"use client"

import { Home, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbItem {
  id: string
  name: string
  type: 'home' | 'tournament' | 'subevent'
}

interface ArchiveBreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (item: BreadcrumbItem | null) => void
}

export function ArchiveBreadcrumb({ items, onNavigate }: ArchiveBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {/* Home button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate(null)}
        className="flex items-center gap-1 shrink-0"
      >
        <Home className="h-4 w-4" />
        <span className="text-body">Archive</span>
      </Button>

      {/* Breadcrumb items */}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 shrink-0">
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item)}
            className="text-body"
          >
            {item.name}
          </Button>
        </div>
      ))}
    </div>
  )
}
