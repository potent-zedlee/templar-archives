"use client"

import { useState } from "react"
import { X, Save, Trash2, Star, Bookmark } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useFilterStore } from "@/lib/filter-store"
import { toast } from "sonner"

interface FilterPanelProps {
  isOpen: boolean
  onClose: () => void
  onApply?: () => void
  className?: string
}

export function FilterPanel({ isOpen, onClose, onApply, className }: FilterPanelProps) {
  const {
    // Basic filters
    playerSearch,
    setPlayerSearch,
    selectedPlayers,
    removePlayer,
    card1,
    card2,
    setCard1,
    setCard2,

    // Actions
    selectedActions,
    toggleAction,
    selectedAdvancedActions,
    toggleAdvancedAction,

    // Position
    selectedPositions,
    togglePosition,

    // Pot size
    potMin,
    potMax,
    setPotMin,
    setPotMax,

    // Stakes
    selectedStakes,
    toggleStake,

    // Board texture
    selectedBoardTextures,
    toggleBoardTexture,

    // Stack size
    sprMin,
    sprMax,
    setSprMin,
    setSprMax,
    stackMin,
    stackMax,
    setStackMin,
    setStackMax,

    // Hand range
    handRangeType,
    setHandRangeType,

    // Saved filters
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,

    // Actions
    resetFilters,
    getActiveFiltersCount,
  } = useFilterStore()

  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [filterName, setFilterName] = useState("")
  const [filterDescription, setFilterDescription] = useState("")

  const handleReset = () => {
    resetFilters()
    toast.success("필터가 초기화되었습니다")
  }

  const handleApply = () => {
    if (onApply) onApply()
    onClose()
    toast.success("필터가 적용되었습니다")
  }

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast.error("필터 이름을 입력해주세요")
      return
    }
    saveFilter(filterName, filterDescription)
    setFilterName("")
    setFilterDescription("")
    setSaveDialogOpen(false)
    toast.success("필터가 저장되었습니다")
  }

  const handleLoadFilter = (id: string) => {
    loadFilter(id)
    toast.success("필터가 로드되었습니다")
  }

  const handleDeleteFilter = (id: string) => {
    deleteFilter(id)
    toast.success("필터가 삭제되었습니다")
  }

  const activeCount = getActiveFiltersCount()

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Slide-in Panel */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-full sm:w-[420px] bg-card border-r border-border transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          className
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">고급 필터</h2>
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1.5">
                  {activeCount}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">닫기</span>
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="basic" className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-2">
              <TabsTrigger value="basic" className="flex-1">기본</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">고급</TabsTrigger>
              <TabsTrigger value="saved" className="flex-1">저장됨</TabsTrigger>
            </TabsList>

            {/* Filter Content */}
            <ScrollArea className="flex-1">
              {/* Basic Filters */}
              <TabsContent value="basic" className="p-4 space-y-6 m-0">
                {/* Player Filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">플레이어</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="플레이어 검색..."
                      className="h-9"
                      value={playerSearch}
                      onChange={(e) => setPlayerSearch(e.target.value)}
                    />
                    {selectedPlayers.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedPlayers.map((player) => (
                          <Badge
                            key={player}
                            variant="secondary"
                            className="gap-1"
                          >
                            {player}
                            <button
                              onClick={() => removePlayer(player)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Filters */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">카드</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="예: A♠"
                      className="h-9"
                      value={card1}
                      onChange={(e) => setCard1(e.target.value)}
                    />
                    <Input
                      placeholder="예: K♥"
                      className="h-9"
                      value={card2}
                      onChange={(e) => setCard2(e.target.value)}
                    />
                  </div>
                </div>

                {/* Hand Range */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">핸드 레인지</Label>
                  <Select value={handRangeType || 'all'} onValueChange={(value) => setHandRangeType(value === 'all' ? null : value as any)}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="모든 핸드" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">모든 핸드</SelectItem>
                      <SelectItem value="premium">프리미엄 (AA-JJ, AK)</SelectItem>
                      <SelectItem value="broadways">브로드웨이 (AK-AJ, KQ)</SelectItem>
                      <SelectItem value="suited-connectors">수티드 커넥터</SelectItem>
                      <SelectItem value="pocket-pairs">포켓 페어</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Hand Actions */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">기본 액션</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['fold', 'call', 'raise', 'allin'] as const).map((action) => (
                      <Button
                        key={action}
                        variant={selectedActions.includes(action) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAction(action)}
                      >
                        {action === 'allin' ? 'All-in' : action.charAt(0).toUpperCase() + action.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Position */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">포지션</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['early', 'middle', 'late', 'sb', 'bb', 'btn'] as const).map((position) => (
                      <Button
                        key={position}
                        variant={selectedPositions.includes(position) ? "default" : "outline"}
                        size="sm"
                        onClick={() => togglePosition(position)}
                        className="text-xs"
                      >
                        {position.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Pot Size */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">팟 사이즈</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="최소"
                      className="h-9"
                      value={potMin ?? ''}
                      onChange={(e) => setPotMin(e.target.value ? Number(e.target.value) : null)}
                    />
                    <Input
                      type="number"
                      placeholder="최대"
                      className="h-9"
                      value={potMax ?? ''}
                      onChange={(e) => setPotMax(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>

                {/* Stakes */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">스테이크</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['low', 'mid', 'high', 'nosebleed'] as const).map((stake) => (
                      <Button
                        key={stake}
                        variant={selectedStakes.includes(stake) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleStake(stake)}
                      >
                        {stake.charAt(0).toUpperCase() + stake.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Advanced Filters */}
              <TabsContent value="advanced" className="p-4 space-y-6 m-0">
                {/* Advanced Actions */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">고급 액션</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['3bet', '4bet', 'cbet', 'check-raise', 'squeeze', 'donk-bet'] as const).map((action) => (
                      <Button
                        key={action}
                        variant={selectedAdvancedActions.includes(action) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleAdvancedAction(action)}
                        className="text-xs"
                      >
                        {action === '3bet' ? '3BET' :
                         action === '4bet' ? '4BET' :
                         action === 'cbet' ? 'C-BET' :
                         action === 'check-raise' ? 'Check-Raise' :
                         action === 'squeeze' ? 'Squeeze' :
                         'Donk Bet'}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Board Texture */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">보드 텍스처</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['monotone', 'rainbow', 'paired', 'twoTone', 'connected', 'dry'] as const).map((texture) => (
                      <Button
                        key={texture}
                        variant={selectedBoardTextures.includes(texture) ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleBoardTexture(texture)}
                        className="text-xs"
                      >
                        {texture === 'monotone' ? '모노톤' :
                         texture === 'rainbow' ? '레인보우' :
                         texture === 'paired' ? '페어' :
                         texture === 'twoTone' ? '투톤' :
                         texture === 'connected' ? '커넥티드' :
                         '드라이'}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Stack Size (SPR) */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">SPR (Stack to Pot Ratio)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="최소"
                      className="h-9"
                      value={sprMin ?? ''}
                      onChange={(e) => setSprMin(e.target.value ? Number(e.target.value) : null)}
                    />
                    <Input
                      type="number"
                      placeholder="최대"
                      className="h-9"
                      value={sprMax ?? ''}
                      onChange={(e) => setSprMax(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SPR = 스택 / 팟 (예: SPR 10 = 스택이 팟의 10배)
                  </p>
                </div>

                {/* Stack Size (Absolute) */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">스택 사이즈 (칩)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="최소"
                      className="h-9"
                      value={stackMin ?? ''}
                      onChange={(e) => setStackMin(e.target.value ? Number(e.target.value) : null)}
                    />
                    <Input
                      type="number"
                      placeholder="최대"
                      className="h-9"
                      value={stackMax ?? ''}
                      onChange={(e) => setStackMax(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Saved Filters */}
              <TabsContent value="saved" className="p-4 space-y-4 m-0">
                {savedFilters.length === 0 ? (
                  <div className="text-center py-8">
                    <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-body text-muted-foreground">
                      저장된 필터가 없습니다
                    </p>
                    <p className="text-caption text-muted-foreground mt-1">
                      필터를 설정하고 저장 버튼을 눌러보세요
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedFilters.map((filter) => (
                      <div
                        key={filter.id}
                        className="flex items-center gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {filter.name}
                          </div>
                          {filter.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {filter.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(filter.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleLoadFilter(filter.id)}
                          >
                            로드
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleDeleteFilter(filter.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-2">
            <div className="flex gap-2">
              <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={activeCount === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    저장
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>필터 저장</DialogTitle>
                    <DialogDescription>
                      현재 필터 설정을 저장하여 나중에 다시 사용할 수 있습니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="filter-name">필터 이름 *</Label>
                      <Input
                        id="filter-name"
                        placeholder="예: 3BET 팟 블러프"
                        value={filterName}
                        onChange={(e) => setFilterName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="filter-description">설명 (선택)</Label>
                      <Input
                        id="filter-description"
                        placeholder="예: 드라이보드에서 3BET 팟 블러프 상황"
                        value={filterDescription}
                        onChange={(e) => setFilterDescription(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      취소
                    </Button>
                    <Button onClick={handleSaveFilter}>저장</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="outline"
                onClick={handleReset}
                disabled={activeCount === 0}
              >
                초기화
              </Button>
            </div>
            <Button className="w-full" onClick={handleApply}>
              적용 {activeCount > 0 && `(${activeCount})`}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
