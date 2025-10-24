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
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react'
import { TournamentDialog } from '@/components/tournament-dialog'
import { DeleteDialog } from '@/components/archive-dialogs/delete-dialog'
import type { Tournament, FolderItem } from '@/lib/types/archive'
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
                filteredTournaments.map((tournament) => (
                  <TableRow key={tournament.id}>
                    <TableCell className="font-medium">{tournament.name}</TableCell>
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
                ))
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
        onSuccess={handleTournamentDeleted}
      />
    </div>
  )
}
