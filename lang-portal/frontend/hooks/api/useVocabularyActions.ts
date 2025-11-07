"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { groupApi } from "@/services/api";
import { toast } from "sonner";
import { useGroups } from "./useGroup";

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
 */
export function useAddToFavorites() {
  const { data: groups } = useGroups();
  const addToGroup = useAddToGroup();

  const getFavoritesGroupId = (): number | undefined => {
    const favorites = (groups || []).find((g: any) => 
      typeof g.name === 'string' && g.name.toLowerCase().includes('favorite')
    );
    return favorites?.id as number | undefined;
  };

  const addToFavorites = async (itemId: number, type: 'word' | 'kanji') => {
    const favoritesId = getFavoritesGroupId();
    if (!favoritesId) {
      toast.error("No Favorites group found", { 
        description: "Create a 'Favorites' group first on the Groups page." 
      });
      return;
    }

    addToGroup.mutate({ groupId: favoritesId, itemId, type });
  };

  return {
    addToFavorites,
    isLoading: addToGroup.isPending,
  };
}


