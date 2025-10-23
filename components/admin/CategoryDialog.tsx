"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Upload, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useCreateCategoryMutation, useUpdateCategoryMutation, useUploadLogoMutation, useCategoriesQuery } from "@/lib/queries/category-queries"
import type { TournamentCategory } from "@/lib/tournament-categories-db"
import Image from "next/image"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

// Zod Schema
const categoryFormSchema = z.object({
  id: z.string()
    .min(2, "ID는 최소 2자 이상이어야 합니다")
    .max(50, "ID는 최대 50자까지 가능합니다")
    .regex(/^[a-z0-9-]+$/, "ID는 소문자, 숫자, 하이픈(-)만 사용 가능합니다"),
  name: z.string()
    .min(2, "이름은 최소 2자 이상이어야 합니다")
    .max(100, "이름은 최대 100자까지 가능합니다"),
  display_name: z.string()
    .min(2, "표시 이름은 최소 2자 이상이어야 합니다")
    .max(100, "표시 이름은 최대 100자까지 가능합니다"),
  short_name: z.string().max(20, "약칭은 최대 20자까지 가능합니다").optional(),
  aliases: z.string().optional(), // Comma-separated
  region: z.enum(["premier", "regional", "online", "specialty"]),
  priority: z.coerce.number().int().min(0).max(100).default(50),
  website: z.string().url("올바른 URL을 입력해주세요").optional().or(z.literal("")),
  is_active: z.boolean().default(true),
  game_type: z.enum(["tournament", "cash_game", "both"]).default("both"),
  parent_id: z.string().optional(),
  theme_gradient: z.string().optional(),
  theme_text: z.string().optional(),
  theme_shadow: z.string().optional(),
})

type CategoryFormValues = z.infer<typeof categoryFormSchema>

interface CategoryDialogProps {
  category?: TournamentCategory | null
  trigger?: React.ReactNode
}

export function CategoryDialog({ category, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(category?.logo_url || null)

  const isEditing = !!category
  const createMutation = useCreateCategoryMutation()
  const updateMutation = useUpdateCategoryMutation(category?.id || "")
  const uploadLogoMutation = useUploadLogoMutation(category?.id || "")

  // Fetch all categories for parent selection (root categories only)
  const { data: allCategories = [] } = useCategoriesQuery(true)

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      id: category?.id || "",
      name: category?.name || "",
      display_name: category?.display_name || "",
      short_name: category?.short_name || "",
      aliases: category?.aliases?.join(", ") || "",
      region: category?.region || "regional",
      priority: category?.priority || 50,
      website: category?.website || "",
      is_active: category?.is_active ?? true,
      game_type: category?.game_type || "both",
      parent_id: category?.parent_id || "none",
      theme_gradient: category?.theme_gradient || "",
      theme_text: category?.theme_text || "",
      theme_shadow: category?.theme_shadow || "",
    },
  })

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!["image/svg+xml", "image/png", "image/jpeg"].includes(file.type)) {
      form.setError("root", { message: "SVG, PNG, JPEG 파일만 업로드 가능합니다" })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      form.setError("root", { message: "파일 크기는 5MB 이하여야 합니다" })
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (values: CategoryFormValues) => {
    try {
      // Parse aliases
      const aliasesArray = values.aliases
        ? values.aliases.split(",").map((a) => a.trim()).filter(Boolean)
        : []

      const input = {
        id: values.id,
        name: values.name,
        display_name: values.display_name,
        short_name: values.short_name || undefined,
        aliases: aliasesArray,
        region: values.region,
        priority: values.priority,
        website: values.website || undefined,
        is_active: values.is_active,
        game_type: values.game_type,
        parent_id: values.parent_id === "none" || !values.parent_id ? null : values.parent_id,
        theme_gradient: values.theme_gradient || undefined,
        theme_text: values.theme_text || undefined,
        theme_shadow: values.theme_shadow || undefined,
      }

      if (isEditing) {
        // Update existing category
        const { id, ...updateInput } = input
        await updateMutation.mutateAsync(updateInput)

        // Upload logo if changed
        if (logoFile) {
          await uploadLogoMutation.mutateAsync(logoFile)
        }
      } else {
        // Create new category
        const newCategory = await createMutation.mutateAsync(input)

        // Upload logo if provided
        if (logoFile && newCategory.id) {
          await uploadLogoMutation.mutateAsync(logoFile)
        }
      }

      // Close dialog and reset form
      setOpen(false)
      form.reset()
      setLogoFile(null)
      setLogoPreview(null)
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다",
      })
    }
  }

  const handleCancel = () => {
    setOpen(false)
    form.reset()
    setLogoFile(null)
    setLogoPreview(category?.logo_url || null)
  }

  // Cleanup blob URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            카테고리 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "카테고리 수정" : "카테고리 추가"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "카테고리 정보를 수정합니다. 변경 후 저장 버튼을 클릭하세요."
              : "새 토너먼트 카테고리를 추가합니다. 모든 필수 항목을 입력하세요."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Logo Upload */}
            <div className="space-y-2">
              <FormLabel>로고</FormLabel>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <div className="relative w-16 h-16 border rounded-lg overflow-hidden bg-muted">
                    <Image
                      src={logoPreview}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept=".svg,.png,.jpg,.jpeg"
                    onChange={handleLogoChange}
                    className="cursor-pointer"
                  />
                  <FormDescription className="mt-1">
                    SVG, PNG, JPEG (최대 5MB)
                  </FormDescription>
                </div>
                {logoPreview && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoFile(null)
                      setLogoPreview(null)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* ID (disabled when editing) */}
            <FormField
              control={form.control}
              name="id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ID *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="wsop"
                      {...field}
                      disabled={isEditing}
                    />
                  </FormControl>
                  <FormDescription>
                    URL-safe ID (소문자, 숫자, 하이픈만 사용)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name & Display Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>정식 명칭 *</FormLabel>
                    <FormControl>
                      <Input placeholder="World Series of Poker" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>표시 이름 *</FormLabel>
                    <FormControl>
                      <Input placeholder="WSOP" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Short Name */}
            <FormField
              control={form.control}
              name="short_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>약칭</FormLabel>
                  <FormControl>
                    <Input placeholder="WSOP" {...field} />
                  </FormControl>
                  <FormDescription>
                    짧은 표시용 이름 (선택 사항)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Aliases */}
            <FormField
              control={form.control}
              name="aliases"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>별칭</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="WSOP, World Series, 월드시리즈"
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormDescription>
                    쉼표(,)로 구분된 별칭 목록
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Region & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>지역 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="지역 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="premier">Premier</SelectItem>
                        <SelectItem value="regional">Regional</SelectItem>
                        <SelectItem value="online">Online</SelectItem>
                        <SelectItem value="specialty">Specialty</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>우선순위 *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} max={100} {...field} />
                    </FormControl>
                    <FormDescription>
                      0-100 (낮을수록 우선)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Game Type */}
            <FormField
              control={form.control}
              name="game_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>게임 타입 *</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="tournament" id="tournament" />
                        <Label htmlFor="tournament" className="cursor-pointer">
                          토너먼트
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="cash_game" id="cash_game" />
                        <Label htmlFor="cash_game" className="cursor-pointer">
                          캐쉬게임
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="both" />
                        <Label htmlFor="both" className="cursor-pointer">
                          둘 다
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    이 카테고리가 표시될 페이지를 선택하세요
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent Category */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상위 카테고리</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || "none"}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="없음 (최상위 카테고리)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">없음 (최상위 카테고리)</SelectItem>
                      {allCategories
                        .filter((cat) => cat.id !== category?.id && !cat.parent_id)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.display_name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    상위 카테고리를 선택하면 하위 카테고리로 설정됩니다
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>웹사이트</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.wsop.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active Status */}
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">활성 상태</FormLabel>
                    <FormDescription>
                      활성화된 카테고리만 화면에 표시됩니다
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Theme Colors (Optional) */}
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex items-center gap-2">
                <FormLabel>테마 색상 (선택 사항)</FormLabel>
                <Badge variant="secondary">고급</Badge>
              </div>
              <FormField
                control={form.control}
                name="theme_gradient"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gradient</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="from-blue-900 via-blue-800 to-blue-700"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="theme_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Color</FormLabel>
                    <FormControl>
                      <Input placeholder="text-white" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="theme_shadow"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shadow</FormLabel>
                    <FormControl>
                      <Input placeholder="shadow-blue-900/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Error Message */}
            {form.formState.errors.root && (
              <div className="text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCancel}>
                취소
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  updateMutation.isPending ||
                  uploadLogoMutation.isPending
                }
              >
                {(createMutation.isPending ||
                  updateMutation.isPending ||
                  uploadLogoMutation.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEditing ? "수정" : "추가"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
