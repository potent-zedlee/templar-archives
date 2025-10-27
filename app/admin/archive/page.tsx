'use client'

/**
 * Admin Archive Management Page
 *
 * 관리자 전용 Archive 관리 페이지
 * - 토너먼트 목록 (테이블 뷰)
 * - CRUD 다이얼로그
 * - 검색 및 필터링
 * Phase 33: Enhanced with type-safe sorting and ARIA attributes
 */

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import { isAdmin } from '@/lib/auth-utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2, ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TournamentDialog } from '@/components/tournament-dialog'
import { DeleteDialog } from '@/components/archive-dialogs/delete-dialog'
import { SubEventDialog } from '@/components/archive-dialogs/sub-event-dialog'
import { DayDialog } from '@/components/archive-dialogs/day-dialog'
import { UnsortedVideosTab } from './_components/UnsortedVideosTab'
import type { Tournament, FolderItem } from '@/lib/types/archive'
import type { SubEvent, Stream } from '@/lib/supabase'
import type { AdminArchiveSortField, SortDirection } from '@/lib/types/sorting'
import { getSortAriaProps } from '@/hooks/useSorting'
import { useRouter } from 'next/navigation'
import { getCategoryByAlias } from '@/lib/tournament-categories'

export default function AdminArchivePage() {
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [gameTypeFilter, setGameTypeFilter] = useState('all')
  const [sortField, setSortField] = useState<AdminArchiveSortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [_userEmail, setUserEmail] = useState<string | null>(null)
  const [isUserAdmin, setIsUserAdmin] = useState(false)

  // Dialog states
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTournamentId, setEditingTournamentId] = useState('')
  const [deletingItem, setDeletingItem] = useState<FolderItem | null>(null)

  // SubEvent states
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set())
  const [subEvents, setSubEvents] = useState<Map<string, SubEvent[]>>(new Map())
  const [subEventDialogOpen, setSubEventDialogOpen] = useState(false)
  const [editingSubEventId, setEditingSubEventId] = useState('')
  const [selectedTournamentIdForSubEvent, setSelectedTournamentIdForSubEvent] = useState('')

  // Stream/Day states
  const [expandedSubEvents, setExpandedSubEvents] = useState<Set<string>>(new Set())
  const [streams, setStreams] = useState<Map<string, (Stream & { hand_count?: number })[]>>(new Map())
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [editingDayId, setEditingDayId] = useState('')
  const [selectedSubEventIdForDay, setSelectedSubEventIdForDay] = useState('')

  // Tournament form states
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newCategory, setNewCategory] = useState<Tournament['category']>('WSOP')
  const [newCategoryLogo, setNewCategoryLogo] = useState('')
  const [newGameType, setNewGameType] = useState<'tournament' | 'cash-game'>('tournament')
  const [newLocation, setNewLocation] = useState('')
  const [newCity, setNewCity] = useState('')
  const [newCountry, setNewCountry] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  const router = useRouter()
  const supabase = createClientSupabaseClient()

  // Auth check
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please sign in')
        router.push('/auth/login')
        return
      }

      setUserEmail(user.email || null)
      const adminCheck = isAdmin(user.email)
      setIsUserAdmin(adminCheck)

      if (!adminCheck) {
        toast.error('Admin access required')
        router.push('/')
        return
      }
    }

    checkAdmin()
  }, [router])

  // Load tournaments
  useEffect(() => {
    if (!isUserAdmin) return
    loadTournaments()
  }, [isUserAdmin])

  // Filter and sort tournaments
  useEffect(() => {
    let filtered = tournaments

    // Category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(t => t.category === categoryFilter)
    }

    // Game type filter
    if (gameTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.game_type === gameTypeFilter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.location.toLowerCase().includes(query) ||
        t.city?.toLowerCase().includes(query) ||
        t.country?.toLowerCase().includes(query)
      )
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let compareResult = 0

      switch (sortField) {
        case 'name':
          compareResult = a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          break
        case 'category':
          compareResult = a.category.localeCompare(b.category)
          break
        case 'type':
          compareResult = (a.game_type || 'tournament').localeCompare(b.game_type || 'tournament')
          break
        case 'location':
          const locationA = a.city && a.country ? `${a.city}, ${a.country}` : a.location
          const locationB = b.city && b.country ? `${b.city}, ${b.country}` : b.location
          compareResult = locationA.toLowerCase().localeCompare(locationB.toLowerCase())
          break
        case 'date':
          compareResult = new Date(a.end_date).getTime() - new Date(b.end_date).getTime()
          break
      }

      return sortDirection === 'asc' ? compareResult : -compareResult
    })

    setFilteredTournaments(sorted)
  }, [tournaments, categoryFilter, gameTypeFilter, searchQuery, sortField, sortDirection])

  const loadTournaments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('end_date', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: AdminArchiveSortField) => {
    if (sortField === field) {
      // 같은 필드 클릭 시 방향 토글
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // 다른 필드 클릭 시 해당 필드로 변경, 기본 asc
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleCreateTournament = () => {
    setEditingTournamentId('')
    setNewTournamentName('')
    setNewCategory('WSOP')
    setNewCategoryLogo('')
    setNewGameType('tournament')
    setNewLocation('')
    setNewCity('')
    setNewCountry('')
    setNewStartDate('')
    setNewEndDate('')
    setTournamentDialogOpen(true)
  }

  const handleEditTournament = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id)
    setNewTournamentName(tournament.name)
    setNewCategory(tournament.category)
    setNewCategoryLogo(tournament.category_logo || '')
    setNewGameType(tournament.game_type || 'tournament')
    setNewLocation(tournament.location)
    setNewCity(tournament.city || '')
    setNewCountry(tournament.country || '')
    setNewStartDate(tournament.start_date)
    setNewEndDate(tournament.end_date)
    setTournamentDialogOpen(true)
  }

  const handleDeleteTournament = (tournament: Tournament) => {
    setDeletingItem({
      id: tournament.id,
      name: tournament.name,
      type: 'tournament' as const,
    })
    setDeleteDialogOpen(true)
  }

  const handleTournamentSaved = () => {
    loadTournaments()
    setTournamentDialogOpen(false)
  }

  const handleTournamentDeleted = () => {
    loadTournaments()
    setDeleteDialogOpen(false)
  }

  // SubEvent functions
  const toggleTournamentExpand = async (tournamentId: string) => {
    const newExpanded = new Set(expandedTournaments)

    if (newExpanded.has(tournamentId)) {
      newExpanded.delete(tournamentId)
    } else {
      newExpanded.add(tournamentId)
      // Load SubEvents if not already loaded
      if (!subEvents.has(tournamentId)) {
        await loadSubEvents(tournamentId)
      }
    }

    setExpandedTournaments(newExpanded)
  }

  const loadSubEvents = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase
        .from('sub_events')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('date', { ascending: false })

      if (error) throw error

      const newSubEvents = new Map(subEvents)
      newSubEvents.set(tournamentId, data || [])
      setSubEvents(newSubEvents)
    } catch (error) {
      console.error('Error loading sub events:', error)
      toast.error('Failed to load events')
    }
  }

  const handleAddSubEvent = (tournamentId: string) => {
    setSelectedTournamentIdForSubEvent(tournamentId)
    setEditingSubEventId('')
    setSubEventDialogOpen(true)
  }

  const handleEditSubEvent = (subEventId: string, tournamentId: string) => {
    setSelectedTournamentIdForSubEvent(tournamentId)
    setEditingSubEventId(subEventId)
    setSubEventDialogOpen(true)
  }

  const handleDeleteSubEvent = (subEvent: SubEvent, _tournamentId: string) => {
    setDeletingItem({
      id: subEvent.id,
      name: subEvent.name,
      type: 'subevent' as const,
    })
    setDeleteDialogOpen(true)
  }

  const handleSubEventSuccess = () => {
    // Reload SubEvents for the current tournament
    if (selectedTournamentIdForSubEvent) {
      loadSubEvents(selectedTournamentIdForSubEvent)
    }
    setSubEventDialogOpen(false)
    setEditingSubEventId('')
    setSelectedTournamentIdForSubEvent('')
  }

  const handleSubEventDeleted = () => {
    // Reload SubEvents for all expanded tournaments
    expandedTournaments.forEach(tournamentId => {
      loadSubEvents(tournamentId)
    })
    setDeleteDialogOpen(false)
  }

  // Stream/Day functions
  const toggleSubEventExpand = async (subEventId: string) => {
    const newExpanded = new Set(expandedSubEvents)

    if (newExpanded.has(subEventId)) {
      newExpanded.delete(subEventId)
    } else {
      newExpanded.add(subEventId)
      // Load Streams if not already loaded
      if (!streams.has(subEventId)) {
        await loadStreams(subEventId)
      }
    }

    setExpandedSubEvents(newExpanded)
  }

  const loadStreams = async (subEventId: string) => {
    try {
      // Load streams with hand count
      const { data: streamsData, error } = await supabase
        .from('streams')
        .select('*')
        .eq('sub_event_id', subEventId)
        .order('published_at', { ascending: false })

      if (error) throw error

      // Get hand counts for these streams
      const streamIds = (streamsData || []).map(s => s.id)
      let handCounts: Record<string, number> = {}

      if (streamIds.length > 0) {
        const { data: handCountData } = await supabase
          .from('hands')
          .select('day_id')
          .in('day_id', streamIds)

        if (handCountData) {
          handCounts = handCountData.reduce((acc, h) => {
            acc[h.day_id] = (acc[h.day_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      }

      // Merge hand counts with stream data
      const streamsWithCounts = (streamsData || []).map(stream => ({
        ...stream,
        hand_count: handCounts[stream.id] || 0
      }))

      const newStreams = new Map(streams)
      newStreams.set(subEventId, streamsWithCounts)
      setStreams(newStreams)
    } catch (error) {
      console.error('Error loading streams:', error)
      toast.error('Failed to load streams')
    }
  }

  const handleAddStream = (subEventId: string) => {
    setSelectedSubEventIdForDay(subEventId)
    setEditingDayId('')
    setDayDialogOpen(true)
  }

  const handleEditStream = (streamId: string, subEventId: string) => {
    setSelectedSubEventIdForDay(subEventId)
    setEditingDayId(streamId)
    setDayDialogOpen(true)
  }

  const handleDeleteStream = (stream: Stream, _subEventId: string) => {
    setDeletingItem({
      id: stream.id,
      name: stream.name,
      type: 'day' as const,
    })
    setDeleteDialogOpen(true)
  }

  const handleStreamSuccess = () => {
    // Reload Streams for the current SubEvent
    if (selectedSubEventIdForDay) {
      loadStreams(selectedSubEventIdForDay)
    }
    setDayDialogOpen(false)
    setEditingDayId('')
    setSelectedSubEventIdForDay('')
  }

  const handleStreamDeleted = () => {
    // Reload Streams for all expanded subevents
    expandedSubEvents.forEach(subEventId => {
      loadStreams(subEventId)
    })
    setDeleteDialogOpen(false)
  }

  if (!isUserAdmin) {
    return (
      <div className="container mx-auto py-12 text-center">
        <h1 className="text-2xl font-bold text-muted-foreground">Access Denied</h1>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Archive Management</h1>
          <p className="text-muted-foreground mt-1">Manage tournaments, events, and videos</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tournaments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
          <TabsTrigger value="unsorted">Unsorted Videos</TabsTrigger>
        </TabsList>

        {/* Tournaments Tab */}
        <TabsContent value="tournaments" className="space-y-6">
          <div className="flex items-center justify-end">
            <Button onClick={handleCreateTournament}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tournament
            </Button>
          </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tournaments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            <SelectItem value="WSOP">WSOP</SelectItem>
            <SelectItem value="Triton">Triton</SelectItem>
            <SelectItem value="EPT">EPT</SelectItem>
            <SelectItem value="APT">APT</SelectItem>
            <SelectItem value="APL">APL</SelectItem>
            <SelectItem value="Hustler Casino Live">Hustler Casino Live</SelectItem>
            <SelectItem value="GGPOKER">GGPOKER</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Game Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="tournament">Tournament</SelectItem>
            <SelectItem value="cash-game">Cash Game</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="min-w-[200px] cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('name')}
                  {...getSortAriaProps('name', sortField, sortDirection)}
                >
                  <div className="flex items-center gap-2">
                    Name
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="w-32 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('category')}
                  {...getSortAriaProps('category', sortField, sortDirection)}
                >
                  <div className="flex items-center gap-2">
                    Category
                    {sortField === 'category' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="w-32 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('type')}
                  {...getSortAriaProps('type', sortField, sortDirection)}
                >
                  <div className="flex items-center gap-2">
                    Type
                    {sortField === 'type' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="w-40 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('location')}
                  {...getSortAriaProps('location', sortField, sortDirection)}
                >
                  <div className="flex items-center gap-2">
                    Location
                    {sortField === 'location' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="w-48 cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('date')}
                  {...getSortAriaProps('date', sortField, sortDirection)}
                >
                  <div className="flex items-center gap-2">
                    Date Range
                    {sortField === 'date' ? (
                      sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTournaments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    No tournaments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTournaments.flatMap((tournament) => {
                  const isExpanded = expandedTournaments.has(tournament.id)
                  const tournamentSubEvents = subEvents.get(tournament.id) || []

                  const rows = []

                  // Tournament Row
                  rows.push(
                    <TableRow
                      key={tournament.id}
                      className="hover:bg-muted/50 cursor-pointer"
                      onClick={() => toggleTournamentExpand(tournament.id)}
                    >
                        <TableCell className="font-medium min-w-[200px]">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTournamentExpand(tournament.id)
                              }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            {(() => {
                              const category = getCategoryByAlias(tournament.category)
                              return category?.logoUrl ? (
                                <Image
                                  src={category.logoUrl}
                                  alt={tournament.category}
                                  width={24}
                                  height={24}
                                  className="object-contain"
                                />
                              ) : null
                            })()}
                            {tournament.name}
                          </div>
                        </TableCell>
                        <TableCell className="w-32">
                          <Badge variant="outline">{tournament.category}</Badge>
                        </TableCell>
                        <TableCell className="w-32">
                          <Badge variant={tournament.game_type === 'tournament' ? 'default' : 'secondary'}>
                            {tournament.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-40">
                          {tournament.city && tournament.country
                            ? `${tournament.city}, ${tournament.country}`
                            : tournament.location}
                        </TableCell>
                        <TableCell className="w-48 text-xs text-muted-foreground">
                          {new Date(tournament.start_date).toLocaleDateString()} -{' '}
                          {new Date(tournament.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="w-36 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddSubEvent(tournament.id)
                              }}
                              title="Add SubEvent"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditTournament(tournament)
                              }}
                              title="Edit Tournament"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteTournament(tournament)
                              }}
                              title="Delete Tournament"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                  )

                  // SubEvent Rows (if tournament is expanded)
                  if (isExpanded) {
                    if (tournamentSubEvents.length === 0) {
                      rows.push(
                        <TableRow key={`${tournament.id}-no-subevents`}>
                          <TableCell colSpan={6} className="bg-muted/30 text-center py-3 text-sm text-muted-foreground">
                            No events yet. Add one to get started.
                          </TableCell>
                        </TableRow>
                      )
                    } else {
                      tournamentSubEvents.forEach((subEvent) => {
                        const isSubEventExpanded = expandedSubEvents.has(subEvent.id)
                        const subEventStreams = streams.get(subEvent.id) || []

                        // SubEvent Row
                        rows.push(
                          <TableRow
                            key={subEvent.id}
                            className="hover:bg-muted/30 cursor-pointer bg-muted/20"
                            onClick={() => toggleSubEventExpand(subEvent.id)}
                          >
                            <TableCell className="font-medium min-w-[200px]">
                              <div className="flex items-center gap-2 pl-4">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleSubEventExpand(subEvent.id)
                                                  }}
                                                >
                                                  {isSubEventExpanded ? (
                                                    <ChevronDown className="h-3 w-3" />
                                                  ) : (
                                                    <ChevronRight className="h-3 w-3" />
                                                  )}
                                                </Button>
                                                {subEvent.name}
                                              </div>
                                            </TableCell>
                                            <TableCell className="w-32 text-xs">{subEvent.event_number || '-'}</TableCell>
                                            <TableCell className="w-32 text-xs">{subEvent.buy_in || '-'}</TableCell>
                                            <TableCell className="w-40 text-xs">{subEvent.entry_count || '-'}</TableCell>
                                            <TableCell className="w-48 text-xs">
                                              {subEvent.date ? new Date(subEvent.date).toLocaleDateString() : '-'}
                                            </TableCell>
                                            <TableCell className="w-36 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleAddStream(subEvent.id)
                                                  }}
                                                  title="Add Stream"
                                                >
                                                  <Plus className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleEditSubEvent(subEvent.id, tournament.id)
                                                  }}
                                                  title="Edit SubEvent"
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteSubEvent(subEvent, tournament.id)
                                                  }}
                                                  title="Delete SubEvent"
                                                >
                                                  <Trash2 className="h-3 w-3 text-destructive" />
                                                </Button>
                                              </div>
                                            </TableCell>
                                          </TableRow>
                        )

                        // Stream Rows (if subEvent is expanded)
                        if (isSubEventExpanded) {
                          if (subEventStreams.length === 0) {
                            rows.push(
                              <TableRow key={`${subEvent.id}-no-streams`}>
                                <TableCell colSpan={6} className="bg-muted/10 text-center py-2 text-xs text-muted-foreground">
                                  No streams yet. Add one to get started.
                                </TableCell>
                              </TableRow>
                            )
                          } else {
                            subEventStreams.forEach((stream) => {
                              rows.push(
                                <TableRow key={stream.id} className="bg-muted/10 hover:bg-muted/20 h-10">
                                  <TableCell className="font-medium text-xs min-w-[200px] py-2">
                                    <div className="pl-8">{stream.name}</div>
                                  </TableCell>
                                  <TableCell className="w-32 text-xs py-2">
                                    <Badge variant="secondary" className="text-xs">
                                      {stream.video_source || 'youtube'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="w-32 text-xs py-2">
                                    <Badge variant="outline" className="text-xs">
                                      {stream.hand_count || 0} hands
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="w-40 py-2" />
                                  <TableCell className="w-48 text-xs py-2">
                                    {stream.published_at
                                      ? new Date(stream.published_at).toLocaleDateString()
                                      : stream.created_at
                                      ? new Date(stream.created_at).toLocaleDateString()
                                      : '-'}
                                  </TableCell>
                                  <TableCell className="w-36 text-right py-2">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEditStream(stream.id, subEvent.id)}
                                        title="Edit Stream"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteStream(stream, subEvent.id)}
                                        title="Delete Stream"
                                      >
                                        <Trash2 className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )
                            })
                          }
                        }
                      })
                    }
                  }

                  return rows
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Total: {tournaments.length} tournaments</span>
            <span>•</span>
            <span>Showing: {filteredTournaments.length} tournaments</span>
          </div>
        </TabsContent>

        {/* Unsorted Videos Tab */}
        <TabsContent value="unsorted">
          <UnsortedVideosTab onRefresh={loadTournaments} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TournamentDialog
        isOpen={tournamentDialogOpen}
        onOpenChange={setTournamentDialogOpen}
        editingTournamentId={editingTournamentId}
        onSave={handleTournamentSaved}
        onCancel={() => setTournamentDialogOpen(false)}
        newTournamentName={newTournamentName}
        setNewTournamentName={setNewTournamentName}
        newCategory={newCategory}
        setNewCategory={setNewCategory}
        newGameType={newGameType}
        setNewGameType={setNewGameType}
        newLocation={newLocation}
        setNewLocation={setNewLocation}
        newCity={newCity}
        setNewCity={setNewCity}
        newCountry={newCountry}
        setNewCountry={setNewCountry}
        newStartDate={newStartDate}
        setNewStartDate={setNewStartDate}
        newEndDate={newEndDate}
        setNewEndDate={setNewEndDate}
        newCategoryLogo={newCategoryLogo}
        setNewCategoryLogo={setNewCategoryLogo}
        isUserAdmin={isUserAdmin}
      />

      <DeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        item={deletingItem}
        onSuccess={
          deletingItem?.type === 'day'
            ? handleStreamDeleted
            : deletingItem?.type === 'subevent'
            ? handleSubEventDeleted
            : handleTournamentDeleted
        }
      />

      <SubEventDialog
        isOpen={subEventDialogOpen}
        onOpenChange={setSubEventDialogOpen}
        selectedTournamentId={selectedTournamentIdForSubEvent}
        editingSubEventId={editingSubEventId}
        onSuccess={handleSubEventSuccess}
      />

      <DayDialog
        isOpen={dayDialogOpen}
        onOpenChange={setDayDialogOpen}
        selectedSubEventId={selectedSubEventIdForDay}
        editingDayId={editingDayId}
        onSuccess={handleStreamSuccess}
      />
    </div>
  )
}
