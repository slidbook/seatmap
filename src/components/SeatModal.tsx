'use client'

import { useState, useTransition } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { Seat } from '@/types'
import { assignSeat, unassignSeat, reserveSeat, makeAvailable, updateSeat } from '@/app/actions/seats'

type Mode = 'view' | 'assign' | 'reserve' | 'edit'

const STATUS_LABELS  = { AVAILABLE: 'Available', OCCUPIED: 'Occupied', RESERVED: 'Reserved' }
const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary'> = {
  AVAILABLE: 'default',
  OCCUPIED:  'destructive',
  RESERVED:  'secondary',
}

interface SeatModalProps {
  seat:      Seat | null
  teams:     string[]
  onClose:   () => void
  onUpdated: () => Promise<void>
  onMoveStart: (seat: Seat) => void
}

export function SeatModal({ seat, teams, onClose, onUpdated, onMoveStart }: SeatModalProps) {
  const [mode, setMode] = useState<Mode>('view')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name,  setName]  = useState('')
  const [team,  setTeam]  = useState('')
  const [notes, setNotes] = useState('')
  const [label, setLabel] = useState('')

  const enterMode = (m: Mode) => {
    setError(null)
    if (m === 'assign' || m === 'edit') {
      setName(seat?.occupant_name  ?? '')
      setTeam(seat?.occupant_team  ?? '')
      setNotes(seat?.notes         ?? '')
      setLabel(seat?.label         ?? '')
    }
    if (m === 'reserve') {
      setNotes(seat?.notes ?? '')
    }
    setMode(m)
  }

  const close = () => {
    setMode('view')
    setError(null)
    onClose()
  }

  const run = (fn: () => Promise<void>) => {
    setError(null)
    startTransition(async () => {
      try {
        await fn()
        await onUpdated()
        close()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong')
      }
    })
  }

  if (!seat) return null

  return (
    <Dialog open={!!seat} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {seat.label}
            <Badge variant={STATUS_VARIANTS[seat.status]}>
              {STATUS_LABELS[seat.status]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* ── VIEW mode ── */}
        {mode === 'view' && (
          <>
            <div className="text-sm space-y-1">
              {seat.occupant_name && (
                <p className="font-medium">{seat.occupant_name}
                  {seat.occupant_team && (
                    <span className="font-normal text-muted-foreground"> · {seat.occupant_team}</span>
                  )}
                </p>
              )}
              {seat.notes && <p className="text-muted-foreground">{seat.notes}</p>}
              {!seat.occupant_name && !seat.notes && (
                <p className="text-muted-foreground italic">No details recorded.</p>
              )}
            </div>

            <DialogFooter>
              {seat.status === 'AVAILABLE' && (
                <>
                  <Button size="sm" onClick={() => enterMode('assign')}>Assign person</Button>
                  <Button size="sm" variant="outline" onClick={() => enterMode('reserve')}>Reserve</Button>
                </>
              )}
              {seat.status === 'OCCUPIED' && (
                <>
                  <Button size="sm" onClick={() => enterMode('edit')}>Edit</Button>
                  <Button size="sm" variant="outline" onClick={() => { close(); onMoveStart(seat) }}>Move</Button>
                  <Button size="sm" variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => unassignSeat(seat.id))}>
                    Unassign
                  </Button>
                </>
              )}
              {seat.status === 'RESERVED' && (
                <>
                  <Button size="sm" onClick={() => enterMode('assign')}>Assign person</Button>
                  <Button size="sm" variant="outline"
                    disabled={isPending}
                    onClick={() => run(() => makeAvailable(seat.id))}>
                    Make available
                  </Button>
                </>
              )}
            </DialogFooter>
          </>
        )}

        {/* ── ASSIGN / EDIT mode ── */}
        {(mode === 'assign' || mode === 'edit') && (
          <>
            <div className="grid gap-3">
              {mode === 'edit' && (
                <div className="grid gap-1.5">
                  <Label htmlFor="modal-label">Seat label</Label>
                  <Input id="modal-label" value={label} onChange={e => setLabel(e.target.value)} />
                </div>
              )}
              <div className="grid gap-1.5">
                <Label htmlFor="modal-name">Name *</Label>
                <Input id="modal-name" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" autoFocus />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="modal-team">Team</Label>
                <Input id="modal-team" value={team} onChange={e => setTeam(e.target.value)}
                  placeholder="Team name" list="modal-teams-list" />
                <datalist id="modal-teams-list">
                  {teams.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="modal-notes">Notes</Label>
                <Input id="modal-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <DialogFooter>
              <Button size="sm"
                disabled={isPending || !name.trim()}
                onClick={() => {
                  if (mode === 'assign') {
                    run(() => assignSeat(seat.id, name.trim(), team.trim(), notes.trim()))
                  } else {
                    run(() => updateSeat(seat.id, {
                      label: label.trim() || undefined,
                      occupant_name: name.trim(),
                      occupant_team: team.trim() || null,
                      notes: notes.trim() || null,
                    }))
                  }
                }}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('view')}>Back</Button>
            </DialogFooter>
          </>
        )}

        {/* ── RESERVE mode ── */}
        {mode === 'reserve' && (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="modal-reserve-notes">Reason (optional)</Label>
              <Input id="modal-reserve-notes" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Holding for Design hire" autoFocus />
            </div>
            <DialogFooter>
              <Button size="sm" disabled={isPending}
                onClick={() => run(() => reserveSeat(seat.id, notes.trim()))}>
                {isPending ? 'Saving…' : 'Reserve seat'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMode('view')}>Back</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
