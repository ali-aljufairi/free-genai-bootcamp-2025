"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Settings, Play } from "lucide-react"
import { JLPTLevelSelector } from "./shared/jlpt-level-selector"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useWordBuilderStore } from "@/stores/word-builder-store"

interface WordBuilderConfigProps {
  onStart: () => void
  isLoading: boolean
  isMobile: boolean
}

export function WordBuilderConfig({ onStart, isLoading, isMobile }: WordBuilderConfigProps) {
  const { preferences, setPreferences } = useWordBuilderStore()

  const handleTimeLimitChange = (value: string) => {
    const seconds = parseInt(value)
    setPreferences({ ...preferences, time_limit: seconds })
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  if (isMobile) {
    return (
      <div className="pb-20">
        <Card className="glass-card mb-4">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Game Settings</h3>
            </div>

            <div className="space-y-4">
              <JLPTLevelSelector
                level={preferences.jlpt_level}
                onLevelChange={(level) => setPreferences({ ...preferences, jlpt_level: level })}
                isMobile={true}
              />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Time Limit</Label>
                <Select 
                  value={preferences.time_limit.toString()} 
                  onValueChange={handleTimeLimitChange}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="180">3 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                    <SelectItem value="600">10 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Game Help Options */}
              <div className="space-y-3 pt-2 border-t">
                <Label className="text-sm font-medium">Game Help Options</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-hints" className="text-sm">Show Kanji Hints</Label>
                    <p className="text-xs text-muted-foreground">Display meanings and readings</p>
                  </div>
                  <Switch
                    id="show-hints"
                    checked={preferences.show_hints}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, show_hints: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-validate" className="text-sm">Auto-Validate</Label>
                    <p className="text-xs text-muted-foreground">Check words automatically when slots are filled</p>
                  </div>
                  <Switch
                    id="auto-validate"
                    checked={preferences.auto_validate}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, auto_validate: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-clear" className="text-sm">Auto-Clear on Success</Label>
                    <p className="text-xs text-muted-foreground">Clear slots after forming a valid word</p>
                  </div>
                  <Switch
                    id="auto-clear"
                    checked={preferences.auto_clear_on_success}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, auto_clear_on_success: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t">
          <Button
            onClick={onStart}
            className="w-full h-14 text-lg font-medium"
            disabled={isLoading}
          >
            <Play className="w-5 h-5 mr-2" />
            {isLoading ? "Starting..." : "Start Game"}
          </Button>
        </div>
      </div>
    )
  }

  // Desktop layout
  return (
    <div className="h-full min-h-screen flex flex-col">
      <Card className="glass-card flex-1 m-4">
        <CardContent className="p-8 space-y-8 h-full flex flex-col">
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-border/50">
              <Settings className="w-6 h-6" />
              <h3 className="text-lg font-medium">Word Builder Settings</h3>
              <p className="text-sm text-muted-foreground">Choose your JLPT level and time limit.</p>
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

            {/* Game Help Options */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <Label className="text-sm font-medium">Game Help Options</Label>
              
              <div className="grid grid-cols-1 gap-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="show-hints-desktop" className="text-sm">Show Kanji Hints</Label>
                    <p className="text-xs text-muted-foreground">Display kanji meanings and readings as hints</p>
                  </div>
                  <Switch
                    id="show-hints-desktop"
                    checked={preferences.show_hints}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, show_hints: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-validate-desktop" className="text-sm">Auto-Validate</Label>
                    <p className="text-xs text-muted-foreground">Automatically check words when all slots are filled</p>
                  </div>
                  <Switch
                    id="auto-validate-desktop"
                    checked={preferences.auto_validate}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, auto_validate: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-clear-desktop" className="text-sm">Auto-Clear on Success</Label>
                    <p className="text-xs text-muted-foreground">Automatically clear slots after forming a valid word</p>
                  </div>
                  <Switch
                    id="auto-clear-desktop"
                    checked={preferences.auto_clear_on_success}
                    onCheckedChange={(checked) => 
                      setPreferences({ ...preferences, auto_clear_on_success: checked })
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50">
            <Button
              onClick={onStart}
              className="w-full h-12 text-lg font-medium"
              disabled={isLoading}
            >
              <Play className="w-5 h-5 mr-2" />
              {isLoading ? "Starting..." : "Start Word Builder Game"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

