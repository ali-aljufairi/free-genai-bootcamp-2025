"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface SessionRestartDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  checkboxId: string
  dontShowAgain: boolean
  onDontShowAgainChange: (value: boolean) => void
  onKeepCurrent: () => void
  onStartNew: () => void
  keepCurrentLabel: string
  startNewLabel: string
}

export function SessionRestartDialog({
  open,
  onOpenChange,
  title,
  description,
  checkboxId,
  dontShowAgain,
  onDontShowAgainChange,
  onKeepCurrent,
  onStartNew,
  keepCurrentLabel,
  startNewLabel,
}: SessionRestartDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={checkboxId}
            checked={dontShowAgain}
            onCheckedChange={(checked) => onDontShowAgainChange(checked === true)}
          />
          <Label htmlFor={checkboxId}>Don't show again</Label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onKeepCurrent}>{keepCurrentLabel}</AlertDialogCancel>
          <AlertDialogAction onClick={onStartNew}>{startNewLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
