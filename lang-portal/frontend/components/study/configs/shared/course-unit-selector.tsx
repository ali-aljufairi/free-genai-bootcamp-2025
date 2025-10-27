"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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
                <Label className="text-sm font-medium">Course (Optional)</Label>
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
                    <Label className="text-sm font-medium">Unit (Optional)</Label>
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
