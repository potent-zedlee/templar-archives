"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
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
import { useAuth } from "@/components/layout/AuthProvider"
import { CardSkeleton } from "@/components/ui/skeletons/CardSkeleton"
import { EditProfileDialog } from "@/components/dialogs/EditProfileDialog"
import { toast } from "sonner"
import {
  useProfileQuery,
  useUserPostsQuery,
  useUserCommentsQuery,
  useUserBookmarksQuery,
} from "@/lib/queries/profile-queries"

export default function ProfileIdClient() {
  const params = useParams()
  const userId = params.id as string
  const { user } = useAuth()

  // UI state
  const [activeTab, setActiveTab] = useState<"posts" | "comments" | "bookmarks">("posts")
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const isOwnProfile = user?.id === userId

  // React Query hooks
  const { data: profileData = null, isLoading: loading, error } = useProfileQuery(userId)
  const [profile, setProfile] = useState(profileData)
  const { data: posts = [] } = useUserPostsQuery(userId)
  const { data: comments = [] } = useUserCommentsQuery(userId)
  const { data: bookmarks = [] } = useUserBookmarksQuery(userId)

  // Sync profile state with query data
  useEffect(() => {
    setProfile(profileData)
  }, [profileData])

  // Handle error
  if (error) {
    toast.error('Failed to load profile')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black-100">
        <div className="container max-w-6xl mx-auto py-8 px-4">
          <CardSkeleton count={3} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black-100">
        <div className="container max-w-6xl mx-auto py-16 px-4 text-center">
          <h2 className="text-heading text-2xl mb-4">USER NOT FOUND</h2>
          <p className="text-black-600 mb-6">
            The profile you are looking for does not exist.
          </p>
          <Link href="/community" className="btn-primary">
            Go to Community
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-100">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        {/* Profile Header */}
        <div className="card-postmodern p-6 mb-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Avatar */}
            <div className="h-24 w-24 md:h-32 md:w-32 border-2 border-gold-700 gold-glow bg-black-200 flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.nickname} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-gold-400">
                  {profile.nickname.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-heading text-2xl mb-2">{profile.nickname}</h1>
                  {profile.bio && (
                    <p className="text-black-600 mb-3">{profile.bio}</p>
                  )}
                </div>
                {isOwnProfile && (
                  <button
                    onClick={() => setIsEditDialogOpen(true)}
                    className="btn-secondary flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Edit Profile
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 mb-4">
                <div className="text-center">
                  <div className="text-heading font-bold font-mono text-xl">{profile.posts_count}</div>
                  <div className="text-caption text-black-600">POSTS</div>
                </div>
                <div className="text-center">
                  <div className="text-heading font-bold font-mono text-xl">{profile.comments_count}</div>
                  <div className="text-caption text-black-600">COMMENTS</div>
                </div>
                <div className="text-center">
                  <div className="text-heading font-bold font-mono text-xl">{profile.likes_received}</div>
                  <div className="text-caption text-black-600">LIKES</div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="flex flex-wrap gap-3">
                {profile.location && (
                  <div className="flex items-center gap-1 text-caption text-black-600">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-caption text-gold-400 hover:text-gold-300 transition-colors"
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
                    className="flex items-center gap-1 text-caption text-gold-400 hover:text-gold-300 transition-colors"
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
                    className="flex items-center gap-1 text-caption text-gold-400 hover:text-gold-300 transition-colors"
                  >
                    <Instagram className="h-4 w-4" />
                    <span>@{profile.instagram_handle}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Tabs */}
        <div className="space-y-4">
          {/* Tab Headers */}
          <div className="flex gap-2 border-b-2 border-black-300">
            <button
              onClick={() => setActiveTab("posts")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                activeTab === "posts"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              POSTS
            </button>
            <button
              onClick={() => setActiveTab("comments")}
              className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                activeTab === "comments"
                  ? "border-gold-400 text-gold-400"
                  : "border-transparent text-black-600 hover:text-black-800"
              }`}
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              COMMENTS
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab("bookmarks")}
                className={`px-4 py-2 border-b-2 -mb-0.5 transition-colors ${
                  activeTab === "bookmarks"
                    ? "border-gold-400 text-gold-400"
                    : "border-transparent text-black-600 hover:text-black-800"
                }`}
              >
                <Bookmark className="h-4 w-4 inline mr-2" />
                BOOKMARKS
              </button>
            )}
          </div>

          {/* Posts Tab */}
          {activeTab === "posts" && (
            <div className="space-y-4">
              {posts.length === 0 ? (
                <div className="card-postmodern p-8 text-center">
                  <p className="text-black-600">No posts yet</p>
                </div>
              ) : (
                posts.map((post) => (
                  <div key={post.id} className="card-postmodern-interactive p-4">
                    <Link href={`/community/${post.id}`}>
                      <h3 className="font-semibold mb-2">{post.title}</h3>
                      <p className="text-caption text-black-600 line-clamp-2 mb-3">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 text-caption text-black-600">
                        <span className="px-2 py-1 border border-gold-600 bg-gold-700/20 text-xs uppercase">
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          <span className="font-mono">{(post as any).likesCount ?? (post as any).likes_count ?? 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          <span className="font-mono">{(post as any).commentsCount ?? (post as any).comments_count ?? 0}</span>
                        </span>
                        <span className="font-mono">{new Date((post as any).createdAt ?? (post as any).created_at).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="space-y-4">
              {comments.length === 0 ? (
                <div className="card-postmodern p-8 text-center">
                  <p className="text-black-600">No comments yet</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="card-postmodern-interactive p-4">
                    <p className="mb-3">{comment.content}</p>
                    <div className="flex items-center gap-4 text-caption text-black-600">
                      {(comment.post as any)?.title && (
                        <Link
                          href={`/community/${(comment.post as any).id}`}
                          className="hover:text-gold-400 transition-colors"
                        >
                          on: {(comment.post as any).title}
                        </Link>
                      )}
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span className="font-mono">{(comment as any).likesCount ?? (comment as any).likes_count ?? 0}</span>
                      </span>
                      <span className="font-mono">{new Date((comment as any).createdAt ?? (comment as any).created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Bookmarks Tab */}
          {isOwnProfile && activeTab === "bookmarks" && (
            <div className="space-y-4">
              {bookmarks.length === 0 ? (
                <div className="card-postmodern p-8 text-center">
                  <p className="text-black-600">No bookmarks yet</p>
                </div>
              ) : (
                bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="card-postmodern-interactive p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 border border-gold-600 bg-gold-700/20 text-xs uppercase font-mono">
                            #{(bookmark.hand as any)?.number}
                          </span>
                          {((bookmark as any).folderName ?? (bookmark as any).folder_name) && (
                            <span className="px-2 py-1 border border-black-400 text-xs uppercase">
                              {(bookmark as any).folderName ?? (bookmark as any).folder_name}
                            </span>
                          )}
                        </div>
                        {(bookmark.hand as any)?.description && (
                          <p className="mb-2">{(bookmark.hand as any).description}</p>
                        )}
                        {bookmark.notes && (
                          <p className="text-caption text-black-600">{bookmark.notes}</p>
                        )}
                      </div>
                      <Link
                        href={`/archive?hand=${(bookmark.hand as any)?.id}`}
                        className="btn-ghost ml-4"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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
