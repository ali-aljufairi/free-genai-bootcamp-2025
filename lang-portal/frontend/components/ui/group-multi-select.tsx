"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";

interface Group {
    id: number;
    name: string;
    description?: string;
}

interface GroupMultiSelectProps {
    groups: Group[];
    selectedGroups: number[];
    onSelectionChange: (selectedIds: number[]) => void;
    placeholder?: string;
    triggerClassName?: string;
    variant?: "default" | "outline" | "ghost";
    size?: "default" | "sm" | "lg" | "icon";
    disabled?: boolean;
}

export function GroupMultiSelect({
    groups,
    selectedGroups,
    onSelectionChange,
    placeholder = "Select groups...",
    triggerClassName,
    variant = "outline",
    size = "default",
    disabled = false,
}: GroupMultiSelectProps) {
    const [open, setOpen] = React.useState(false);

    const selectedGroupsData = React.useMemo(() => {
        return groups.filter((g) => selectedGroups.includes(g.id));
    }, [groups, selectedGroups]);

    const toggleGroup = (groupId: number) => {
        if (selectedGroups.includes(groupId)) {
            onSelectionChange(selectedGroups.filter((id) => id !== groupId));
        } else {
            onSelectionChange([...selectedGroups, groupId]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={variant}
                    size={size}
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between",
                        selectedGroups.length === 0 && "text-muted-foreground",
                        triggerClassName
                    )}
                    disabled={disabled}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {selectedGroups.length === 0 ? (
                            <span className="truncate">{placeholder}</span>
                        ) : (
                            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-hidden">
                                {selectedGroupsData.slice(0, 2).map((g) => (
                                    <Badge key={g.id} variant="secondary" className="text-xs shrink-0">
                                        {g.name}
                                    </Badge>
                                ))}
                                {selectedGroups.length > 2 && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                        +{selectedGroups.length - 2}
                                    </Badge>
                                )}
                            </div>
                        )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search groups..." className="h-9" />
                    <CommandList>
                        <CommandEmpty>No groups found.</CommandEmpty>
                        <CommandGroup>
                            {groups.map((group) => {
                                const isSelected = selectedGroups.includes(group.id);
                                return (
                                    <CommandItem
                                        key={group.id}
                                        value={group.name}
                                        onSelect={() => toggleGroup(group.id)}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                isSelected ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{group.name}</div>
                                            {group.description && (
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {group.description}
                                                </div>
                                            )}
                                        </div>
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
                {selectedGroups.length > 0 && (
                    <div className="border-t p-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-8 text-xs"
                            onClick={() => {
                                onSelectionChange([]);
                            }}
                        >
                            Clear selection
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
}

