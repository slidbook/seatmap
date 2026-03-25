'use client'

import { useState, useCallback } from 'react'
import { SeatMap } from './SeatMap'
import { SeatModal } from './SeatModal'
import { NavBar } from './NavBar'
import type { Seat, Floor } from '@/types'
import { moveSeat } from '@/app/actions/seats'
import { createClient } from '@/lib/supabase/client'

interface MapClientProps {
  floor:        Floor
  initialSeats: Seat[]
  teams:        string[]
  userEmail:    string
}

export function MapClient({ floor, initialSeats, teams, userEmail }: MapClientProps) {
  const [seats,        setSeats]        = useState<Seat[]>(initialSeats)
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null)
  const [movingFrom,   setMovingFrom]   = useState<Seat | null>(null)
  const [moveError,    setMoveError]    = useState<string | null>(null)

  const refreshSeats = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase.from('seats').select('*').order('label')
    if (data) setSeats(data as Seat[])
  }, [])

  const handleSeatClick = useCallback((seat: Seat) => {
    if (movingFrom) {
      // We're in move mode — this click is the destination
      if (seat.id === movingFrom.id) {
        // Clicked the source seat again — cancel
        setMovingFrom(null)
        return
      }

      if (seat.status === 'OCCUPIED') {
        const ok = window.confirm(
          `${seat.label} is occupied by ${seat.occupant_name}.\n\nSwap ${movingFrom.occupant_name} with ${seat.occupant_name}?`
        )
        if (!ok) return
      }

      moveSeat(movingFrom.id, seat.id)
        .then(() => refreshSeats())
        .catch((e) => setMoveError(e.message))
        .finally(() => setMovingFrom(null))
      return
    }

    setSelectedSeat(seat)
  }, [movingFrom, refreshSeats])

  const handleMoveStart = useCallback((seat: Seat) => {
    setMoveError(null)
    setMovingFrom(seat)
  }, [])

  return (
    <>
      <NavBar seats={seats} userEmail={userEmail} />

      {movingFrom && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between">
          <span>
            Moving <strong>{movingFrom.occupant_name}</strong> from <strong>{movingFrom.label}</strong>.
            Click a destination seat, or{' '}
            <button className="underline font-medium" onClick={() => setMovingFrom(null)}>cancel</button>.
          </span>
        </div>
      )}

      {moveError && (
        <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2 text-sm text-destructive">
          Move failed: {moveError}
          <button className="ml-3 underline" onClick={() => setMoveError(null)}>Dismiss</button>
        </div>
      )}

      <main className="flex-1 overflow-auto bg-muted/30">
        <SeatMap
          svgContent={floor.svg_content}
          seats={seats}
          onSeatClick={handleSeatClick}
          moveSourceId={movingFrom?.id}
        />
      </main>

      <SeatModal
        seat={selectedSeat}
        teams={teams}
        onClose={() => setSelectedSeat(null)}
        onUpdated={refreshSeats}
        onMoveStart={handleMoveStart}
      />
    </>
  )
}
