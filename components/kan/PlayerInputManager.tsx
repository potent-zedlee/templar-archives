'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayerInputManagerProps {
  players: string[]
  onChange: (players: string[]) => void
  className?: string
}

export function PlayerInputManager({
  players,
  onChange,
  className,
}: PlayerInputManagerProps) {
  const [newPlayerName, setNewPlayerName] = useState('')

  const handleAddPlayer = () => {
    const trimmed = newPlayerName.trim()
    if (trimmed && players.length < 9) {
      onChange([...players, trimmed])
      setNewPlayerName('')
    }
  }

  const handleRemovePlayer = (index: number) => {
    onChange(players.filter((_, i) => i !== index))
  }

  const handleUpdatePlayer = (index: number, value: string) => {
    const updated = [...players]
    updated[index] = value
    onChange(updated)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddPlayer()
    }
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <CardTitle>참가 플레이어 (선택사항)</CardTitle>
        </div>
        <CardDescription>
          AI가 자동으로 인식하지만, 입력하면 매칭 정확도가 높아집니다.
          최소 2명 ~ 최대 9명까지 입력할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Player List */}
        {players.length > 0 && (
          <div className="space-y-2">
            {players.map((player, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <Input
                  value={player}
                  onChange={(e) => handleUpdatePlayer(index, e.target.value)}
                  placeholder="Player Name"
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemovePlayer(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {players.length === 0 && (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">아직 추가된 플레이어가 없습니다</p>
          </div>
        )}

        {/* Add Player Input */}
        {players.length < 9 && (
          <div className="space-y-2">
            <Label htmlFor="newPlayer">새 플레이어 추가</Label>
            <div className="flex gap-2">
              <Input
                id="newPlayer"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="플레이어 이름 입력"
                className="flex-1"
              />
              <Button
                onClick={handleAddPlayer}
                disabled={!newPlayerName.trim() || players.length >= 9}
              >
                <Plus className="w-4 h-4 mr-2" />
                추가
              </Button>
            </div>
          </div>
        )}

        {/* Player Count Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {players.length}명 / 9명
          </span>
          {players.length >= 9 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              최대 인원에 도달했습니다
            </span>
          )}
          {players.length > 0 && players.length < 2 && (
            <span className="text-yellow-600 dark:text-yellow-400">
              최소 2명 이상 권장
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
