'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { createClientSupabaseClient } from '@/lib/supabase-client'
import type { Player } from '@/lib/types/archive'

// ===========================
// Player Selector Component
// ===========================

interface PlayerSelectorProps {
  value: string | null // player_id
  onChange: (playerId: string | null, player: Player | null) => void
  placeholder?: string
  disabled?: boolean
}

export function PlayerSelector({
  value,
  onChange,
  placeholder = 'Select player...',
  disabled = false,
}: PlayerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch players from DB
  useEffect(() => {
    const fetchPlayers = async () => {
      const supabase = createClientSupabaseClient()
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name', { ascending: true })
        .limit(100)

      if (error) {
        console.error('Error fetching players:', error)
        setLoading(false)
        return
      }

      setPlayers(data || [])
      setLoading(false)
    }

    fetchPlayers()
  }, [])

  // Get selected player
  const selectedPlayer = players.find((p) => p.id === value)

  // Filter players by search query
  const filteredPlayers = players.filter((player) => {
    const query = searchQuery.toLowerCase()
    return (
      player.name.toLowerCase().includes(query) ||
      player.normalized_name?.toLowerCase().includes(query) ||
      player.aliases?.some((alias) => alias.toLowerCase().includes(query))
    )
  })

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between"
        >
          {selectedPlayer ? selectedPlayer.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput
            placeholder="Search player..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Loading players...</CommandEmpty>
            ) : filteredPlayers.length === 0 ? (
              <CommandEmpty>No player found</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredPlayers.map((player) => (
                  <CommandItem
                    key={player.id}
                    value={player.id}
                    onSelect={(currentValue) => {
                      const newValue = currentValue === value ? null : currentValue
                      const newPlayer = newValue ? players.find((p) => p.id === newValue) || null : null
                      onChange(newValue, newPlayer)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === player.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{player.name}</span>
                      {player.country && (
                        <span className="text-xs text-muted-foreground">{player.country}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
