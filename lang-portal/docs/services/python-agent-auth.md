# Python Agent Service Authentication Integration

## Overview

The Sorami Python Agent Service (Learning Plan Generator) integrates seamlessly with Sorami's centralized authentication system. The service uses **Clerk JWT tokens** for authentication and delegates user management to the **Go backend**, following Sorami's microservices architecture principles.

## Architecture

```
[Frontend/Next.js]
    ↓ (Authorization: Bearer <Clerk JWT>)
[Python Agent Service] (FastAPI)
    ↓ (JWT Verification via Clerk JWKS)
    ↓ (Extract Clerk ID from claims)
    ↓ (Authorization: Bearer <Clerk JWT>)
[Go Backend API]
    ↓ (Auto-create user if needed)
    ↓ (Return user_id + profile data)
[Python Agent Service]
    ↓ (Use user_id for data operations)
[LangGraph Workflow]
```

## Key Design Principles

1. **No Direct Database Access**: The Python agent does NOT connect directly to PostgreSQL. All user data is fetched via the Go backend API.

2. **Single Source of Truth**: The Go backend is the authoritative source for user management, settings, and learning progress data.

3. **Automatic User Creation**: The Go backend automatically creates users when they first authenticate, eliminating the need for manual user setup in the Python service.

4. **Token Forwarding**: The Python service forwards the original Clerk JWT token to the Go backend, maintaining the authentication chain.

## Implementation Details

### 1. JWT Verification (`agent/auth.py`)

The Python service verifies Clerk JWT tokens using the same JWKS (JSON Web Key Set) endpoint that the Go backend uses.

#### Configuration

```python
# Environment variables required:
CLERK_JWKS_URL=https://clerk.your-domain.com/.well-known/jwks.json
# OR
CLERK_ISSUER=https://clerk.your-domain.com
```

#### Verification Flow

```python
def verify_bearer(authorization: str | None = Header(default=None)):
    """
    Verify Clerk JWT bearer token.
    
    - Extracts token from Authorization header
    - Fetches JWKS from Clerk (with 1-hour caching)
    - Validates token signature and expiration
    - Returns JWT claims
    """
```

**Features:**
- **JWKS Caching**: JWKS keys are cached for 1 hour to reduce API calls
- **URL Validation**: Validates that `CLERK_JWKS_URL` or `CLERK_ISSUER` are properly formatted
- **Error Handling**: Provides clear error messages for configuration issues

### 2. User ID Resolution (`agent/auth.py`)

Instead of querying the database directly, the Python service calls the Go backend API to resolve the Clerk ID to an internal user ID.

```python
def get_user_id_from_claims(claims: dict, token: str) -> int | None:
    """
    Extract user_id from JWT claims by calling Go backend API.
    The Go backend handles user creation automatically.
    
    Args:
        claims: JWT claims dictionary (from verify_bearer)
        token: The JWT bearer token to forward to Go backend
        
    Returns:
        The database user_id, or None if unable to retrieve
    """
```

**Process:**
1. Extracts `sub` (Clerk ID) from JWT claims
2. Calls `GET /api/langportal/users/me` with the bearer token
3. Go backend middleware automatically:
   - Validates the token
   - Creates user if they don't exist
   - Returns user profile with internal `user_id`
4. Python service extracts `user_id` from the response

**Benefits:**
- **Consistency**: Uses the same user creation logic as the Go backend
- **No Duplication**: Avoids duplicate user creation logic in Python
- **Automatic Setup**: User settings and roles are created automatically by Go backend

### 3. Go Backend API Client (`agent/utils/go_backend_client.py`)

A dedicated client module handles all communication with the Go backend.

#### User Profile Fetching

```python
def get_user_profile(token: str) -> Optional[Dict[str, Any]]:
    """
    Get user profile from Go backend API.
    
    Calls: GET /api/langportal/users/me
    
    Returns:
        {
            "user": {
                "id": 1,
                "clerk_id": "user_xxx",
                "email": "user@example.com",
                "display_name": "User Name",
                ...
            },
            "settings": {
                "current_jlpt_level": 5,
                "daily_review_target": 20,
                ...
            },
            "roles": [...]
        }
    """
```

#### Dashboard Statistics

```python
def get_dashboard_stats(token: str) -> Optional[Dict[str, Any]]:
    """
    Get dashboard stats from Go backend API.
    
    Calls:
    - GET /api/langportal/dashboard/quick-stats
    - GET /api/langportal/dashboard/study_progress
    
    Returns aggregated statistics including:
    - total_words_studied
    - total_kanji_studied
    - success_rate
    - study_streak_days
    - total_study_sessions
    """
```

**Configuration:**
```python
GO_BACKEND_URL=http://localhost:8080  # Default, override in production
```

### 4. FastAPI Endpoint Integration (`agent/api.py`)

All protected endpoints use the `verify_bearer` dependency and extract the token for Go backend calls.

#### Example Endpoint

```python
@api.post("/api/agent/plan/generate", response_model=LearningPlanResponse)
async def generate_learning_plan(
    request: LearningPlanRequest,
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """
    Generate personalized learning plan.
    
    Authentication:
    - Requires valid Clerk JWT token
    - Extracts user_id via Go backend API
    - Passes token to LangGraph workflow for data fetching
    """
    # Extract token from Authorization header
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]
    
    # Get user_id from Go backend
    user_id = get_user_id_from_claims(claims, token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Unable to identify user")
    
    # Run workflow with token for authenticated API calls
    complete_data = run_learning_plan_generator(
        user_id=user_id,
        token=token,  # Pass token for Go backend API calls
        learning_goal=request.learning_goal,
    )
    
    return LearningPlanResponse(status="success", data=complete_data)
```

### 5. LangGraph Workflow Integration (`agent/graph.py`)

The LangGraph workflow receives the JWT token in the initial state, allowing all nodes to make authenticated calls to the Go backend.

```python
def run_learning_plan_generator(
    user_id: int, 
    learning_goal: str | None = None, 
    token: str | None = None
):
    """
    Run the Learning Plan Generator workflow.
    
    Args:
        user_id: The user's database ID (from Go backend)
        token: The JWT bearer token for Go backend API calls
        learning_goal: Optional learning goal from user
    """
    initial_state = {
        "user_id": user_id,
        "token": token,  # Available to all nodes
        "learning_goal": learning_goal,
    }
    # ... workflow execution
```

### 6. Node-Level Data Fetching (`agent/nodes/user_analysis_node.py`)

Nodes use the `go_backend_client` to fetch user data instead of direct database queries.

```python
def user_analysis_node(state: State):
    """
    Fetch and analyze user progress data from Go backend API.
    """
    user_id = state.get("user_id")
    token = state.get("token")  # Get token from state
    
    # Fetch from Go backend (not database)
    user_profile = get_user_profile(token)
    dashboard_stats = get_dashboard_stats(token)
    
    # Transform to internal format
    user_data = {
        "profile": {...},
        "progress": {...},
        "analytics": {...},
    }
    
    return {"user_data": user_data}
```

## Environment Variables

### Required

```bash
# Clerk Authentication
CLERK_JWKS_URL=https://clerk.your-domain.com/.well-known/jwks.json
# OR
CLERK_ISSUER=https://clerk.your-domain.com

# Go Backend Integration
GO_BACKEND_URL=http://localhost:8080  # Development
# GO_BACKEND_URL=https://api.sorami.aljufairi.org  # Production

# LLM API Key
GROQ_API_KEY=your_groq_api_key
```

### Optional

```bash
# External Services (for learning resources)
TAVILY_API_KEY=your_tavily_api_key  # Web search
YOUTUBE_API_KEY=your_youtube_api_key  # Video search

# Email Configuration
GMAIL_USER=your_gmail@gmail.com
GMAIL_PASSWORD=your_app_password
```

## Error Handling

### Authentication Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `Missing bearer token` | No Authorization header | Ensure frontend sends `Authorization: Bearer <token>` |
| `Token expired` | JWT has expired | Frontend should refresh token via Clerk |
| `Invalid token` | Token signature invalid | Check `CLERK_JWKS_URL` configuration |
| `Unable to identify user` | Go backend API call failed | Check `GO_BACKEND_URL` and network connectivity |

### Go Backend Communication Errors

The Python service handles Go backend failures gracefully:

```python
# In go_backend_client.py
try:
    response = requests.get(url, headers=headers, timeout=5)
    if response.status_code == 200:
        return response.json()
    else:
        logger.error(f"Go backend returned status {response.status_code}")
        return None  # Graceful degradation
except requests.exceptions.RequestException as e:
    logger.error(f"Failed to call Go backend API: {e}")
    return None
```

## Security Considerations

1. **Token Forwarding**: The original Clerk JWT is forwarded to the Go backend, maintaining the authentication chain without token exchange.

2. **No Token Storage**: Tokens are never stored or cached in the Python service. They are only used for the duration of the request.

3. **HTTPS in Production**: All API calls between services should use HTTPS in production environments.

4. **Timeout Protection**: All Go backend API calls have a 5-second timeout to prevent hanging requests.

5. **Error Sanitization**: Error messages don't expose sensitive information about the authentication system.

## Testing

### Local Development

1. **Start Go Backend**:
   ```bash
   cd lang-portal
   make run
   ```

2. **Start Python Agent**:
   ```bash
   cd agent
   uv run fastapi dev api.py
   ```

3. **Test Authentication**:
   ```bash
   # Get token from Clerk (via frontend or Clerk dashboard)
   TOKEN="your_clerk_jwt_token"
   
   # Test endpoint
   curl -X POST http://localhost:8002/api/agent/plan/generate \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"learning_goal": "Improve kanji"}'
   ```

### Debug Endpoint

The Python service includes a debug endpoint for testing authentication:

```python
@api.get("/api/agent/debug/auth")
async def debug_auth(
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """
    Debug endpoint to test authentication flow.
    
    Returns:
    - JWT claims
    - User ID (from Go backend)
    - User profile data
    """
```

## Migration from Direct Database Access

The Python agent was refactored to remove direct PostgreSQL connections:

### Before (Deprecated)

```python
# ❌ Direct database connection
from db.connection import get_db_connection
from db.user_data import get_user_profile_and_settings

conn = get_db_connection()
user_data = get_user_profile_and_settings(user_id)
```

### After (Current)

```python
# ✅ Go backend API calls
from utils.go_backend_client import get_user_profile, get_dashboard_stats

user_profile = get_user_profile(token)
dashboard_stats = get_dashboard_stats(token)
```

**Benefits:**
- **Consistency**: Single source of truth for user data
- **Maintainability**: User creation logic only in Go backend
- **Scalability**: No database connection pool needed in Python service
- **Security**: No database credentials in Python service

## Integration with Frontend

The frontend calls the Python agent service through Next.js API rewrites:

```javascript
// frontend/next.config.mjs
{
  source: '/api/agent/:path*',
  destination: 'http://localhost:8002/api/agent/:path*',
}
```

The frontend automatically includes the Clerk JWT token:

```typescript
// Frontend automatically adds Authorization header
const response = await fetch('/api/agent/plan/generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    // Authorization header added automatically by Clerk
  },
  body: JSON.stringify({ learning_goal: '...' })
});
```

## Troubleshooting

### Issue: "Invalid token" error

**Check:**
1. `CLERK_JWKS_URL` or `CLERK_ISSUER` is correctly set
2. URL format is correct (must include `https://` and full path)
3. Network connectivity to Clerk's JWKS endpoint

**Solution:**
```bash
# Test JWKS endpoint
curl https://clerk.your-domain.com/.well-known/jwks.json
```

### Issue: "Unable to identify user"

**Check:**
1. `GO_BACKEND_URL` is correct
2. Go backend is running and accessible
3. Go backend has proper Clerk configuration

**Solution:**
```bash
# Test Go backend endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/langportal/users/me
```

### Issue: User not found in database

**Note:** This should not happen! The Go backend automatically creates users. If you see this error:

1. Check Go backend logs for user creation errors
2. Verify database connectivity from Go backend
3. Check that the Go backend middleware is properly configured

## Best Practices

1. **Always use `get_user_id_from_claims`**: Never extract user_id directly from JWT claims. Always call the Go backend to ensure user exists.

2. **Pass token through workflow**: Include the token in the LangGraph state so all nodes can make authenticated API calls.

3. **Handle None gracefully**: Go backend API calls may return `None` on errors. Always check for `None` before using the data.

4. **Log authentication events**: Log successful authentications and failures for debugging and monitoring.

5. **Use environment variables**: Never hardcode URLs or credentials. Use environment variables for all configuration.

## Related Documentation

- [Authentication Flow](./auth/authentication-flow.md) - Overall Sorami authentication architecture
- [Clerk Setup](./auth/clerk-setup.md) - Clerk configuration guide
- [Go Backend API](../api/README.md) - Go backend API documentation

## Summary

The Python Agent Service integrates with Sorami's authentication system by:

1. ✅ Verifying Clerk JWT tokens using JWKS
2. ✅ Delegating user management to the Go backend
3. ✅ Forwarding tokens for authenticated API calls
4. ✅ Avoiding direct database access
5. ✅ Following microservices architecture principles

This design ensures consistency, maintainability, and security across the Sorami platform.






