"use client"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  MapPin,
  Globe,
  Twitter,
  Instagram,
  Edit,
  MessageSquare,
  ThumbsUp,
  FileText,
  Bookmark
} from "lucide-react"
import Link from "next/link"
import {
  getProfile,
  fetchUserPosts,
  fetchUserComments,
  fetchUserBookmarks,
  type UserProfile
} from "@/lib/user-profile"
import { useAuth } from "@/components/auth-provider"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { EditProfileDialog } from "@/components/edit-profile-dialog"
import { toast } from "sonner"

export default function profileidClient() {
  const params = useParams()
  const userId = params.id as string
  const { user } = useAuth()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [bookmarks, setBookmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "bookmarks">("posts")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const isOwnProfile = user?.id === userId

  useEffect(() => {
    loadProfile()
  }, [userId])

  useEffect(() => {
    loadTabData()
  }, [activeTab, userId])

  async function loadProfile() {
    try {
      const profileData = await getProfile(userId)
      setProfile(profileData)
    } catch (error) {
      console.error('Error loading profile:', error)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  async function loadTabData() {
    try {
      if (activeTab === "posts") {
        const data = await fetchUserPosts(userId)
        setPosts(data)
      } else if (activeTab === "comments") {
        const data = await fetchUserComments(userId)
        setComments(data)
      } else if (activeTab === "bookmarks") {
        if (isOwnProfile) {
          const data = await fetchUserBookmarks(userId)
          setBookmarks(data)
        }
      }
    } catch (error) {
      console.error('Error loading tab data:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-6xl mx-auto py-8 px-4">
          <CardSkeleton count={3} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-6xl mx-auto py-16 px-4 text-center">
          <h2 className="text-title-lg mb-4">User not found</h2>
          <p className="text-body text-muted-foreground mb-6">
            The profile you are looking for does not exist.
          </p>
          <Link href="/community" className={buttonVariants()}>
            Go to Community
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={profile.avatar_url} alt={profile.nickname} />
              <AvatarFallback className="text-2xl">
                {profile.nickname.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-title-lg mb-2">{profile.nickname}</h1>
                  {profile.bio && (
                    <p className="text-body text-muted-foreground mb-3">{profile.bio}</p>
                  )}
                </div>
                {isOwnProfile && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mb-4">
                <div className="text-center">
                  <div className="text-title font-bold">{profile.posts_count}</div>
                  <div className="text-caption text-muted-foreground">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-title font-bold">{profile.comments_count}</div>
                  <div className="text-caption text-muted-foreground">Comments</div>
                </div>
                <div className="text-center">
                  <div className="text-title font-bold">{profile.likes_received}</div>
                  <div className="text-caption text-muted-foreground">Likes</div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex flex-wrap gap-3">
                {profile.location && (
                  <div className="flex items-center gap-1 text-caption text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-caption text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}
                {profile.twitter_handle && (
                  <a
                    href={`https://twitter.com/${profile.twitter_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-caption text-primary hover:underline"
                  >
                    <Twitter className="h-4 w-4" />
                    <span>@{profile.twitter_handle}</span>
                  </a>
                )}
                {profile.instagram_handle && (
                  <a
                    href={`https://instagram.com/${profile.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-caption text-primary hover:underline"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>@{profile.instagram_handle}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Activity Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">
              <FileText className="h-4 w-4 mr-2" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="h-4 w-4 mr-2" />
              Comments
            </TabsTrigger>
            {isOwnProfile && (
              <TabsTrigger value="bookmarks">
                <Bookmark className="h-4 w-4 mr-2" />
                Bookmarks
              </TabsTrigger>
            )}
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="mt-6 space-y-4">
            {posts.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-body text-muted-foreground">No posts yet</p>
              </Card>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <Link href={`/community/${post.id}`}>
                    <h3 className="text-body font-semibold mb-2">{post.title}</h3>
                    <p className="text-caption text-muted-foreground line-clamp-2 mb-3">
                      {post.content}
                    </p>
                    <div className="flex items-center gap-4 text-caption text-muted-foreground">
                      <Badge variant="secondary">{post.category}</Badge>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {post.comments_count}
                      </span>
                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                    </div>
                  </Link>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments" className="mt-6 space-y-4">
            {comments.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-body text-muted-foreground">No comments yet</p>
              </Card>
            ) : (
              comments.map((comment) => (
                <Card key={comment.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <p className="text-body mb-3">{comment.content}</p>
                  <div className="flex items-center gap-4 text-caption text-muted-foreground">
                    {comment.post?.title && (
                      <Link
                        href={`/community/${comment.post.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        on: {comment.post.title}
                      </Link>
                    )}
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3 w-3" />
                      {comment.likes_count}
                    </span>
                    <span>{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Bookmarks Tab */}
          {isOwnProfile && (
            <TabsContent value="bookmarks" className="mt-6 space-y-4">
              {bookmarks.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-body text-muted-foreground">No bookmarks yet</p>
                </Card>
              ) : (
                bookmarks.map((bookmark) => (
                  <Card key={bookmark.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge>#{bookmark.hand?.number}</Badge>
                          {bookmark.folder_name && (
                            <Badge variant="outline">{bookmark.folder_name}</Badge>
                          )}
                        </div>
                        {bookmark.hand?.description && (
                          <p className="text-body mb-2">{bookmark.hand.description}</p>
                        )}
                        {bookmark.notes && (
                          <p className="text-caption text-muted-foreground">{bookmark.notes}</p>
                        )}
                      </div>
                      <Link
                        href={`/archive?hand=${bookmark.hand?.id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        View
                      </Link>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Edit Profile Dialog */}
      {profile && isOwnProfile && (
        <EditProfileDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          profile={profile}
          onProfileUpdated={(updatedProfile) => {
            setProfile(updatedProfile)
          }}
        />
      )}
    </div>
  )
}
