package services

import (
	"context"
	"encoding/json"
	"fmt"
	"lang-portal/internal/config"
	"log"
	"os"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/billing"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/redis/go-redis/v9"
)

// SubscriptionInfo represents cached subscription information
type SubscriptionInfo struct {
	Plan         string // "basic", "pro", "free", or "none"
	HasActiveSub bool
	CachedAt     time.Time
}

// SubscriptionService handles subscription checks with caching
type SubscriptionService struct {
	cache       *redis.Client // Valkey/Redis client for persistent caching
	secretKey   string
	cacheTTL    time.Duration
	initialized bool
}

// NewSubscriptionService creates a new subscription service with caching
func NewSubscriptionService() (*SubscriptionService, error) {
	secretKey := os.Getenv("CLERK_SECRET_KEY")
	if secretKey == "" {
		return nil, fmt.Errorf("CLERK_SECRET_KEY environment variable not set")
	}

	// Set Clerk API key globally
	clerk.SetKey(secretKey)

	// Default cache TTL: 24 hours (1 day)
	cacheTTL := 24 * time.Hour
	if ttlStr := os.Getenv("SUBSCRIPTION_CACHE_TTL"); ttlStr != "" {
		if parsed, err := time.ParseDuration(ttlStr); err == nil {
			cacheTTL = parsed
		}
	}

	// Get Valkey cache client (shared instance)
	cacheClient := config.GetCacheClient()
	if cacheClient == nil {
		log.Printf("⚠️  SubscriptionService: Valkey cache not available, subscription caching disabled")
		log.Printf("   Subscription checks will still work but without caching (slower API calls)")
		log.Printf("   To enable caching, configure VALKEY_HOST environment variable")
	}

	service := &SubscriptionService{
		cache:       cacheClient,
		secretKey:   secretKey,
		cacheTTL:    cacheTTL,
		initialized: true,
	}

	if cacheClient != nil {
		log.Printf("✅ SubscriptionService initialized with Valkey cache (TTL: %v)", cacheTTL)
		log.Printf("   Cache type: Valkey/Redis (persistent, distributed)")
		log.Printf("   Cache status: %s", config.GetCacheStatus())
	} else {
		log.Printf("⚠️  SubscriptionService initialized without cache (TTL: %v would be used if cache available)", cacheTTL)
	}
	return service, nil
}

// GetSubscriptionPlan retrieves the user's subscription plan with caching.
// Returns: plan ("basic", "pro", "free", or "none"), hasActiveSub (bool), error.
// Note: In business logic, only "basic" and "pro" are treated as paid/active plans.
func (s *SubscriptionService) GetSubscriptionPlan(ctx context.Context, clerkUserID string) (string, bool, error) {
	if !s.initialized {
		return "none", false, fmt.Errorf("subscription service not initialized")
	}

	// Check cache first (Valkey/Redis)
	cacheKey := fmt.Sprintf("subscription:%s", clerkUserID)

	if s.cache != nil {
		// Try to get from Valkey cache
		cachedData, err := s.cache.Get(ctx, cacheKey).Result()
		if err == nil {
			// Cache hit - deserialize the data
			var info SubscriptionInfo
			if err := json.Unmarshal([]byte(cachedData), &info); err == nil {
				age := time.Since(info.CachedAt)
				log.Printf("✅ Cache HIT for user %s: plan=%s, active=%v (cached %v ago, TTL=%v)",
					clerkUserID, info.Plan, info.HasActiveSub, age, s.cacheTTL)
				return info.Plan, info.HasActiveSub, nil
			}
			// If deserialization fails, log and continue to fetch fresh data
			log.Printf("⚠️  Cache deserialization error for user %s: %v, fetching fresh data", clerkUserID, err)
		} else if err != redis.Nil {
			// Error other than "key not found" - log but continue
			log.Printf("⚠️  Cache GET error for user %s: %v, fetching fresh data", clerkUserID, err)
		}
	}

	// Cache miss - fetch from Clerk API
	log.Printf("❌ Cache MISS for user %s, fetching from Clerk API (cache TTL=%v)", clerkUserID, s.cacheTTL)
	plan, hasActive, err := s.fetchSubscriptionFromClerk(ctx, clerkUserID)
	if err != nil {
		// On error, return "none" but log the error
		log.Printf("Error fetching subscription for user %s: %v", clerkUserID, err)
		return "none", false, err
	}

	// Cache the result in Valkey
	if s.cache != nil {
		info := SubscriptionInfo{
			Plan:         plan,
			HasActiveSub: hasActive,
			CachedAt:     time.Now(),
		}
		// Serialize to JSON
		infoJSON, err := json.Marshal(info)
		if err == nil {
			// Store in Valkey with TTL
			if setErr := s.cache.Set(ctx, cacheKey, infoJSON, s.cacheTTL).Err(); setErr != nil {
				log.Printf("⚠️  Failed to cache subscription for user %s: %v", clerkUserID, setErr)
			} else {
				log.Printf("💾 Cached subscription for user %s: plan=%s, active=%v (TTL=%v)",
					clerkUserID, plan, hasActive, s.cacheTTL)
			}
		} else {
			log.Printf("⚠️  Failed to serialize subscription info for user %s: %v", clerkUserID, err)
		}
	}

	return plan, hasActive, nil
}

// matchPlanIdentifier checks if a plan identifier matches "basic", "pro", or "free"
// This matches what Clerk's has({ plan: 'basic' }) expects
// Returns: isPro, isBasic, isFree
func matchPlanIdentifier(identifier string) (isPro bool, isBasic bool, isFree bool) {
	identifier = strings.ToLower(strings.TrimSpace(identifier))

	// Exact matches (most reliable)
	if identifier == "pro" {
		return true, false, false
	}
	if identifier == "basic" {
		return false, true, false
	}
	if identifier == "free" {
		return false, false, true
	}

	// Common variations with separators
	// Match "pro-plan", "pro_plan", "plan-pro", etc.
	if strings.HasPrefix(identifier, "pro-") ||
		strings.HasPrefix(identifier, "pro_") ||
		strings.HasSuffix(identifier, "-pro") ||
		strings.HasSuffix(identifier, "_pro") ||
		identifier == "pro_plan" ||
		identifier == "proplan" {
		return true, false, false
	}

	// Match "basic-plan", "basic_plan", "plan-basic", etc.
	if strings.HasPrefix(identifier, "basic-") ||
		strings.HasPrefix(identifier, "basic_") ||
		strings.HasSuffix(identifier, "-basic") ||
		strings.HasSuffix(identifier, "_basic") ||
		identifier == "basic_plan" ||
		identifier == "basicplan" {
		return false, true, false
	}

	// Match "free-plan", "free_plan", "plan-free", etc.
	if strings.HasPrefix(identifier, "free-") ||
		strings.HasPrefix(identifier, "free_") ||
		strings.HasSuffix(identifier, "-free") ||
		strings.HasSuffix(identifier, "_free") ||
		identifier == "free_plan" ||
		identifier == "freeplan" {
		return false, false, true
	}

	return false, false, false
}

// fetchSubscriptionFromClerk fetches subscription from Clerk Billing API
func (s *SubscriptionService) fetchSubscriptionFromClerk(ctx context.Context, clerkUserID string) (string, bool, error) {
	// List subscription items for the user
	params := &billing.ListSubscriptionItemsParams{
		UserID: clerk.String(clerkUserID),
		Status: clerk.String("active"), // Only get active subscriptions
	}

	subscriptionItems, err := billing.ListSubscriptionItems(ctx, params)
	if err != nil {
		// Check if it's an API error we can handle
		if apiErr, ok := err.(*clerk.APIErrorResponse); ok {
			log.Printf("Clerk API error: %s", apiErr.Error())
			// If user not found or no subscriptions, return "none"
			// APIErrorResponse doesn't expose StatusCode directly, check error message
			if strings.Contains(apiErr.Error(), "404") || strings.Contains(apiErr.Error(), "not found") {
				return "none", false, nil
			}
		}
		return "none", false, fmt.Errorf("failed to fetch subscription from Clerk: %w", err)
	}

	// Check if user has any active subscription items
	if subscriptionItems == nil || len(subscriptionItems.Data) == 0 {
		// Fallback: check public metadata for backward compatibility
		return s.checkPublicMetadata(ctx, clerkUserID)
	}

	// Determine plan from subscription items
	// Clerk Billing uses exact plan identifiers that match what has({ plan: 'basic' }) expects
	hasPro := false
	hasBasic := false
	hasFree := false

	for _, item := range subscriptionItems.Data {
		// Check the plan identifier
		// Clerk Billing stores plan info in the Plan field
		if item.Plan != nil {
			// Check plan ID first (most reliable - this is what Clerk uses for has({ plan: 'basic' }))
			if item.Plan.ID != "" {
				isPro, isBasic, isFreePlan := matchPlanIdentifier(item.Plan.ID)
				if isPro {
					hasPro = true
				}
				if isBasic {
					hasBasic = true
				}
				if isFreePlan {
					hasFree = true
				}
			}
			// Also check plan name as fallback
			if item.Plan.Name != "" {
				isPro, isBasic, isFreePlan := matchPlanIdentifier(item.Plan.Name)
				if isPro {
					hasPro = true
				}
				if isBasic {
					hasBasic = true
				}
				if isFreePlan {
					hasFree = true
				}
			}
		}
	}

	// Pro takes precedence over Basic. Free is treated as non-paid (informational only).
	if hasPro {
		return "pro", true, nil
	}
	if hasBasic {
		return "basic", true, nil
	}
	if hasFree {
		// Free plan is surfaced as a distinct plan but not considered paid for access control.
		return "free", true, nil
	}

	// If we have active items but can't determine plan, log warning and fallback to metadata
	if len(subscriptionItems.Data) > 0 {
		log.Printf("Warning: Found active subscription items for user %s but couldn't determine plan type", clerkUserID)
		// Fallback to metadata check instead of assuming basic
		return s.checkPublicMetadata(ctx, clerkUserID)
	}

	// Fallback to metadata check
	return s.checkPublicMetadata(ctx, clerkUserID)
}

// checkPublicMetadata checks user's public metadata as fallback
// This maintains backward compatibility with existing metadata-based checks
func (s *SubscriptionService) checkPublicMetadata(ctx context.Context, clerkUserID string) (string, bool, error) {
	log.Printf("No active subscription items found for user %s, checking metadata fallback", clerkUserID)

	// Fetch user to check public metadata
	clerkUser, err := user.Get(ctx, clerkUserID)
	if err != nil {
		log.Printf("Failed to fetch user for metadata check: %v", err)
		return "none", false, nil
	}

	// Check public metadata for subscription_plan
	// PublicMetadata is json.RawMessage in Clerk SDK v2
	if len(clerkUser.PublicMetadata) > 0 {
		var metadataMap map[string]interface{}
		if err := json.Unmarshal(clerkUser.PublicMetadata, &metadataMap); err == nil {
			if planInterface, exists := metadataMap["subscription_plan"]; exists {
				if planStr, ok := planInterface.(string); ok {
					plan := strings.ToLower(planStr)
					if plan == "pro" {
						return "pro", true, nil
					}
					if plan == "basic" {
						return "basic", true, nil
					}
					if plan == "free" {
						// Metadata may indicate "free"; treat as informational, not as paid access.
						return "free", true, nil
					}
				}
			}
		}
	}

	return "none", false, nil
}

// InvalidateCache invalidates the cache for a specific user
// Call this when subscription status changes (e.g., via webhook)
func (s *SubscriptionService) InvalidateCache(clerkUserID string) {
	if s.cache == nil {
		log.Printf("⚠️  Cannot invalidate cache for user %s: Valkey cache not available", clerkUserID)
		return
	}

	cacheKey := fmt.Sprintf("subscription:%s", clerkUserID)
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	if err := s.cache.Del(ctx, cacheKey).Err(); err != nil {
		log.Printf("⚠️  Failed to invalidate cache for user %s: %v", clerkUserID, err)
	} else {
		log.Printf("✅ Invalidated subscription cache for user %s", clerkUserID)
	}
}

// HasProPlan checks if user has Pro plan (convenience method)
func (s *SubscriptionService) HasProPlan(ctx context.Context, clerkUserID string) (bool, error) {
	plan, hasActive, err := s.GetSubscriptionPlan(ctx, clerkUserID)
	if err != nil {
		return false, err
	}
	return hasActive && plan == "pro", nil
}

// HasFreePlan checks if user has Free plan (convenience method).
// Free plan does NOT grant paid/unlimited access; it is informational only.
func (s *SubscriptionService) HasFreePlan(ctx context.Context, clerkUserID string) (bool, error) {
	plan, hasActive, err := s.GetSubscriptionPlan(ctx, clerkUserID)
	if err != nil {
		return false, err
	}
	return hasActive && plan == "free", nil
}

// HasUnlimitedPlan checks if user has a plan that grants unlimited access.
// Currently only the Pro plan is treated as unlimited.
func (s *SubscriptionService) HasUnlimitedPlan(ctx context.Context, clerkUserID string) (bool, error) {
	plan, hasActive, err := s.GetSubscriptionPlan(ctx, clerkUserID)
	if err != nil {
		return false, err
	}
	return hasActive && plan == "pro", nil
}

// HasBasicPlan checks if user has Basic plan (convenience method)
func (s *SubscriptionService) HasBasicPlan(ctx context.Context, clerkUserID string) (bool, error) {
	plan, hasActive, err := s.GetSubscriptionPlan(ctx, clerkUserID)
	if err != nil {
		return false, err
	}
	return hasActive && plan == "basic", nil
}

// HasActiveSubscription checks if user has any active subscription
func (s *SubscriptionService) HasActiveSubscription(ctx context.Context, clerkUserID string) (bool, error) {
	_, hasActive, err := s.GetSubscriptionPlan(ctx, clerkUserID)
	return hasActive, err
}
