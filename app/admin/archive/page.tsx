'use client'

/**
 * Admin Archive Management Page
 *
 * 관리자 전용 Archive 관리 페이지
 * - 토너먼트 목록 (테이블 뷰)
 * - CRUD 다이얼로그
 * - 검색 및 필터링
 * Firestore 버전으로 마이그레이션됨
 */

import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore'
import { firestore as db, auth } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type {
  FirestoreTournament,
  FirestoreEvent,
  FirestoreStream,
} from '@/lib/firestore-types'
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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, Loader2, ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { TournamentDialog } from '@/components/features/archive/TournamentDialog'
import { DeleteDialog } from '@/components/features/archive/dialogs/DeleteDialog'
import { SubEventDialog } from '@/components/features/archive/dialogs/SubEventDialog'
import { DayDialog } from '@/components/features/archive/dialogs/DayDialog'
import { AnalyzeVideoDialog, type StreamWithIds } from '@/components/features/archive/dialogs/AnalyzeVideoDialog'
import { UnsortedVideosTab } from './_components/UnsortedVideosTab'
import type { Tournament, FolderItem, ContentStatus, Event, Stream } from '@/lib/types/archive'
import type { AdminArchiveSortField, SortDirection } from '@/lib/types/sorting'
import { getSortAriaProps } from '@/hooks/useSorting'
import { useRouter } from 'next/navigation'
import { StreamStatusBadge } from '@/components/admin/archive/StreamStatusBadge'
import { StreamActions } from '@/components/admin/archive/StreamActions'
import { StreamProgressIndicator } from '@/components/admin/archive/StreamProgressIndicator'
import { StatusFilter } from '@/components/admin/archive/StatusFilter'
import { CategoryFilter } from '@/components/admin/archive/CategoryFilter'
import { BulkActions } from '@/components/admin/archive/BulkActions'

// Helper: Timestamp to string
function timestampToString(ts: Timestamp | { toDate: () => Date } | null | undefined): string {
  if (!ts) return ''
  if (ts instanceof Timestamp) return ts.toDate().toISOString()
  if ('toDate' in ts) return ts.toDate().toISOString()
  return ''
}

export default function AdminArchivePage() {
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [gameTypeFilter, setGameTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all')
  const [selectedStreamIds, setSelectedStreamIds] = useState<Set<string>>(new Set())
  const [selectedStreamMeta, setSelectedStreamMeta] = useState<Map<string, {tournamentId: string, eventId: string}>>(new Map())
  const [sortField, setSortField] = useState<AdminArchiveSortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [_userEmail, setUserEmail] = useState<string | null>(null)
  const [isUserAdmin, setIsUserAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<'tournaments' | 'unsorted'>('tournaments')

  // Dialog states
  const [tournamentDialogOpen, setTournamentDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTournamentId, setEditingTournamentId] = useState('')
  const [deletingItem, setDeletingItem] = useState<FolderItem | null>(null)

  // SubEvent states
  const [expandedTournaments, setExpandedTournaments] = useState<Set<string>>(new Set())
  const [subEvents, setSubEvents] = useState<Map<string, Event[]>>(new Map())
  const [subEventDialogOpen, setSubEventDialogOpen] = useState(false)
  const [editingSubEventId, setEditingSubEventId] = useState('')
  const [selectedTournamentIdForSubEvent, setSelectedTournamentIdForSubEvent] = useState('')

  // Stream/Day states
  const [expandedSubEvents, setExpandedSubEvents] = useState<Set<string>>(new Set())
  const [streams, setStreams] = useState<Map<string, (Stream & { hand_count?: number })[]>>(new Map())
  const [dayDialogOpen, setDayDialogOpen] = useState(false)
  const [editingDayId, setEditingDayId] = useState('')
  const [selectedSubEventIdForDay, setSelectedSubEventIdForDay] = useState('')

  // KAN Analyze states
  const [analyzeDialogOpen, setAnalyzeDialogOpen] = useState(false)
  const [selectedStreamForAnalyze, setSelectedStreamForAnalyze] = useState<StreamWithIds | null>(null)

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

  // Auth check with Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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
    })

    return () => unsubscribe()
  }, [router])

  // Load tournaments
  useEffect(() => {
    if (!isUserAdmin) return
    loadTournaments()
  }, [isUserAdmin])

  // Reload streams when status filter changes
  useEffect(() => {
    expandedSubEvents.forEach(subEventId => {
      // Find the tournament ID for this subEvent
      for (const [tournamentId, events] of subEvents.entries()) {
        const foundEvent = events.find(e => e.id === subEventId)
        if (foundEvent) {
          loadStreams(tournamentId, subEventId)
          break
        }
      }
    })
  }, [statusFilter])

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
      const tournamentsRef = collection(db, COLLECTION_PATHS.TOURNAMENTS)
      const tournamentsQuery = query(tournamentsRef, orderBy('endDate', 'desc'))
      const snapshot = await getDocs(tournamentsQuery)

      const tournamentsList: Tournament[] = snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreTournament
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          category_logo: data.categoryInfo?.logo,
          game_type: data.gameType,
          location: data.location,
          city: data.city,
          country: data.country,
          start_date: timestampToString(data.startDate),
          end_date: timestampToString(data.endDate),
          total_prize: data.totalPrize,
          status: data.status,
          created_at: timestampToString(data.createdAt),
        }
      })

      setTournaments(tournamentsList)
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  const handleSort = (field: AdminArchiveSortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
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
      if (!subEvents.has(tournamentId)) {
        await loadSubEvents(tournamentId)
      }
    }

    setExpandedTournaments(newExpanded)
  }

  const loadSubEvents = async (tournamentId: string) => {
    try {
      const eventsRef = collection(db, COLLECTION_PATHS.EVENTS(tournamentId))
      const eventsQuery = query(eventsRef, orderBy('date', 'desc'))
      const snapshot = await getDocs(eventsQuery)

      const eventsList: Event[] = snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreEvent
        return {
          id: doc.id,
          tournament_id: tournamentId,
          name: data.name,
          date: timestampToString(data.date),
          event_number: data.eventNumber,
          total_prize: data.totalPrize,
          winner: data.winner,
          buy_in: data.buyIn,
          entry_count: data.entryCount,
          blind_structure: data.blindStructure,
          level_duration: data.levelDuration,
          starting_stack: data.startingStack,
          notes: data.notes,
          status: data.status,
          created_at: timestampToString(data.createdAt),
        }
      })

      const newSubEvents = new Map(subEvents)
      newSubEvents.set(tournamentId, eventsList)
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

  const handleDeleteSubEvent = (subEvent: Event, _tournamentId: string) => {
    setDeletingItem({
      id: subEvent.id,
      name: subEvent.name,
      type: 'event' as const,
    })
    setDeleteDialogOpen(true)
  }

  const handleSubEventSuccess = () => {
    if (selectedTournamentIdForSubEvent) {
      loadSubEvents(selectedTournamentIdForSubEvent)
    }
    setSubEventDialogOpen(false)
    setEditingSubEventId('')
    setSelectedTournamentIdForSubEvent('')
  }

  const handleSubEventDeleted = () => {
    expandedTournaments.forEach(tournamentId => {
      loadSubEvents(tournamentId)
    })
    setDeleteDialogOpen(false)
  }

  // Stream/Day functions
  const toggleSubEventExpand = async (tournamentId: string, subEventId: string) => {
    const newExpanded = new Set(expandedSubEvents)

    if (newExpanded.has(subEventId)) {
      newExpanded.delete(subEventId)
    } else {
      newExpanded.add(subEventId)
      if (!streams.has(subEventId)) {
        await loadStreams(tournamentId, subEventId)
      }
    }

    setExpandedSubEvents(newExpanded)
  }

  const loadStreams = async (tournamentId: string, subEventId: string) => {
    try {
      const streamsRef = collection(db, COLLECTION_PATHS.STREAMS(tournamentId, subEventId))
      let streamsQuery = query(streamsRef, orderBy('publishedAt', 'desc'))

      // Status filter is handled client-side since Firestore doesn't support combining orderBy with where on different fields easily
      const snapshot = await getDocs(streamsQuery)

      // Get hand counts for these streams
      const streamsList: (Stream & { hand_count?: number })[] = []

      for (const doc of snapshot.docs) {
        const data = doc.data() as FirestoreStream

        // Apply status filter
        if (statusFilter !== 'all' && data.status !== statusFilter) {
          continue
        }

        // Get hand count from embedded stats or query hands collection
        let handCount = data.stats?.handsCount || 0

        streamsList.push({
          id: doc.id,
          event_id: subEventId,
          name: data.name,
          description: data.description,
          video_url: data.videoUrl,
          video_file: data.videoFile,
          video_source: data.videoSource,
          status: data.status,
          gcs_path: data.gcsPath,
          gcs_uri: data.gcsUri,
          gcs_file_size: data.gcsFileSize,
          gcs_uploaded_at: timestampToString(data.gcsUploadedAt),
          upload_status: data.uploadStatus,
          video_duration: data.videoDuration,
          published_at: timestampToString(data.publishedAt),
          created_at: timestampToString(data.createdAt),
          hand_count: handCount,
        })
      }

      const newStreams = new Map(streams)
      newStreams.set(subEventId, streamsList)
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
      type: 'stream' as const,
    })
    setDeleteDialogOpen(true)
  }

  const handleStreamSuccess = () => {
    // Find tournament ID for the subEvent
    if (selectedSubEventIdForDay) {
      for (const [tournamentId, events] of subEvents.entries()) {
        if (events.some(e => e.id === selectedSubEventIdForDay)) {
          loadStreams(tournamentId, selectedSubEventIdForDay)
          break
        }
      }
    }
    setDayDialogOpen(false)
    setEditingDayId('')
    setSelectedSubEventIdForDay('')
  }

  const handleStreamDeleted = () => {
    // Reload Streams for all expanded subevents
    for (const subEventId of expandedSubEvents) {
      for (const [tournamentId, events] of subEvents.entries()) {
        if (events.some(e => e.id === subEventId)) {
          loadStreams(tournamentId, subEventId)
          break
        }
      }
    }
    setDeleteDialogOpen(false)
  }

  // KAN Analyze functions
  const handleOpenAnalyze = (stream: Stream, tournamentId: string, eventId: string) => {
    setSelectedStreamForAnalyze({
      ...stream,
      tournamentId,
      eventId,
      // Ensure FirestoreStream compatibility
      name: stream.name,
      description: stream.description,
      videoUrl: stream.video_url,
      videoFile: stream.video_file,
      videoNasPath: stream.video_nas_path,
      videoSource: stream.video_source,
      createdAt: stream.created_at ? new Date(stream.created_at) as any : new Date() as any,
      updatedAt: stream.created_at ? new Date(stream.created_at) as any : new Date() as any,
    } as unknown as StreamWithIds)
    setAnalyzeDialogOpen(true)
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

      {/* Custom Tabs */}
      <div className="space-y-6">
        <div className="border-b border-border">
          <nav className="flex gap-6 -mb-px" aria-label="Archive tabs">
            <button
              onClick={() => setActiveTab('tournaments')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'tournaments'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              aria-current={activeTab === 'tournaments' ? 'page' : undefined}
            >
              Tournaments
            </button>
            <button
              onClick={() => setActiveTab('unsorted')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'unsorted'
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
              aria-current={activeTab === 'unsorted' ? 'page' : undefined}
            >
              Unsorted Videos
            </button>
          </nav>
        </div>

        {/* Tournaments Tab */}
        {activeTab === 'tournaments' && (
          <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4 flex-wrap">
              <StatusFilter value={statusFilter} onChange={setStatusFilter} />
              <div className="h-6 w-px bg-border" />
              <CategoryFilter value={categoryFilter} onChange={setCategoryFilter} />
            </div>
            <Button onClick={handleCreateTournament}>
              <Plus className="mr-2 h-4 w-4" />
              Add Tournament
            </Button>
          </div>

      {/* Bulk Actions */}
      {selectedStreamIds.size > 0 && (
        <BulkActions
          selectedStreamIds={Array.from(selectedStreamIds)}
          selectedStreamMeta={selectedStreamMeta}
          onSuccess={() => {
            // Reload streams for expanded subevents
            for (const subEventId of expandedSubEvents) {
              for (const [tournamentId, events] of subEvents.entries()) {
                if (events.some(e => e.id === subEventId)) {
                  loadStreams(tournamentId, subEventId)
                  break
                }
              }
            }
          }}
          onClearSelection={() => {
            setSelectedStreamIds(new Set())
            setSelectedStreamMeta(new Map())
          }}
        />
      )}

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
        <select
          value={gameTypeFilter}
          onChange={(e) => setGameTypeFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary min-w-[180px]"
          aria-label="Game type filter"
        >
          <option value="all">All Types</option>
          <option value="tournament">Tournament</option>
          <option value="cash-game">Cash Game</option>
        </select>
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
                <TableHead className="w-10" />
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
                          {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString() : ''} -{' '}
                          {tournament.end_date ? new Date(tournament.end_date).toLocaleDateString() : ''}
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
                            onClick={() => toggleSubEventExpand(tournament.id, subEvent.id)}
                          >
                            <TableCell className="font-medium min-w-[200px]">
                              <div className="flex items-center gap-2 pl-4">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-5 w-5 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    toggleSubEventExpand(tournament.id, subEvent.id)
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
                              const streamStatus = (stream.status || 'draft') as ContentStatus
                              const isSelected = selectedStreamIds.has(stream.id)

                              rows.push(
                                <TableRow
                                  key={stream.id}
                                  className={`bg-muted/10 hover:bg-muted/20 h-10 ${isSelected ? 'bg-primary/10' : ''}`}
                                >
                                  {/* Checkbox */}
                                  <TableCell className="w-10 py-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation()
                                        const newSelected = new Set(selectedStreamIds)
                                        const newMeta = new Map(selectedStreamMeta)
                                        if (e.target.checked) {
                                          newSelected.add(stream.id)
                                          newMeta.set(stream.id, {
                                            tournamentId: tournament.id,
                                            eventId: subEvent.id
                                          })
                                        } else {
                                          newSelected.delete(stream.id)
                                          newMeta.delete(stream.id)
                                        }
                                        setSelectedStreamIds(newSelected)
                                        setSelectedStreamMeta(newMeta)
                                      }}
                                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                                    />
                                  </TableCell>

                                  <TableCell className="font-medium text-xs min-w-[200px] py-2">
                                    <div className="pl-8">{stream.name}</div>
                                  </TableCell>

                                  {/* Status Badge */}
                                  <TableCell className="w-32 text-xs py-2">
                                    <StreamStatusBadge status={streamStatus} />
                                  </TableCell>

                                  <TableCell className="w-32 text-xs py-2">
                                    <div className="flex flex-col gap-1">
                                      <Badge variant="outline" className="text-xs">
                                        {stream.hand_count || 0} hands
                                      </Badge>
                                      <StreamProgressIndicator streamId={stream.id} />
                                    </div>
                                  </TableCell>
                                  <TableCell className="w-40 py-2" />
                                  <TableCell className="w-48 text-xs py-2">
                                    {stream.published_at
                                      ? new Date(stream.published_at).toLocaleDateString()
                                      : stream.created_at
                                      ? new Date(stream.created_at).toLocaleDateString()
                                      : '-'}
                                  </TableCell>

                                  {/* Actions */}
                                  <TableCell className="w-36 text-right py-2">
                                    <div className="flex items-center justify-end gap-2">
                                      <StreamActions
                                        streamId={stream.id}
                                        streamName={stream.name}
                                        currentStatus={streamStatus}
                                        tournamentId={tournament.id}
                                        eventId={subEvent.id}
                                        videoUrl={stream.video_url}
                                        stream={stream}
                                        onStatusChange={() => loadStreams(tournament.id, subEvent.id)}
                                        onOpenAnalyze={() => handleOpenAnalyze(stream, tournament.id, subEvent.id)}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleEditStream(stream.id, subEvent.id)
                                        }}
                                        title="Edit Stream"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteStream(stream, subEvent.id)
                                        }}
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
            <span>-</span>
            <span>Showing: {filteredTournaments.length} tournaments</span>
          </div>
        </div>
        )}

        {/* Unsorted Videos Tab */}
        {activeTab === 'unsorted' && (
          <UnsortedVideosTab onRefresh={loadTournaments} />
        )}
      </div>

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
          deletingItem?.type === 'stream'
            ? handleStreamDeleted
            : deletingItem?.type === 'event'
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

      {/* KAN Analyze Dialog */}
      <AnalyzeVideoDialog
        isOpen={analyzeDialogOpen}
        onOpenChange={setAnalyzeDialogOpen}
        day={selectedStreamForAnalyze}
        onSuccess={() => {
          // Reload streams when analysis completes
          if (selectedStreamForAnalyze) {
            // Find parent subEvent to reload
            for (const [subEventId, streamList] of streams.entries()) {
              if (streamList.some(s => s.id === selectedStreamForAnalyze.id)) {
                // Find tournament ID
                for (const [tournamentId, events] of subEvents.entries()) {
                  if (events.some(e => e.id === subEventId)) {
                    loadStreams(tournamentId, subEventId)
                    break
                  }
                }
                break
              }
            }
          }
        }}
      />
    </div>
  )
}
