'use client'

import { formatCurrency } from '@/lib/utils'

interface Action {
  player: string
  action: string
  amount: number
  street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER'
}

interface ActionHistoryProps {
  actions: Action[]
  players: Array<{ name: string }>
}

const streets = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'] as const

export function ActionHistory({ actions, players }: ActionHistoryProps) {
  // Group actions by street
  const actionsByStreet = streets.reduce(
    (acc, street) => {
      acc[street] = actions.filter((a) => a.street === street)
      return acc
    },
    {} as Record<string, Action[]>
  )

  // Get unique players from actions
  const uniquePlayers = Array.from(
    new Set(actions.map((a) => a.player))
  ).map((name) => ({ name }))

  const displayPlayers = uniquePlayers.length > 0 ? uniquePlayers : players

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-max">
        <div className="grid grid-cols-5 gap-2 text-sm">
          {/* Header */}
          <div className="font-semibold bg-muted p-2 rounded">Player</div>
          {streets.map((street) => (
            <div key={street} className="font-semibold bg-muted p-2 rounded text-center">
              {street}
            </div>
          ))}

          {/* Player rows */}
          {displayPlayers.map((player) => (
            <div key={player.name} className="col-span-5 grid grid-cols-5 gap-2">
              {/* Player name */}
              <div className="bg-card border border-border p-2 rounded font-medium truncate">
                {player.name}
              </div>

              {/* Actions per street */}
              {streets.map((street) => {
                const playerActions = actionsByStreet[street].filter(
                  (a) => a.player === player.name
                )

                return (
                  <div
                    key={street}
                    className="bg-card border border-border p-2 rounded text-center"
                  >
                    {playerActions.length > 0 ? (
                      <div className="space-y-1">
                        {playerActions.map((action, idx) => (
                          <div key={idx} className="text-xs">
                            <span
                              className={`font-semibold ${
                                action.action === 'FOLD'
                                  ? 'text-red-500'
                                  : action.action === 'RAISE' || action.action === 'BET'
                                  ? 'text-green-500'
                                  : action.action === 'ALL_IN'
                                  ? 'text-yellow-500'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {action.action}
                            </span>
                            {action.amount > 0 && (
                              <span className="ml-1 text-muted-foreground">
                                {formatCurrency(action.amount)}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
