"use client"

/**
 * Content Editor Component
 *
 * 뉴스 및 라이브 리포팅 작성을 위한 공통 에디터
 */

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Upload, X, Save, Send } from "lucide-react"
import { storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { toast } from "sonner"

type ContentType = 'news' | 'live_report'

interface ContentEditorProps {
  type: ContentType
  initialData?: {
    title?: string
    content?: string
    thumbnailUrl?: string
    category?: string
    tags?: string[]
    externalLink?: string
  }
  onSave: (data: {
    title: string
    content: string
    thumbnailUrl?: string
    category: string
    tags: string[]
    externalLink?: string
    status: 'draft' | 'pending'
  }) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

const NEWS_CATEGORIES = ['Tournament', 'Player News', 'Industry', 'General', 'Other']
const LIVE_CATEGORIES = ['Tournament Update', 'Chip Counts', 'Breaking News', 'Results', 'Other']

export function ContentEditor({ type, initialData, onSave, onCancel, isLoading }: ContentEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '')
  const [category, setCategory] = useState(initialData?.category || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [externalLink, setExternalLink] = useState(initialData?.externalLink || '')
  const [uploading, setUploading] = useState(false)

  const categories = type === 'news' ? NEWS_CATEGORIES : LIVE_CATEGORIES

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const folder = type === 'news' ? 'news-images' : 'live-reports-images'
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${folder}/${fileName}`

      // Firebase Storage에 업로드
      const storageRef = ref(storage, filePath)
      await uploadBytes(storageRef, file)
      const publicUrl = await getDownloadURL(storageRef)

      setThumbnailUrl(publicUrl)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const handleSubmit = async (status: 'draft' | 'pending') => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!content.trim()) {
      toast.error('Content is required')
      return
    }
    if (!category) {
      toast.error('Category is required')
      return
    }

    await onSave({
      title: title.trim(),
      content: content.trim(),
      thumbnailUrl: thumbnailUrl || undefined,
      category,
      tags,
      externalLink: externalLink.trim() || undefined,
      status,
    })
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={type === 'news' ? 'Enter news title' : 'Enter live report title'}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground">{title.length}/200</p>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Thumbnail Image */}
      <div className="space-y-2">
        <Label htmlFor="thumbnail">Thumbnail Image</Label>
        <div className="flex items-center gap-4">
          <Input
            id="thumbnail"
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('thumbnail')?.click()}
            disabled={uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload Image'}
          </Button>
          {thumbnailUrl && (
            <div className="flex items-center gap-2">
              <img src={thumbnailUrl} alt="Thumbnail" className="h-16 w-16 object-cover rounded" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setThumbnailUrl('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Recommended: 1200x630px, max 5MB</p>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">Content * (Markdown supported)</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your content here... (Markdown supported)"
          rows={15}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">{content.length} characters</p>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label htmlFor="tags">Tags</Label>
        <div className="flex gap-2">
          <Input
            id="tags"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            placeholder="Add tag and press Enter"
          />
          <Button type="button" onClick={handleAddTag} variant="outline">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              {tag}
              <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveTag(tag)} />
            </Badge>
          ))}
        </div>
      </div>

      {/* External Link */}
      <div className="space-y-2">
        <Label htmlFor="external-link">External Link (Source URL)</Label>
        <Input
          id="external-link"
          type="url"
          value={externalLink}
          onChange={(e) => setExternalLink(e.target.value)}
          placeholder="https://example.com/source"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleSubmit('draft')}
          disabled={isLoading}
        >
          <Save className="h-4 w-4 mr-2" />
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={() => handleSubmit('pending')}
          disabled={isLoading}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit for Approval
        </Button>
      </div>
    </Card>
  )
}
