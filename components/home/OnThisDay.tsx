"use client"

/**
 * On This Day Component
 *
 * 과거 같은 날 진행된 토너먼트 표시
 * Firestore 버전으로 마이그레이션됨
 */

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Calendar, Eye, Video } from "lucide-react"
import { firestore } from "@/lib/firebase"
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
  where,
  Timestamp,
} from "firebase/firestore"
import { COLLECTION_PATHS } from "@/lib/firestore-types"
import type { FirestoreTournament } from "@/lib/firestore-types"
import Link from "next/link"

type HistoricalTournament = {
  id: string
  name: string
  category: string
  location: string
  startDate: string
  endDate: string
  handCount: number
  yearsAgo: number
}

export function OnThisDay() {
  const [tournaments, setTournaments] = useState<HistoricalTournament[]>([])
  const [loading, setLoading] = useState(true)
  const today = new Date()
  const formattedDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric" })

  useEffect(() => {
    loadHistoricalTournaments()
  }, [])

  async function loadHistoricalTournaments() {
    setLoading(true)
    try {
      // Get tournaments that started before today
      const tournamentsRef = collection(firestore, COLLECTION_PATHS.TOURNAMENTS)
      const q = query(
        tournamentsRef,
        where('startDate', '<', Timestamp.fromDate(today)),
        orderBy('startDate', 'desc'),
        limit(3)
      )
      const snapshot = await getDocs(q)

      // Calculate years ago and get hand counts
      const enrichedTournaments = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data() as FirestoreTournament
          const tournamentId = doc.id
          const startDate = data.startDate?.toDate?.() || new Date()
          const yearsAgo = today.getFullYear() - startDate.getFullYear()

          // Count hands for this tournament
          const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
          const handsQuery = query(handsRef, where('tournamentId', '==', tournamentId))
          const handsSnap = await getDocs(handsQuery)
          const handCount = handsSnap.size

          return {
            id: tournamentId,
            name: data.name,
            category: data.category,
            location: data.location,
            startDate: startDate.toISOString(),
            endDate: data.endDate?.toDate?.()?.toISOString() || startDate.toISOString(),
            handCount,
            yearsAgo,
          }
        })
      )

      setTournaments(enrichedTournaments)
    } catch (error) {
      console.error('Error loading historical tournaments:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <section className="py-16 md:py-24">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        <div className="mb-12 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-title-lg text-foreground">On This Day</h2>
          </div>
          <p className="text-body-lg text-muted-foreground">Relive poker history from {formattedDate} in previous years</p>
        </div>

        <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-3">
          {loading ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-body text-muted-foreground">Loading...</p>
            </div>
          ) : tournaments.length === 0 ? (
            <div className="col-span-3 text-center py-8">
              <p className="text-body text-muted-foreground">No historical tournaments found</p>
            </div>
          ) : (
            tournaments.map((tournament) => (
              <Link key={tournament.id} href="/archive">
                <Card className="group overflow-hidden border-border bg-card hover:border-primary/50 transition-all cursor-pointer">
                  <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-primary/20 to-purple-600/20">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Video className="h-16 w-16 text-primary/40" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white">
                      {tournament.category}
                    </div>
                    <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-3 py-1 text-xs font-bold text-primary-foreground">
                      {tournament.yearsAgo} {tournament.yearsAgo === 1 ? 'year' : 'years'} ago
                    </div>
                  </div>

                  <div className="p-4">
                    <h3 className="mb-2 text-body font-semibold text-card-foreground group-hover:text-primary transition-colors line-clamp-2">
                      {tournament.name}
                    </h3>
                    <p className="mb-3 text-caption text-muted-foreground line-clamp-2">
                      {tournament.location} • {formatDate(tournament.startDate)} - {formatDate(tournament.endDate)}
                    </p>
                    <div className="flex items-center justify-between text-caption text-muted-foreground">
                      <span>{formatDate(tournament.startDate)}</span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {tournament.handCount} hands
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  )
}
