"use client"

import { memo } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BreadcrumbItem {
  id: string
  name: string
  type: 'home' | 'tournament' | 'subevent' | 'event'
}

interface ArchiveBreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (item: BreadcrumbItem | null) => void
}

export const ArchiveBreadcrumb = memo(function ArchiveBreadcrumb({ items, onNavigate }: ArchiveBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2">
      {/* Breadcrumb items */}
      {items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 shrink-0">
          {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
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
})
