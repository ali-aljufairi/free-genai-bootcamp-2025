"use client"

import { CheckCircle2, Clock, Star, Brain, MessageSquare, Edit, Mic, Search } from "lucide-react"
import { useState } from "react"
import { useStudyActivities } from "@/hooks/api/useStudyActivity"
import { StudyActivity } from "@/types/api"

// Map activity types to their respective icons
const activityIcons: Record<string, JSX.Element> = {
  "quiz": <CheckCircle2 className="h-5 w-5 text-green-500" />,
  "flashcards": <Clock className="h-5 w-5 text-blue-500" />,
  "chat": <MessageSquare className="h-5 w-5 text-purple-500" />,
  "drawing": <Edit className="h-5 w-5 text-orange-500" />,
  "speech": <Mic className="h-5 w-5 text-red-500" />,
  "agent": <Search className="h-5 w-5 text-teal-500" />,
  "achievement": <Star className="h-5 w-5 text-yellow-500" />,
}

// Map activity types to human-readable titles
const activityTitles: Record<string, string> = {
  "quiz": "Completed Quiz",
  "flashcards": "Studied Flashcards",
  "chat": "Practiced Conversation",
  "drawing": "Practiced Writing",
  "speech": "Speech Practice",
  "agent": "Learning Resources",
  "achievement": "Earned Achievement",
}

// Default activities to show when loading or if there's an error
const defaultActivities = [
  {
    id: 1,
    type: "quiz",
    title: "Completed Quiz",
    description: "Basic Greetings",
    time: "2 hours ago",
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  },
  {
    id: 2,
    type: "flashcards",
    title: "Studied Flashcards",
    description: "Food Vocabulary",
    time: "4 hours ago",
    icon: <Clock className="h-5 w-5 text-blue-500" />,
  },
  {
    id: 3,
    type: "achievement",
    title: "Earned Achievement",
    description: "5-Day Streak",
    time: "Yesterday",
    icon: <Star className="h-5 w-5 text-yellow-500" />,
  },
  {
    id: 4,
    type: "quiz",
    title: "Completed Quiz",
    description: "Numbers 1-100",
    time: "Yesterday",
    icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
  },
  {
    id: 5,
    type: "flashcards",
    title: "Studied Flashcards",
    description: "Common Verbs",
    time: "2 days ago",
    icon: <Clock className="h-5 w-5 text-blue-500" />,
  },
]

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

export function ActivityFeed() {
  // Use our hook to fetch study activities
  const { data, isLoading, error } = useStudyActivities(1, 10);

  // Transform fetched activities into the format expected by the component
  const activities = data?.items?.map((activity: StudyActivity) => {
    // Ensure we have a valid activity type, default to flashcards if missing
    const activityType = activity.type || "flashcards";
    return {
      id: activity.id,
      type: activityType,
      title: activityTitles[activityType] || "Study Session",
      description: activity.description || activity.name,
      time: formatRelativeTime(activity.created_at),
      icon: activityIcons[activityType] || activityIcons.flashcards,
    };
  }) || [];

  return (
    <div className="space-y-4 py-2">
      {isLoading ? (
        <div className="text-center py-4 text-sm text-muted-foreground">Loading activities...</div>
      ) : error || activities.length === 0 ? (
        <>
          {error && (
            <div className="text-center py-2 text-sm text-red-500">
              Failed to load activities. Using demo data.
            </div>
          )}
          {defaultActivities.map((activity) => (
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
          ))}
        </>
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

