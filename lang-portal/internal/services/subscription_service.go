package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"
	"github.com/clerk/clerk-sdk-go/v2/billing"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/patrickmn/go-cache"
)

// SubscriptionInfo represents cached subscription information
type SubscriptionInfo struct {
	Plan         string // "basic", "pro", or "none"
	HasActiveSub bool
	CachedAt     time.Time
}

// SubscriptionService handles subscription checks with caching
type SubscriptionService struct {
	cache      *cache.Cache
	secretKey  string
	cacheTTL   time.Duration
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

	// Default cache TTL: 5 minutes
	cacheTTL := 5 * time.Minute
	if ttlStr := os.Getenv("SUBSCRIPTION_CACHE_TTL"); ttlStr != "" {
		if parsed, err := time.ParseDuration(ttlStr); err == nil {
			cacheTTL = parsed
		}
	}

	// Create cache with TTL and cleanup interval
	c := cache.New(cacheTTL, 10*time.Minute)

	service := &SubscriptionService{
		cache:      c,
		secretKey:  secretKey,
		cacheTTL:   cacheTTL,
		initialized: true,
	}

	log.Printf("SubscriptionService initialized with cache TTL: %v", cacheTTL)
	return service, nil
}

// GetSubscriptionPlan retrieves the user's subscription plan with caching
// Returns: plan ("basic", "pro", or "none"), hasActiveSub (bool), error
func (s *SubscriptionService) GetSubscriptionPlan(ctx context.Context, clerkUserID string) (string, bool, error) {
	if !s.initialized {
		return "none", false, fmt.Errorf("subscription service not initialized")
	}

	// Check cache first
	cacheKey := fmt.Sprintf("subscription:%s", clerkUserID)
	if cached, found := s.cache.Get(cacheKey); found {
		info := cached.(SubscriptionInfo)
		log.Printf("Cache hit for user %s: plan=%s", clerkUserID, info.Plan)
		return info.Plan, info.HasActiveSub, nil
	}

	// Cache miss - fetch from Clerk API
	log.Printf("Cache miss for user %s, fetching from Clerk API", clerkUserID)
	plan, hasActive, err := s.fetchSubscriptionFromClerk(ctx, clerkUserID)
	if err != nil {
		// On error, return "none" but log the error
		log.Printf("Error fetching subscription for user %s: %v", clerkUserID, err)
		return "none", false, err
	}

	// Cache the result
	info := SubscriptionInfo{
		Plan:         plan,
		HasActiveSub: hasActive,
		CachedAt:     time.Now(),
	}
	s.cache.Set(cacheKey, info, cache.DefaultExpiration)
	log.Printf("Cached subscription for user %s: plan=%s, active=%v", clerkUserID, plan, hasActive)

	return plan, hasActive, nil
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
	// Look for plan identifiers in the subscription items
	hasPro := false
	hasBasic := false

	for _, item := range subscriptionItems.Data {
		// Check the plan identifier
		// Clerk Billing stores plan info in the Plan field
		if item.Plan != nil {
			// Check plan ID (it's a string, not a pointer)
			if item.Plan.ID != "" {
				planID := strings.ToLower(item.Plan.ID)
				if strings.Contains(planID, "pro") {
					hasPro = true
				} else if strings.Contains(planID, "basic") {
					hasBasic = true
				}
			}
			// Also check plan name if available (it's a string, not a pointer)
			if item.Plan.Name != "" {
				planName := strings.ToLower(item.Plan.Name)
				if strings.Contains(planName, "pro") {
					hasPro = true
				} else if strings.Contains(planName, "basic") {
					hasBasic = true
				}
			}
		}
	}

	// Pro takes precedence over Basic
	if hasPro {
		return "pro", true, nil
	}
	if hasBasic {
		return "basic", true, nil
	}

	// If we have active items but can't determine plan, assume basic
	if len(subscriptionItems.Data) > 0 {
		return "basic", true, nil
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
				}
			}
		}
	}

	return "none", false, nil
}

// InvalidateCache invalidates the cache for a specific user
// Call this when subscription status changes (e.g., via webhook)
func (s *SubscriptionService) InvalidateCache(clerkUserID string) {
	cacheKey := fmt.Sprintf("subscription:%s", clerkUserID)
	s.cache.Delete(cacheKey)
	log.Printf("Invalidated subscription cache for user %s", clerkUserID)
}

// HasProPlan checks if user has Pro plan (convenience method)
func (s *SubscriptionService) HasProPlan(ctx context.Context, clerkUserID string) (bool, error) {
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
