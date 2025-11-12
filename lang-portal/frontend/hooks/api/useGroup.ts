"use client";

import { useFetch } from "./useFetch";
import { groupApi, userApi } from "@/services/api";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export function useGroups() {
  const { data, loading, error, refetch } = useFetch<any[]>(
    () => groupApi.getGroups(),
    [],
    { cacheKey: "groups", errorMessage: "Failed to load groups" }
  );

  return { data: data ?? [], isLoading: loading, error, refetch };
}

export function useCreateGroup() {
  const [isLoading, setIsLoading] = useState(false);
  const { refetch } = useGroups();

  const createGroup = async (payload: { name: string; description?: string }) => {
    try {
      setIsLoading(true);
      const res = await groupApi.createGroup(payload);
      toast.success("Group created", { description: payload.name });
      // Refetch groups to update the list
      await refetch();
      return res;
    } catch (e: any) {
      toast.error("Failed to create group", { description: e?.message || "Unknown error" });
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { createGroup, isLoading };
}

/**
 * Hook to get current user profile including favorite_group_id
 */
export function useUserProfile() {
  const { data, loading, error, refetch } = useFetch<{ id: number; favorite_group_id?: number | null; [key: string]: any }>(
    () => userApi.getMe(),
    [],
    { cacheKey: "userProfile", errorMessage: "Failed to load user profile" }
  );

  const favoriteGroupId = useMemo(() => {
    return data?.favorite_group_id ?? null;
  }, [data?.favorite_group_id]);

  return { 
    data, 
    isLoading: loading, 
    error, 
    refetch,
    favoriteGroupId
  };
}

/**
 * Hook to set favorite group
 */
export function useSetFavoriteGroup() {
  const [isLoading, setIsLoading] = useState(false);
  const { refetch: refetchProfile } = useUserProfile();
  const { refetch: refetchGroups } = useGroups();

  const setFavoriteGroup = async (groupId: number | null) => {
    try {
      setIsLoading(true);
      await userApi.setFavoriteGroup(groupId);
      toast.success("Favorite group updated");
      // Refetch user profile and groups to update UI
      await Promise.all([refetchProfile(), refetchGroups()]);
    } catch (e: any) {
      toast.error("Failed to set favorite group", { description: e?.message || "Unknown error" });
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  return { setFavoriteGroup, isLoading };
}

/**
 * Hook to fetch all groups
 */
// export function useGroups() {
//   return useFetch(groupApi.getGroups);
// }

/**
 * Hook to fetch a specific group
 */
// export function useGroup(id: string) {
//   return useFetch(() => groupApi.getGroup(id), [id]);
// }

/**
 * Hook to fetch words for a group
 */
// export function useGroupWords(id: string) {
//   return useFetch(() => groupApi.getGroupWords(id), [id]);
// }

/**
 * Hook to fetch study sessions for a group
 */
// export function useGroupStudySessions(id: string) {
//   return useFetch(() => groupApi.getGroupStudySessions(id), [id]);
// }

// export default {
//   useGroups,
//   useGroup,
//   useGroupWords,
//   useGroupStudySessions,
// };