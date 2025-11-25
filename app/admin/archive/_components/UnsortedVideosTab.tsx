'use client'

/**
 * Unsorted Videos Tab Component
 *
 * 관리자 전용 Unsorted 비디오 관리
 * - 비디오 목록 테이블 뷰
 * - CRUD 작업 (추가, 수정, 삭제)
 * - 배치 선택 및 조직화
 * - 검색 및 필터링
 * Phase 33: Enhanced with type-safe sorting and ARIA attributes
 */

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Trash2, Search, Loader2, ExternalLink, FolderInput, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { QuickUploadDialog } from '@/components/features/admin/upload/QuickUploadDialog'
import {
  getUnsortedVideos,
  deleteUnsortedVideo,
  deleteUnsortedVideosBatch,
} from '@/app/actions/unsorted'
import type { UnsortedVideo } from '@/lib/unsorted-videos'
import type { UnsortedVideosSortField, SortDirection } from '@/lib/types/sorting'
import { getSortAriaProps } from '@/hooks/useSorting'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UnsortedVideosTabProps {
  onRefresh?: () => void
}

export function UnsortedVideosTab({ onRefresh }: UnsortedVideosTabProps) {
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState<UnsortedVideo[]>([])
  const [filteredVideos, setFilteredVideos] = useState<UnsortedVideo[]>([])
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [sortField, setSortField] = useState<UnsortedVideosSortField>('created')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [videoToDelete, setVideoToDelete] = useState<string | null>(null)
  const [organizeDialogOpen, setOrganizeDialogOpen] = useState(false)

  // Load videos
  useEffect(() => {
    loadVideos()
  }, [])

  // Filter and sort videos
  useEffect(() => {
    let filtered = videos

    // Source filter
    if (sourceFilter !== 'all') {
      filtered = filtered.filter((v) => v.video_source === sourceFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.video_url?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareResult = 0

      switch (sortField) {
        case 'name':
          compareResult = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          break
        case 'source':
          const sourceA = a.video_source || 'youtube'
          const sourceB = b.video_source || 'youtube'
          compareResult = sourceA.localeCompare(sourceB)
          break
        case 'created':
          compareResult = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
        case 'published':
          // Handle null published_at (put nulls at the end)
          if (!a.published_at && !b.published_at) compareResult = 0
          else if (!a.published_at) compareResult = 1
          else if (!b.published_at) compareResult = -1
          else compareResult = new Date(a.published_at).getTime() - new Date(b.published_at).getTime()
          break
      }

      return sortDirection === 'asc' ? compareResult : -compareResult
    })

    setFilteredVideos(sorted)
  }, [videos, sourceFilter, searchQuery, sortField, sortDirection])

  const loadVideos = async () => {
    setLoading(true)
    try {
      const result = await getUnsortedVideos()
      if (result.success) {
        setVideos(result.data)
      } else {
        toast.error(result.error || 'Failed to load unsorted videos')
      }
    } catch (error) {
      console.error('Error loading unsorted videos:', error)
      toast.error('Failed to load unsorted videos')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: UnsortedVideosSortField) => {
    if (sortField === field) {
      // 같은 필드 클릭 시 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 필드 클릭 시 해당 필드로 변경, 기본 asc
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = () => {
    if (selectedVideos.size === filteredVideos.length) {
      setSelectedVideos(new Set())
    } else {
      setSelectedVideos(new Set(filteredVideos.map((v) => v.id)))
    }
  }

  const handleSelectVideo = (id: string, checked: boolean) => {
    const newSet = new Set(selectedVideos)
    if (checked) {
      newSet.add(id)
    } else {
      newSet.delete(id)
    }
    setSelectedVideos(newSet)
  }

  const handleDelete = async (id: string) => {
    setVideoToDelete(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!videoToDelete) return

    const result = await deleteUnsortedVideo(videoToDelete)
    if (result.success) {
      toast.success('Video deleted')
      loadVideos()
      setSelectedVideos((prev) => {
        const newSet = new Set(prev)
        newSet.delete(videoToDelete)
        return newSet
      })
    } else {
      toast.error(result.error || 'Failed to delete video')
    }

    setDeleteDialogOpen(false)
    setVideoToDelete(null)
  }

  const handleDeleteSelected = async () => {
    if (selectedVideos.size === 0) return

    const result = await deleteUnsortedVideosBatch(Array.from(selectedVideos))
    if (result.success) {
      toast.success(`${selectedVideos.size} video(s) deleted`)
      loadVideos()
      setSelectedVideos(new Set())
    } else {
      toast.error(result.error || 'Failed to delete videos')
    }
  }

  const handleOrganizeSelected = () => {
    if (selectedVideos.size === 0) {
      toast.error('Please select videos to organize')
      return
    }
    setOrganizeDialogOpen(true)
  }

  const handleUploadSuccess = () => {
    loadVideos()
    if (onRefresh) onRefresh()
  }

  return (
    <>
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Video Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="youtube">YouTube</SelectItem>
              <SelectItem value="local">Local Upload</SelectItem>
              <SelectItem value="nas">NAS</SelectItem>
            </SelectContent>
          </Select>
          <QuickUploadDialog onSuccess={handleUploadSuccess} />
        </div>

        {/* Selection Actions */}
        {selectedVideos.size > 0 && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-md">
            <span className="text-sm font-medium">
              {selectedVideos.size} video{selectedVideos.size > 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleOrganizeSelected}
            >
              <FolderInput className="h-4 w-4" />
              Organize to Event
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="h-4 w-4" />
              Delete Selected
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedVideos(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        filteredVideos.length > 0 &&
                        selectedVideos.size === filteredVideos.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="min-w-[300px] cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('name')}
                    {...getSortAriaProps('name', sortField, sortDirection)}
                  >
                    <div className="flex items-center gap-2">
                      Name
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-32 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('source')}
                    {...getSortAriaProps('source', sortField, sortDirection)}
                  >
                    <div className="flex items-center gap-2">
                      Source
                      {sortField === 'source' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-48 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('created')}
                    {...getSortAriaProps('created', sortField, sortDirection)}
                  >
                    <div className="flex items-center gap-2">
                      Created At
                      {sortField === 'created' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-48 cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('published')}
                    {...getSortAriaProps('published', sortField, sortDirection)}
                  >
                    <div className="flex items-center gap-2">
                      Published At
                      {sortField === 'published' ? (
                        sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVideos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No unsorted videos found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVideos.map((video) => (
                    <TableRow key={video.id} className="hover:bg-muted/50">
                      <TableCell>
                        <Checkbox
                          checked={selectedVideos.has(video.id)}
                          onCheckedChange={(checked) =>
                            handleSelectVideo(video.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[300px]">
                            {video.name}
                          </span>
                          {video.video_url && (
                            <a
                              href={video.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:text-foreground"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {video.video_source || 'youtube'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(video.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {video.published_at
                          ? new Date(video.published_at).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(video.id)}
                          title="Delete Video"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Total: {videos.length} unsorted videos</span>
          <span>•</span>
          <span>Showing: {filteredVideos.length} videos</span>
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this video. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Organize Dialog (Placeholder - will use Day Dialog) */}
      <Dialog open={organizeDialogOpen} onOpenChange={setOrganizeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Organize Videos</DialogTitle>
            <DialogDescription>
              Selected {selectedVideos.size} video(s) will be organized to an
              event. This feature is coming soon - please use Day Dialog's "From
              Unsorted" tab for now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOrganizeDialogOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
