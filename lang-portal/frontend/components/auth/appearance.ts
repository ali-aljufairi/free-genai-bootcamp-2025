/**
 * @deprecated This file is no longer used.
 * 
 * The Clerk appearance configuration has been consolidated into:
 * /lib/clerk-appearance.ts
 * 
 * This ensures a single, unified styling approach across all Clerk components
 * and prevents conflicts between different configurations.
 */

// Re-export the unified configuration for backward compatibility
export { clerkAppearance as authAppearance } from "@/lib/clerk-appearance";
