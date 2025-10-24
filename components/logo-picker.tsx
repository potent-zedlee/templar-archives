"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Check, Search, Loader2 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  getStaticLogos,
  getUploadedLogos,
  searchLogos,
  type LogoFile,
} from "@/lib/logo-utils"

interface LogoPickerProps {
  selectedLogo?: string | null
  onSelect: (logoUrl: string) => void
}

export function LogoPicker({ selectedLogo, onSelect }: LogoPickerProps) {
  const [staticLogos, setStaticLogos] = useState<LogoFile[]>([])
  const [uploadedLogos, setUploadedLogos] = useState<LogoFile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"static" | "uploaded">("static")

  // Load logos on mount
  useEffect(() => {
    const loadLogos = async () => {
      setLoading(true)
      try {
        const [staticData, uploadedData] = await Promise.all([
          Promise.resolve(getStaticLogos()),
          getUploadedLogos(),
        ])
        setStaticLogos(staticData)
        setUploadedLogos(uploadedData)
      } catch (error) {
        console.error("Error loading logos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadLogos()
  }, [])

  // Filter logos based on search query
  const filteredStaticLogos = searchLogos(staticLogos, searchQuery)
  const filteredUploadedLogos = searchLogos(uploadedLogos, searchQuery)

  const renderLogoGrid = (logos: LogoFile[]) => {
    if (logos.length === 0) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "검색 결과가 없습니다" : "로고가 없습니다"}
        </div>
      )
    }

    return (
      <div className="grid grid-cols-4 gap-3">
        {logos.map((logo) => {
          const isSelected = selectedLogo === logo.url || selectedLogo === logo.path
          return (
            <button
              key={logo.path}
              type="button"
              onClick={() => onSelect(logo.url)}
              className={cn(
                "relative aspect-square rounded-lg border-2 p-2 transition-all hover:border-primary/50 hover:bg-muted/50",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border bg-background"
              )}
              title={logo.name}
            >
              {/* Logo Image */}
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={logo.url}
                  alt={logo.name}
                  fill
                  className="object-contain p-1"
                  unoptimized={logo.url.startsWith("http")}
                />
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Logo Name (tooltip) */}
              <div className="absolute bottom-0 left-0 right-0 bg-background/90 backdrop-blur-sm text-xs p-1 truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                {logo.name}
              </div>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="로고 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "static" | "uploaded")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="static">
            정적 로고 ({filteredStaticLogos.length})
          </TabsTrigger>
          <TabsTrigger value="uploaded">
            업로드된 로고 ({filteredUploadedLogos.length})
          </TabsTrigger>
        </TabsList>

        {/* Static Logos */}
        <TabsContent value="static">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {renderLogoGrid(filteredStaticLogos)}
            </ScrollArea>
          )}
        </TabsContent>

        {/* Uploaded Logos */}
        <TabsContent value="uploaded">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              {renderLogoGrid(filteredUploadedLogos)}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      {/* Info */}
      {!loading && (
        <p className="text-xs text-muted-foreground">
          {activeTab === "static"
            ? "public/logos/ 폴더의 정적 로고 파일"
            : "Supabase Storage에 업로드된 커스텀 로고"}
        </p>
      )}
    </div>
  )
}
