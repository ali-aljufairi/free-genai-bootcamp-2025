"use client"

import { useWordBuilderStore } from "@/stores/word-builder-store"
import { Settings } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { JLPTLevelSelector } from "@/components/study/configs/shared/jlpt-level-selector"

export function WordBuilderSettings() {
  const {
    preferences,
    setPreferences,
  } = useWordBuilderStore()

  const handleTimeLimitChange = (value: string) => {
    const seconds = parseInt(value)
    setPreferences({ ...preferences, time_limit: seconds })
  }

  return (
    <div className="space-y-6">
      {/* Study Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Study Settings</h3>
            <p className="text-sm text-muted-foreground">Configure your word builder game preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <JLPTLevelSelector
            level={preferences.jlpt_level}
            onLevelChange={(level) => setPreferences({ ...preferences, jlpt_level: level })}
            isMobile={false}
          />
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">Time Limit</Label>
            <Select 
              value={preferences.time_limit.toString()} 
              onValueChange={handleTimeLimitChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="180">3 minutes</SelectItem>
                <SelectItem value="300">5 minutes</SelectItem>
                <SelectItem value="600">10 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Game Help Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-2 border-b border-border/50">
          <Settings className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-medium">Game Help Options</h3>
            <p className="text-sm text-muted-foreground">Configure game assistance features</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Show Kanji Hints</Label>
              <p className="text-sm text-muted-foreground">
                Display kanji meanings and readings as hints
              </p>
            </div>
            <Switch
              checked={preferences.show_hints}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, show_hints: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto-Validate</Label>
              <p className="text-sm text-muted-foreground">
                Automatically check words when all slots are filled
              </p>
            </div>
            <Switch
              checked={preferences.auto_validate}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, auto_validate: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Auto-Clear on Success</Label>
              <p className="text-sm text-muted-foreground">
                Automatically clear slots after forming a valid word
              </p>
            </div>
            <Switch
              checked={preferences.auto_clear_on_success}
              onCheckedChange={(checked) => 
                setPreferences({ ...preferences, auto_clear_on_success: checked })
              }
            />
          </div>
        </div>
      </div>
    </div>
  )
}

