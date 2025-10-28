"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Course, Unit } from "@/types/api"

interface CourseUnitSelectorProps {
    selectedCourse: number | null
    selectedUnit: number | null
    availableCourses: Course[]
    units: Unit[]
    onCourseChange: (courseId: number | null) => void
    onUnitChange: (unitId: number | null) => void
    isMobile?: boolean
}

export function CourseUnitSelector({
    selectedCourse,
    selectedUnit,
    availableCourses,
    units,
    onCourseChange,
    onUnitChange,
    isMobile = false
}: CourseUnitSelectorProps) {
    return (
        <>
            <div className="space-y-2">
                <div className="flex items-center gap-1">
                    <Label className="text-sm font-medium">Course (Optional)</Label>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Choose a specific course or use all courses for mixed practice</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
                <Select
                    value={selectedCourse?.toString() || "all"}
                    onValueChange={(value) => onCourseChange(value === "all" ? null : parseInt(value))}
                >
                    <SelectTrigger className={isMobile ? "h-12" : ""}>
                        <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Courses</SelectItem>
                        {availableCourses.map((course) => (
                            <SelectItem key={course.id} value={course.id.toString()}>
                                {course.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {selectedCourse && (
                <div className="space-y-2">
                    <div className="flex items-center gap-1">
                        <Label className="text-sm font-medium">Unit (Optional)</Label>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Choose a specific unit within the course or use all units</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <Select
                        value={selectedUnit?.toString() || "all"}
                        onValueChange={(value) => onUnitChange(value === "all" ? null : parseInt(value))}
                    >
                        <SelectTrigger className={isMobile ? "h-12" : ""}>
                            <SelectValue placeholder={selectedCourse ? "Select unit" : "Select course first"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Units</SelectItem>
                            {units.map((unit) => (
                                <SelectItem key={unit.id} value={unit.id.toString()}>
                                    {unit.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </>
    )
}
