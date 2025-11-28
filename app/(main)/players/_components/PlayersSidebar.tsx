"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { RotateCcw, Trophy, Calendar, Crown, Globe, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

export type LeaderboardType = 'all-time' | '2025' | 'women' | 'country'

interface PlayersSidebarProps {
  selectedLeaderboard: LeaderboardType
  onLeaderboardChange: (type: LeaderboardType) => void
  selectedCountry: string | null
  onCountryChange: (country: string | null) => void
  countries: string[]
  countryPlayerCounts: Record<string, number>
  onReset: () => void
}

export function PlayersSidebar({
  selectedLeaderboard,
  onLeaderboardChange,
  selectedCountry,
  onCountryChange,
  countries,
  countryPlayerCounts,
  onReset
}: PlayersSidebarProps) {
  const [isCountryExpanded, setIsCountryExpanded] = useState(false)

  const leaderboards = [
    {
      id: 'all-time' as LeaderboardType,
      icon: Trophy,
      label: 'All-Time Money List',
      description: '전체 기간 상금 순위'
    },
    {
      id: '2025' as LeaderboardType,
      icon: Calendar,
      label: '2025 Money List',
      description: '2025년 상금 순위'
    },
    {
      id: 'women' as LeaderboardType,
      icon: Crown,
      label: "Women's Elite Board",
      description: '여성 플레이어 순위'
    }
  ]

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-lg text-foreground">Leaderboards</h2>
        <p className="text-sm text-muted-foreground">
          플레이어 순위 및 통계
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Leaderboard Menu */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Rankings</h3>
            <div className="space-y-2">
              {leaderboards.map((board) => {
                const Icon = board.icon
                const isSelected = selectedLeaderboard === board.id

                return (
                  <button
                    key={board.id}
                    onClick={() => {
                      onLeaderboardChange(board.id)
                      if (board.id !== 'country') {
                        onCountryChange(null)
                      }
                    }}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg transition-all ${
                      isSelected
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
                        : 'bg-muted/50 border-2 border-transparent hover:border-border'
                    }`}
                  >
                    <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      isSelected
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-muted-foreground'
                    }`} />
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${
                        isSelected
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-foreground'
                      }`}>
                        {board.label}
                      </div>
                      <div className={`text-xs ${
                        isSelected
                          ? 'text-green-700 dark:text-green-300'
                          : 'text-muted-foreground'
                      }`}>
                        {board.description}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Country Leaderboard Accordion */}
          <div>
            <button
              onClick={() => {
                setIsCountryExpanded(!isCountryExpanded)
                if (!isCountryExpanded) {
                  onLeaderboardChange('country')
                }
              }}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                selectedLeaderboard === 'country'
                  ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
                  : 'bg-muted/50 border-2 border-transparent hover:border-border'
              }`}
            >
              <div className="flex items-center gap-3">
                <Globe className={`h-5 w-5 ${
                  selectedLeaderboard === 'country'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-muted-foreground'
                }`} />
                <div className="text-left">
                  <div className={`text-sm font-medium ${
                    selectedLeaderboard === 'country'
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-foreground'
                  }`}>
                    Country Leaderboard
                  </div>
                  <div className={`text-xs ${
                    selectedLeaderboard === 'country'
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-muted-foreground'
                  }`}>
                    국가별 순위
                  </div>
                </div>
              </div>
              {isCountryExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Country List */}
            {isCountryExpanded && (
              <div className="mt-2 space-y-1 pl-4 max-h-[400px] overflow-y-auto">
                {countries.map((country) => {
                  const count = countryPlayerCounts[country] || 0
                  const isSelected = selectedCountry === country

                  return (
                    <button
                      key={country}
                      onClick={() => {
                        onCountryChange(isSelected ? null : country)
                        onLeaderboardChange('country')
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                        isSelected
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-100'
                          : 'hover:bg-accent text-foreground'
                      }`}
                    >
                      <span className="truncate">{country}</span>
                      <Badge
                        variant={isSelected ? "default" : "secondary"}
                        className={`ml-2 ${
                          isSelected
                            ? 'bg-green-600 dark:bg-green-700'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {count}
                      </Badge>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <Separator className="bg-border" />

      {/* Footer Actions */}
      <div className="p-4">
        <Button
          variant="ghost"
          className="w-full rounded-lg hover:bg-muted text-foreground"
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset Filters
        </Button>
      </div>
    </div>
  )
}
