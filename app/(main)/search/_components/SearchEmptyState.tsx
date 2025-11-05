"use client"

import { Sparkles } from "lucide-react"

export function SearchEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 blur-3xl rounded-full" />
        <div className="relative bg-gradient-to-br from-purple-500 to-blue-500 p-6 rounded-full">
          <Sparkles className="h-12 w-12 text-white" />
        </div>
      </div>

      <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
        How can I help you?
      </h1>

      <p className="text-muted-foreground text-center max-w-md mb-8">
        Introducing the AI Search — the new way to explore, uncover, and understand your poker hand library
      </p>

      <div className="w-full max-w-2xl space-y-3 text-sm text-muted-foreground">
        <div className="flex items-start gap-2">
          <span className="text-purple-400">•</span>
          <p>Use natural language: <span className="text-foreground">"Show me hands with AA vs KK"</span></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-blue-400">•</span>
          <p>Search by tournament: <span className="text-foreground">"WSOP Main Event big pots"</span></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="text-purple-400">•</span>
          <p>Find specific scenarios: <span className="text-foreground">"Bluff catches over 100k"</span></p>
        </div>
      </div>
    </div>
  )
}
