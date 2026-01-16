"use client";

import { useState, useMemo, useEffect } from "react";
import { useGrammarList } from "@/hooks/api/useGrammar";
import { useUserProfile } from "@/hooks/api/useGroup";
import { GrammarCard } from "@/components/grammar/GrammarCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search, X, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;
type JLPTLevel = typeof JLPT_LEVELS[number];

// Convert numeric JLPT level (1-5) to level strings (N1-N5)
// Level 5 = N5, Level 4 = N4, etc.
// Returns user's level and all levels below (e.g., level 4 returns ["N4", "N5"])
function getLevelsForUserLevel(userLevel: number): JLPTLevel[] {
  // userLevel: 5 = N5, 4 = N4, 3 = N3, 2 = N2, 1 = N1
  // Validate userLevel
  if (userLevel < 1 || userLevel > 5) {
    return ["N5"]; // Default to N5 if invalid
  }

  // JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"]
  // For userLevel 5 (N5): want ["N5"] → slice from index 0, take 1
  // For userLevel 4 (N4): want ["N4", "N5"] → slice from index 0, take 2
  // For userLevel 3 (N3): want ["N3", "N4", "N5"] → slice from index 0, take 3
  // Pattern: start at index 0, take (6 - userLevel) items
  const numLevels = 6 - userLevel;
  return JLPT_LEVELS.slice(0, numLevels) as JLPTLevel[];
}

export default function GrammarPage() {
  const { data, isLoading, error } = useGrammarList();
  const { data: userProfile, isLoading: isLoadingProfile } = useUserProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [learningStatusFilter, setLearningStatusFilter] = useState<boolean | undefined>(undefined);

  // Initialize selected levels based on user's JLPT level
  const defaultLevels = useMemo(() => {
    const userLevel = userProfile?.settings?.current_jlpt_level;
    if (userLevel && typeof userLevel === "number") {
      return getLevelsForUserLevel(userLevel);
    }
    // Default to N5 if user level not available
    return ["N5"];
  }, [userProfile?.settings?.current_jlpt_level]);

  const [selectedLevels, setSelectedLevels] = useState<Set<JLPTLevel>>(
    () => new Set(defaultLevels as JLPTLevel[])
  );

  // Update selected levels when user profile loads
  useEffect(() => {
    if (defaultLevels.length > 0 && !isLoadingProfile) {
      setSelectedLevels(new Set(defaultLevels as JLPTLevel[]));
    }
  }, [defaultLevels, isLoadingProfile]);

  // Filter grammar points based on search, level, and learning status
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((grammarPoint) => {
      // Level filter
      if (!selectedLevels.has(grammarPoint.level as JLPTLevel)) {
        return false;
      }

      // Learning status filter
      if (learningStatusFilter !== undefined) {
        const isLearned = grammarPoint.is_learned ?? false;
        if (learningStatusFilter !== isLearned) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          grammarPoint.key.toLowerCase().includes(query) ||
          grammarPoint.base_form.toLowerCase().includes(query) ||
          (grammarPoint.structure &&
            grammarPoint.structure.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [data, searchQuery, selectedLevels, learningStatusFilter]);

  // Calculate progress
  const progress = useMemo(() => {
    if (!data) return { learned: 0, total: 0, percentage: 0 };
    const learned = data.filter((gp) => gp.is_learned).length;
    const total = data.length;
    return {
      learned,
      total,
      percentage: total > 0 ? Math.round((learned / total) * 100) : 0,
    };
  }, [data]);

  const toggleLevel = (level: JLPTLevel) => {
    setSelectedLevels((prev) => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      // Ensure at least one level is selected
      if (next.size === 0) {
        return new Set([level]);
      }
      return next;
    });
  };

  const selectAllLevels = () => {
    setSelectedLevels(new Set(JLPT_LEVELS));
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Grammar Points</h1>
        <p className="text-muted-foreground">
          Browse grammar points. Showing your JLPT level and below by default. Select additional levels to explore more.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by grammar point, base form, or structure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={clearSearch}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Level Filters */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Filter by Level</label>
            <Button
              variant="ghost"
              size="sm"
              onClick={selectAllLevels}
              className="h-7 text-xs"
            >
              Select All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {JLPT_LEVELS.map((level) => {
              const isSelected = selectedLevels.has(level);
              const levelColors: Record<JLPTLevel, string> = {
                N5: "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-500/20",
                N4: "bg-green-500/10 text-green-600 border-green-500/20 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20",
                N3: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20 dark:bg-yellow-500/20 dark:text-yellow-400 hover:bg-yellow-500/20",
                N2: "bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-orange-500/20 dark:text-orange-400 hover:bg-orange-500/20",
                N1: "bg-red-500/10 text-red-600 border-red-500/20 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20",
              };
              return (
                <Button
                  key={level}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleLevel(level)}
                  className={cn(
                    "transition-all",
                    isSelected && levelColors[level]
                  )}
                >
                  {level}
                  {isSelected && (
                    <CheckCircle2 className="ml-1.5 h-3.5 w-3.5" />
                  )}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Learning Status Filter */}
        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Filter by Learning Status</label>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLearningStatusFilter(undefined)}
              className={cn(
                "h-7 text-xs",
                learningStatusFilter === undefined && "bg-accent text-accent-foreground border-2 border-primary/50"
              )}
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLearningStatusFilter(false)}
              className={cn(
                "h-7 text-xs",
                learningStatusFilter === false && "bg-accent text-accent-foreground border-2 border-primary/50"
              )}
            >
              Not Learned
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLearningStatusFilter(true)}
              className={cn(
                "h-7 text-xs",
                learningStatusFilter === true && "bg-accent text-accent-foreground border-2 border-primary/50"
              )}
            >
              Learned
            </Button>
          </div>
        </div>

        {/* Progress Summary */}
        {!isLoading && data && data.length > 0 && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-normal">
                Total: {data.length}
              </Badge>
              <Badge variant="outline" className="font-normal">
                Showing: {filteredData.length}
              </Badge>
              {progress.total > 0 && (
                <Badge
                  variant="outline"
                  className="font-normal bg-green-500/10 text-green-700 border-green-500/20 dark:bg-green-500/20 dark:text-green-400"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Learned: {progress.learned}/{progress.total} ({progress.percentage}%)
                </Badge>
              )}
            </div>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load grammar points. Please try again later.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && data && (
        <>
          {filteredData.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {searchQuery || selectedLevels.size < JLPT_LEVELS.length || learningStatusFilter !== undefined
                  ? "No grammar points match your filters. Try adjusting your search, level, or learning status filters."
                  : "No grammar points found for your current JLPT level."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Showing {filteredData.length} of {data.length} grammar point
                {data.length !== 1 ? "s" : ""}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredData.map((grammarPoint) => (
                  <GrammarCard
                    key={grammarPoint.id}
                    grammarPoint={grammarPoint}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}


