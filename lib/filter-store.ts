import { create } from 'zustand'

export type FilterState = {
  // Player filters
  playerSearch: string
  selectedPlayers: string[]

  // Card filters
  card1: string
  card2: string

  // Community cards
  communityCards: string[]

  // Action filters
  selectedActions: ('fold' | 'call' | 'raise' | 'allin')[]

  // Advanced action filters
  selectedAdvancedActions: ('3bet' | '4bet' | 'cbet' | 'check-raise' | 'squeeze' | 'donk-bet')[]

  // Position filters
  selectedPositions: ('early' | 'middle' | 'late' | 'sb' | 'bb' | 'btn')[]

  // Pot size
  potMin: number | null
  potMax: number | null

  // Stakes
  selectedStakes: ('low' | 'mid' | 'high' | 'nosebleed')[]

  // Board texture filters
  selectedBoardTextures: ('monotone' | 'rainbow' | 'paired' | 'twoTone' | 'connected' | 'dry')[]

  // Stack size filters (SPR - Stack to Pot Ratio)
  sprMin: number | null
  sprMax: number | null
  stackMin: number | null
  stackMax: number | null

  // Hand range filters
  handRangeType: 'premium' | 'broadways' | 'suited-connectors' | 'pocket-pairs' | 'all' | null

  // Saved filters
  savedFilters: SavedFilter[]
}

export type SavedFilter = {
  id: string
  name: string
  description?: string
  filters: Partial<FilterState>
  createdAt: string
}

type FilterActions = {
  setPlayerSearch: (search: string) => void
  addPlayer: (player: string) => void
  removePlayer: (player: string) => void
  setCard1: (card: string) => void
  setCard2: (card: string) => void
  setCommunityCard: (index: number, card: string) => void
  toggleAction: (action: FilterState['selectedActions'][0]) => void
  toggleAdvancedAction: (action: FilterState['selectedAdvancedActions'][0]) => void
  togglePosition: (position: FilterState['selectedPositions'][0]) => void
  setPotMin: (value: number | null) => void
  setPotMax: (value: number | null) => void
  toggleStake: (stake: FilterState['selectedStakes'][0]) => void
  toggleBoardTexture: (texture: FilterState['selectedBoardTextures'][0]) => void
  setSprMin: (value: number | null) => void
  setSprMax: (value: number | null) => void
  setStackMin: (value: number | null) => void
  setStackMax: (value: number | null) => void
  setHandRangeType: (type: FilterState['handRangeType']) => void
  saveFilter: (name: string, description?: string) => void
  loadFilter: (id: string) => void
  deleteFilter: (id: string) => void
  resetFilters: () => void
  getActiveFiltersCount: () => number
}

const initialState: FilterState = {
  playerSearch: '',
  selectedPlayers: [],
  card1: '',
  card2: '',
  communityCards: ['', '', '', '', ''],
  selectedActions: [],
  selectedAdvancedActions: [],
  selectedPositions: [],
  potMin: null,
  potMax: null,
  selectedStakes: [],
  selectedBoardTextures: [],
  sprMin: null,
  sprMax: null,
  stackMin: null,
  stackMax: null,
  handRangeType: null,
  savedFilters: [],
}

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...initialState,

  setPlayerSearch: (search) => set({ playerSearch: search }),

  addPlayer: (player) => set((state) => ({
    selectedPlayers: [...state.selectedPlayers, player]
  })),

  removePlayer: (player) => set((state) => ({
    selectedPlayers: state.selectedPlayers.filter(p => p !== player)
  })),

  setCard1: (card) => set({ card1: card }),
  setCard2: (card) => set({ card2: card }),

  setCommunityCard: (index, card) => set((state) => {
    const newCards = [...state.communityCards]
    newCards[index] = card
    return { communityCards: newCards }
  }),

  toggleAction: (action) => set((state) => ({
    selectedActions: state.selectedActions.includes(action)
      ? state.selectedActions.filter(a => a !== action)
      : [...state.selectedActions, action]
  })),

  toggleAdvancedAction: (action) => set((state) => ({
    selectedAdvancedActions: state.selectedAdvancedActions.includes(action)
      ? state.selectedAdvancedActions.filter(a => a !== action)
      : [...state.selectedAdvancedActions, action]
  })),

  togglePosition: (position) => set((state) => ({
    selectedPositions: state.selectedPositions.includes(position)
      ? state.selectedPositions.filter(p => p !== position)
      : [...state.selectedPositions, position]
  })),

  setPotMin: (value) => set({ potMin: value }),
  setPotMax: (value) => set({ potMax: value }),

  toggleStake: (stake) => set((state) => ({
    selectedStakes: state.selectedStakes.includes(stake)
      ? state.selectedStakes.filter(s => s !== stake)
      : [...state.selectedStakes, stake]
  })),

  toggleBoardTexture: (texture) => set((state) => ({
    selectedBoardTextures: state.selectedBoardTextures.includes(texture)
      ? state.selectedBoardTextures.filter(t => t !== texture)
      : [...state.selectedBoardTextures, texture]
  })),

  setSprMin: (value) => set({ sprMin: value }),
  setSprMax: (value) => set({ sprMax: value }),
  setStackMin: (value) => set({ stackMin: value }),
  setStackMax: (value) => set({ stackMax: value }),

  setHandRangeType: (type) => set({ handRangeType: type }),

  saveFilter: (name, description) => set((state) => {
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name,
      description,
      filters: {
        selectedPlayers: state.selectedPlayers,
        card1: state.card1,
        card2: state.card2,
        communityCards: state.communityCards,
        selectedActions: state.selectedActions,
        selectedAdvancedActions: state.selectedAdvancedActions,
        selectedPositions: state.selectedPositions,
        potMin: state.potMin,
        potMax: state.potMax,
        selectedStakes: state.selectedStakes,
        selectedBoardTextures: state.selectedBoardTextures,
        sprMin: state.sprMin,
        sprMax: state.sprMax,
        stackMin: state.stackMin,
        stackMax: state.stackMax,
        handRangeType: state.handRangeType,
      },
      createdAt: new Date().toISOString(),
    }
    return {
      savedFilters: [...state.savedFilters, newFilter]
    }
  }),

  loadFilter: (id) => set((state) => {
    const filter = state.savedFilters.find(f => f.id === id)
    if (!filter) return state
    return { ...state, ...filter.filters }
  }),

  deleteFilter: (id) => set((state) => ({
    savedFilters: state.savedFilters.filter(f => f.id !== id)
  })),

  resetFilters: () => set((state) => ({
    ...initialState,
    savedFilters: state.savedFilters, // Keep saved filters
  })),

  getActiveFiltersCount: () => {
    const state = get()
    let count = 0

    if (state.selectedPlayers.length > 0) count++
    if (state.card1 || state.card2) count++
    if (state.communityCards.some(c => c)) count++
    if (state.selectedActions.length > 0) count++
    if (state.selectedAdvancedActions.length > 0) count++
    if (state.selectedPositions.length > 0) count++
    if (state.potMin !== null || state.potMax !== null) count++
    if (state.selectedStakes.length > 0) count++
    if (state.selectedBoardTextures.length > 0) count++
    if (state.sprMin !== null || state.sprMax !== null) count++
    if (state.stackMin !== null || state.stackMax !== null) count++
    if (state.handRangeType) count++

    return count
  }
}))
