"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Loader2 } from "lucide-react"
import { updateProfile, checkNicknameAvailable, uploadAvatar, type UserProfile } from "@/lib/user-profile"
import { toast } from "sonner"

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: UserProfile
  onProfileUpdated: (profile: UserProfile) => void
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  onProfileUpdated
}: EditProfileDialogProps) {
  const [nickname, setNickname] = useState(profile.nickname)
  const [bio, setBio] = useState(profile.bio || "")
  const [location, setLocation] = useState(profile.location || "")
  const [website, setWebsite] = useState(profile.website || "")
  const [twitterHandle, setTwitterHandle] = useState(profile.twitter_handle || "")
  const [instagramHandle, setInstagramHandle] = useState(profile.instagram_handle || "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "")
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast.error('File must be an image')
      return
    }

    setUploading(true)
    try {
      const url = await uploadAvatar(profile.id, file)
      setAvatarUrl(url)
      toast.success('Avatar uploaded successfully')
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast.error('Failed to upload avatar')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    // Validate nickname
    if (!nickname.trim()) {
      toast.error('Nickname is required')
      return
    }

    if (nickname.length < 3) {
      toast.error('Nickname must be at least 3 characters')
      return
    }

    // Check nickname availability
    if (nickname !== profile.nickname) {
      const available = await checkNicknameAvailable(nickname, profile.id)
      if (!available) {
        toast.error('This nickname is already taken')
        return
      }
    }

    setSaving(true)
    try {
      const updatedProfile = await updateProfile(profile.id, {
        nickname: nickname.trim(),
        bio: bio.trim() || undefined,
        location: location.trim() || undefined,
        website: website.trim() || undefined,
        twitter_handle: twitterHandle.trim() || undefined,
        instagram_handle: instagramHandle.trim() || undefined,
        avatar_url: avatarUrl || undefined
      })

      if (!updatedProfile) {
        throw new Error('Failed to update profile')
      }

      toast.success('Profile updated successfully')
      onProfileUpdated(updatedProfile)
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Avatar Upload */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl} alt={nickname} />
              <AvatarFallback>{nickname.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Change Avatar
                  </>
                )}
              </Button>
              <p className="text-caption text-muted-foreground mt-1">
                Max 5MB • JPG, PNG, GIF
              </p>
            </div>
          </div>

          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname *</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={50}
            />
            <p className="text-caption text-muted-foreground">
              {nickname.length}/50 characters
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className="text-caption text-muted-foreground">
              {bio.length}/500 characters
            </p>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              maxLength={100}
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://yourwebsite.com"
              maxLength={200}
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="twitter">Twitter Handle</Label>
              <div className="flex items-center gap-2">
                <span className="text-body text-muted-foreground">@</span>
                <Input
                  id="twitter"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value.replace('@', ''))}
                  placeholder="username"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram Handle</Label>
              <div className="flex items-center gap-2">
                <span className="text-body text-muted-foreground">@</span>
                <Input
                  id="instagram"
                  value={instagramHandle}
                  onChange={(e) => setInstagramHandle(e.target.value.replace('@', ''))}
                  placeholder="username"
                  maxLength={50}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
