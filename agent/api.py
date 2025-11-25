#!/usr/bin/env python3
"""
Agent - AI-powered personalized learning plan generator
FastAPI implementation
"""

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import os

from graph import run_learning_plan_generator
from config import GROQ_API_KEY
from auth import verify_bearer, get_user_id_from_claims

# Initialize FastAPI app
api = FastAPI(
    title="Learning Plan Generator API",
    description="API for AI-powered personalized Japanese learning plan generation",
    version="2.0.0",
)

# Add CORS middleware
api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Check if required API keys are set
def check_api_keys():
    """Check if required API keys are set."""
    api_keys = {
        "GROQ_API_KEY": GROQ_API_KEY,
    }
    missing_keys = [key for key, value in api_keys.items() if not value]
    return missing_keys


# Check optional API keys (warnings only)
def check_optional_api_keys():
    """Check optional API keys and return warnings."""
    warnings = []
    if not os.environ.get("TAVILY_API_KEY"):
        warnings.append(
            "TAVILY_API_KEY not set - external resource search will be disabled"
        )
    if not os.environ.get("YOUTUBE_API_KEY"):
        warnings.append(
            "YOUTUBE_API_KEY not set - YouTube video search will be disabled"
        )
    return warnings


# Input models
class LearningPlanRequest(BaseModel):
    learning_goal: Optional[str] = Field(
        None,
        description="Optional learning goal (e.g., 'Improve kanji', 'Prepare for JLPT N3')",
        example="Improve kanji recognition and prepare for JLPT N3",
    )


# Response models
class LearningPlanResponse(BaseModel):
    status: str = Field(default="success")
    data: dict = Field(
        default={},
        description="Complete learning plan including analysis, weaknesses, and recommendations",
    )


@api.get("/")
async def root():
    """Health check endpoint."""
    return {"status": "online", "service": "Learning Plan Generator API"}


@api.get("/api/agent/debug/auth")
async def debug_auth(
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """Debug endpoint to check authentication status."""
    import logging

    logger = logging.getLogger(__name__)

    clerk_id = claims.get("sub", "unknown")

    # Extract token from authorization header
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    user_id = get_user_id_from_claims(claims, token)

    logger.info(f"Debug auth - Clerk ID: {clerk_id}, User ID: {user_id}")

    return {
        "authenticated": True,
        "clerk_id": clerk_id,
        "user_id": user_id,
        "claims_keys": list(claims.keys()),
    }


@api.post("/api/agent/plan/generate", response_model=LearningPlanResponse)
async def generate_learning_plan(
    request: LearningPlanRequest,
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """
    Generate a personalized learning plan based on user's progress and goals.

    This endpoint analyzes the user's learning data from the database and generates
    a comprehensive, personalized learning plan with recommendations for Sorami features.
    """
    import logging

    logger = logging.getLogger(__name__)

    # Log claims for debugging (without sensitive data)
    logger.info(
        f"Received request with claims: sub={claims.get('sub')}, exp={claims.get('exp')}"
    )

    # Check if required API keys are set
    missing_keys = check_api_keys()
    if missing_keys:
        raise HTTPException(
            status_code=500,
            detail=f"Missing required API keys: {', '.join(missing_keys)}",
        )

    # Extract token from authorization header
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    # Extract user_id from JWT claims by calling Go backend
    user_id = get_user_id_from_claims(claims, token)
    if not user_id:
        clerk_id = claims.get("sub", "unknown")
        logger.warning(f"Unable to map Clerk ID {clerk_id} to database user_id")
        raise HTTPException(
            status_code=401,
            detail=f"Unable to identify user. Clerk ID: {clerk_id}. Please ensure your account is properly linked.",
        )

    try:
        # Run the learning plan generation workflow
        # Pass token so nodes can call Go backend API
        complete_data = run_learning_plan_generator(
            user_id=user_id,
            learning_goal=request.learning_goal,
            token=token,
        )

        # Return the complete data
        return LearningPlanResponse(status="success", data=complete_data)
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating learning plan: {str(e)}"
        )


# Legacy endpoint for backward compatibility (deprecated)
@api.post("/api/agent/search/direct")
async def search_direct_legacy(
    authorization: str = Header(None),
    claims=Depends(verify_bearer),
):
    """
    Legacy endpoint - redirects to learning plan generation.
    This endpoint is deprecated. Use /api/agent/plan/generate instead.
    """
    # Extract token from authorization header
    token = None
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1]

    # Extract user_id from JWT claims by calling Go backend
    user_id = get_user_id_from_claims(claims, token)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Unable to identify user. Please ensure you are authenticated.",
        )

    try:
        # Run the learning plan generation workflow
        # Pass token so nodes can call Go backend API
        complete_data = run_learning_plan_generator(
            user_id=user_id,
            learning_goal=None,
            token=token,
        )

        return {"status": "success", "data": complete_data}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error generating learning plan: {str(e)}"
        )
