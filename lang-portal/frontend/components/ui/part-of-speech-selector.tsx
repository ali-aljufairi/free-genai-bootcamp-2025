import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { PartOfSpeech, getPartOfSpeechLabel, isValidPartOfSpeech } from '@/types/pos-enum'

interface PartOfSpeechSelectorProps {
  selectedParts: PartOfSpeech[]
  onSelectionChange: (parts: PartOfSpeech[]) => void
  availableParts: string[]
  disabled?: boolean
}

export function PartOfSpeechSelector({
  selectedParts,
  onSelectionChange,
  availableParts,
  disabled = false
}: PartOfSpeechSelectorProps) {
  const [open, setOpen] = useState(false)

  // Filter available parts to only include valid enum values
  const validParts = availableParts.filter(isValidPartOfSpeech) as PartOfSpeech[]

  const handleSelectAll = () => {
    onSelectionChange(validParts)
  }

  const handleClearAll = () => {
    onSelectionChange([])
  }

  const handleTogglePart = (part: PartOfSpeech) => {
    if (selectedParts.includes(part)) {
      // Remove this part
      onSelectionChange(selectedParts.filter(p => p !== part))
    } else {
      // Add this part
      const newSelection = [...selectedParts, part]
      onSelectionChange(newSelection)
    }
  }

  const handleAllToggle = () => {
    if (selectedParts.length === 0) {
      // If "All" is currently selected (no filters), do nothing or select all individual items
      // For this use case, we'll keep it as "All" (empty array)
      return
    } else {
      // Clear all selections to show "All"
      onSelectionChange([])
    }
  }

  const getDisplayText = () => {
    if (selectedParts.length === 0) {
      return 'All parts of speech'
    } else if (selectedParts.length === 1) {
      return getPartOfSpeechLabel(selectedParts[0])
    } else if (selectedParts.length === validParts.length) {
      return 'All parts of speech'
    } else {
      return `${selectedParts.length} parts selected`
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">{getDisplayText()}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-96 max-h-[400px] overflow-y-auto">
        <DropdownMenuLabel>Filter by Part of Speech</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Control buttons */}
        <div className="flex gap-1 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8"
            onClick={handleSelectAll}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8"
            onClick={handleClearAll}
          >
            Clear All
          </Button>
        </div>

        <DropdownMenuSeparator />

        {/* "All" option - when no parts are selected, all are included */}
        <DropdownMenuCheckboxItem
          checked={selectedParts.length === 0}
          onCheckedChange={handleAllToggle}
        >
          All parts of speech
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Part of speech options in 2-column grid */}
        <div className="grid grid-cols-2 gap-1 p-1">
          {validParts.map((part) => (
            <DropdownMenuCheckboxItem
              key={part}
              checked={selectedParts.includes(part)}
              onCheckedChange={() => handleTogglePart(part)}
              className="text-sm"
            >
              {getPartOfSpeechLabel(part)}
            </DropdownMenuCheckboxItem>
          ))}
        </div>

        {validParts.length === 0 && (
          <div className="px-2 py-4 text-sm text-muted-foreground text-center">
            No parts of speech available
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
