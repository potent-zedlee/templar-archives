"use client"
import { useEffect, useState } from "react"
import { useRouter} from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bookmark, Trash2, FolderOpen, Calendar, Edit } from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { getUserBookmarks, removeHandBookmark, updateBookmarkFolder, updateBookmarkNotes, type HandBookmarkWithDetails } from "@/lib/hand-bookmarks"
import { BookmarkDialog } from "@/components/bookmark-dialog"
import { toast } from "sonner"
import Link from "next/link"

export default function bookmarksClient() {
  const { user } = useAuth()
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<HandBookmarkWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [editingBookmark, setEditingBookmark] = useState<HandBookmarkWithDetails | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
      return
    }

    loadBookmarks()
  }, [user, router])

  const loadBookmarks = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      const data = await getUserBookmarks(user.id)
      setBookmarks(data)

      // Extract folder list
      const folderSet = new Set(data.map((b) => b.folder_name || 'Default').filter(Boolean))
      setFolders(Array.from(folderSet).sort())
    } catch (error) {
      console.error('Failed to load bookmarks:', error)
      toast.error('Failed to load bookmarks.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveBookmark = async (handId: string) => {
    if (!user) return

    try {
      await removeHandBookmark(handId, user.id)
      toast.success('Bookmark removed.')
      loadBookmarks()
    } catch (error) {
      console.error('Failed to remove bookmark:', error)
      toast.error('Failed to remove bookmark.')
    }
  }

  const handleEditBookmark = (bookmark: HandBookmarkWithDetails) => {
    setEditingBookmark(bookmark)
    setEditDialogOpen(true)
  }

  const handleUpdateBookmark = async (folderName: string | null, notes: string) => {
    if (!user || !editingBookmark) return

    try {
      await updateBookmarkFolder(editingBookmark.hand_id, user.id, folderName)
      await updateBookmarkNotes(editingBookmark.hand_id, user.id, notes)
      toast.success('Bookmark updated')
      loadBookmarks()
    } catch (error) {
      console.error('Failed to update bookmark:', error)
      toast.error('Failed to update bookmark')
      throw error
    }
  }

  const filteredBookmarks = bookmarks.filter((bookmark) => {
    if (selectedFolder === 'all') return true
    return (bookmark.folder_name || 'Default') === selectedFolder
  })

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-title-lg font-bold flex items-center gap-2">
            <Bookmark className="h-6 w-6" />
            My Bookmarks
          </h1>
          <p className="text-caption text-muted-foreground mt-2">
            View and manage your saved hands.
          </p>
        </div>

        <Separator />

        {/* Folder tabs */}
        {folders.length > 0 && (
          <Tabs value={selectedFolder} onValueChange={setSelectedFolder}>
            <TabsList>
              <TabsTrigger value="all">
                <FolderOpen className="h-4 w-4 mr-2" />
                All ({bookmarks.length})
              </TabsTrigger>
              {folders.map((folder) => (
                <TabsTrigger key={folder} value={folder}>
                  {folder} ({bookmarks.filter((b) => (b.folder_name || 'Default') === folder).length})
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Bookmark list */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading bookmarks...</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <Card className="p-12">
            <div className="text-center space-y-4">
              <Bookmark className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-body font-semibold">No bookmarks</h3>
                <p className="text-caption text-muted-foreground mt-2">
                  Save hands by clicking the bookmark button on hand detail pages.
                </p>
              </div>
              <Link href="/archive" className={buttonVariants()}>
                Browse Archive
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredBookmarks.map((bookmark) => (
              <Card key={bookmark.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  {/* Hand info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/archive?tournament=${bookmark.hand?.day?.sub_event?.tournament?.id}&day=${bookmark.hand?.day?.id}`}
                        className="hover:underline"
                      >
                        <h3 className="text-body font-semibold">
                          Hand #{bookmark.hand?.number}
                        </h3>
                      </Link>
                      {bookmark.folder_name && (
                        <Badge variant="secondary">
                          <FolderOpen className="h-3 w-3 mr-1" />
                          {bookmark.folder_name}
                        </Badge>
                      )}
                    </div>

                    {/* Tournament info */}
                    {bookmark.hand?.day?.sub_event?.tournament && (
                      <div className="text-caption text-muted-foreground">
                        {bookmark.hand.day.sub_event.tournament.name} &gt;{' '}
                        {bookmark.hand.day.sub_event.name} &gt; {bookmark.hand.day.name}
                      </div>
                    )}

                    {/* Hand description */}
                    {bookmark.hand?.description && (
                      <p className="text-body text-muted-foreground line-clamp-2">
                        {bookmark.hand.description}
                      </p>
                    )}

                    {/* Personal notes */}
                    {bookmark.notes && (
                      <div className="bg-muted p-2 rounded text-caption">
                        <strong>Notes:</strong> {bookmark.notes}
                      </div>
                    )}

                    {/* Bookmark date */}
                    <div className="flex items-center gap-2 text-caption text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Bookmarked {new Date(bookmark.created_at).toLocaleDateString('en-US')}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/archive?tournament=${bookmark.hand?.day?.sub_event?.tournament?.id}&day=${bookmark.hand?.day?.id}`}
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      View
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBookmark(bookmark)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveBookmark(bookmark.hand_id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingBookmark && (
          <BookmarkDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSave={handleUpdateBookmark}
            userId={user?.id}
            existingBookmark={{
              folder_name: editingBookmark.folder_name,
              notes: editingBookmark.notes
            }}
            mode="edit"
          />
        )}
        </div>
      </div>
    </div>
  )
}
