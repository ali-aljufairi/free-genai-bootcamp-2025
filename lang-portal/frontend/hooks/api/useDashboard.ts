"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { dashboardApi } from "@/services/api";
import { QuickStats, StudyProgress, StudySession } from "@/types/api";

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

export default {
  useQuickStats,
  useStudyProgress,
  useLastStudySession,
  useActivityDates,
  useRecentActivities,
};