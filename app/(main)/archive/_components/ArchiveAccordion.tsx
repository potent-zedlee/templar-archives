"use client"

/**
 * Archive Accordion Component - Phase 42
 *
 * HTML details/summary 기반 Accordion:
 * Tournament → Event → Stream → Hand
 *
 * Features:
 * - Native HTML Accordion (details/summary)
 * - Virtual scrolling for hands
 * - Postmodern design
 */

import { Badge, Button } from 'flowbite-react'
import { Calendar, MapPin, Trophy, Video, Plus, ChevronRight } from 'lucide-react'
import type { Tournament, Hand } from '@/lib/types/archive'
import { VirtualHandList } from './VirtualHandList'

interface ArchiveAccordionProps {
  tournaments: Tournament[]
  hands: Map<string, Hand[]> // streamId → hands
  onAddEvent?: (tournamentId: string) => void
  onAddStream?: (eventId: string) => void
  onHandClick?: (hand: Hand) => void
  onSeekToTime?: (timeString: string) => void
  isAdmin?: boolean
}

export function ArchiveAccordion({
  tournaments,
  hands,
  onAddEvent,
  onAddStream,
  onHandClick,
  onSeekToTime,
  isAdmin = false
}: ArchiveAccordionProps) {

  if (tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No tournaments available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => (
        <details key={tournament.id} className="group bg-card rounded-lg shadow-md overflow-hidden">
          <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <ChevronRight className="w-5 h-5 transition-transform group-open:rotate-90" />
              <Trophy className="w-5 h-5 text-yellow-500" />
              <div>
                <h3 className="text-lg font-bold">{tournament.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{tournament.location}</span>
                  <Calendar className="w-4 h-4 ml-2" />
                  <span>{tournament.start_date}</span>
                </div>
              </div>
            </div>
            <Badge color="info">{tournament.events?.length || 0} Events</Badge>
          </summary>

          <div className="p-4 border-t border-border">
            {/* Events */}
            {tournament.events && tournament.events.length > 0 ? (
              <div className="space-y-3">
                {tournament.events.map((event) => (
                  <details key={event.id} className="group/event bg-muted rounded-lg overflow-hidden">
                    <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors">
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 transition-transform group-open/event:rotate-90" />
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {event.date} • {event.buy_in || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <Badge color="success">{event.streams?.length || 0} Streams</Badge>
                    </summary>

                    <div className="p-3 border-t border-border">
                      {/* Streams */}
                      {event.streams && event.streams.length > 0 ? (
                        <div className="space-y-2">
                          {event.streams.map((stream) => (
                            <details key={stream.id} className="group/stream bg-card rounded-lg overflow-hidden">
                              <summary className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent transition-colors">
                                <div className="flex items-center gap-2">
                                  <ChevronRight className="w-4 h-4 transition-transform group-open/stream:rotate-90" />
                                  <Video className="w-4 h-4" />
                                  <span className="font-medium">{stream.name}</span>
                                </div>
                                <Badge size="sm" color="warning">
                                  {hands.get(stream.id)?.length || 0} Hands
                                </Badge>
                              </summary>

                              <div className="p-3 border-t border-border">
                                {/* Virtual Hand List */}
                                <VirtualHandList
                                  hands={hands.get(stream.id) || []}
                                  onHandClick={onHandClick}
                                  onSeekToTime={onSeekToTime}
                                />
                              </div>
                            </details>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <p className="text-sm">No streams available</p>
                          {isAdmin && onAddStream && (
                            <Button
                              size="sm"
                              color="light"
                              className="mt-3"
                              onClick={() => onAddStream(event.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Stream
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No events available</p>
                {isAdmin && onAddEvent && (
                  <Button
                    size="sm"
                    color="light"
                    className="mt-3"
                    onClick={() => onAddEvent(tournament.id)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Event
                  </Button>
                )}
              </div>
            )}
          </div>
        </details>
      ))}
    </div>
  )
}
