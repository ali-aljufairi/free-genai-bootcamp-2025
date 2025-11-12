"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { groupApi, userApi } from "@/services/api";
import { toast } from "sonner";
import { useGroups, useUserProfile, useCreateGroup } from "./useGroup";
import { useCallback, useMemo } from "react";

/**
 * Hook to add a word or kanji to a group
 */
export function useAddToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ groupId, itemId, type }: { groupId: number; itemId: number; type: 'word' | 'kanji' }) => {
      if (type === 'word') {
        return groupApi.addWord(groupId, itemId);
      } else {
        return groupApi.addKanji(groupId, itemId);
      }
    },
    onSuccess: () => {
      // Invalidate groups query to refresh data
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to add to group", {
        description: error.message || "Unknown error"
      });
    }
  });
}

/**
 * Hook to add a word or kanji to favorites group
 * Automatically creates a favorite group if it doesn't exist
 */
export function useAddToFavorites() {
  const { data: groups } = useGroups();
  const { favoriteGroupId, refetch: refetchProfile } = useUserProfile();
  const { createGroup } = useCreateGroup();
  const addToGroup = useAddToGroup();
  const queryClient = useQueryClient();

  // Memoize groups to prevent unnecessary callback recreations
  const groupsMemo = useMemo(() => groups || [], [groups]);

  const addToFavorites = useCallback(async (itemId: number, type: 'word' | 'kanji') => {
    try {
      let favoritesId: number | null = null;

      // Check if user has a favorite group set
      if (favoriteGroupId) {
        // Verify the group still exists
        const group = groupsMemo.find((g: any) => g.id === favoriteGroupId);
        if (group) {
          favoritesId = favoriteGroupId;
        }
      }

      // If no favorite group exists, check if a "Favorites" group already exists
      if (!favoritesId) {
        // First, check if a "Favorites" group already exists
        const existingFavoritesGroup = groupsMemo.find((g: any) => 
          g.name && g.name.toLowerCase().trim() === "favorites"
        );

        if (existingFavoritesGroup) {
          // Use the existing "Favorites" group
          favoritesId = existingFavoritesGroup.id;
          
          // Set it as the user's favorite group if not already set
          if (favoriteGroupId !== favoritesId) {
            try {
              await userApi.setFavoriteGroup(favoritesId);
              await refetchProfile();
            } catch (e: any) {
              console.error("Failed to set favorite group:", e);
              // Continue anyway - we'll use the existing group
            }
          }
        } else {
          // Create a new "Favorites" group only if one doesn't exist
          try {
            const newGroup = await createGroup({ 
              name: "Favorites", 
              description: "Your favorite vocabulary items" 
            });
            
            if (!newGroup || !newGroup.id) {
              toast.error("Failed to create Favorites group");
              return;
            }

            favoritesId = newGroup.id;

            // Set it as the user's favorite group
            try {
              await userApi.setFavoriteGroup(favoritesId);
              await refetchProfile();
            } catch (e: any) {
              console.error("Failed to set favorite group:", e);
              // Continue anyway - the group was created
            }
          } catch (createError: any) {
            // If creation fails due to duplicate name, try to find the existing group
            if (createError?.message?.includes("duplicate") || createError?.message?.includes("unique constraint")) {
              // Refetch groups to get the latest list
              queryClient.invalidateQueries({ queryKey: ['groups'] });
              
              // Try to find the existing group
              const refreshedGroups = await queryClient.fetchQuery({ queryKey: ['groups'] });
              const foundGroup = (refreshedGroups as any[] || []).find((g: any) => 
                g.name && g.name.toLowerCase().trim() === "favorites"
              );
              
              if (foundGroup) {
                favoritesId = foundGroup.id;
                try {
                  await userApi.setFavoriteGroup(favoritesId);
                  await refetchProfile();
                } catch (e: any) {
                  console.error("Failed to set favorite group:", e);
                  // Continue anyway - we found the group
                }
              } else {
                toast.error("Favorites group already exists but could not be found. Please refresh the page.");
                return;
              }
            } else {
              throw createError;
            }
          }
        }
      }

      // Ensure we have a valid favoritesId before adding
      if (!favoritesId) {
        toast.error("Failed to find or create Favorites group");
        return;
      }

      // Add the item to the favorite group
      addToGroup.mutate(
        { groupId: favoritesId, itemId, type },
        {
          onSuccess: () => {
            toast.success("Added to favorites");
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['groups'] });
          },
        }
      );
    } catch (error: any) {
      toast.error("Failed to add to favorites", {
        description: error?.message || "Unknown error"
      });
    }
  }, [favoriteGroupId, groupsMemo, createGroup, refetchProfile, addToGroup, queryClient]);

  return {
    addToFavorites,
    isLoading: addToGroup.isPending,
  };
}
