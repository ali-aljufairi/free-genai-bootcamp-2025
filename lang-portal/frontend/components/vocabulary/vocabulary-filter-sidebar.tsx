"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentType } from "@/hooks/api/useVocabularyBrowser";

interface VocabularyFilterSidebarProps {
    contentType: ContentType;
    hasKanji: boolean | undefined;
    partOfSpeech: string[];
    jlpt: number | undefined;
    correctCountMin: number | undefined;
    onyomi: boolean | undefined;
    kunyomi: boolean | undefined;
    sortBy: 'frequency' | 'default';
    group: number | undefined;
    groups?: Array<{ id: number; name: string }>;
    onContentTypeChange: (type: ContentType) => void;
    onHasKanjiChange: (hasKanji: boolean | undefined) => void;
    onTogglePartOfSpeech: (pos: string) => void;
    onSetPartOfSpeech: (pos: string[]) => void;
    onJlptChange: (jlpt: number | undefined) => void;
    onCorrectCountMinChange: (count: number | undefined) => void;
    onOnyomiChange: (onyomi: boolean | undefined) => void;
    onKunyomiChange: (kunyomi: boolean | undefined) => void;
    onSortByChange: (sort: 'frequency' | 'default') => void;
    onGroupChange: (group: number | undefined) => void;
}

const FilterContent = ({
    contentType,
    hasKanji,
    partOfSpeech,
    jlpt,
    correctCountMin,
    onyomi,
    kunyomi,
    sortBy,
    group,
    groups = [],
    onContentTypeChange,
    onHasKanjiChange,
    onTogglePartOfSpeech,
    onSetPartOfSpeech,
    onJlptChange,
    onCorrectCountMinChange,
    onOnyomiChange,
    onKunyomiChange,
    onSortByChange,
    onGroupChange,
}: VocabularyFilterSidebarProps) => {
    const jlptLevels = [1, 2, 3, 4, 5];

    const partsOfSpeech = [
        { value: 'noun', label: 'Noun' },
        { value: 'verb', label: 'Verb' },
        { value: 'adjective', label: 'Adj' },
        { value: 'adverb', label: 'Adv' },
        { value: 'particle', label: 'Particle' },
        { value: 'prefix', label: 'Prefix' },
        { value: 'suffix', label: 'Suffix' },
        { value: 'expression', label: 'Expr' },
    ];

    return (
        <div className="space-y-4">
            {/* Content Type - Buttons */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Content</h3>
                <div className="grid grid-cols-3 gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContentTypeChange('words')}
                        className={cn(
                            "h-7 text-xs",
                            contentType === 'words' && "bg-accent text-accent-foreground border-2 border-primary/50"
                        )}
                    >
                        Words
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContentTypeChange('kanji')}
                        className={cn(
                            "h-7 text-xs",
                            contentType === 'kanji' && "bg-accent text-accent-foreground border-2 border-primary/50"
                        )}
                    >
                        Kanji
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onContentTypeChange('both')}
                        className={cn(
                            "h-7 text-xs",
                            contentType === 'both' && "bg-accent text-accent-foreground border-2 border-primary/50"
                        )}
                    >
                        Both
                    </Button>
                </div>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort By</h3>
                <Select value={sortBy} onValueChange={(v) => onSortByChange(v as 'frequency' | 'default')}>
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="default">Default</SelectItem>
                        <SelectItem value="frequency">Frequency</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Group Filter */}
            {groups.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Group</h3>
                    <Select
                        value={group?.toString() || "all"}
                        onValueChange={(v) => onGroupChange(v === "all" ? undefined : parseInt(v, 10))}
                    >
                        <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Groups</SelectItem>
                            {groups.map((g) => (
                                <SelectItem key={g.id} value={g.id.toString()}>
                                    {g.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* JLPT Level - Buttons */}
            <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">JLPT</h3>
                <div className="grid grid-cols-6 gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onJlptChange(undefined)}
                        className={cn(
                            "h-7 text-xs",
                            jlpt === undefined && "bg-accent text-accent-foreground border-2 border-primary/50"
                        )}
                    >
                        All
                    </Button>
                    {jlptLevels.map((level) => (
                        <Button
                            key={level}
                            variant="outline"
                            size="sm"
                            onClick={() => onJlptChange(level)}
                            className={cn(
                                "h-7 text-xs",
                                jlpt === level && "bg-accent text-accent-foreground border-2 border-primary/50"
                            )}
                        >
                            N{level}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Word-Specific Filters */}
            {contentType !== 'kanji' && (
                <>
                    {/* Has Kanji Checkbox */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Options</h3>
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors">
                            <Checkbox
                                checked={hasKanji === true}
                                onCheckedChange={(v) => onHasKanjiChange(v ? true : undefined)}
                                className="h-4 w-4"
                            />
                            <span className="text-xs">Has Kanji</span>
                        </label>
                    </div>

                    {/* Part of Speech - Multiple Selection Buttons */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Part of Speech</h3>
                        <div className="grid grid-cols-4 gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSetPartOfSpeech([])}
                                className={cn(
                                    "h-7 text-xs col-span-4",
                                    partOfSpeech.length === 0 && "bg-accent text-accent-foreground border-2 border-primary/50"
                                )}
                            >
                                All Types
                            </Button>
                            {partsOfSpeech.map((pos) => {
                                const isSelected = partOfSpeech.includes(pos.value);
                                return (
                                    <Button
                                        key={pos.value}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => onTogglePartOfSpeech(pos.value)}
                                        className={cn(
                                            "h-7 text-xs",
                                            isSelected && "bg-accent text-accent-foreground border-2 border-primary/50"
                                        )}
                                    >
                                        {pos.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Study Progress */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Study Progress</h3>
                        <div className="grid grid-cols-3 gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onCorrectCountMinChange(undefined)}
                                className={cn(
                                    "h-7 text-xs",
                                    correctCountMin === undefined && "bg-accent text-accent-foreground border-2 border-primary/50"
                                )}
                            >
                                All
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onCorrectCountMinChange(0)}
                                className={cn(
                                    "h-7 text-xs",
                                    correctCountMin === 0 && "bg-accent text-accent-foreground border-2 border-primary/50"
                                )}
                            >
                                Not Studied
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onCorrectCountMinChange(1)}
                                className={cn(
                                    "h-7 text-xs",
                                    correctCountMin !== undefined && correctCountMin >= 1 && "bg-accent text-accent-foreground border-2 border-primary/50"
                                )}
                            >
                                Studied
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {/* Kanji-Specific Filters */}
            {contentType !== 'words' && (
                <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reading Type</h3>
                    <div className="space-y-1.5">
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors">
                            <Checkbox
                                checked={onyomi === true}
                                onCheckedChange={(v) => onOnyomiChange(v ? true : undefined)}
                                className="h-4 w-4"
                            />
                            <span className="text-xs">Onyomi</span>
                        </label>
                        <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors">
                            <Checkbox
                                checked={kunyomi === true}
                                onCheckedChange={(v) => onKunyomiChange(v ? true : undefined)}
                                className="h-4 w-4"
                            />
                            <span className="text-xs">Kunyomi</span>
                        </label>
                    </div>
                </div>
            )}
        </div>
    );
};

export function VocabularyFilterSidebar({
    contentType,
    hasKanji,
    partOfSpeech,
    jlpt,
    correctCountMin,
    onyomi,
    kunyomi,
    sortBy,
    group,
    groups,
    onContentTypeChange,
    onHasKanjiChange,
    onTogglePartOfSpeech,
    onSetPartOfSpeech,
    onJlptChange,
    onCorrectCountMinChange,
    onOnyomiChange,
    onKunyomiChange,
    onSortByChange,
    onGroupChange,
}: VocabularyFilterSidebarProps) {
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [isDesktopOpen, setIsDesktopOpen] = useState(false);

    return (
        <>
            {/* Mobile: Use Sheet */}
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className="md:hidden">
                        <Filter className="h-4 w-4 mr-2" />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80">
                    <SheetHeader>
                        <SheetTitle>Filters</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6">
                        <FilterContent
                            contentType={contentType}
                            hasKanji={hasKanji}
                            partOfSpeech={partOfSpeech}
                            jlpt={jlpt}
                            correctCountMin={correctCountMin}
                            onyomi={onyomi}
                            kunyomi={kunyomi}
                            sortBy={sortBy}
                            group={group}
                            groups={groups}
                            onContentTypeChange={onContentTypeChange}
                            onHasKanjiChange={onHasKanjiChange}
                            onTogglePartOfSpeech={onTogglePartOfSpeech}
                            onSetPartOfSpeech={onSetPartOfSpeech}
                            onJlptChange={onJlptChange}
                            onCorrectCountMinChange={onCorrectCountMinChange}
                            onOnyomiChange={onOnyomiChange}
                            onKunyomiChange={onKunyomiChange}
                            onSortByChange={onSortByChange}
                            onGroupChange={onGroupChange}
                        />
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop: Popover dropdown */}
            <Popover open={isDesktopOpen} onOpenChange={setIsDesktopOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="hidden md:flex"
                    >
                        <Filter className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                        Filters
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 max-h-[80vh] overflow-y-auto" align="start">
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold mb-2">Filters</h2>
                        <FilterContent
                            contentType={contentType}
                            hasKanji={hasKanji}
                            partOfSpeech={partOfSpeech}
                            jlpt={jlpt}
                            correctCountMin={correctCountMin}
                            onyomi={onyomi}
                            kunyomi={kunyomi}
                            sortBy={sortBy}
                            group={group}
                            groups={groups}
                            onContentTypeChange={onContentTypeChange}
                            onHasKanjiChange={onHasKanjiChange}
                            onTogglePartOfSpeech={onTogglePartOfSpeech}
                            onSetPartOfSpeech={onSetPartOfSpeech}
                            onJlptChange={onJlptChange}
                            onCorrectCountMinChange={onCorrectCountMinChange}
                            onOnyomiChange={onOnyomiChange}
                            onKunyomiChange={onKunyomiChange}
                            onSortByChange={onSortByChange}
                            onGroupChange={onGroupChange}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        </>
    );
}
