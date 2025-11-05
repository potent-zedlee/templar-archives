"use client"

import { useState, useEffect } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Clock,
  Star,
  Trash2,
  Search,
  TrendingUp,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchHistoryItem {
  id: string
  query: string
  timestamp: number
  isAI: boolean
  favorite?: boolean
}

interface SearchHistoryProps {
  onSelectQuery?: (query: string) => void
}

const QUICK_TEMPLATES = [
  {
    label: "AA vs KK",
    query: "Show me hands with pocket aces against pocket kings",
    icon: TrendingUp
  },
  {
    label: "Big Pots (>100k)",
    query: "Find hands with pot size greater than 100000",
    icon: Star
  },
  {
    label: "WSOP Hands",
    query: "Show me all hands from WSOP tournaments",
    icon: Search
  },
  {
    label: "Bluff Catches",
    query: "Find hands where players called big bets with marginal hands",
    icon: Sparkles
  }
]

export function SearchHistory({ onSelectQuery }: SearchHistoryProps) {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [favorites, setFavorites] = useState<SearchHistoryItem[]>([])

  useEffect(() => {
    // Load from localStorage
    const savedHistory = localStorage.getItem("search_history")
    const savedFavorites = localStorage.getItem("search_favorites")

    if (savedHistory) {
      setHistory(JSON.parse(savedHistory))
    }
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites))
    }
  }, [])

  const handleSelectQuery = (query: string) => {
    onSelectQuery?.(query)
  }

  const handleToggleFavorite = (item: SearchHistoryItem) => {
    if (favorites.find(f => f.id === item.id)) {
      const updated = favorites.filter(f => f.id !== item.id)
      setFavorites(updated)
      localStorage.setItem("search_favorites", JSON.stringify(updated))
    } else {
      const updated = [...favorites, item]
      setFavorites(updated)
      localStorage.setItem("search_favorites", JSON.stringify(updated))
    }
  }

  const handleClearHistory = () => {
    setHistory([])
    localStorage.removeItem("search_history")
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-lg">Search</h2>
        <p className="text-sm text-muted-foreground">
          Recent searches and templates
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Quick Templates */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Quick Templates</h3>
            </div>
            <div className="space-y-2">
              {QUICK_TEMPLATES.map((template) => (
                <Button
                  key={template.label}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleSelectQuery(template.query)}
                >
                  <div className="flex items-start gap-3 w-full">
                    <template.icon className="h-4 w-4 mt-0.5 text-purple-400" />
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{template.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {template.query}
                      </div>
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Favorites */}
          {favorites.length > 0 && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Saved Searches
                  </h3>
                </div>
                <div className="space-y-2">
                  {favorites.map((item) => (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className="w-full justify-start h-auto py-2"
                      onClick={() => handleSelectQuery(item.query)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        {item.isAI && (
                          <Sparkles className="h-3 w-3 mt-1 text-purple-400" />
                        )}
                        <div className="flex-1 text-left text-sm line-clamp-2">
                          {item.query}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Recent Searches */}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Recent
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearHistory}
                  className="h-7 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
              <div className="space-y-2">
                {history.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2 group"
                  >
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start h-auto py-2"
                      onClick={() => handleSelectQuery(item.query)}
                    >
                      <div className="flex items-start gap-2 w-full">
                        {item.isAI && (
                          <Sparkles className="h-3 w-3 mt-1 text-purple-400" />
                        )}
                        <div className="flex-1 text-left text-sm line-clamp-2">
                          {item.query}
                        </div>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleToggleFavorite(item)}
                    >
                      <Star
                        className={cn(
                          "h-4 w-4",
                          favorites.find(f => f.id === item.id)
                            ? "fill-yellow-500 text-yellow-500"
                            : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
