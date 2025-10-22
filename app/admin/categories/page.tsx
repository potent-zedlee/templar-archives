"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, closestCenter } from "@dnd-kit/core"
import { arrayMove } from "@/lib/utils/array"
import { useDebounce } from "@/hooks/useDebounce"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { Search, Save } from "lucide-react"
import { CategoryDialog } from "@/components/admin/CategoryDialog"
import { CategoryTable } from "@/components/admin/CategoryTable"
import {
  useCategoriesQuery,
  useReorderCategoriesMutation,
  useAllCategoryUsageQuery,
} from "@/lib/queries/category-queries"
import { useAuth } from "@/components/auth-provider"
import { isAdmin } from "@/lib/admin"
import { toast } from "sonner"
import type { TournamentCategory } from "@/lib/tournament-categories-db"

export default function CategoriesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [hasAccess, setHasAccess] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [regionFilter, setRegionFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")
  const [includeInactive, setIncludeInactive] = useState(true)

  // Drag & Drop state
  const [activeId, setActiveId] = useState<string | null>(null)
  const [localCategories, setLocalCategories] = useState<TournamentCategory[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // React Query hooks
  const { data: categories, isLoading } = useCategoriesQuery(includeInactive)
  const { data: usageCounts } = useAllCategoryUsageQuery()
  const reorderMutation = useReorderCategoriesMutation()

  // Update local categories when data changes
  useEffect(() => {
    if (categories) {
      setLocalCategories(categories)
      setHasChanges(false)
    }
  }, [categories])

  // Check admin access
  const checkAccess = useCallback(async () => {
    if (!user) {
      router.push("/auth/login")
      return
    }

    try {
      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        toast.error("관리자 권한이 필요합니다")
        router.push("/")
        return
      }

      setHasAccess(true)
    } catch (error) {
      console.error("Error checking admin access:", error)
      toast.error("권한 확인 중 오류가 발생했습니다")
      router.push("/")
    }
  }, [user, router])

  useEffect(() => {
    checkAccess()
  }, [checkAccess])

  // Filter categories
  const filteredCategories = useMemo(() => {
    return localCategories.filter((category) => {
      // Search filter
      const searchMatch =
        !debouncedSearchQuery ||
        category.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        category.display_name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        category.id.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        category.aliases.some((alias) =>
          alias.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
        )

      // Region filter
      const regionMatch =
        regionFilter === "all" || category.region === regionFilter

      // Active filter
      const activeMatch =
        activeFilter === "all" ||
        (activeFilter === "active" && category.is_active) ||
        (activeFilter === "inactive" && !category.is_active)

      return searchMatch && regionMatch && activeMatch
    })
  }, [localCategories, debouncedSearchQuery, regionFilter, activeFilter])

  // Drag handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setLocalCategories((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id)
        const newIndex = items.findIndex((item) => item.id === over.id)

        const reordered = arrayMove(items, oldIndex, newIndex)
        setHasChanges(true)
        return reordered
      })
    }

    setActiveId(null)
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  // Save order
  async function handleSaveOrder() {
    const categoryIds = localCategories.map((cat) => cat.id)

    try {
      await reorderMutation.mutateAsync(categoryIds)
      setHasChanges(false)
    } catch (error) {
      // Error toast is handled by mutation
    }
  }

  // Reset order
  function handleResetOrder() {
    if (categories) {
      setLocalCategories(categories)
      setHasChanges(false)
    }
  }

  if (!hasAccess) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 px-4">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">카테고리 관리</h1>
          <p className="text-muted-foreground">
            토너먼트 카테고리를 추가, 수정, 삭제하고 순서를 변경할 수 있습니다.
          </p>
        </header>

        {/* Toolbar */}
        <Card className="p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                placeholder="카테고리 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                aria-label="카테고리 검색"
              />
            </div>

            {/* Region Filter */}
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[180px]" aria-label="지역 필터">
                <SelectValue placeholder="지역 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 지역</SelectItem>
                <SelectItem value="premier">Premier</SelectItem>
                <SelectItem value="regional">Regional</SelectItem>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="specialty">Specialty</SelectItem>
              </SelectContent>
            </Select>

            {/* Active Filter */}
            <Select
              value={activeFilter}
              onValueChange={(value: string) => {
                const filter = value as "all" | "active" | "inactive"
                setActiveFilter(filter)
                setIncludeInactive(filter === "all" || filter === "inactive")
              }}
            >
              <SelectTrigger className="w-[180px]" aria-label="활성 상태 필터">
                <SelectValue placeholder="활성 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모두</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
              </SelectContent>
            </Select>

            {/* Add Category */}
            <CategoryDialog />
          </div>

          {/* Save Order Button */}
          {hasChanges && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t" role="alert" aria-live="polite">
              <Button onClick={handleSaveOrder} disabled={reorderMutation.isPending} aria-label="카테고리 순서 저장">
                <Save className="h-4 w-4 mr-2" aria-hidden="true" />
                순서 저장
              </Button>
              <Button
                variant="outline"
                onClick={handleResetOrder}
                disabled={reorderMutation.isPending}
                aria-label="순서 변경 취소"
              >
                취소
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                순서가 변경되었습니다. 저장하세요.
              </span>
            </div>
          )}
        </Card>

        {/* Categories Table */}
        {isLoading ? (
          <div className="space-y-4" role="status" aria-label="카테고리 목록 로딩 중">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <CategoryTable categories={filteredCategories} usageCounts={usageCounts || {}} />
            <DragOverlay>
              {activeId ? (
                <div className="bg-background border rounded-lg p-4 shadow-2xl">
                  <span className="font-medium">
                    {localCategories.find((cat) => cat.id === activeId)?.display_name}
                  </span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

        {/* Results Count */}
        {!isLoading && (
          <div className="mt-4 text-sm text-muted-foreground text-center" role="status" aria-live="polite">
            총 {filteredCategories.length}개의 카테고리
            {searchQuery && ` (검색 결과)`}
          </div>
        )}
      </div>
    </div>
  )
}
