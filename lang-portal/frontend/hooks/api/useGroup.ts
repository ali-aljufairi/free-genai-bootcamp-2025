"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupApi, userApi } from "@/services/api";
import { useMemo } from "react";
import { toast } from "sonner";
import { Group } from "@/types/api";

export interface UserProfile {
  id: number;
  favorite_group_id?: number | null;
  user?: {
    display_name?: string;
    email?: string;
  };
  settings?: {
    current_jlpt_level?: number;
  };
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
 * Hook to get current user profile including favorite_group_id
 */
export function useUserProfile() {
  const { data, isLoading, error, refetch } = useQuery<UserProfile>({
    queryKey: ['user', 'profile'],
    queryFn: () => userApi.getMe(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const favoriteGroupId = useMemo(() => {
    return data?.favorite_group_id ?? null;
  }, [data?.favorite_group_id]);

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
