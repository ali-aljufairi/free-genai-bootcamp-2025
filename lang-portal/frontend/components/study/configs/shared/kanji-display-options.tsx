"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface KanjiShowOptions {
  showCharacter: boolean
  showOnyomi: boolean
  showKunyomi: boolean
  showKanjiEnglish: boolean
}

interface KanjiAskOptions {
  askForCharacter: boolean
  askForOnyomi: boolean
  askForKunyomi: boolean
  askForKanjiEnglish: boolean
}

interface KanjiDisplayOptionsProps {
  showOptions: KanjiShowOptions
  askOptions: KanjiAskOptions
  onShowOptionsChange: (options: Partial<KanjiShowOptions>) => void
  onAskOptionsChange: (options: Partial<KanjiAskOptions>) => void
  isMobile?: boolean
}

export function KanjiDisplayOptions({
  showOptions,
  askOptions,
  onShowOptionsChange,
  onAskOptionsChange,
  isMobile = false
}: KanjiDisplayOptionsProps) {
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

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for English</Label>
              <Switch
                checked={askOptions.askForKanjiEnglish}
                onCheckedChange={(value) => onAskOptionsChange({ askForKanjiEnglish: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for Character</Label>
              <Switch
                checked={askOptions.askForCharacter}
                onCheckedChange={(value) => onAskOptionsChange({ askForCharacter: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for On-yomi</Label>
              <Switch
                checked={askOptions.askForOnyomi}
                onCheckedChange={(value) => onAskOptionsChange({ askForOnyomi: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Ask for Kun-yomi</Label>
              <Switch
                checked={askOptions.askForKunyomi}
                onCheckedChange={(value) => onAskOptionsChange({ askForKunyomi: value })}
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
                  askForCharacter: true,
                  askForOnyomi: true,
                  askForKunyomi: true,
                  askForKanjiEnglish: true
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
                  askForCharacter: false,
                  askForOnyomi: false,
                  askForKunyomi: false,
                  askForKanjiEnglish: false
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
              <Label className="text-sm">Show Character</Label>
              <Switch
                checked={showOptions.showCharacter}
                onCheckedChange={(value) => onShowOptionsChange({ showCharacter: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show On-yomi</Label>
              <Switch
                checked={showOptions.showOnyomi}
                onCheckedChange={(value) => onShowOptionsChange({ showOnyomi: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show Kun-yomi</Label>
              <Switch
                checked={showOptions.showKunyomi}
                onCheckedChange={(value) => onShowOptionsChange({ showKunyomi: value })}
              />
            </div>
            <div className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-accent/50 transition-colors">
              <Label className="text-sm">Show English</Label>
              <Switch
                checked={showOptions.showKanjiEnglish}
                onCheckedChange={(value) => onShowOptionsChange({ showKanjiEnglish: value })}
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
            <Label>Show Character (漢字)</Label>
            <Switch
              checked={showOptions.showCharacter}
              onCheckedChange={(value) => onShowOptionsChange({ showCharacter: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show On-yomi (音読み)</Label>
            <Switch
              checked={showOptions.showOnyomi}
              onCheckedChange={(value) => onShowOptionsChange({ showOnyomi: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show Kun-yomi (訓読み)</Label>
            <Switch
              checked={showOptions.showKunyomi}
              onCheckedChange={(value) => onShowOptionsChange({ showKunyomi: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Show English</Label>
            <Switch
              checked={showOptions.showKanjiEnglish}
              onCheckedChange={(value) => onShowOptionsChange({ showKanjiEnglish: value })}
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
            <Label>Ask for Character</Label>
            <Switch
              checked={askOptions.askForCharacter}
              onCheckedChange={(value) => onAskOptionsChange({ askForCharacter: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ask for On-yomi</Label>
            <Switch
              checked={askOptions.askForOnyomi}
              onCheckedChange={(value) => onAskOptionsChange({ askForOnyomi: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ask for Kun-yomi</Label>
            <Switch
              checked={askOptions.askForKunyomi}
              onCheckedChange={(value) => onAskOptionsChange({ askForKunyomi: value })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Ask for English</Label>
            <Switch
              checked={askOptions.askForKanjiEnglish}
              onCheckedChange={(value) => onAskOptionsChange({ askForKanjiEnglish: value })}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAskOptionsChange({
                askForCharacter: true,
                askForOnyomi: true,
                askForKunyomi: true,
                askForKanjiEnglish: true
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
                askForCharacter: false,
                askForOnyomi: false,
                askForKunyomi: false,
                askForKanjiEnglish: false
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

