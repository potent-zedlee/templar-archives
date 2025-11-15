'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import type { HandActionInput } from '@/app/actions/hands-manual'
import type { Player } from '@/lib/types/archive'

// ===========================
// Types
// ===========================

const ACTION_TYPES = [
  { value: 'fold', label: 'Fold' },
  { value: 'check', label: 'Check' },
  { value: 'call', label: 'Call' },
  { value: 'bet', label: 'Bet' },
  { value: 'raise', label: 'Raise' },
  { value: 'all-in', label: 'All-in' },
  { value: 'show', label: 'Show' },
  { value: 'muck', label: 'Muck' },
  { value: 'win', label: 'Win' },
] as const

const STREETS = [
  { value: 'preflop', label: 'Preflop' },
  { value: 'flop', label: 'Flop' },
  { value: 'turn', label: 'Turn' },
  { value: 'river', label: 'River' },
  { value: 'showdown', label: 'Showdown' },
] as const

// ===========================
// Action Builder Component
// ===========================

interface ActionBuilderProps {
  actions: HandActionInput[]
  players: { id: string; name: string }[] // Available players
  onChange: (actions: HandActionInput[]) => void
}

export function ActionBuilder({ actions, players, onChange }: ActionBuilderProps) {
  // Add new action
  const handleAddAction = () => {
    const newAction: HandActionInput = {
      player_id: players[0]?.id || '',
      action_type: 'fold',
      street: 'preflop',
      amount: 0,
      action_order: actions.length + 1,
    }

    onChange([...actions, newAction])
  }

  // Update action
  const handleUpdateAction = (index: number, updates: Partial<HandActionInput>) => {
    const updated = [...actions]
    updated[index] = { ...updated[index], ...updates }
    onChange(updated)
  }

  // Remove action
  const handleRemoveAction = (index: number) => {
    const filtered = actions.filter((_, i) => i !== index)
    // Re-order remaining actions
    const reordered = filtered.map((action, i) => ({
      ...action,
      action_order: i + 1,
    }))
    onChange(reordered)
  }

  // Group actions by street
  const groupedActions = STREETS.reduce((acc, street) => {
    acc[street.value] = actions.filter((a) => a.street === street.value)
    return acc
  }, {} as Record<string, HandActionInput[]>)

  return (
    <div className="space-y-6">
      {/* Actions by Street */}
      {STREETS.map((street) => {
        const streetActions = groupedActions[street.value]
        if (streetActions.length === 0) return null

        return (
          <div key={street.value} className="space-y-2">
            <h4 className="text-sm font-semibold text-primary">{street.label}</h4>
            <div className="space-y-2">
              {streetActions.map((action, idx) => {
                const globalIndex = actions.findIndex(
                  (a) => a.action_order === action.action_order
                )

                return (
                  <div
                    key={`${street.value}-${idx}`}
                    className="grid grid-cols-12 gap-2 items-center p-2 bg-muted/50 rounded-lg"
                  >
                    {/* Order */}
                    <div className="col-span-1 text-center text-sm font-medium">
                      #{action.action_order}
                    </div>

                    {/* Player */}
                    <div className="col-span-3">
                      <Select
                        value={action.player_id}
                        onValueChange={(value) =>
                          handleUpdateAction(globalIndex, { player_id: value })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Player" />
                        </SelectTrigger>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Type */}
                    <div className="col-span-3">
                      <Select
                        value={action.action_type}
                        onValueChange={(value) =>
                          handleUpdateAction(globalIndex, {
                            action_type: value as HandActionInput['action_type'],
                          })
                        }
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Action" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Amount */}
                    <div className="col-span-3">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={action.amount}
                        onChange={(e) =>
                          handleUpdateAction(globalIndex, {
                            amount: parseInt(e.target.value) || 0,
                          })
                        }
                        className="h-8"
                      />
                    </div>

                    {/* Description (optional) */}
                    <div className="col-span-1">
                      <Input
                        placeholder="Note"
                        value={action.description || ''}
                        onChange={(e) =>
                          handleUpdateAction(globalIndex, { description: e.target.value })
                        }
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Delete */}
                    <div className="col-span-1 flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAction(globalIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Add Action Button */}
      <Button type="button" variant="outline" onClick={handleAddAction} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Action
      </Button>

      {actions.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No actions added yet. Click "Add Action" to start.
        </p>
      )}
    </div>
  )
}
