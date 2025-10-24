'use client'

/**
 * Admin Archive Management Page
 *
 * 관리자 전용 Archive 관리 페이지
 * - 토너먼트 목록 (테이블 뷰)
 * - CRUD 다이얼로그
 * - 검색 및 필터링
 */

import { useEffect, useState } from 'react'
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
import { Plus, Pencil, Trash2, Search, Loader2, ChevronRight, ChevronDown } from 'lucide-react'
import { TournamentDialog } from '@/components/tournament-dialog'
import { DeleteDialog } from '@/components/archive-dialogs/delete-dialog'
import { SubEventDialog } from '@/components/archive-dialogs/sub-event-dialog'
import type { Tournament, FolderItem } from '@/lib/types/archive'
import type { SubEvent } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminArchivePage() {
  const [loading, setLoading] = useState(true)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [gameTypeFilter, setGameTypeFilter] = useState('all')
  const [userEmail, setUserEmail] = useState<string | null>(null)
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

  // Tournament form states
  const [newTournamentName, setNewTournamentName] = useState('')
  const [newCategory, setNewCategory] = useState<Tournament['category']>('WSOP')
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

  // Filter tournaments
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

    setFilteredTournaments(filtered)
  }, [tournaments, categoryFilter, gameTypeFilter, searchQuery])

  const loadTournaments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: false })

      if (error) throw error
      setTournaments(data || [])
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTournament = () => {
    setEditingTournamentId('')
    setNewTournamentName('')
    setNewCategory('WSOP')
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

  const handleDeleteSubEvent = (subEvent: SubEvent, tournamentId: string) => {
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
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                filteredTournaments.map((tournament) => {
                  const isExpanded = expandedTournaments.has(tournament.id)
                  const tournamentSubEvents = subEvents.get(tournament.id) || []

                  return (
                    <>
                      {/* Tournament Row */}
                      <TableRow key={tournament.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleTournamentExpand(tournament.id)}
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
                        <TableCell>
                          <Badge variant="outline">{tournament.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tournament.game_type === 'tournament' ? 'default' : 'secondary'}>
                            {tournament.game_type === 'tournament' ? 'Tournament' : 'Cash Game'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tournament.city && tournament.country
                            ? `${tournament.city}, ${tournament.country}`
                            : tournament.location}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(tournament.start_date).toLocaleDateString()} -{' '}
                          {new Date(tournament.end_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTournament(tournament)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTournament(tournament)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* SubEvents (expanded) */}
                      {isExpanded && (
                        <TableRow key={`${tournament.id}-subevents`}>
                          <TableCell colSpan={6} className="p-0">
                            <div className="bg-muted/30 p-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold">Events</h4>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddSubEvent(tournament.id)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Event
                                </Button>
                              </div>

                              {tournamentSubEvents.length === 0 ? (
                                <div className="text-center py-6 text-sm text-muted-foreground">
                                  No events yet. Add one to get started.
                                </div>
                              ) : (
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Event #</TableHead>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Buy-in</TableHead>
                                      <TableHead>Entries</TableHead>
                                      <TableHead>Winner</TableHead>
                                      <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {tournamentSubEvents.map((subEvent) => (
                                      <TableRow key={subEvent.id}>
                                        <TableCell className="font-medium">{subEvent.name}</TableCell>
                                        <TableCell>{subEvent.event_number || '-'}</TableCell>
                                        <TableCell className="text-xs">
                                          {subEvent.date ? new Date(subEvent.date).toLocaleDateString() : '-'}
                                        </TableCell>
                                        <TableCell className="text-xs">{subEvent.buy_in || '-'}</TableCell>
                                        <TableCell>{subEvent.entry_count || '-'}</TableCell>
                                        <TableCell className="text-xs">{subEvent.winner || '-'}</TableCell>
                                        <TableCell className="text-right">
                                          <div className="flex items-center justify-end gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleEditSubEvent(subEvent.id, tournament.id)}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleDeleteSubEvent(subEvent, tournament.id)}
                                            >
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
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
        isUserAdmin={isUserAdmin}
      />

      <DeleteDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        item={deletingItem}
        onSuccess={deletingItem?.type === 'subevent' ? handleSubEventDeleted : handleTournamentDeleted}
      />

      <SubEventDialog
        isOpen={subEventDialogOpen}
        onOpenChange={setSubEventDialogOpen}
        selectedTournamentId={selectedTournamentIdForSubEvent}
        editingSubEventId={editingSubEventId}
        onSuccess={handleSubEventSuccess}
      />
    </div>
  )
}
