/**
 * Single Hand Input Panel
 *
 * High Templar 이상이 한 번에 1개 핸드의 정보를 입력하는 사이드 패널
 * 비디오 플레이어 옆에 표시되어 영상을 보면서 입력 가능
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChevronLeft, ChevronRight, Plus, X, Search } from 'lucide-react'
import { useBatchSubmitTimecodeMutation } from '@/lib/queries/timecode-queries'
import { validateHHMMSS, parseHHMMSS } from '@/lib/timecode-utils'
import { fetchAllPlayers, type Player } from '@/lib/hand-players'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AddPlayerDialog } from '@/components/admin/add-player-dialog'

interface PlayerInput {
  id: string // 로컬 ID (UI용)
  playerId: string // DB Player ID
  playerName: string
}

interface HandInput {
  handNumber: string
  startTime: string // HH:MM:SS
  endTime: string // HH:MM:SS
  players: PlayerInput[]
}

interface SingleHandInputPanelProps {
  streamId: string | null
  streamName?: string
  onSuccess?: () => void
  onClose?: () => void
}

export function SingleHandInputPanel({
  streamId,
  streamName,
  onSuccess,
  onClose,
}: SingleHandInputPanelProps) {
  // States
  const [currentHandIndex, setCurrentHandIndex] = useState(0)
  const [savedHands, setSavedHands] = useState<HandInput[]>([])
  const [currentHand, setCurrentHand] = useState<HandInput>(() => getInitialHandState(1))
  const [searchQuery, setSearchQuery] = useState('')
  const [showPlayerSearch, setShowPlayerSearch] = useState(false)
  const [isModified, setIsModified] = useState(false)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false)

  // Queries
  const batchSubmitMutation = useBatchSubmitTimecodeMutation()

  // Load players on mount
  useEffect(() => {
    const loadPlayers = async () => {
      setLoadingPlayers(true)
      try {
        const players = await fetchAllPlayers()
        setAllPlayers(players)
      } catch (error) {
        console.error('Failed to load players:', error)
        toast.error('플레이어 목록을 불러오는데 실패했습니다')
      } finally {
        setLoadingPlayers(false)
      }
    }
    loadPlayers()
  }, [])

  // 초기 핸드 상태 생성
  function getInitialHandState(handNumber: number, copyPlayers?: PlayerInput[]): HandInput {
    return {
      handNumber: String(handNumber).padStart(3, '0'),
      startTime: '',
      endTime: '',
      players: copyPlayers
        ? copyPlayers.map((p) => ({
            ...p,
            id: crypto.randomUUID(), // 새로운 로컬 ID 생성
          }))
        : [],
    }
  }

  // 핸드 필드 업데이트
  const updateHandField = <K extends keyof HandInput>(field: K, value: HandInput[K]) => {
    setCurrentHand((prev) => ({ ...prev, [field]: value }))
    setIsModified(true)
  }

  // 플레이어 추가
  const addPlayer = (player: { id: string; name: string }) => {
    const newPlayer: PlayerInput = {
      id: crypto.randomUUID(),
      playerId: player.id,
      playerName: player.name,
    }
    updateHandField('players', [...currentHand.players, newPlayer])
    setSearchQuery('')
    setShowPlayerSearch(false)
  }

  // 새 플레이어 생성 후 콜백
  const handlePlayerCreated = (player: Player) => {
    // 전체 플레이어 목록에 추가
    setAllPlayers((prev) => [...prev, player])
    // 자동으로 현재 핸드에 추가
    addPlayer({ id: player.id, name: player.name })
  }

  // 플레이어 제거
  const removePlayer = (localId: string) => {
    updateHandField(
      'players',
      currentHand.players.filter((p) => p.id !== localId)
    )
  }

  // 플레이어 필드 업데이트
  const updatePlayer = (localId: string, field: keyof PlayerInput, value: string) => {
    const updated = currentHand.players.map((p) =>
      p.id === localId ? { ...p, [field]: value } : p
    )
    updateHandField('players', updated)
  }

  // 필터링된 플레이어 목록
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((player) => {
      // 이미 선택된 플레이어 제외
      if (currentHand.players.some((p) => p.playerId === player.id)) return false
      // 검색어 필터
      if (searchQuery && !player.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      return true
    })
  }, [allPlayers, currentHand.players, searchQuery])

  // Validation
  const errors = useMemo(() => {
    const errorMap: Record<string, string[]> = {}

    // 핸드 번호 검증
    if (!currentHand.handNumber.trim()) {
      errorMap.handNumber = ['핸드 번호 필수']
    }

    // 시작 타임코드 검증
    if (!currentHand.startTime.trim()) {
      errorMap.startTime = ['시작 시간 필수']
    } else if (!validateHHMMSS(currentHand.startTime)) {
      errorMap.startTime = ['시작 시간 형식 오류']
    }

    // 종료 타임코드 검증
    if (!currentHand.endTime.trim()) {
      errorMap.endTime = ['종료 시간 필수']
    } else if (!validateHHMMSS(currentHand.endTime)) {
      errorMap.endTime = ['종료 시간 형식 오류']
    }

    // 시작 < 종료 검증
    if (
      currentHand.startTime.trim() &&
      currentHand.endTime.trim() &&
      validateHHMMSS(currentHand.startTime) &&
      validateHHMMSS(currentHand.endTime)
    ) {
      const startSeconds = parseHHMMSS(currentHand.startTime)
      const endSeconds = parseHHMMSS(currentHand.endTime)
      if (startSeconds >= endSeconds) {
        errorMap.timecode = ['시작 ≥ 종료']
      }
    }

    // 플레이어 최소 1명 검증
    if (currentHand.players.length === 0) {
      errorMap.players = ['최소 1명 이상 필요']
    }

    return errorMap
  }, [currentHand])

  const hasErrors = Object.keys(errors).length > 0
  const isSubmitting = batchSubmitMutation.isPending

  // RESET 핸들러
  const handleReset = () => {
    setCurrentHand(getInitialHandState(parseInt(currentHand.handNumber, 10)))
    setIsModified(false)
    toast.success('입력 내용이 초기화되었습니다')
  }

  // SAVE 핸들러
  const handleSave = () => {
    if (hasErrors) {
      toast.error('입력 오류가 있습니다')
      return
    }

    const newSavedHands = [...savedHands, currentHand]
    setSavedHands(newSavedHands)

    // currentHandIndex를 새 핸드 위치로 이동
    const newIndex = newSavedHands.length
    setCurrentHandIndex(newIndex)

    const nextHandNumber = parseInt(currentHand.handNumber, 10) + 1
    setCurrentHand(getInitialHandState(nextHandNumber, currentHand.players))
    setIsModified(false)
    toast.success('저장되었습니다')
  }

  // +HAND 핸들러
  const handleNextHand = () => {
    if (isModified && !hasErrors) {
      const confirm = window.confirm('현재 핸드를 저장하시겠습니까?')
      if (confirm) {
        handleSave() // handleSave가 currentHandIndex를 업데이트함
      } else {
        const nextHandNumber = parseInt(currentHand.handNumber, 10) + 1
        setCurrentHand(getInitialHandState(nextHandNumber, currentHand.players))
        setCurrentHandIndex(savedHands.length)
        setIsModified(false)
      }
    } else if (isModified && hasErrors) {
      toast.error('입력 오류를 수정해주세요')
    } else {
      const nextHandNumber = parseInt(currentHand.handNumber, 10) + 1
      setCurrentHand(getInitialHandState(nextHandNumber, currentHand.players))
      setCurrentHandIndex(savedHands.length)
    }
  }

  // 이전 핸드로 이동
  const handlePrevHand = () => {
    if (savedHands.length > 0 && currentHandIndex > 0) {
      const prevIndex = currentHandIndex - 1
      setCurrentHandIndex(prevIndex)
      setCurrentHand({ ...savedHands[prevIndex] })
      setIsModified(false)
    }
  }

  // 다음 핸드로 이동
  const handleNextHandNav = () => {
    if (currentHandIndex < savedHands.length - 1) {
      // Saved 핸드 내에서 다음으로 이동
      const nextIndex = currentHandIndex + 1
      setCurrentHandIndex(nextIndex)
      setCurrentHand({ ...savedHands[nextIndex] })
      setIsModified(false)
    } else if (currentHandIndex === savedHands.length - 1) {
      // 마지막 saved 핸드에서 새 핸드로 이동
      const nextIndex = savedHands.length
      setCurrentHandIndex(nextIndex)
      const nextHandNumber = parseInt(currentHand.handNumber, 10) + 1
      setCurrentHand(getInitialHandState(nextHandNumber, currentHand.players))
      setIsModified(false)
    }
  }

  // CONFIRM 핸들러 (모든 핸드 제출)
  const handleConfirm = async () => {
    if (!streamId) {
      toast.error('스트림을 선택해주세요')
      return
    }

    // 현재 핸드도 저장되지 않았고 오류가 없다면 제출 여부 확인
    const handsToSubmit = [...savedHands]
    if (isModified && !hasErrors && currentHand.players.length > 0) {
      const confirm = window.confirm('현재 핸드도 함께 제출하시겠습니까?')
      if (confirm) {
        handsToSubmit.push(currentHand)
      }
    }

    if (handsToSubmit.length === 0) {
      toast.error('제출할 핸드가 없습니다')
      return
    }

    // Batch API 형식으로 변환
    const timecodes = handsToSubmit.map((hand) => ({
      handNumber: hand.handNumber.trim(),
      startTime: hand.startTime.trim(),
      endTime: hand.endTime.trim(),
      description: `Players: ${hand.players.map((p) => p.playerName).join(', ')}` || null,
    }))

    try {
      await batchSubmitMutation.mutateAsync({
        streamId,
        timecodes,
      })

      // 성공 시 콜백 호출 및 초기화
      setSavedHands([])
      setCurrentHand(getInitialHandState(1))
      setIsModified(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      // 에러는 mutation에서 toast로 표시됨
    }
  }

  const totalHands = savedHands.length + (isModified ? 1 : 0)

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* 헤더 */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevHand}
              disabled={currentHandIndex === 0}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-lg font-bold">
              Hand {parseInt(currentHand.handNumber, 10)}
              {totalHands > 0 && <span className="text-muted-foreground text-sm ml-1">(total {totalHands})</span>}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextHandNav}
              disabled={currentHandIndex >= savedHands.length}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Timecode 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Timecode</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  value={currentHand.startTime}
                  onChange={(e) => updateHandField('startTime', e.target.value)}
                  placeholder="hh:mm:ss"
                  maxLength={8}
                  className={cn(
                    'h-9 text-sm',
                    errors.startTime && 'border-red-500'
                  )}
                />
                {errors.startTime && (
                  <p className="text-xs text-red-600 mt-1">{errors.startTime.join(', ')}</p>
                )}
              </div>
              <div>
                <Input
                  value={currentHand.endTime}
                  onChange={(e) => updateHandField('endTime', e.target.value)}
                  placeholder="hh:mm:ss"
                  maxLength={8}
                  className={cn(
                    'h-9 text-sm',
                    (errors.endTime || errors.timecode) && 'border-red-500'
                  )}
                />
                {(errors.endTime || errors.timecode) && (
                  <p className="text-xs text-red-600 mt-1">
                    {[...(errors.endTime || []), ...(errors.timecode || [])].join(', ')}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Players 섹션 */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">Players</h4>

            {/* 선택된 플레이어 목록 */}
            {currentHand.players.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 p-3 bg-muted rounded-md border border-border"
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{player.playerName}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removePlayer(player.id)}
                  className="h-8 w-8 flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* 플레이어 검색 */}
            {showPlayerSearch ? (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search players..."
                    className="pl-8 h-9 text-sm"
                    autoFocus
                  />
                </div>
                {filteredPlayers.length > 0 ? (
                  <ScrollArea className="h-40 border rounded-md">
                    <div className="p-2 space-y-1">
                      {filteredPlayers.slice(0, 20).map((player) => (
                        <button
                          key={player.id}
                          onClick={() => addPlayer(player)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
                        >
                          {player.name}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="space-y-3 py-4">
                    <div className="text-sm text-muted-foreground text-center">
                      {loadingPlayers ? 'Loading...' : 'No players found'}
                    </div>
                    {!loadingPlayers && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAddPlayerDialogOpen(true)}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create New Player
                      </Button>
                    )}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowPlayerSearch(false)
                    setSearchQuery('')
                  }}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowPlayerSearch(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            )}

            {errors.players && (
              <p className="text-xs text-red-600">{errors.players.join(', ')}</p>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* 하단 버튼 */}
      <div className="p-4 border-t border-border space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            RESET
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleNextHand}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            HAND
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleSave}
            disabled={hasErrors || isSubmitting}
            className="h-9 text-xs"
          >
            SAVE
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            CANCEL
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={savedHands.length === 0 || isSubmitting}
            className="h-9 text-xs"
          >
            {isSubmitting ? '제출 중...' : `CONFIRM (${savedHands.length})`}
          </Button>
        </div>
      </div>

      {/* Add Player Dialog */}
      <AddPlayerDialog
        open={addPlayerDialogOpen}
        onOpenChange={setAddPlayerDialogOpen}
        onPlayerCreated={handlePlayerCreated}
      />
    </div>
  )
}
