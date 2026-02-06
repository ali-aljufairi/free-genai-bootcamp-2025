"use client"

import Link from "next/link"
import { CheckCircle2, Clock, Star, Brain, MessageSquare, Edit, Mic, Search, Puzzle } from "lucide-react"
import { useRecentActivities } from "@/hooks/api/useDashboard"
import { RecentActivity } from "@/types/api"
import { Button } from "@/components/ui/button"

// Map activity types to their respective icons
const activityIcons: Record<string, JSX.Element> = {
  "quiz": <CheckCircle2 className="h-5 w-5 text-green-500" />,
  "flashcards": <Clock className="h-5 w-5 text-blue-500" />,
  "chat": <MessageSquare className="h-5 w-5 text-purple-500" />,
  "drawing": <Edit className="h-5 w-5 text-orange-500" />,
  "speech": <Mic className="h-5 w-5 text-red-500" />,
  "agent": <Search className="h-5 w-5 text-teal-500" />,
  "achievement": <Star className="h-5 w-5 text-yellow-500" />,
  "word_builder": <Puzzle className="h-5 w-5 text-indigo-500" />,
}

// Map activity types to human-readable titles
const activityTitles: Record<string, string> = {
  "quiz": "Grammar Quiz",
  "flashcards": "Studied Flashcards",
  "chat": "Chat Practice",
  "drawing": "Practiced Writing",
  "speech": "Speech Practice",
  "agent": "Learning Resources",
  "achievement": "Earned Achievement",
  "word_builder": "Word Builder",
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  // Handle empty or null dates
  if (!dateString) return "Unknown date";
  
  // Try to parse the date string
  let date: Date;
  try {
    date = new Date(dateString);
    
    // Check if date is invalid
    if (isNaN(date.getTime())) {
      return "Invalid date";
    }
  } catch (e) {
    return "Invalid date format";
  }
  
  const now = new Date();
  const diffInMilliseconds = now.getTime() - date.getTime();
  const diffInSeconds = Math.floor(diffInMilliseconds / 1000);
  
  // If less than a minute, show seconds
  if (diffInSeconds < 60) {
    return diffInSeconds <= 5 ? 'Just now' : `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  // If less than an hour, show minutes
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  // If less than a day, show hours
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  // If less than a week, show days
  if (diffInDays < 7) {
    return diffInDays === 1 ? 'Yesterday' : `${diffInDays} days ago`;
  }
  
  // Otherwise show the actual date
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  return date.toLocaleDateString(undefined, options);
}

interface ActivityDisplayItem {
  id: number;
  type: string;
  title: string;
  description: string;
  time: string;
  icon: JSX.Element;
}

export function ActivityFeed() {
  const { data, isLoading, error, refetch, isRefetching } = useRecentActivities(10);

  // Transform API data to display format
  const activities: ActivityDisplayItem[] = data?.items?.map((activity: RecentActivity) => {
    const activityType = activity.type || "flashcards";
    return {
      id: activity.id,
      type: activityType,
      title: activityTitles[activityType] || "Study Session",
      description: activity.description || activity.name || "",
      time: formatRelativeTime(activity.created_at),
      icon: activityIcons[activityType] || activityIcons.flashcards,
    };
  }) || [];

  return (
    <div className="space-y-4 py-2">
      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">Loading activities...</div>
      ) : error ? (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-red-500">Couldn&apos;t load your recent activity.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? "Retrying..." : "Try again"}
          </Button>
        </div>
      ) : activities.length === 0 ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground">Start a study session to build your daily momentum.</p>
          <Button size="sm" variant="outline" asChild>
            <Link href="/study">Start studying</Link>
          </Button>
        </div>
      ) : (
        activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
          >
            <div className="mt-0.5">{activity.icon}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{activity.title}</p>
              <p className="text-sm text-muted-foreground">{activity.description}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
