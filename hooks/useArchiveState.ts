import { useState } from 'react'

// Types
type TournamentCategory = "WSOP" | "Triton" | "EPT" | "Hustler" | "APT" | "APL" | "GGPOKER"
type VideoSourceTab = 'youtube' | 'upload'

export type PayoutRow = {
  rank: number
  playerName: string
  prizeAmount: string
}

export interface ArchiveState {
  // Data states
  tournaments: any[]
  setTournaments: (tournaments: any[]) => void
  hands: any[]
  setHands: (hands: any[]) => void
  selectedDay: string
  setSelectedDay: (day: string) => void
  loading: boolean
  setLoading: (loading: boolean) => void
  userEmail: string | null
  setUserEmail: (email: string | null) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void

  // Tournament dialog states
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  editingTournamentId: string
  setEditingTournamentId: (id: string) => void
  newTournamentName: string
  setNewTournamentName: (name: string) => void
  newCategory: TournamentCategory
  setNewCategory: (category: TournamentCategory) => void
  newLocation: string
  setNewLocation: (location: string) => void
  newStartDate: string
  setNewStartDate: (date: string) => void
  newEndDate: string
  setNewEndDate: (date: string) => void

  // SubEvent dialog states
  isSubEventDialogOpen: boolean
  setIsSubEventDialogOpen: (open: boolean) => void
  selectedTournamentId: string
  setSelectedTournamentId: (id: string) => void
  editingSubEventId: string
  setEditingSubEventId: (id: string) => void
  newSubEventName: string
  setNewSubEventName: (name: string) => void
  newSubEventDate: string
  setNewSubEventDate: (date: string) => void
  newSubEventPrize: string
  setNewSubEventPrize: (prize: string) => void
  newSubEventWinner: string
  setNewSubEventWinner: (winner: string) => void
  newSubEventBuyIn: string
  setNewSubEventBuyIn: (buyIn: string) => void
  newSubEventEntryCount: string
  setNewSubEventEntryCount: (count: string) => void
  newSubEventBlindStructure: string
  setNewSubEventBlindStructure: (structure: string) => void
  newSubEventLevelDuration: string
  setNewSubEventLevelDuration: (duration: string) => void
  newSubEventStartingStack: string
  setNewSubEventStartingStack: (stack: string) => void
  newSubEventNotes: string
  setNewSubEventNotes: (notes: string) => void

  // SubEvent Info dialog states
  isSubEventInfoDialogOpen: boolean
  setIsSubEventInfoDialogOpen: (open: boolean) => void
  viewingSubEventId: string
  setViewingSubEventId: (id: string) => void
  viewingSubEvent: any | null
  setViewingSubEvent: (subEvent: any | null) => void
  viewingPayouts: any[]
  setViewingPayouts: (payouts: any[]) => void
  loadingViewingPayouts: boolean
  setLoadingViewingPayouts: (loading: boolean) => void
  isEditingViewingPayouts: boolean
  setIsEditingViewingPayouts: (editing: boolean) => void
  editingViewingPayouts: PayoutRow[]
  setEditingViewingPayouts: (payouts: PayoutRow[]) => void
  savingPayouts: boolean
  setSavingPayouts: (saving: boolean) => void

  // Payout dialog states
  payouts: PayoutRow[]
  setPayouts: (payouts: PayoutRow[]) => void
  payoutSectionOpen: boolean
  setPayoutSectionOpen: (open: boolean) => void
  hendonMobUrl: string
  setHendonMobUrl: (url: string) => void
  hendonMobHtml: string
  setHendonMobHtml: (html: string) => void
  csvText: string
  setCsvText: (text: string) => void
  loadingPayouts: boolean
  setLoadingPayouts: (loading: boolean) => void

  // Day dialog states
  isDayDialogOpen: boolean
  setIsDayDialogOpen: (open: boolean) => void
  selectedSubEventId: string
  setSelectedSubEventId: (id: string) => void
  editingDayId: string
  setEditingDayId: (id: string) => void
  newDayName: string
  setNewDayName: (name: string) => void
  videoSourceTab: VideoSourceTab
  setVideoSourceTab: (tab: VideoSourceTab) => void
  newDayVideoUrl: string
  setNewDayVideoUrl: (url: string) => void
  uploadFile: File | null
  setUploadFile: (file: File | null) => void
  uploading: boolean
  setUploading: (uploading: boolean) => void
  uploadProgress: number
  setUploadProgress: (progress: number) => void

  // Video player dialog states
  isVideoDialogOpen: boolean
  setIsVideoDialogOpen: (open: boolean) => void
  videoStartTime: string
  setVideoStartTime: (time: string) => void

  // UI states
  openMenuId: string
  setOpenMenuId: (id: string) => void

  // Folder navigation states
  navigationLevel: 'root' | 'tournament' | 'subevent' | 'unorganized'
  setNavigationLevel: (level: 'root' | 'tournament' | 'subevent' | 'unorganized') => void
  currentTournamentId: string
  setCurrentTournamentId: (id: string) => void
  currentSubEventId: string
  setCurrentSubEventId: (id: string) => void

  // Unsorted videos state
  unsortedVideos: any[]
  setUnsortedVideos: (videos: any[]) => void
}

export function useArchiveState(): ArchiveState {
  // Data states
  const [tournaments, setTournaments] = useState<any[]>([])
  const [hands, setHands] = useState<any[]>([])
  const [selectedDay, setSelectedDay] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>("All")

  // Tournament dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTournamentId, setEditingTournamentId] = useState<string>("")
  const [newTournamentName, setNewTournamentName] = useState("")
  const [newCategory, setNewCategory] = useState<TournamentCategory>("WSOP")
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

  // SubEvent Info dialog states
  const [isSubEventInfoDialogOpen, setIsSubEventInfoDialogOpen] = useState(false)
  const [viewingSubEventId, setViewingSubEventId] = useState<string>("")
  const [viewingSubEvent, setViewingSubEvent] = useState<any | null>(null)
  const [viewingPayouts, setViewingPayouts] = useState<any[]>([])
  const [loadingViewingPayouts, setLoadingViewingPayouts] = useState(false)
  const [isEditingViewingPayouts, setIsEditingViewingPayouts] = useState(false)
  const [editingViewingPayouts, setEditingViewingPayouts] = useState<PayoutRow[]>([])
  const [savingPayouts, setSavingPayouts] = useState(false)

  // Payout dialog states
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
  const [videoSourceTab, setVideoSourceTab] = useState<VideoSourceTab>('youtube')
  const [newDayVideoUrl, setNewDayVideoUrl] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Video player dialog states
  const [isVideoDialogOpen, setIsVideoDialogOpen] = useState(false)
  const [videoStartTime, setVideoStartTime] = useState<string>("")

  // UI states
  const [openMenuId, setOpenMenuId] = useState<string>("")

  // Folder navigation states
  const [navigationLevel, setNavigationLevel] = useState<'root' | 'tournament' | 'subevent' | 'unorganized'>('root')
  const [currentTournamentId, setCurrentTournamentId] = useState<string>("")
  const [currentSubEventId, setCurrentSubEventId] = useState<string>("")

  // Unsorted videos state
  const [unsortedVideos, setUnsortedVideos] = useState<any[]>([])

  return {
    tournaments,
    setTournaments,
    hands,
    setHands,
    selectedDay,
    setSelectedDay,
    loading,
    setLoading,
    userEmail,
    setUserEmail,
    selectedCategory,
    setSelectedCategory,
    isDialogOpen,
    setIsDialogOpen,
    editingTournamentId,
    setEditingTournamentId,
    newTournamentName,
    setNewTournamentName,
    newCategory,
    setNewCategory,
    newLocation,
    setNewLocation,
    newStartDate,
    setNewStartDate,
    newEndDate,
    setNewEndDate,
    isSubEventDialogOpen,
    setIsSubEventDialogOpen,
    selectedTournamentId,
    setSelectedTournamentId,
    editingSubEventId,
    setEditingSubEventId,
    newSubEventName,
    setNewSubEventName,
    newSubEventDate,
    setNewSubEventDate,
    newSubEventPrize,
    setNewSubEventPrize,
    newSubEventWinner,
    setNewSubEventWinner,
    newSubEventBuyIn,
    setNewSubEventBuyIn,
    newSubEventEntryCount,
    setNewSubEventEntryCount,
    newSubEventBlindStructure,
    setNewSubEventBlindStructure,
    newSubEventLevelDuration,
    setNewSubEventLevelDuration,
    newSubEventStartingStack,
    setNewSubEventStartingStack,
    newSubEventNotes,
    setNewSubEventNotes,
    isSubEventInfoDialogOpen,
    setIsSubEventInfoDialogOpen,
    viewingSubEventId,
    setViewingSubEventId,
    viewingSubEvent,
    setViewingSubEvent,
    viewingPayouts,
    setViewingPayouts,
    loadingViewingPayouts,
    setLoadingViewingPayouts,
    isEditingViewingPayouts,
    setIsEditingViewingPayouts,
    editingViewingPayouts,
    setEditingViewingPayouts,
    savingPayouts,
    setSavingPayouts,
    payouts,
    setPayouts,
    payoutSectionOpen,
    setPayoutSectionOpen,
    hendonMobUrl,
    setHendonMobUrl,
    hendonMobHtml,
    setHendonMobHtml,
    csvText,
    setCsvText,
    loadingPayouts,
    setLoadingPayouts,
    isDayDialogOpen,
    setIsDayDialogOpen,
    selectedSubEventId,
    setSelectedSubEventId,
    editingDayId,
    setEditingDayId,
    newDayName,
    setNewDayName,
    videoSourceTab,
    setVideoSourceTab,
    newDayVideoUrl,
    setNewDayVideoUrl,
    uploadFile,
    setUploadFile,
    uploading,
    setUploading,
    uploadProgress,
    setUploadProgress,
    isVideoDialogOpen,
    setIsVideoDialogOpen,
    videoStartTime,
    setVideoStartTime,
    openMenuId,
    setOpenMenuId,
    navigationLevel,
    setNavigationLevel,
    currentTournamentId,
    setCurrentTournamentId,
    currentSubEventId,
    setCurrentSubEventId,
    unsortedVideos,
    setUnsortedVideos,
  }
}
