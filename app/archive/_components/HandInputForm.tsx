'use client'

import { useState } from 'react'
import { useHandInputStore } from '@/stores/hand-input-store'
import { createHandManually } from '@/app/actions/hands-manual'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { CardSelector } from './hand-input/CardSelector'
import { PlayerSelector } from './hand-input/PlayerSelector'
import { ActionBuilder } from './hand-input/ActionBuilder'
import { Save, Send, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import type { HandPlayerInput } from '@/app/actions/hands-manual'

// ===========================
// Hand Input Form Component
// ===========================

const POSITIONS = ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'CO', 'HJ'] as const

export function HandInputForm() {
  const {
    currentHand,
    updateHandField,
    updatePlayer,
    addPlayer,
    removePlayer,
    actions,
    addAction,
    updateAction,
    removeAction,
    saveHandLocally,
    resetCurrentHand,
    isDirty,
    markClean,
  } = useHandInputStore()

  const [submitting, setSubmitting] = useState(false)
  const [openSections, setOpenSections] = useState<string[]>(['basic-info'])

  if (!currentHand) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No hand data available</p>
      </div>
    )
  }

  // Handle submit
  const handleSubmit = async () => {
    try {
      setSubmitting(true)

      // Validation
      if (!currentHand.hand.number) {
        toast.error('Hand number is required')
        return
      }
      if (!currentHand.hand.description) {
        toast.error('Hand description is required')
        return
      }
      if (currentHand.players.length === 0) {
        toast.error('At least one player is required')
        return
      }

      // Submit to server
      const result = await createHandManually({
        hand: currentHand.hand,
        players: currentHand.players,
        actions: currentHand.actions,
      })

      if (!result.success) {
        toast.error(result.error || 'Failed to create hand')
        return
      }

      toast.success('Hand created successfully!')
      markClean()
      resetCurrentHand()
    } catch (error) {
      console.error('Error submitting hand:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle save locally
  const handleSaveLocally = () => {
    saveHandLocally()
    toast.success('Hand saved locally')
  }

  // Handle add player
  const handleAddPlayer = () => {
    const newPlayer: HandPlayerInput = {
      player_id: '',
      poker_position: 'BTN',
      seat: currentHand.players.length + 1,
      starting_stack: 0,
      ending_stack: 0,
    }
    addPlayer(newPlayer)
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Form Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <Accordion
          type="multiple"
          value={openSections}
          onValueChange={setOpenSections}
          className="space-y-3"
        >
          {/* 1. Basic Info */}
          <AccordionItem value="basic-info" className="border border-gray-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold text-gray-900">Basic info</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Hand Number */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Hand Number <span className="text-red-500">*</span>
                </label>
                <Input
                  value={currentHand.hand.number}
                  onChange={(e) => updateHandField('number', e.target.value)}
                  placeholder="001"
                  maxLength={10}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Description <span className="text-red-500">*</span>
                </label>
                <Textarea
                  value={currentHand.hand.description}
                  onChange={(e) => updateHandField('description', e.target.value)}
                  placeholder="Brief hand summary..."
                  rows={3}
                  maxLength={500}
                />
              </div>

              {/* AI Summary (optional) */}
              <div>
                <label className="text-sm font-medium mb-1 block">AI Summary (optional)</label>
                <Textarea
                  value={currentHand.hand.ai_summary || ''}
                  onChange={(e) => updateHandField('ai_summary', e.target.value)}
                  placeholder="AI-generated hand analysis..."
                  rows={2}
                  maxLength={1000}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Blinds & Pot */}
          <AccordionItem value="blinds-pot" className="border border-gray-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold text-gray-900">Blinds & pot</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Small Blind */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Small Blind <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.small_blind}
                    onChange={(e) =>
                      updateHandField('small_blind', parseInt(e.target.value) || 0)
                    }
                    placeholder="100"
                  />
                </div>

                {/* Big Blind */}
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Big Blind <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.big_blind}
                    onChange={(e) => updateHandField('big_blind', parseInt(e.target.value) || 0)}
                    placeholder="200"
                  />
                </div>

                {/* Ante */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Ante (optional)</label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.ante || 0}
                    onChange={(e) => updateHandField('ante', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Pot Sizes by Street */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Pot Preflop</label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.pot_preflop || 0}
                    onChange={(e) =>
                      updateHandField('pot_preflop', parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Pot Flop</label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.pot_flop || 0}
                    onChange={(e) => updateHandField('pot_flop', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Pot Turn</label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.pot_turn || 0}
                    onChange={(e) => updateHandField('pot_turn', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Pot River (Final)</label>
                  <Input
                    type="number"
                    min="0"
                    value={currentHand.hand.pot_river || 0}
                    onChange={(e) => updateHandField('pot_river', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 3. Players & Positions */}
          <AccordionItem value="players" className="border border-gray-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold text-gray-900">
                Players & positions ({currentHand.players.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {currentHand.players.map((player, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Player {index + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePlayer(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Player Selector */}
                  <div>
                    <label className="text-sm font-medium mb-1 block">Player Name</label>
                    <PlayerSelector
                      value={player.player_id}
                      onChange={(playerId) => updatePlayer(index, { player_id: playerId || '' })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Position */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Position</label>
                      <select
                        className="w-full h-10 px-3 rounded-md border border-input bg-background"
                        value={player.poker_position}
                        onChange={(e) => updatePlayer(index, { poker_position: e.target.value })}
                      >
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seat */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Seat</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={player.seat}
                        onChange={(e) => updatePlayer(index, { seat: parseInt(e.target.value) })}
                      />
                    </div>

                    {/* Starting Stack */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Starting Stack</label>
                      <Input
                        type="number"
                        min="0"
                        value={player.starting_stack}
                        onChange={(e) =>
                          updatePlayer(index, { starting_stack: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>

                    {/* Ending Stack */}
                    <div>
                      <label className="text-sm font-medium mb-1 block">Ending Stack</label>
                      <Input
                        type="number"
                        min="0"
                        value={player.ending_stack}
                        onChange={(e) =>
                          updatePlayer(index, { ending_stack: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  {/* Hole Cards */}
                  <div>
                    <CardSelector
                      label="Hole Cards"
                      value={player.hole_cards || []}
                      onChange={(cards) => updatePlayer(index, { hole_cards: cards })}
                      maxCards={2}
                      placeholder="e.g., As Kh"
                    />
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" onClick={handleAddPlayer} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </AccordionContent>
          </AccordionItem>

          {/* 4. Board Cards */}
          <AccordionItem value="board" className="border border-gray-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold text-gray-900">Board cards</span>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-4">
              {/* Flop */}
              <CardSelector
                label="Flop (3 cards)"
                value={currentHand.hand.board_flop || []}
                onChange={(cards) => updateHandField('board_flop', cards)}
                maxCards={3}
                placeholder="e.g., As Kh Qd"
              />

              {/* Turn */}
              <div>
                <label className="text-sm font-medium mb-1 block">Turn (1 card)</label>
                <Input
                  value={currentHand.hand.board_turn || ''}
                  onChange={(e) => updateHandField('board_turn', e.target.value)}
                  placeholder="e.g., 7c"
                  maxLength={3}
                />
              </div>

              {/* River */}
              <div>
                <label className="text-sm font-medium mb-1 block">River (1 card)</label>
                <Input
                  value={currentHand.hand.board_river || ''}
                  onChange={(e) => updateHandField('board_river', e.target.value)}
                  placeholder="e.g., 3s"
                  maxLength={3}
                />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Actions */}
          <AccordionItem value="actions" className="border border-gray-200 rounded-lg px-4 bg-white shadow-sm">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold text-gray-900">
                Action sequence ({currentHand.actions.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              <ActionBuilder
                actions={currentHand.actions}
                players={currentHand.players.map((p, idx) => ({
                  id: p.player_id,
                  name: p.player_id ? `Player ${idx + 1}` : `Player ${idx + 1}`
                }))}
                onChange={(newActions) => {
                  const currentHandData = useHandInputStore.getState().currentHand
                  if (currentHandData) {
                    useHandInputStore.setState({
                      currentHand: {
                        ...currentHandData,
                        actions: newActions
                      },
                      isDirty: true
                    })
                  }
                }}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Bottom Action Bar */}
      <div className="border-t border-gray-200 bg-white p-4 flex gap-2 shadow-sm">
        <Button
          type="button"
          variant="outline"
          onClick={handleSaveLocally}
          disabled={!isDirty}
          className="flex-1"
        >
          <Save className="h-4 w-4 mr-2" />
          Save draft
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !currentHand.hand.number}
          className="flex-1"
        >
          <Send className="h-4 w-4 mr-2" />
          {submitting ? 'Submitting...' : 'Submit hand'}
        </Button>
      </div>
    </div>
  )
}
