"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ChevronDown, ChevronRight, Star, Download, MessageSquare, Plus, Upload, Server, Youtube, Play, CheckCircle, X, Edit, Trash, MoreVertical, Info, Folder } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { supabase } from "@/lib/supabase"
import type { Tournament as TournamentType, SubEvent as SubEventType, Day as DayType, Hand as HandType } from "@/lib/supabase"
import { fetchTournamentsTree } from "@/lib/queries"
import { toast } from "sonner"
import type { HandHistory } from "@/lib/types/hand-history"
import { isAdmin } from "@/lib/auth-utils"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { EmptyState } from "@/components/empty-state"

// Dynamic imports for heavy components
const VideoPlayerDialog = dynamic(() => import("@/components/video-player-dialog").then(mod => ({ default: mod.VideoPlayerDialog })), {
  ssr: false
})

const HandListAccordion = dynamic(() => import("@/components/hand-list-accordion").then(mod => ({ default: mod.HandListAccordion })), {
  ssr: false,
  loading: () => <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-md" />)}</div>
})

// Extended types with UI state
type Tournament = TournamentType & {
  sub_events?: SubEvent[]
  expanded: boolean
}

type SubEvent = SubEventType & {
  days?: Day[]
  expanded: boolean
}

type Day = DayType & {
  selected: boolean
}

type Hand = HandType & {
  checked: boolean
}

export default function ArchivePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [hands, setHands] = useState<Hand[]>([])
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Tournament dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTournamentId, setEditingTournamentId] = useState<string>("")
  const [newTournamentName, setNewTournamentName] = useState("")
  const [newCategory, setNewCategory] = useState<TournamentType["category"]>("WSOP")
  const [newLocation, setNewLocation] = useState("")
  const [newStartDate, setNewStartDate] = useState("")
  const [newEndDate, setNewEndDate] = useState("")

  // SubEvent dialog states
  const [isSubEventDialogOpen, setIsSubEventDialogOpen] = useState(false)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("")
  const [editingSubEventId, setEditingSubEventId] = useState<string>("")
  const [newSubEventName, setNewSubEventName] = useState("")
  const [newSubEventDate, setNewSubEventDate] = useState("")
  const [newSubEventPrize, setNewSubEventPrize] = useState("")
  const [newSubEventWinner, setNewSubEventWinner] = useState("")
  const [newSubEventBuyIn, setNewSubEventBuyIn] = useState("")
  const [newSubEventEntryCount, setNewSubEventEntryCount] = useState("")
  const [newSubEventBlindStructure, setNewSubEventBlindStructure] = useState("")
  const [newSubEventLevelDuration, setNewSubEventLevelDuration] = useState("")
  const [newSubEventStartingStack, setNewSubEventStartingStack] = useState("")
  const [newSubEventNotes, setNewSubEventNotes] = useState("")

  // SubEvent Info dialog
  const [isSubEventInfoDialogOpen, setIsSubEventInfoDialogOpen] = useState(false)
  const [viewingSubEventId, setViewingSubEventId] = useState<string>("")
  const [viewingSubEvent, setViewingSubEvent] = useState<SubEvent | null>(null)
  const [viewingPayouts, setViewingPayouts] = useState<any[]>([])
  const [loadingViewingPayouts, setLoadingViewingPayouts] = useState(false)
  const [isEditingViewingPayouts, setIsEditingViewingPayouts] = useState(false)
  const [editingViewingPayouts, setEditingViewingPayouts] = useState<PayoutRow[]>([])
  const [savingPayouts, setSavingPayouts] = useState(false)

  // Payout dialog states
  type PayoutRow = { rank: number; playerName: string; prizeAmount: string }
  const [payouts, setPayouts] = useState<PayoutRow[]>([
    { rank: 1, playerName: "", prizeAmount: "" }
  ])
  const [payoutSectionOpen, setPayoutSectionOpen] = useState(false)
  const [hendonMobUrl, setHendonMobUrl] = useState("")
  const [hendonMobHtml, setHendonMobHtml] = useState("")
  const [csvText, setCsvText] = useState("")
  const [loadingPayouts, setLoadingPayouts] = useState(false)

  // Day dialog states
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false)
  const [selectedSubEventId, setSelectedSubEventId] = useState<string>("")
  const [editingDayId, setEditingDayId] = useState<string>("")
  const [newDayName, setNewDayName] = useState("")
  const [videoSourceTab, setVideoSourceTab] = useState<'nas' | 'youtube' | 'upload'>('nas')
  const [newDayVideoUrl, setNewDayVideoUrl] = useState("")
  const [newDayNasPath, setNewDayNasPath] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Video player dialog states
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [videoStartTime, setVideoStartTime] = useState<string>("")

  // Dropdown menu state
  const [openMenuId, setOpenMenuId] = useState<string>("")

  // Load user session
  useEffect(() => {
    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUserEmail(session?.user?.email || null)
    }
    loadUser()
  }, [])

  // Load tournaments with sub_events and days
  useEffect(() => {
    loadTournaments()
  }, [])

  // Load hands when day is selected
  useEffect(() => {
    if (selectedDay) {
      loadHands(selectedDay)
    }
  }, [selectedDay])

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId("")
      }
    }
    document.addEventListener("click", handleClickOutside)
    return () => document.removeEventListener("click", handleClickOutside)
  }, [openMenuId])

  // Load payouts when viewing sub event info
  useEffect(() => {
    if (isSubEventInfoDialogOpen && viewingSubEventId) {
      loadViewingPayouts(viewingSubEventId)
    }
  }, [isSubEventInfoDialogOpen, viewingSubEventId])

  async function loadViewingPayouts(subEventId: string) {
    setLoadingViewingPayouts(true)
    try {
      const { data, error } = await supabase
        .from('event_payouts')
        .select('*')
        .eq('sub_event_id', subEventId)
        .order('rank', { ascending: true })

      if (error) throw error

      setViewingPayouts(data || [])
    } catch (error) {
      console.error('Error loading payouts:', error)
      setViewingPayouts([])
    } finally {
      setLoadingViewingPayouts(false)
    }
  }

  async function loadTournaments() {
    setLoading(true)
    try {
      const tournamentsData = await fetchTournamentsTree()

      const tournamentsWithUIState = tournamentsData.map((tournament: any) => ({
        ...tournament,
        sub_events: tournament.sub_events?.map((subEvent: any) => ({
          ...subEvent,
          days: subEvent.days?.map((day: any) => ({ ...day, selected: false })),
          expanded: false,
        })),
        expanded: true,
      }))

      setTournaments(tournamentsWithUIState)

      // Auto-select first day if available
      if (tournamentsWithUIState.length > 0 &&
          tournamentsWithUIState[0].sub_events?.length &&
          tournamentsWithUIState[0].sub_events[0].days?.length) {
        const firstDay = tournamentsWithUIState[0].sub_events[0].days[0]
        setSelectedDay(firstDay.id)
        setTournaments(prev =>
          prev.map((t, ti) => ({
            ...t,
            sub_events: t.sub_events?.map((se, sei) => ({
              ...se,
              days: se.days?.map((d, di) => ({
                ...d,
                selected: ti === 0 && sei === 0 && di === 0
              }))
            }))
          }))
        )
      }
    } catch (error) {
      console.error('Error loading tournaments:', error)
      toast.error('Failed to load tournaments')
    } finally {
      setLoading(false)
    }
  }

  async function loadHands(dayId: string) {
    try {
      const { data, error } = await supabase
        .from('hands')
        .select(`
          *,
          hand_players(
            position,
            cards,
            player:players(name)
          )
        `)
        .eq('day_id', dayId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setHands((data || []).map(hand => ({ ...hand, checked: false })))
    } catch (error) {
      console.error('Error loading hands:', error)
    }
  }

  const toggleTournament = (tournamentId: string) => {
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === tournamentId ? { ...t, expanded: !t.expanded } : t
      )
    )
  }

  const toggleSubEvent = (tournamentId: string, subEventId: string) => {
    setTournaments((prev) =>
      prev.map((t) =>
        t.id === tournamentId
          ? {
              ...t,
              sub_events: t.sub_events?.map((se) =>
                se.id === subEventId ? { ...se, expanded: !se.expanded } : se
              ),
            }
          : t
      )
    )
  }

  const selectDay = (dayId: string) => {
    setSelectedDay(dayId)
    setTournaments((prev) =>
      prev.map((t) => ({
        ...t,
        sub_events: t.sub_events?.map((se) => ({
          ...se,
          days: se.days?.map((d) => ({
            ...d,
            selected: d.id === dayId,
          })),
        })),
      }))
    )
  }

  const toggleFavorite = async (handId: string) => {
    const hand = hands.find(h => h.id === handId)
    if (!hand) return

    try {
      const { error } = await supabase
        .from('hands')
        .update({ favorite: !hand.favorite })
        .eq('id', handId)

      if (error) throw error

      setHands((prev) =>
        prev.map((h) => (h.id === handId ? { ...h, favorite: !h.favorite } : h))
      )
    } catch (error) {
      console.error('Error toggling favorite:', error)
    }
  }

  const toggleChecked = (handId: string) => {
    setHands((prev) =>
      prev.map((h) => (h.id === handId ? { ...h, checked: !h.checked } : h))
    )
  }

  const addNewTournament = async () => {
    if (!newTournamentName.trim() || !newLocation.trim() || !newStartDate || !newEndDate) return

    // Call updateTournament if in edit mode
    if (editingTournamentId) {
      return updateTournament()
    }

    try {
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          name: newTournamentName,
          category: newCategory,
          location: newLocation,
          start_date: newStartDate,
          end_date: newEndDate,
        })
        .select()
        .single()

      if (error) throw error

      await loadTournaments()

      setNewTournamentName("")
      setNewCategory("WSOP")
      setNewLocation("")
      setNewStartDate("")
      setNewEndDate("")
      setEditingTournamentId("")
      setIsDialogOpen(false)
      toast.success('Tournament added successfully')
    } catch (error) {
      console.error('Error adding tournament:', error)
      toast.error('Failed to add tournament')
    }
  }

  // Payout helper functions
  const addPayoutRow = () => {
    setPayouts([...payouts, { rank: payouts.length + 1, playerName: "", prizeAmount: "" }])
  }

  const removePayoutRow = (index: number) => {
    if (payouts.length === 1) return // Keep at least 1
    const newPayouts = payouts.filter((_, i) => i !== index)
    // Re-sort ranks
    setPayouts(newPayouts.map((p, i) => ({ ...p, rank: i + 1 })))
  }

  const updatePayoutRow = (index: number, field: keyof PayoutRow, value: string | number) => {
    const newPayouts = [...payouts]
    newPayouts[index] = { ...newPayouts[index], [field]: value }
    setPayouts(newPayouts)
  }

  // Prize amount parser: "$10M" → 1000000000 (cents), "$10,000,000" → 1000000000
  const parsePrizeAmount = (amountStr: string): number => {
    if (!amountStr) return 0

    // Remove $ and spaces
    let cleaned = amountStr.replace(/[$\s]/g, '')

    // Handle M (million) and K (thousand)
    if (cleaned.includes('M')) {
      const num = parseFloat(cleaned.replace('M', ''))
      return Math.round(num * 1000000 * 100) // Convert to cents
    } else if (cleaned.includes('K')) {
      const num = parseFloat(cleaned.replace('K', ''))
      return Math.round(num * 1000 * 100)
    } else {
      // Remove commas and parse
      const num = parseFloat(cleaned.replace(/,/g, ''))
      return Math.round(num * 100) // Convert to cents
    }
  }

  // Load payouts from Hendon Mob URL
  const loadPayoutsFromUrl = async () => {
    if (!hendonMobUrl.trim()) return

    setLoadingPayouts(true)
    try {
      const response = await fetch('/api/parse-hendon-mob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: hendonMobUrl.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse URL')
      }

      if (data.payouts && data.payouts.length > 0) {
        const loadedPayouts = data.payouts.map((p: any) => ({
          rank: p.rank,
          playerName: p.playerName,
          prizeAmount: p.prizeAmount, // Already in display format from API
        }))
        setPayouts(loadedPayouts)
        setHendonMobUrl("") // Clear URL after successful load
        toast.success(`${loadedPayouts.length} payouts loaded successfully`)
      } else {
        toast.error('Payout information not found')
      }
    } catch (error: any) {
      console.error('Error loading payouts from URL:', error)
      toast.error(error.message || 'Failed to load payouts')
    } finally {
      setLoadingPayouts(false)
    }
  }

  // Load payouts from HTML
  const loadPayoutsFromHtml = async () => {
    if (!hendonMobHtml.trim()) return

    setLoadingPayouts(true)
    try {
      const response = await fetch('/api/parse-hendon-mob-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: hendonMobHtml.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse HTML')
      }

      if (data.payouts && data.payouts.length > 0) {
        const loadedPayouts = data.payouts.map((p: any) => ({
          rank: p.rank,
          playerName: p.playerName,
          prizeAmount: p.prizeAmount,
        }))
        setPayouts(loadedPayouts)
        setHendonMobHtml("") // Clear HTML after successful load
        toast.success(`${loadedPayouts.length} payouts loaded successfully`)
      } else {
        toast.error('Payout information not found')
      }
    } catch (error: any) {
      console.error('Error loading payouts from HTML:', error)
      toast.error(error.message || 'Failed to load payouts')
    } finally {
      setLoadingPayouts(false)
    }
  }

  // Load payouts from CSV
  const loadPayoutsFromCsv = async () => {
    if (!csvText.trim()) return

    setLoadingPayouts(true)
    try {
      const response = await fetch('/api/parse-payout-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText: csvText.trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse CSV')
      }

      if (data.payouts && data.payouts.length > 0) {
        const loadedPayouts = data.payouts.map((p: any) => ({
          rank: p.rank,
          playerName: p.playerName,
          prizeAmount: p.prizeAmount,
        }))
        setPayouts(loadedPayouts)
        setCsvText("") // Clear CSV after successful load
        toast.success(`${loadedPayouts.length} payouts loaded successfully`)
      } else {
        toast.error('Payout information not found')
      }
    } catch (error: any) {
      console.error('Error loading payouts from CSV:', error)
      toast.error(error.message || 'Failed to load payouts')
    } finally {
      setLoadingPayouts(false)
    }
  }

  const addSubEvent = async () => {
    if (!newSubEventName.trim() || !newSubEventDate) return

    // Call updateSubEvent if in edit mode
    if (editingSubEventId) {
      return updateSubEvent()
    }

    try {
      // 1. Create SubEvent
      const { data: subEventData, error: subEventError} = await supabase
        .from('sub_events')
        .insert({
          tournament_id: selectedTournamentId,
          name: newSubEventName,
          date: newSubEventDate,
          total_prize: newSubEventPrize || null,
          winner: newSubEventWinner || null,
          buy_in: newSubEventBuyIn || null,
          entry_count: newSubEventEntryCount ? parseInt(newSubEventEntryCount) : null,
          blind_structure: newSubEventBlindStructure || null,
          level_duration: newSubEventLevelDuration ? parseInt(newSubEventLevelDuration) : null,
          starting_stack: newSubEventStartingStack ? parseInt(newSubEventStartingStack) : null,
          notes: newSubEventNotes || null,
        })
        .select()
        .single()

      if (subEventError) throw subEventError

      // 2. Save Payouts (only if values exist)
      const validPayouts = payouts.filter(p => p.playerName.trim() && p.prizeAmount.trim())
      if (validPayouts.length > 0) {
        const payoutInserts = validPayouts.map(p => ({
          sub_event_id: subEventData.id,
          rank: p.rank,
          player_name: p.playerName.trim(),
          prize_amount: parsePrizeAmount(p.prizeAmount),
          matched_status: 'unmatched' as const,
        }))

        const { error: payoutError } = await supabase
          .from('event_payouts')
          .insert(payoutInserts)

        if (payoutError) {
          console.error('Payout insert error:', payoutError)
          toast.error('Failed to save payouts')
          // SubEvent created, so no rollback
        }
      }

      await loadTournaments()

      // Reset states
      setNewSubEventName("")
      setNewSubEventDate("")
      setNewSubEventPrize("")
      setNewSubEventWinner("")
      setNewSubEventBuyIn("")
      setNewSubEventEntryCount("")
      setNewSubEventBlindStructure("")
      setNewSubEventLevelDuration("")
      setNewSubEventStartingStack("")
      setNewSubEventNotes("")
      setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
      setPayoutSectionOpen(false)
      setEditingSubEventId("")
      setIsSubEventDialogOpen(false)
      toast.success('Event added successfully')
    } catch (error) {
      console.error('Error adding sub event:', error)
      toast.error('Failed to add event')
    }
  }

  const addDay = async () => {
    try {
      // Call updateDay if in edit mode
      if (editingDayId) {
        return updateDay()
      }

      let videoData: any = {
        sub_event_id: selectedSubEventId,
        name: newDayName.trim() || `Day ${new Date().toISOString()}`,
        video_source: videoSourceTab,
      }

      // NAS source
      if (videoSourceTab === 'nas') {
        if (!newDayNasPath.trim()) {
          alert('Please enter NAS file path')
          return
        }
        videoData.video_nas_path = newDayNasPath.trim()
      }

      // YouTube source
      if (videoSourceTab === 'youtube') {
        if (!newDayVideoUrl.trim()) {
          alert('Please enter YouTube URL')
          return
        }
        videoData.video_url = newDayVideoUrl.trim()
      }

      // File upload source
      if (videoSourceTab === 'upload') {
        if (!uploadFile) {
          alert('Please select a file to upload')
          return
        }

        setUploading(true)

        // Upload to Supabase Storage
        const fileName = `${selectedSubEventId}-${Date.now()}-${uploadFile.name}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('videos')
          .upload(fileName, uploadFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert('Failed to upload file')
          setUploading(false)
          return
        }

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('videos')
          .getPublicUrl(fileName)

        videoData.video_file = publicUrl
        setUploading(false)
      }

      // Create Day
      const { data, error } = await supabase
        .from('days')
        .insert(videoData)
        .select()
        .single()

      if (error) throw error

      await loadTournaments()

      // Reset states
      setNewDayName("")
      setNewDayVideoUrl("")
      setNewDayNasPath("")
      setUploadFile(null)
      setVideoSourceTab('nas')
      setEditingDayId("")
      setIsDayDialogOpen(false)
    } catch (error) {
      console.error('Error adding day:', error)
      setUploading(false)
    }
  }

  // Update functions
  const updateTournament = async () => {
    if (!editingTournamentId || !newTournamentName.trim()) return

    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          name: newTournamentName,
          category: newCategory,
          location: newLocation,
          start_date: newStartDate,
          end_date: newEndDate,
        })
        .eq('id', editingTournamentId)

      if (error) throw error

      await loadTournaments()
      setEditingTournamentId("")
      setNewTournamentName("")
      setNewCategory("WSOP")
      setNewLocation("")
      setNewStartDate("")
      setNewEndDate("")
      setIsDialogOpen(false)
      toast.success('Tournament updated successfully')
    } catch (error) {
      console.error('Error updating tournament:', error)
      toast.error('Failed to update tournament')
    }
  }

  const updateSubEvent = async () => {
    if (!editingSubEventId || !newSubEventName.trim()) return

    try {
      // 1. Update SubEvent
      const { error: subEventError } = await supabase
        .from('sub_events')
        .update({
          name: newSubEventName,
          date: newSubEventDate,
          total_prize: newSubEventPrize || null,
          winner: newSubEventWinner || null,
          buy_in: newSubEventBuyIn || null,
          entry_count: newSubEventEntryCount ? parseInt(newSubEventEntryCount) : null,
          blind_structure: newSubEventBlindStructure || null,
          level_duration: newSubEventLevelDuration ? parseInt(newSubEventLevelDuration) : null,
          starting_stack: newSubEventStartingStack ? parseInt(newSubEventStartingStack) : null,
          notes: newSubEventNotes || null,
        })
        .eq('id', editingSubEventId)

      if (subEventError) throw subEventError

      // 2. Update Payouts (delete existing and recreate)
      // Delete existing payouts
      const { error: deleteError } = await supabase
        .from('event_payouts')
        .delete()
        .eq('sub_event_id', editingSubEventId)

      if (deleteError) {
        console.error('Error deleting old payouts:', deleteError)
      }

      // Insert new payouts (only if values exist)
      const validPayouts = payouts.filter(p => p.playerName.trim() && p.prizeAmount.trim())
      if (validPayouts.length > 0) {
        const payoutInserts = validPayouts.map(p => ({
          sub_event_id: editingSubEventId,
          rank: p.rank,
          player_name: p.playerName.trim(),
          prize_amount: parsePrizeAmount(p.prizeAmount),
          matched_status: 'unmatched' as const,
        }))

        const { error: payoutError } = await supabase
          .from('event_payouts')
          .insert(payoutInserts)

        if (payoutError) {
          console.error('Payout insert error:', payoutError)
          toast.error('Failed to save payouts')
        }
      }

      await loadTournaments()
      setEditingSubEventId("")
      setNewSubEventName("")
      setNewSubEventDate("")
      setNewSubEventPrize("")
      setNewSubEventWinner("")
      setNewSubEventBuyIn("")
      setNewSubEventEntryCount("")
      setNewSubEventBlindStructure("")
      setNewSubEventLevelDuration("")
      setNewSubEventStartingStack("")
      setNewSubEventNotes("")
      setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
      setPayoutSectionOpen(false)
      setIsSubEventDialogOpen(false)
      toast.success('Event updated successfully')
    } catch (error) {
      console.error('Error updating sub event:', error)
      toast.error('Failed to update event')
    }
  }

  const updateDay = async () => {
    if (!editingDayId || !newDayName.trim()) return

    try {
      let videoData: any = {
        name: newDayName.trim(),
        video_source: videoSourceTab,
      }

      if (videoSourceTab === 'nas') {
        videoData.video_nas_path = newDayNasPath.trim()
        videoData.video_url = null
        videoData.video_file = null
      } else if (videoSourceTab === 'youtube') {
        videoData.video_url = newDayVideoUrl.trim()
        videoData.video_nas_path = null
        videoData.video_file = null
      }

      const { error } = await supabase
        .from('days')
        .update(videoData)
        .eq('id', editingDayId)

      if (error) throw error

      await loadTournaments()
      setEditingDayId("")
      setNewDayName("")
      setNewDayVideoUrl("")
      setNewDayNasPath("")
      setIsDayDialogOpen(false)
      toast.success('Day updated successfully')
    } catch (error) {
      console.error('Error updating day:', error)
      toast.error('Failed to update day')
    }
  }

  // Delete functions
  const deleteTournament = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament and all its data?')) return

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)

      if (error) throw error

      await loadTournaments()
      toast.success('Tournament deleted successfully')
    } catch (error) {
      console.error('Error deleting tournament:', error)
      toast.error('Failed to delete tournament')
    }
  }

  const deleteSubEvent = async (subEventId: string) => {
    if (!confirm('Are you sure you want to delete this event and all its data?')) return

    try {
      const { error } = await supabase
        .from('sub_events')
        .delete()
        .eq('id', subEventId)

      if (error) throw error

      await loadTournaments()
      toast.success('Event deleted successfully')
    } catch (error) {
      console.error('Error deleting sub event:', error)
      toast.error('Failed to delete event')
    }
  }

  const deleteDay = async (dayId: string) => {
    if (!confirm('Are you sure you want to delete this day and all hand data?')) return

    try {
      const { error } = await supabase
        .from('days')
        .delete()
        .eq('id', dayId)

      if (error) throw error

      await loadTournaments()
      if (selectedDay === dayId) {
        setSelectedDay("")
        setHands([])
      }
      toast.success('Day deleted successfully')
    } catch (error) {
      console.error('Error deleting day:', error)
      toast.error('Failed to delete day')
    }
  }

  // Functions to open edit dialogs
  const openEditTournament = (tournament: Tournament) => {
    setEditingTournamentId(tournament.id)
    setNewTournamentName(tournament.name)
    setNewCategory(tournament.category)
    setNewLocation(tournament.location || "")
    setNewStartDate(tournament.start_date || "")
    setNewEndDate(tournament.end_date || "")
    setIsDialogOpen(true)
  }

  const openEditSubEvent = async (subEvent: SubEvent, tournamentId: string) => {
    setEditingSubEventId(subEvent.id)
    setSelectedTournamentId(tournamentId)
    setNewSubEventName(subEvent.name)
    setNewSubEventDate(subEvent.date || "")
    setNewSubEventPrize(subEvent.total_prize || "")
    setNewSubEventWinner(subEvent.winner || "")
    setNewSubEventBuyIn(subEvent.buy_in || "")
    setNewSubEventEntryCount(subEvent.entry_count?.toString() || "")
    setNewSubEventBlindStructure(subEvent.blind_structure || "")
    setNewSubEventLevelDuration(subEvent.level_duration?.toString() || "")
    setNewSubEventStartingStack(subEvent.starting_stack?.toString() || "")
    setNewSubEventNotes(subEvent.notes || "")

    // Load existing payouts
    try {
      const { data: existingPayouts, error } = await supabase
        .from('event_payouts')
        .select('*')
        .eq('sub_event_id', subEvent.id)
        .order('rank', { ascending: true })

      if (error) throw error

      if (existingPayouts && existingPayouts.length > 0) {
        const loadedPayouts = existingPayouts.map(p => ({
          rank: p.rank,
          playerName: p.player_name,
          prizeAmount: formatPrizeAmount(p.prize_amount), // cents -> display format
        }))
        setPayouts(loadedPayouts)
        setPayoutSectionOpen(true) // Auto-open if existing payouts
      } else {
        setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
        setPayoutSectionOpen(false)
      }
    } catch (error) {
      console.error('Error loading payouts:', error)
      setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
      setPayoutSectionOpen(false)
    }

    setIsSubEventDialogOpen(true)
  }

  // Format cents to display format: 1000000000 -> "$10,000,000"
  const formatPrizeAmount = (cents: number): string => {
    const dollars = cents / 100
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }

  // Extract country info from player name
  const getCountryInfo = (playerName: string): { flag: string; iso2: string; cleanName: string } => {
    const match = playerName.match(/\(([A-Z]{2,3})\)$/)
    if (!match) {
      return { flag: '', iso2: '', cleanName: playerName }
    }

    let countryCode = match[1]

    // Convert 3-letter to 2-letter ISO code
    const country3to2: Record<string, string> = {
      'USA': 'US', 'GBR': 'GB', 'KOR': 'KR', 'JPN': 'JP', 'CHN': 'CN',
      'FRA': 'FR', 'DEU': 'DE', 'ITA': 'IT', 'ESP': 'ES', 'CAN': 'CA',
      'AUS': 'AU', 'BRA': 'BR', 'MEX': 'MX', 'RUS': 'RU', 'IND': 'IN',
      'NLD': 'NL', 'BEL': 'BE', 'SWE': 'SE', 'NOR': 'NO', 'DNK': 'DK',
      'FIN': 'FI', 'POL': 'PL', 'CZE': 'CZ', 'AUT': 'AT', 'CHE': 'CH',
      'PRT': 'PT', 'GRC': 'GR', 'TUR': 'TR', 'ISR': 'IL', 'ARE': 'AE',
      'SAU': 'SA', 'EGY': 'EG', 'ZAF': 'ZA', 'ARG': 'AR', 'CHL': 'CL',
      'COL': 'CO', 'PER': 'PE', 'VEN': 'VE', 'THA': 'TH', 'VNM': 'VN',
      'MYS': 'MY', 'SGP': 'SG', 'IDN': 'ID', 'PHL': 'PH', 'HKG': 'HK',
      'TWN': 'TW', 'MAC': 'MO', 'NZL': 'NZ', 'IRL': 'IE', 'LUX': 'LU',
    }

    const iso2 = country3to2[countryCode] || (countryCode.length === 2 ? countryCode : countryCode.substring(0, 2))

    // Try to convert 2-letter ISO code to flag emoji
    let flag = ''
    try {
      flag = iso2
        .toUpperCase()
        .split('')
        .map(char => String.fromCodePoint(0x1F1E6 + char.charCodeAt(0) - 65))
        .join('')

      // Test if emoji is valid (some browsers don't support all flags)
      // If not, we'll fall back to ISO code
    } catch (e) {
      flag = ''
    }

    const cleanName = playerName.replace(/\s*\([A-Z]{2,3}\)$/, '')

    return { flag, iso2, cleanName }
  }

  const openEditDay = (day: Day, subEventId: string) => {
    setEditingDayId(day.id)
    setSelectedSubEventId(subEventId)
    setNewDayName(day.name)
    setVideoSourceTab(day.video_source || 'nas')
    setNewDayVideoUrl(day.video_url || "")
    setNewDayNasPath(day.video_nas_path || "")
    setIsDayDialogOpen(true)
  }

  // Editing payout helper functions for viewing dialog
  const addEditingPayoutRow = () => {
    setEditingViewingPayouts([...editingViewingPayouts, {
      rank: editingViewingPayouts.length + 1,
      playerName: "",
      prizeAmount: ""
    }])
  }

  const removeEditingPayoutRow = (index: number) => {
    if (editingViewingPayouts.length === 1) return
    const newPayouts = editingViewingPayouts.filter((_, i) => i !== index)
    setEditingViewingPayouts(newPayouts.map((p, i) => ({ ...p, rank: i + 1 })))
  }

  const updateEditingPayoutRow = (index: number, field: keyof PayoutRow, value: string | number) => {
    const newPayouts = [...editingViewingPayouts]
    newPayouts[index] = { ...newPayouts[index], [field]: value }
    setEditingViewingPayouts(newPayouts)
  }

  // Enter edit mode for viewing payouts
  const enterEditMode = () => {
    const payoutsToEdit = viewingPayouts.map(p => ({
      rank: p.rank,
      playerName: p.player_name,
      prizeAmount: formatPrizeAmount(p.prize_amount),
    }))
    setEditingViewingPayouts(payoutsToEdit.length > 0 ? payoutsToEdit : [{ rank: 1, playerName: "", prizeAmount: "" }])
    setIsEditingViewingPayouts(true)
  }

  // Cancel editing
  const cancelEditingPayouts = () => {
    setIsEditingViewingPayouts(false)
    setEditingViewingPayouts([])
  }

  // Save edited payouts
  const saveEditingPayouts = async () => {
    if (!viewingSubEventId) return

    setSavingPayouts(true)
    try {
      // 1. Delete old payouts
      const { error: deleteError } = await supabase
        .from('event_payouts')
        .delete()
        .eq('sub_event_id', viewingSubEventId)

      if (deleteError) throw deleteError

      // 2. Insert new payouts (only valid ones)
      const validPayouts = editingViewingPayouts.filter(p => p.playerName.trim() && p.prizeAmount.trim())
      if (validPayouts.length > 0) {
        const payoutInserts = validPayouts.map(p => ({
          sub_event_id: viewingSubEventId,
          rank: p.rank,
          player_name: p.playerName.trim(),
          prize_amount: parsePrizeAmount(p.prizeAmount),
          matched_status: 'unmatched' as const,
        }))

        const { error: insertError } = await supabase
          .from('event_payouts')
          .insert(payoutInserts)

        if (insertError) throw insertError
      }

      // 3. Reload payouts and exit edit mode
      await loadViewingPayouts(viewingSubEventId)
      setIsEditingViewingPayouts(false)
      setEditingViewingPayouts([])
      toast.success('Payouts saved successfully')
    } catch (error) {
      console.error('Error saving payouts:', error)
      toast.error('Failed to save payouts')
    } finally {
      setSavingPayouts(false)
    }
  }

  // Check if user is admin
  const isUserAdmin = isAdmin(userEmail)

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Header />
        <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
          <ResizablePanelGroup direction="horizontal" className="gap-6">
            <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
              <CardSkeleton count={1} variant="compact" />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={75} minSize={60}>
              <CardSkeleton count={2} variant="detailed" />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />

      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <ResizablePanelGroup direction="horizontal" className="gap-6">
          {/* Left: Hierarchical tree structure */}
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40}>
            <Card className="p-4 bg-card h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-title">Events</h2>
                {isUserAdmin && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTournamentId ? "Edit Tournament" : "Add Tournament"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select value={newCategory} onValueChange={(value) => setNewCategory(value as TournamentType["category"])}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="WSOP">WSOP</SelectItem>
                            <SelectItem value="Triton">Triton</SelectItem>
                            <SelectItem value="EPT">EPT</SelectItem>
                            <SelectItem value="APL">APL</SelectItem>
                            <SelectItem value="Hustler Casino Live">Hustler Casino Live</SelectItem>
                            <SelectItem value="WSOP Classic">WSOP Classic</SelectItem>
                            <SelectItem value="GGPOKER">GGPOKER</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tournament-name">Tournament Name</Label>
                        <Input
                          id="tournament-name"
                          placeholder="e.g., 2025 WSOP Main Event"
                          value={newTournamentName}
                          onChange={(e) => setNewTournamentName(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          placeholder="e.g., Las Vegas, Seoul, Online"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="start-date">Start Date</Label>
                          <Input
                            id="start-date"
                            type="date"
                            value={newStartDate}
                            onChange={(e) => setNewStartDate(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="end-date">End Date</Label>
                          <Input
                            id="end-date"
                            type="date"
                            value={newEndDate}
                            onChange={(e) => setNewEndDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => {
                          setIsDialogOpen(false)
                          setEditingTournamentId("")
                        }}>
                          Cancel
                        </Button>
                        <Button onClick={addNewTournament}>
                          {editingTournamentId ? "Edit" : "Add"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                )}
              </div>
              <ScrollArea className="h-[calc(100vh-240px)]">
                <div className="space-y-1">
                  {tournaments.map((tournament) => (
                    <div key={tournament.id}>
                      {/* Tournament Level */}
                      <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
                        <div
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => toggleTournament(tournament.id)}
                        >
                          {tournament.expanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/10 text-xs font-bold text-primary flex-shrink-0">
                            {tournament.category.charAt(0)}
                          </div>
                          <span className="text-body font-normal text-foreground">
                            {tournament.name}
                          </span>
                        </div>
                        {isUserAdmin && (
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuId(openMenuId === `tournament-${tournament.id}` ? "" : `tournament-${tournament.id}`)
                              }}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                            {openMenuId === `tournament-${tournament.id}` && (
                              <div className="absolute right-0 top-8 z-50 w-auto rounded-md border bg-popover p-1 shadow-md">
                                <div className="flex flex-col gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      openEditTournament(tournament)
                                      setOpenMenuId("")
                                    }}
                                    title="Edit"
                                  >
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setSelectedTournamentId(tournament.id)
                                      setIsSubEventDialogOpen(true)
                                      setOpenMenuId("")
                                    }}
                                    title="이벤트 Add"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteTournament(tournament.id)
                                      setOpenMenuId("")
                                    }}
                                    title="Delete"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* SubEvent Level */}
                      {tournament.expanded && (
                        <div className="ml-4">
                          {tournament.sub_events?.map((subEvent) => (
                            <div key={subEvent.id}>
                              <div className="flex items-center justify-between gap-2 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors group">
                                <div
                                  className="flex items-center gap-2 flex-1 cursor-pointer"
                                  onClick={() =>
                                    toggleSubEvent(tournament.id, subEvent.id)
                                  }
                                >
                                  {subEvent.expanded ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  <span className="text-body font-normal text-foreground">
                                    {subEvent.name}
                                  </span>
                                </div>
                                <div className="relative flex items-center gap-1">
                                  {/* Info button - visible to all users */}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setViewingSubEventId(subEvent.id)
                                      setViewingSubEvent(subEvent)
                                      setIsSubEventInfoDialogOpen(true)
                                    }}
                                    title="정보 보기"
                                  >
                                    <Info className="h-4 w-4" />
                                  </Button>

                                  {/* Management menu - admin only */}
                                  {isUserAdmin && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenMenuId(openMenuId === `subevent-${subEvent.id}` ? "" : `subevent-${subEvent.id}`)
                                        }}
                                      >
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                      {openMenuId === `subevent-${subEvent.id}` && (
                                        <div className="absolute right-0 top-8 z-50 w-auto rounded-md border bg-popover p-1 shadow-md">
                                          <div className="flex flex-col gap-0.5">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                openEditSubEvent(subEvent, tournament.id)
                                                setOpenMenuId("")
                                              }}
                                              title="Edit"
                                            >
                                              <Edit className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedTournamentId(tournament.id)
                                                setSelectedSubEventId(subEvent.id)
                                                setIsDayDialogOpen(true)
                                                setOpenMenuId("")
                                              }}
                                              title="Day Add"
                                            >
                                              <Plus className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                deleteSubEvent(subEvent.id)
                                                setOpenMenuId("")
                                              }}
                                              title="Delete"
                                            >
                                              <Trash className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Day Level */}
                              {subEvent.expanded && (
                                <div className="ml-8">
                                  {subEvent.days?.map((day) => (
                                    <div
                                      key={day.id}
                                      className={`flex items-center justify-between gap-2 py-2 px-3 rounded-md transition-colors group ${
                                        day.selected
                                          ? "bg-primary/10 text-primary font-medium"
                                          : "hover:bg-muted/50 text-foreground"
                                      }`}
                                    >
                                      <span
                                        className="text-body flex-1 cursor-pointer"
                                        onClick={() => selectDay(day.id)}
                                      >
                                        {day.name}
                                      </span>
                                      {/* Day management menu - admin only */}
                                      {isUserAdmin && (
                                        <div className="relative">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              setOpenMenuId(openMenuId === `day-${day.id}` ? "" : `day-${day.id}`)
                                            }}
                                          >
                                            <MoreVertical className="h-4 w-4" />
                                          </Button>
                                          {openMenuId === `day-${day.id}` && (
                                            <div className="absolute right-0 top-8 z-50 w-auto rounded-md border bg-popover p-1 shadow-md">
                                              <div className="flex flex-col gap-0.5">
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    openEditDay(day, subEvent.id)
                                                    setOpenMenuId("")
                                                  }}
                                                  title="Edit"
                                                >
                                                  <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteDay(day.id)
                                                    setOpenMenuId("")
                                                  }}
                                                  title="Delete"
                                                >
                                                  <Trash className="h-3.5 w-3.5" />
                                                </Button>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </Card>

            {/* SubEvent Dialog */}
            <Dialog open={isSubEventDialogOpen} onOpenChange={setIsSubEventDialogOpen}>
              <DialogContent className="max-w-5xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>{editingSubEventId ? "이벤트 Edit" : "이벤트 Add"}</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">기본 정보</TabsTrigger>
                    <TabsTrigger value="payout">페이아웃</TabsTrigger>
                    <TabsTrigger value="structure">블라인드 구조</TabsTrigger>
                  </TabsList>

                  {/* 기본 정보 탭 */}
                  <TabsContent value="basic" className="space-y-4 mt-4">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="subevent-name">Event Name *</Label>
                          <Input
                            id="subevent-name"
                            placeholder="e.g., Main Event, High Roller"
                            value={newSubEventName}
                            onChange={(e) => setNewSubEventName(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-date">Date *</Label>
                          <Input
                            id="subevent-date"
                            type="date"
                            value={newSubEventDate}
                            onChange={(e) => setNewSubEventDate(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-prize">Total Prize</Label>
                          <Input
                            id="subevent-prize"
                            placeholder="e.g., $10,000,000"
                            value={newSubEventPrize}
                            onChange={(e) => setNewSubEventPrize(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-winner">Winner</Label>
                          <Input
                            id="subevent-winner"
                            placeholder="e.g., Daniel Negreanu"
                            value={newSubEventWinner}
                            onChange={(e) => setNewSubEventWinner(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-buyin">Buy-in</Label>
                          <Input
                            id="subevent-buyin"
                            placeholder="e.g., $10,000 + $400"
                            value={newSubEventBuyIn}
                            onChange={(e) => setNewSubEventBuyIn(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-entries">Entry Count</Label>
                          <Input
                            id="subevent-entries"
                            type="number"
                            placeholder="e.g., 8569"
                            value={newSubEventEntryCount}
                            onChange={(e) => setNewSubEventEntryCount(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-level-duration">Level Duration (min)</Label>
                          <Input
                            id="subevent-level-duration"
                            type="number"
                            placeholder="e.g., 60"
                            value={newSubEventLevelDuration}
                            onChange={(e) => setNewSubEventLevelDuration(e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-starting-stack">Starting Stack</Label>
                          <Input
                            id="subevent-starting-stack"
                            type="number"
                            placeholder="e.g., 60000"
                            value={newSubEventStartingStack}
                            onChange={(e) => setNewSubEventStartingStack(e.target.value)}
                          />
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* 페이아웃 탭 */}
                  <TabsContent value="payout" className="space-y-4 mt-4">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-3">
                        {/* Load Payouts Tabs */}
                        <Tabs defaultValue="html" className="w-full">
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="html">HTML</TabsTrigger>
                            <TabsTrigger value="csv">CSV</TabsTrigger>
                            <TabsTrigger value="manual">Manual</TabsTrigger>
                          </TabsList>

                          {/* HTML Tab */}
                          <TabsContent value="html" className="space-y-2 mt-3">
                            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border overflow-hidden">
                              <Label className="text-sm font-medium">Paste HTML Source Code</Label>
                              <Textarea
                                placeholder="1. Open Hendon Mob page in browser&#10;2. Right-click → 'View Page Source' (or Ctrl+U)&#10;3. Copy all HTML (Ctrl+A, Ctrl+C)&#10;4. Paste here"
                                value={hendonMobHtml}
                                onChange={(e) => setHendonMobHtml(e.target.value)}
                                disabled={loadingPayouts}
                                className="h-[150px] max-h-[150px] w-full overflow-x-auto overflow-y-auto font-mono text-xs resize-none break-all"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={loadPayoutsFromHtml}
                                  disabled={!hendonMobHtml.trim() || loadingPayouts}
                                  className="flex-1"
                                >
                                  {loadingPayouts ? "Loading..." : "Parse HTML"}
                                </Button>
                              </div>
                              <p className="text-caption text-muted-foreground">
                                Recommended method. Bypasses bot protection.
                              </p>
                            </div>
                          </TabsContent>

                          {/* CSV Tab */}
                          <TabsContent value="csv" className="space-y-2 mt-3">
                            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border overflow-hidden">
                              <Label className="text-sm font-medium">Paste CSV Data</Label>
                              <Textarea
                                placeholder="Format:&#10;Rank, Player Name, Prize Amount&#10;1, John Doe, $10,000,000&#10;2, Jane Smith, $5,500,000&#10;3, Bob Johnson, $3,000,000&#10;...&#10;&#10;Or without header:&#10;1, John Doe, $10M&#10;2, Jane Smith, $5.5M"
                                value={csvText}
                                onChange={(e) => setCsvText(e.target.value)}
                                disabled={loadingPayouts}
                                className="h-[150px] max-h-[150px] w-full overflow-x-auto overflow-y-auto font-mono text-xs resize-none break-all"
                              />
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={loadPayoutsFromCsv}
                                  disabled={!csvText.trim() || loadingPayouts}
                                  className="flex-1"
                                >
                                  {loadingPayouts ? "Loading..." : "Parse CSV"}
                                </Button>
                              </div>
                              <p className="text-caption text-muted-foreground">
                                Works with any tournament. Supports $10M or $10,000,000 format.
                              </p>
                            </div>
                          </TabsContent>

                          {/* Manual Tab */}
                          <TabsContent value="manual" className="space-y-2 mt-3">
                            <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                              <div className="flex items-center justify-between">
                                <Label className="text-sm font-medium">Enter Payout Information</Label>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addPayoutRow}
                                >
                                  <Plus className="mr-2 h-3 w-3" />
                                  Add Place
                                </Button>
                              </div>
                              <p className="text-caption text-muted-foreground mb-2">
                                Format: $10M, $10,000,000, or 10000000
                              </p>
                              <ScrollArea className="h-[200px] max-h-[200px]">
                                <div className="space-y-2 pr-3">
                                  {payouts.map((payout, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                      <div className="w-16">
                                        <Input
                                          placeholder="#"
                                          value={payout.rank}
                                          disabled
                                          className="text-center"
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <Input
                                          placeholder="Player Name"
                                          value={payout.playerName}
                                          onChange={(e) => updatePayoutRow(index, 'playerName', e.target.value)}
                                        />
                                      </div>
                                      <div className="w-40">
                                        <Input
                                          placeholder="Prize (e.g. $10M)"
                                          value={payout.prizeAmount}
                                          onChange={(e) => updatePayoutRow(index, 'prizeAmount', e.target.value)}
                                        />
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePayoutRow(index)}
                                        disabled={payouts.length === 1}
                                        className="h-9 w-9 p-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* 블라인드 구조 탭 */}
                  <TabsContent value="structure" className="space-y-4 mt-4">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="subevent-blind-structure">Blind Structure</Label>
                          <Textarea
                            id="subevent-blind-structure"
                            placeholder="Level 1: 100/200/200&#10;Level 2: 200/400/400&#10;Level 3: 300/600/600&#10;..."
                            value={newSubEventBlindStructure}
                            onChange={(e) => setNewSubEventBlindStructure(e.target.value)}
                            className="min-h-[300px] resize-none font-mono text-xs"
                          />
                          <p className="text-caption text-muted-foreground">
                            Enter blind levels in any format
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="subevent-notes">Notes</Label>
                          <Textarea
                            id="subevent-notes"
                            placeholder="Additional notes or information about the event"
                            value={newSubEventNotes}
                            onChange={(e) => setNewSubEventNotes(e.target.value)}
                            className="min-h-[150px] resize-none"
                          />
                          <p className="text-caption text-muted-foreground">
                            Any extra information (e.g., special rules, format, etc.)
                          </p>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => {
                      setIsSubEventDialogOpen(false)
                      setEditingSubEventId("")
                      setNewSubEventName("")
                      setNewSubEventDate("")
                      setNewSubEventPrize("")
                      setNewSubEventWinner("")
                      setNewSubEventBuyIn("")
                      setNewSubEventEntryCount("")
                      setNewSubEventBlindStructure("")
                      setNewSubEventLevelDuration("")
                      setNewSubEventStartingStack("")
                      setNewSubEventNotes("")
                      setPayouts([{ rank: 1, playerName: "", prizeAmount: "" }])
                      setPayoutSectionOpen(false)
                    }}>
                      Cancel
                    </Button>
                    <Button onClick={addSubEvent}>
                      {editingSubEventId ? "Edit" : "Add"}
                    </Button>
                  </div>
              </DialogContent>
            </Dialog>

            {/* SubEvent Info Dialog */}
            <Dialog open={isSubEventInfoDialogOpen} onOpenChange={(open) => {
              setIsSubEventInfoDialogOpen(open)
              if (!open) {
                // 다이얼로그 닫힐 때 편집 모드 초기화
                setIsEditingViewingPayouts(false)
                setEditingViewingPayouts([])
              }
            }}>
              <DialogContent className="max-w-3xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>이벤트 정보</DialogTitle>
                </DialogHeader>
                {viewingSubEvent && (
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">기본 정보</TabsTrigger>
                      <TabsTrigger value="payout">페이아웃</TabsTrigger>
                      <TabsTrigger value="structure">블라인드 구조</TabsTrigger>
                    </TabsList>

                    {/* 기본 정보 탭 */}
                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-caption text-muted-foreground">Event Name</Label>
                              <p className="text-body font-medium">{viewingSubEvent.name}</p>
                            </div>
                            <div>
                              <Label className="text-caption text-muted-foreground">Date</Label>
                              <p className="text-body font-medium">{viewingSubEvent.date || "-"}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-caption text-muted-foreground">Total Prize</Label>
                              <p className="text-body font-medium">{viewingSubEvent.total_prize || "-"}</p>
                            </div>
                            <div>
                              <Label className="text-caption text-muted-foreground">Winner</Label>
                              <p className="text-body font-medium">{viewingSubEvent.winner || "-"}</p>
                            </div>
                          </div>

                          <div className="border-t pt-4">
                            <h3 className="text-body font-semibold mb-3">Event Details</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label className="text-caption text-muted-foreground">Buy-in</Label>
                                <p className="text-body">{viewingSubEvent.buy_in || "-"}</p>
                              </div>
                              <div>
                                <Label className="text-caption text-muted-foreground">Entry Count</Label>
                                <p className="text-body">{viewingSubEvent.entry_count?.toLocaleString() || "-"}</p>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-caption text-muted-foreground">Level Duration</Label>
                              <p className="text-body">{viewingSubEvent.level_duration ? `${viewingSubEvent.level_duration} minutes` : "-"}</p>
                            </div>
                            <div>
                              <Label className="text-caption text-muted-foreground">Starting Stack</Label>
                              <p className="text-body">{viewingSubEvent.starting_stack?.toLocaleString() || "-"}</p>
                            </div>
                          </div>

                          {viewingSubEvent.notes && (
                            <div className="border-t pt-4">
                              <Label className="text-caption text-muted-foreground">Notes</Label>
                              <p className="text-body mt-1 p-3 rounded-md border bg-muted/30 whitespace-pre-wrap">{viewingSubEvent.notes}</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    {/* 페이아웃 탭 */}
                    <TabsContent value="payout" className="space-y-4 mt-4">
                      <ScrollArea className="h-[400px] pr-4">
                        {loadingViewingPayouts ? (
                          <div className="flex items-center justify-center h-40">
                            <p className="text-body text-muted-foreground">로딩 중...</p>
                          </div>
                        ) : isEditingViewingPayouts ? (
                          <div className="space-y-3">
                            {/* 편집 모드 */}
                            <div className="flex items-center justify-between mb-3">
                              <Label className="text-sm font-medium">페이아웃 Edit</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={addEditingPayoutRow}
                              >
                                <Plus className="mr-2 h-3 w-3" />
                                순위 Add
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {editingViewingPayouts.map((payout, index) => (
                                <div key={index} className="flex items-center gap-2">
                                  <div className="w-16">
                                    <Input
                                      placeholder="#"
                                      value={payout.rank}
                                      disabled
                                      className="text-center"
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <Input
                                      placeholder="Player 이름"
                                      value={payout.playerName}
                                      onChange={(e) => updateEditingPayoutRow(index, 'playerName', e.target.value)}
                                    />
                                  </div>
                                  <div className="w-40">
                                    <Input
                                      placeholder="$10M"
                                      value={payout.prizeAmount}
                                      onChange={(e) => updateEditingPayoutRow(index, 'prizeAmount', e.target.value)}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeEditingPayoutRow(index)}
                                    disabled={editingViewingPayouts.length === 1}
                                    className="h-9 w-9 p-0"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            <div className="flex justify-end gap-2 pt-3">
                              <Button
                                variant="outline"
                                onClick={cancelEditingPayouts}
                                disabled={savingPayouts}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={saveEditingPayouts}
                                disabled={savingPayouts}
                              >
                                {savingPayouts ? "저장 중..." : "저장"}
                              </Button>
                            </div>
                          </div>
                        ) : viewingPayouts.length > 0 ? (
                          <div className="space-y-2">
                            {/* 보기 모드 */}
                            {isUserAdmin && (
                              <div className="flex justify-end mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={enterEditMode}
                                >
                                  <Edit className="mr-2 h-3 w-3" />
                                  Edit
                                </Button>
                              </div>
                            )}
                            <div className="grid grid-cols-[50px_50px_1fr_auto] gap-3 p-3 bg-muted/30 rounded-md font-medium text-caption">
                              <div>순위</div>
                              <div>국가</div>
                              <div>Player</div>
                              <div className="text-right">상금</div>
                            </div>
                            {viewingPayouts.map((payout) => {
                              const { flag, iso2, cleanName } = getCountryInfo(payout.player_name)

                              return (
                                <div key={payout.id} className="grid grid-cols-[50px_50px_1fr_auto] gap-3 p-3 border rounded-md hover:bg-muted/50 transition-colors">
                                  <div className="text-body font-medium">{payout.rank}</div>
                                  <div className="text-body">
                                    {flag ? (
                                      <span className="text-lg" title={iso2}>{flag}</span>
                                    ) : iso2 ? (
                                      <span className="text-xs font-medium text-muted-foreground">{iso2}</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">-</span>
                                    )}
                                  </div>
                                  <div className="text-body">{cleanName}</div>
                                  <div className="text-body text-right font-medium whitespace-nowrap">{formatPrizeAmount(payout.prize_amount)}</div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-40 gap-3">
                            {/* 데이터 없음 */}
                            <p className="text-body text-muted-foreground">페이아웃 정보가 없습니다</p>
                            {isUserAdmin && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={enterEditMode}
                              >
                                <Plus className="mr-2 h-3 w-3" />
                                페이아웃 Add
                              </Button>
                            )}
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    {/* 블라인드 구조 탭 */}
                    <TabsContent value="structure" className="space-y-4 mt-4">
                      <ScrollArea className="h-[400px] pr-4">
                        {viewingSubEvent.blind_structure ? (
                          <div className="space-y-2">
                            <Label className="text-caption text-muted-foreground">Blind Structure</Label>
                            <pre className="text-xs whitespace-pre-wrap font-mono p-4 rounded-md border bg-muted/30">{viewingSubEvent.blind_structure}</pre>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-40">
                            <p className="text-body text-muted-foreground">블라인드 구조 정보가 없습니다</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>

                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={() => setIsSubEventInfoDialogOpen(false)}>
                        닫기
                      </Button>
                    </div>
                  </Tabs>
                )}
              </DialogContent>
            </Dialog>

            {/* Day/Video Dialog */}
            <Dialog open={isDayDialogOpen} onOpenChange={setIsDayDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingDayId ? "Day Edit" : "Day Add"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="day-name">Day Name (Optional)</Label>
                    <Input
                      id="day-name"
                      placeholder="e.g., Day 1, Day 2 (auto-generated if empty)"
                      value={newDayName}
                      onChange={(e) => setNewDayName(e.target.value)}
                    />
                  </div>

                  {/* Video Source Tabs */}
                  <div className="space-y-4">
                    <Label>Video Source</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={videoSourceTab === 'nas' ? 'default' : 'outline'}
                        onClick={() => setVideoSourceTab('nas')}
                        className="flex-1"
                      >
                        <Server className="mr-2 h-4 w-4" />
                        NAS File
                      </Button>
                      <Button
                        type="button"
                        variant={videoSourceTab === 'youtube' ? 'default' : 'outline'}
                        onClick={() => setVideoSourceTab('youtube')}
                        className="flex-1"
                      >
                        <Youtube className="mr-2 h-4 w-4" />
                        YouTube
                      </Button>
                      <Button
                        type="button"
                        variant={videoSourceTab === 'upload' ? 'default' : 'outline'}
                        onClick={() => setVideoSourceTab('upload')}
                        className="flex-1"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                      </Button>
                    </div>
                  </div>

                  {/* NAS Tab */}
                  {videoSourceTab === 'nas' && (
                    <div className="space-y-2">
                      <Label htmlFor="nas-path">NAS File Path *</Label>
                      <Input
                        id="nas-path"
                        placeholder="e.g., videos/2024/wsop_main_event.mp4"
                        value={newDayNasPath}
                        onChange={(e) => setNewDayNasPath(e.target.value)}
                      />
                      <p className="text-caption text-muted-foreground">
                        Enter the path relative to NAS videos directory
                      </p>
                    </div>
                  )}

                  {/* YouTube Tab */}
                  {videoSourceTab === 'youtube' && (
                    <div className="space-y-2">
                      <Label htmlFor="youtube-url">YouTube URL *</Label>
                      <Input
                        id="youtube-url"
                        placeholder="https://youtube.com/watch?v=..."
                        value={newDayVideoUrl}
                        onChange={(e) => setNewDayVideoUrl(e.target.value)}
                      />
                    </div>
                  )}

                  {/* Upload Tab */}
                  {videoSourceTab === 'upload' && (
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Upload Video File *</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center">
                        <input
                          id="file-upload"
                          type="file"
                          accept="video/mp4,video/mov,video/avi,video/mkv,video/webm"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              if (file.size > 500 * 1024 * 1024) {
                                alert('File size must be less than 500MB')
                                return
                              }
                              setUploadFile(file)
                            }
                          }}
                          className="hidden"
                        />
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-body font-medium">
                            {uploadFile ? uploadFile.name : 'Click to select video file'}
                          </p>
                          <p className="text-caption text-muted-foreground mt-1">
                            {uploadFile
                              ? `${(uploadFile.size / (1024 * 1024)).toFixed(2)} MB`
                              : 'MP4, MOV, AVI, MKV, WebM (max 500MB)'
                            }
                          </p>
                        </label>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => {
                      setIsDayDialogOpen(false)
                      setEditingDayId("")
                    }} disabled={uploading}>
                      Cancel
                    </Button>
                    <Button onClick={addDay} disabled={uploading}>
                      {uploading ? '업로드 중...' : (editingDayId ? 'Edit' : 'Add')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* 오른쪽: 영상 + 핸드 목록 */}
          <ResizablePanel defaultSize={75} minSize={60}>
            <div className="space-y-6">
            {/* Video Header */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-title">
                    {(() => {
                      const selectedDayObj = tournaments
                        .flatMap(t => t.sub_events || [])
                        .flatMap(se => se.days || [])
                        .find(d => d.selected)

                      const selectedSubEventObj = tournaments
                        .flatMap(t => t.sub_events || [])
                        .find(se => se.days?.some(d => d.selected))

                      const selectedTournamentObj = tournaments.find(t =>
                        t.sub_events?.some(se => se.days?.some(d => d.selected))
                      )

                      if (!selectedTournamentObj) return "Select a day"

                      const parts = []
                      if (selectedTournamentObj.name) parts.push(selectedTournamentObj.name)
                      if (selectedSubEventObj?.name) parts.push(selectedSubEventObj.name)
                      if (selectedDayObj?.name) parts.push(selectedDayObj.name)

                      return parts.join(" › ") || "Select a day"
                    })()}
                  </h2>
                  {selectedDay && hands.length > 0 && (
                    <div className="flex items-center gap-2 text-caption text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{hands.length}개의 핸드</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  {selectedDay && (
                    <Button
                      variant="default"
                      size="icon"
                      onClick={() => {
                        setVideoStartTime("")
                        setIsVideoDialogOpen(true)
                      }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="outline" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* 핸드 목록 */}
            <Card className="p-6">
              <h2 className="text-title mb-4">Hand History</h2>
              <div>
                {hands.length > 0 ? (
                  (() => {
                    // 선택된 day, subEvent, tournament 찾기
                    const selectedDayObj = tournaments
                      .flatMap(t => t.sub_events || [])
                      .flatMap(se => se.days || [])
                      .find(d => d.selected)

                    const selectedSubEventObj = tournaments
                      .flatMap(t => t.sub_events || [])
                      .find(se => se.days?.some(d => d.selected))

                    const selectedTournamentObj = tournaments.find(t =>
                      t.sub_events?.some(se => se.days?.some(d => d.selected))
                    )

                    return (
                      <HandListAccordion
                        handIds={hands.map((hand: any) => hand.id)}
                        hands={hands.map((hand: any) => {
                          // timestamp 파싱: "MM:SS-MM:SS" 또는 "MM:SS" 형식 지원
                          const timestamp = hand.timestamp || ""
                          const parts = timestamp.split('-')
                          const startTime = parts[0] || "00:00"
                          const endTime = parts[1] || parts[0] || "00:00"

                          return {
                            handNumber: hand.number || "???",
                            summary: hand.description || "핸드 정보",
                            timestamp: 0,
                            startTime,
                            endTime,
                            duration: 0,
                            winner: hand.hand_players?.find((hp: any) => hp.position === "BTN")?.player?.name || "Unknown",
                            potSize: hand.pot_size || 0,
                            players: hand.hand_players?.map((hp: any) => ({
                              name: hp.player?.name || "Unknown",
                              position: hp.position || "Unknown",
                              cards: hp.cards || [],
                              stackBefore: 0,
                              stackAfter: 0,
                              stackChange: 0,
                            })) || [],
                            communityCards: {
                              preflop: [],
                              flop: hand.board_cards?.slice(0, 3) || [],
                              turn: hand.board_cards?.slice(3, 4) || [],
                              river: hand.board_cards?.slice(4, 5) || [],
                            },
                            actions: {
                              preflop: [],
                              flop: [],
                              turn: [],
                              river: [],
                            },
                            streets: {
                              preflop: { actions: [], pot: 0 },
                              flop: { actions: [], pot: 0 },
                              turn: { actions: [], pot: 0 },
                              river: { actions: [], pot: 0 },
                            },
                            confidence: 0.8,
                          }
                        })}
                        onPlayHand={(startTime) => {
                          setVideoStartTime(startTime)
                          setIsVideoDialogOpen(true)
                        }}
                      />
                    )
                  })()

                ) : (
                  <EmptyState
                    icon={Folder}
                    title="핸드가 없습니다"
                    description="외부 시스템에서 핸드를 import하세요. API: POST /api/import-hands"
                    variant="inline"
                  />
                )}
                {/* Removed redundant text and closing tags */}
                {false && (
                  <div className="flex items-center justify-center h-40">
                    <p className="text-body text-muted-foreground">
                      핸드가 없습니다. 외부 시스템에서 핸드를 import하세요.
                      <br />
                      <span className="text-caption">API: POST /api/import-hands</span>
                    </p>
                  </div>
                )}
              </div>
            </Card>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        day={tournaments
          .flatMap(t => t.sub_events || [])
          .flatMap(se => se.days || [])
          .find(d => d.selected) || null}
        isOpen={isVideoDialogOpen}
        onOpenChange={setIsVideoDialogOpen}
        initialTime={videoStartTime}
      />

      {/* Hand History import는 외부 시스템에서 수행됩니다 */}
      {/* API: POST /api/import-hands */}
    </div>
  )
}
