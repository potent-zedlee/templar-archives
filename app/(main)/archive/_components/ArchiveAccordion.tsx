"use client"

/**
 * Archive Accordion Component
 *
 * Flowbite Accordion을 사용한 계층 구조:
 * Tournament → Event → Stream → Hand
 *
 * Features:
 * - Single mode (한 번에 하나만 열림)
 * - Virtual scrolling for hands
 * - Postmodern design
 */

import { useState } from 'react'
import { Accordion, Badge, Button } from 'flowbite-react'
import { Calendar, MapPin, Trophy, Video, Plus } from 'lucide-react'
import type { Tournament, Event, Stream, Hand } from '@/lib/types/archive'
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
  const [openTournamentId, setOpenTournamentId] = useState<string | null>(null)
  const [openEventId, setOpenEventId] = useState<string | null>(null)
  const [openStreamId, setOpenStreamId] = useState<string | null>(null)

  if (tournaments.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">No tournaments available</p>
      </div>
    )
  }

  return (
    <Accordion collapseAll>
      {tournaments.map((tournament) => (
        <Accordion.Panel key={tournament.id}>
          <Accordion.Title>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <div>
                  <h3 className="text-lg font-bold">{tournament.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.location}</span>
                    <Calendar className="w-4 h-4 ml-2" />
                    <span>{tournament.start_date}</span>
                  </div>
                </div>
              </div>
              <Badge color="info">{tournament.events?.length || 0} Events</Badge>
            </div>
          </Accordion.Title>
          <Accordion.Content>
            {/* Events */}
            {tournament.events && tournament.events.length > 0 ? (
              <Accordion collapseAll>
                {tournament.events.map((event) => (
                  <Accordion.Panel key={event.id}>
                    <Accordion.Title>
                      <div className="flex items-center justify-between w-full">
                        <div>
                          <h4 className="font-semibold">{event.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.date} • {event.buy_in || 'N/A'}
                          </p>
                        </div>
                        <Badge color="success">{event.streams?.length || 0} Streams</Badge>
                      </div>
                    </Accordion.Title>
                    <Accordion.Content>
                      {/* Streams */}
                      {event.streams && event.streams.length > 0 ? (
                        <Accordion collapseAll>
                          {event.streams.map((stream) => (
                            <Accordion.Panel key={stream.id}>
                              <Accordion.Title>
                                <div className="flex items-center gap-2">
                                  <Video className="w-4 h-4" />
                                  <span>{stream.name}</span>
                                  <Badge size="sm" color="warning">
                                    {hands.get(stream.id)?.length || 0} Hands
                                  </Badge>
                                </div>
                              </Accordion.Title>
                              <Accordion.Content>
                                {/* Virtual Hand List */}
                                <VirtualHandList
                                  hands={hands.get(stream.id) || []}
                                  onHandClick={onHandClick}
                                  onSeekToTime={onSeekToTime}
                                />
                              </Accordion.Content>
                            </Accordion.Panel>
                          ))}
                        </Accordion>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
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
                    </Accordion.Content>
                  </Accordion.Panel>
                ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-gray-500">
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
          </Accordion.Content>
        </Accordion.Panel>
      ))}
    </Accordion>
  )
}
