"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ShowOptions {
  showKana: boolean
  showKanji: boolean
  showRomaji: boolean
  showEnglish: boolean
}

interface AskOptions {
  askForKana: boolean
  askForKanji: boolean
  askForRomaji: boolean
  askForEnglish: boolean
}

interface DisplayOptionsProps {
  showOptions: ShowOptions
  askOptions: AskOptions
  onShowOptionsChange: (options: Partial<ShowOptions>) => void
  onAskOptionsChange: (options: Partial<AskOptions>) => void
  isMobile?: boolean
}

export function DisplayOptions({
  showOptions,
  askOptions,
  onShowOptionsChange,
  onAskOptionsChange,
  isMobile = false
}: DisplayOptionsProps) {
  const showCount = Object.values(showOptions).filter(Boolean).length
  const askCount = Object.values(askOptions).filter(Boolean).length

  if (isMobile) {
    return (
      <>
        {/* What to Ask */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <HelpCircle className="w-5 h-5 text-red-500" />
            <div className="flex-1 flex items-center gap-1">
              <h3 className="font-semibold">What to Ask</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose what the quiz will ask you to recall (select at least one)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-xs font-medium text-primary">
              {askCount} selected
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            The card will never show the exact same field you are being asked to answer (for better recall).
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for English</Label>
              <Switch
                checked={askOptions.askForEnglish}
                onCheckedChange={(value) => onAskOptionsChange({ askForEnglish: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for Kana</Label>
              <Switch
                checked={askOptions.askForKana}
                onCheckedChange={(value) => onAskOptionsChange({ askForKana: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for Kanji</Label>
              <Switch
                checked={askOptions.askForKanji}
                onCheckedChange={(value) => onAskOptionsChange({ askForKanji: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for Romaji</Label>
              <Switch
                checked={askOptions.askForRomaji}
                onCheckedChange={(value) => onAskOptionsChange({ askForRomaji: value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                onAskOptionsChange({
                  askForKana: true,
                  askForKanji: true,
                  askForRomaji: true,
                  askForEnglish: true
                })
              }}
            >
              All
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                onAskOptionsChange({
                  askForKana: false,
                  askForKanji: false,
                  askForRomaji: false,
                  askForEnglish: false
                })
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* What to Show */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Eye className="w-5 h-5 text-blue-500" />
            <div className="flex-1 flex items-center gap-1">
              <h3 className="font-semibold">What to Show</h3>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Choose what information to display on each flashcard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-xs font-medium text-primary">
              {showCount} selected
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show Kana</Label>
              <Switch
                checked={showOptions.showKana}
                onCheckedChange={(value) => onShowOptionsChange({ showKana: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show Kanji</Label>
              <Switch
                checked={showOptions.showKanji}
                onCheckedChange={(value) => onShowOptionsChange({ showKanji: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show Romaji</Label>
              <Switch
                checked={showOptions.showRomaji}
                onCheckedChange={(value) => onShowOptionsChange({ showRomaji: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show English</Label>
              <Switch
                checked={showOptions.showEnglish}
                onCheckedChange={(value) => onShowOptionsChange({ showEnglish: value })}
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  // Desktop layout
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Card Display Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2">
          <Eye className="w-6 h-6 text-blue-500" />
          <div className="flex items-center gap-1">
            <h3 className="text-lg font-medium">Card Display Options</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Choose what information to display on each flashcard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Show Kana (ひらがな/カタカナ)</Label>
            <Switch
              checked={showOptions.showKana}
              onCheckedChange={(value) => onShowOptionsChange({ showKana: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Kanji (漢字)</Label>
            <Switch
              checked={showOptions.showKanji}
              onCheckedChange={(value) => onShowOptionsChange({ showKanji: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Romaji</Label>
            <Switch
              checked={showOptions.showRomaji}
              onCheckedChange={(value) => onShowOptionsChange({ showRomaji: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show English</Label>
            <Switch
              checked={showOptions.showEnglish}
              onCheckedChange={(value) => onShowOptionsChange({ showEnglish: value })}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{showCount} selected</p>
      </div>

      {/* Quiz Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2">
          <HelpCircle className="w-6 h-6 text-red-500" />
          <div className="flex items-center gap-1">
            <h3 className="text-lg font-medium">Quiz Settings</h3>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Choose what the quiz will ask you to recall (select at least one)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Ask for Kana</Label>
            <Switch
              checked={askOptions.askForKana}
              onCheckedChange={(value) => onAskOptionsChange({ askForKana: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ask for Kanji</Label>
            <Switch
              checked={askOptions.askForKanji}
              onCheckedChange={(value) => onAskOptionsChange({ askForKanji: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ask for Romaji</Label>
            <Switch
              checked={askOptions.askForRomaji}
              onCheckedChange={(value) => onAskOptionsChange({ askForRomaji: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ask for English</Label>
            <Switch
              checked={askOptions.askForEnglish}
              onCheckedChange={(value) => onAskOptionsChange({ askForEnglish: value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAskOptionsChange({
                askForKana: true,
                askForKanji: true,
                askForRomaji: true,
                askForEnglish: true
              })
            }}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAskOptionsChange({
                askForKana: false,
                askForKanji: false,
                askForRomaji: false,
                askForEnglish: false
              })
            }}
          >
            Clear
          </Button>
          <p className="text-xs text-muted-foreground self-center ml-2">
            {askCount} selected
          </p>
        </div>
      </div>
    </div>
  )
}
