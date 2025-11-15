"use client"

import { FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Sparkles, Grid3x3, List, Star, TrendingUp } from "lucide-react"
import { SearchEmptyState } from "./SearchEmptyState"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import type { Hand } from "@/lib/supabase"
import { cn } from "@/lib/utils"

type HandWithDetails = Hand & {
  tournament_name?: string
  player_names?: string[]
  day_name?: string
  pot_size?: number
}

type ViewMode = "table" | "card"

interface SearchMainPanelProps {
  hands: HandWithDetails[]
  loading: boolean
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onSearch: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function SearchMainPanel({
  hands,
  loading,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  viewMode,
  onViewModeChange
}: SearchMainPanelProps) {
  const hasSearched = searchQuery.trim().length > 0
  const hasResults = hands.length > 0

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-6 border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Ask me anything about your poker hands..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="pl-12 pr-12 h-14 text-lg bg-background border-2 focus:border-purple-500 transition-colors"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              disabled={loading}
            >
              <Sparkles className="h-5 w-5" />
            </Button>
          </div>

          {hasSearched && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {loading ? "Searching..." : `Found ${hands.length} result${hands.length !== 1 ? 's' : ''}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">View:</span>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "card" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onViewModeChange("card")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <TableSkeleton />
          ) : !hasSearched ? (
            <SearchEmptyState />
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center max-w-md space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query or filters
                </p>
              </div>
            </div>
          ) : viewMode === "table" ? (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Hand #</TableHead>
                    <TableHead>Tournament</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Players</TableHead>
                    <TableHead className="text-right">Pot Size</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hands.map((hand) => (
                    <TableRow
                      key={hand.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/hands/${hand.id}`}
                    >
                      <TableCell className="font-mono">
                        {hand.number || "N/A"}
                      </TableCell>
                      <TableCell>{hand.tournament_name || "N/A"}</TableCell>
                      <TableCell>{hand.day_name || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {hand.player_names?.slice(0, 3).map((name, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {name}
                            </Badge>
                          )) || "N/A"}
                          {hand.player_names && hand.player_names.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{hand.player_names.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${(hand.pot_size || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Toggle favorite
                          }}
                        >
                          <Star className={cn(
                            "h-4 w-4",
                            hand.favorite ? "fill-yellow-500 text-yellow-500" : ""
                          )} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hands.map((hand) => (
                <Card
                  key={hand.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => window.location.href = `/hands/${hand.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">Hand #{hand.number || "N/A"}</div>
                        <div className="text-sm text-muted-foreground">
                          {hand.tournament_name || "N/A"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Toggle favorite
                        }}
                      >
                        <Star className={cn(
                          "h-4 w-4",
                          hand.favorite ? "fill-yellow-500 text-yellow-500" : ""
                        )} />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {hand.player_names?.slice(0, 4).map((name, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {name}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Pot Size</span>
                      <span className="font-mono font-semibold">
                        ${(hand.pot_size || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
