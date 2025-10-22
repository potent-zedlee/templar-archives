"use client"

import { useState } from "react"
import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import Image from "next/image"
import {
  Edit,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { CategoryDialog } from "./CategoryDialog"
import {
  useDeleteCategoryMutation,
  useToggleActiveMutation,
  useCategoryUsageQuery,
} from "@/lib/queries/category-queries"
import type { TournamentCategory } from "@/lib/tournament-categories-db"

interface CategoryRowProps {
  category: TournamentCategory
}

function CategoryRow({ category }: CategoryRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: category.id,
    data: {
      type: "category",
      category,
    },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  }

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const deleteMutation = useDeleteCategoryMutation()
  const toggleActiveMutation = useToggleActiveMutation(category.id)
  const { data: usageCount, isLoading: usageLoading } = useCategoryUsageQuery(category.id)

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(category.id)
      setDeleteDialogOpen(false)
    } catch (error) {
      // Error toast is handled by mutation
    }
  }

  const handleToggleActive = async () => {
    try {
      await toggleActiveMutation.mutateAsync()
    } catch (error) {
      // Error toast is handled by mutation
    }
  }

  return (
    <>
      <TableRow
        ref={setNodeRef}
        style={style}
        className={isDragging ? "shadow-2xl ring-2 ring-primary" : ""}
      >
        {/* Drag Handle */}
        <TableCell className="w-12">
          <div
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        </TableCell>

        {/* Logo */}
        <TableCell className="w-16">
          {category.logo_url ? (
            <div className="relative w-12 h-12 border rounded bg-muted">
              <Image
                src={category.logo_url}
                alt={category.display_name}
                fill
                className="object-contain p-1"
              />
            </div>
          ) : (
            <div className="w-12 h-12 border rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
              No Logo
            </div>
          )}
        </TableCell>

        {/* ID */}
        <TableCell className="font-mono text-sm">{category.id}</TableCell>

        {/* Name */}
        <TableCell>
          <div className="space-y-1">
            <div className="font-medium">{category.display_name}</div>
            <div className="text-xs text-muted-foreground">{category.name}</div>
            {category.short_name && (
              <Badge variant="outline" className="text-xs">
                {category.short_name}
              </Badge>
            )}
          </div>
        </TableCell>

        {/* Region */}
        <TableCell>
          <Badge
            variant={
              category.region === "premier"
                ? "default"
                : category.region === "regional"
                ? "secondary"
                : category.region === "online"
                ? "outline"
                : "destructive"
            }
          >
            {category.region}
          </Badge>
        </TableCell>

        {/* Priority */}
        <TableCell className="text-center">{category.priority}</TableCell>

        {/* Usage Count */}
        <TableCell className="text-center">
          {usageLoading ? (
            <span className="text-muted-foreground">-</span>
          ) : (
            <Badge variant="secondary">{usageCount || 0}</Badge>
          )}
        </TableCell>

        {/* Active Status */}
        <TableCell>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleActive}
            disabled={toggleActiveMutation.isPending}
          >
            {category.is_active ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </TableCell>

        {/* Website */}
        <TableCell>
          {category.website && (
            <Button variant="ghost" size="sm" asChild>
              <a href={category.website} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </TableCell>

        {/* Actions */}
        <TableCell>
          <div className="flex items-center gap-2">
            <CategoryDialog
              category={category}
              trigger={
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
              }
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteMutation.isPending || (usageCount || 0) > 0}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카테고리 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              카테고리 &quot;{category.display_name}&quot;를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

interface CategoryTableProps {
  categories: TournamentCategory[]
}

export function CategoryTable({ categories }: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        카테고리가 없습니다. 새 카테고리를 추가하세요.
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead className="w-16">로고</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>이름</TableHead>
            <TableHead>지역</TableHead>
            <TableHead className="text-center">우선순위</TableHead>
            <TableHead className="text-center">사용 개수</TableHead>
            <TableHead>활성</TableHead>
            <TableHead>웹사이트</TableHead>
            <TableHead>작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <CategoryRow key={category.id} category={category} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
