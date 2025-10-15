"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search, ChevronRight } from "lucide-react"
import { createClientSupabaseClient } from "@/lib/supabase-client"

type Tournament = {
  id: string
  name: string
  category: string
  location: string
  start_date: string
}

type SubEvent = {
  id: string
  name: string
  buy_in?: string
}

type Day = {
  id: string
  name: string
}

type Hand = {
  id: string
  number: string
  description: string
  timestamp: string
}

type HandSearchDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (hand: { id: string; number: string; description: string; tournament: string; day: string }) => void
}

export function HandSearchDialog({ open, onOpenChange, onSelect }: HandSearchDialogProps) {
  const [step, setStep] = useState<'tournament' | 'subevent' | 'day' | 'hand'>('tournament')
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)
  const [selectedSubEvent, setSelectedSubEvent] = useState<SubEvent | null>(null)
  const [selectedDay, setSelectedDay] = useState<Day | null>(null)

  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [subEvents, setSubEvents] = useState<SubEvent[]>([])
  const [days, setDays] = useState<Day[]>([])
  const [hands, setHands] = useState<Hand[]>([])

  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 다이얼로그가 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setStep('tournament')
      setSelectedTournament(null)
      setSelectedSubEvent(null)
      setSelectedDay(null)
      setSearchQuery('')
      loadTournaments()
    }
  }, [open])

  // 토너먼트 목록 로드
  const loadTournaments = async () => {
    setIsLoading(true)
    const supabase = createClientSupabaseClient()
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('id, name, category, location, start_date')
        .order('start_date', { ascending: false })
        .limit(20)

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('토너먼트 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Sub Event 목록 로드
  const loadSubEvents = async (tournamentId: string) => {
    setIsLoading(true)
    const supabase = createClientSupabaseClient()
    try {
      const { data, error } = await supabase
        .from('sub_events')
        .select('id, name, buy_in')
        .eq('tournament_id', tournamentId)
        .order('date', { ascending: false })

      if (error) throw error
      setSubEvents(data || [])
    } catch (error) {
      console.error('Sub Event 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Day 목록 로드
  const loadDays = async (subEventId: string) => {
    setIsLoading(true)
    const supabase = createClientSupabaseClient()
    try {
      const { data, error } = await supabase
        .from('days')
        .select('id, name')
        .eq('sub_event_id', subEventId)
        .order('name', { ascending: true })

      if (error) throw error
      setDays(data || [])
    } catch (error) {
      console.error('Day 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Hand 목록 로드
  const loadHands = async (dayId: string) => {
    setIsLoading(true)
    const supabase = createClientSupabaseClient()
    try {
      const { data, error } = await supabase
        .from('hands')
        .select('id, number, description, timestamp')
        .eq('day_id', dayId)
        .order('number', { ascending: true })

      if (error) throw error
      setHands(data || [])
    } catch (error) {
      console.error('Hand 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Tournament 선택
  const handleSelectTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament)
    setStep('subevent')
    loadSubEvents(tournament.id)
  }

  // SubEvent 선택
  const handleSelectSubEvent = (subEvent: SubEvent) => {
    setSelectedSubEvent(subEvent)
    setStep('day')
    loadDays(subEvent.id)
  }

  // Day 선택
  const handleSelectDay = (day: Day) => {
    setSelectedDay(day)
    setStep('hand')
    loadHands(day.id)
  }

  // Hand 선택
  const handleSelectHand = (hand: Hand) => {
    if (!selectedTournament || !selectedDay) return

    onSelect({
      id: hand.id,
      number: hand.number,
      description: hand.description,
      tournament: selectedTournament.name,
      day: selectedDay.name,
    })
    onOpenChange(false)
  }

  // 뒤로 가기
  const handleBack = () => {
    if (step === 'hand') {
      setStep('day')
      setSelectedDay(null)
    } else if (step === 'day') {
      setStep('subevent')
      setSelectedSubEvent(null)
    } else if (step === 'subevent') {
      setStep('tournament')
      setSelectedTournament(null)
    }
  }

  // 검색 필터
  const filteredItems = () => {
    const query = searchQuery.toLowerCase()

    if (step === 'tournament') {
      return tournaments.filter((t) => t.name.toLowerCase().includes(query))
    } else if (step === 'subevent') {
      return subEvents.filter((s) => s.name.toLowerCase().includes(query))
    } else if (step === 'day') {
      return days.filter((d) => d.name.toLowerCase().includes(query))
    } else if (step === 'hand') {
      return hands.filter((h) =>
        h.number.toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query)
      )
    }
    return []
  }

  const getStepTitle = () => {
    switch (step) {
      case 'tournament':
        return 'Tournament 선택'
      case 'subevent':
        return 'Sub Event 선택'
      case 'day':
        return 'Day 선택'
      case 'hand':
        return 'Hand 선택'
    }
  }

  const getBreadcrumb = () => {
    const parts = []
    if (selectedTournament) parts.push(selectedTournament.name)
    if (selectedSubEvent) parts.push(selectedSubEvent.name)
    if (selectedDay) parts.push(selectedDay.name)
    return parts.join(' > ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getStepTitle()}</DialogTitle>
          <DialogDescription>
            {getBreadcrumb() || '핸드를 첨부할 토너먼트를 선택하세요'}
          </DialogDescription>
        </DialogHeader>

        {/* 검색 입력 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* 뒤로 가기 버튼 */}
        {step !== 'tournament' && (
          <Button variant="outline" onClick={handleBack} size="sm">
            ← 뒤로
          </Button>
        )}

        {/* 목록 */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              로딩 중...
            </div>
          ) : filteredItems().length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              결과가 없습니다
            </div>
          ) : (
            <div className="space-y-2">
              {step === 'tournament' &&
                (filteredItems() as Tournament[]).map((tournament) => (
                  <Card
                    key={tournament.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectTournament(tournament)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body font-semibold">{tournament.name}</h3>
                        <p className="text-caption text-muted-foreground">
                          {tournament.location} • {new Date(tournament.start_date).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

              {step === 'subevent' &&
                (filteredItems() as SubEvent[]).map((subEvent) => (
                  <Card
                    key={subEvent.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectSubEvent(subEvent)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-body font-semibold">{subEvent.name}</h3>
                        {subEvent.buy_in && (
                          <p className="text-caption text-muted-foreground">Buy-in: {subEvent.buy_in}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

              {step === 'day' &&
                (filteredItems() as Day[]).map((day) => (
                  <Card
                    key={day.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectDay(day)}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-body font-semibold">{day.name}</h3>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))}

              {step === 'hand' &&
                (filteredItems() as Hand[]).map((hand) => (
                  <Card
                    key={hand.id}
                    className="p-4 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectHand(hand)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge>#{hand.number}</Badge>
                          <span className="text-caption text-muted-foreground">{hand.timestamp}</span>
                        </div>
                        {hand.description && (
                          <p className="text-body mt-1 line-clamp-2">{hand.description}</p>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
