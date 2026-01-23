"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupApi, userApi } from "@/services/api";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Group } from "@/types/api";
import { useUserSettingsStore } from "@/stores/user-settings-store";

export interface UserProfile {
  user: {
    id: number;
    favorite_group_id?: number | null;
    display_name?: string | null;
    email?: string;
  };
  settings: {
    user_id: number;
    current_jlpt_level: number;
    hide_english: boolean;
    ui_language: string;
    timezone: string;
    daily_review_target: number;
    jlpt_level_assessed_at?: string | null;
    jlpt_level_assessment_method?: string | null;
  };
  // Additional fields from backend we don't strictly type here
  [key: string]: any;
}

/**
 * Hook to fetch all groups
 */
export function useGroups() {
  return useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => groupApi.getGroups(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to create a new group
 * Returns both React Query mutation object and a convenience async function
 */
export function useCreateGroup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (payload: { name: string; description?: string }) => groupApi.createGroup(payload),
    onSuccess: (data, variables) => {
      toast.success("Group created", { description: variables.name });
      // Invalidate and refetch groups
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to create group", { description: error.message || "Unknown error" });
    },
  });

  // Provide backward-compatible async function
  const createGroup = async (payload: { name: string; description?: string }) => {
    return mutation.mutateAsync(payload);
  };

  return {
    ...mutation,
    createGroup,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook to update an existing group
 * Returns both React Query mutation object and a convenience async function
 */
export function useUpdateGroup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ groupId, ...data }: { groupId: number; name: string; description?: string }) => 
      groupApi.updateGroup(groupId, data),
    onSuccess: () => {
      toast.success("Group updated");
      // Invalidate and refetch groups
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to update group", { description: error.message || "Unknown error" });
    },
  });

  // Provide backward-compatible async function
  const updateGroup = async ({ groupId, ...data }: { groupId: number; name: string; description?: string }) => {
    return mutation.mutateAsync({ groupId, ...data });
  };

  return {
    ...mutation,
    updateGroup,
    isLoading: mutation.isPending,
  };
}

/**
 * Hook to get current user profile including favorite_group_id
 */
export function useUserProfile() {
  const { data, isLoading, error, refetch } = useQuery<UserProfile>({
    queryKey: ['user', 'profile'],
    queryFn: () => userApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const setFromProfile = useUserSettingsStore((s) => s.setFromProfile);

  // Keep the global user settings store in sync with the profile response
  useEffect(() => {
    if (data?.settings?.current_jlpt_level != null) {
      setFromProfile(data.settings.current_jlpt_level);
    }
  }, [data?.settings?.current_jlpt_level, setFromProfile]);

  const favoriteGroupId = useMemo(() => {
    return data?.user?.favorite_group_id ?? null;
  }, [data?.user?.favorite_group_id]);

  return { 
    data, 
    isLoading, 
    error, 
    refetch,
    favoriteGroupId
  };
}

/**
 * Hook to set favorite group
 */
export function useSetFavoriteGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupId: number | null) => userApi.setFavoriteGroup(groupId),
    onSuccess: () => {
      toast.success("Favorite group updated");
      // Invalidate and refetch user profile and groups
      queryClient.invalidateQueries({ queryKey: ['user', 'profile'] });
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to set favorite group", { description: error.message || "Unknown error" });
    },
  });
}

/**
 * Hook to remove a word from a group
 */
export function useRemoveWordFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, wordId }: { groupId: number; wordId: number }) => 
      groupApi.removeWord(groupId, wordId),
    onSuccess: () => {
      toast.success("Word removed from group");
      // Invalidate groups and words queries
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['words'] });
    },
    onError: (error: Error) => {
      toast.error("Failed to remove word", { description: error.message || "Unknown error" });
    },
  });
}
