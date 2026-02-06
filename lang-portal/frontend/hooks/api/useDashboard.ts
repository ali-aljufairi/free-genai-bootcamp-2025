"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { dailyMissionApi, dashboardApi } from "@/services/api";
import {
  CreateDailyMissionEventRequest,
  DailyMissionConfig,
  DailyMissionInsights,
  DailyMissionToday,
  QuickStats,
  StudyProgress,
  StudySession,
  UpdateDailyMissionConfigRequest
} from "@/types/api";

/**
 * Hook to fetch dashboard stats
 */
export function useQuickStats() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery<QuickStats>({
    queryKey: ['dashboard', 'quick-stats'],
    queryFn: () => dashboardApi.getQuickStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch study progress
 */
export function useStudyProgress() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery<StudyProgress>({
    queryKey: ['dashboard', 'study-progress'],
    queryFn: () => dashboardApi.getStudyProgress(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch last study session
 */
export function useLastStudySession() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery<StudySession>({
    queryKey: ['dashboard', 'last-study-session'],
    queryFn: () => dashboardApi.getLastStudySession(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch activity dates for streak calendar
 */
export function useActivityDates() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery<{ dates: string[] }>({
    queryKey: ['dashboard', 'activity-dates'],
    queryFn: () => dashboardApi.getActivityDates(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch recent activities
 */
export function useRecentActivities(limit: number = 10) {
  const { isLoaded, isSignedIn } = useAuth();
  
  return useQuery({
    queryKey: ['dashboard', 'recent-activities', limit],
    queryFn: () => dashboardApi.getRecentActivities(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch today's daily mission state
 */
export function useDailyMissionToday() {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<DailyMissionToday>({
    queryKey: ['daily-mission', 'today'],
    queryFn: () => dailyMissionApi.getToday(),
    staleTime: 60 * 1000, // 1 minute
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch daily mission configuration
 */
export function useDailyMissionConfig() {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<DailyMissionConfig>({
    queryKey: ['daily-mission', 'config'],
    queryFn: () => dailyMissionApi.getConfig(),
    staleTime: 60 * 1000,
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Hook to fetch daily mission insight analytics
 */
export function useDailyMissionInsights() {
  const { isLoaded, isSignedIn } = useAuth();

  return useQuery<DailyMissionInsights>({
    queryKey: ['daily-mission', 'insights'],
    queryFn: () => dailyMissionApi.getInsights(),
    staleTime: 2 * 60 * 1000,
    enabled: isLoaded && isSignedIn,
  });
}

/**
 * Mutation to update daily mission configuration
 */
export function useUpdateDailyMissionConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateDailyMissionConfigRequest) => dailyMissionApi.updateConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-mission'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

/**
 * Mutation to log daily mission events
 */
export function useLogDailyMissionEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDailyMissionEventRequest) => dailyMissionApi.createEvent(data),
    onSuccess: (_, variables) => {
      if (variables.event_type === 'task_completed' || variables.event_type === 'activity_logged' || variables.event_type === 'mission_completed') {
        queryClient.invalidateQueries({ queryKey: ['daily-mission', 'today'] });
        queryClient.invalidateQueries({ queryKey: ['daily-mission', 'insights'] });
      }
    },
  });
}

export default {
  useQuickStats,
  useStudyProgress,
  useLastStudySession,
  useActivityDates,
  useRecentActivities,
  useDailyMissionToday,
  useDailyMissionConfig,
  useDailyMissionInsights,
  useUpdateDailyMissionConfig,
  useLogDailyMissionEvent,
};
