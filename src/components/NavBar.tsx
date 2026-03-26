'use client'

import type { Seat, SeatStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  Combobox, ComboboxInput, ComboboxContent,
  ComboboxList, ComboboxItem, ComboboxEmpty,
} from '@/components/ui/combobox'
import { Search, X } from 'lucide-react'

const STATUS_OPTIONS: { value: SeatStatus; label: string }[] = [
  { value: 'OCCUPIED',  label: 'Occupied'  },
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED',  label: 'Reserved'  },
]

const STAT_COLOURS: Record<SeatStatus, string> = {
  OCCUPIED:  '#ef4444',
  AVAILABLE: '#22c55e',
  RESERVED:  '#f59e0b',
}

interface NavBarProps {
  seats:              Seat[]
  userEmail:          string
  teams:              string[]
  searchQuery:        string
  onSearchChange:     (q: string) => void
  statusFilter:       Set<SeatStatus>
  onStatusToggle:     (status: SeatStatus) => void
  teamFilter:         string | null
  onTeamFilterChange: (team: string | null) => void
}

export function NavBar({
  seats, userEmail, teams,
  searchQuery, onSearchChange,
  statusFilter, onStatusToggle,
  teamFilter, onTeamFilterChange,
}: NavBarProps) {
  const router = useRouter()

  const visible   = seats.filter((s) => statusFilter.has(s.status))
  const occupied  = visible.filter((s) => s.status === 'OCCUPIED').length
  const available = visible.filter((s) => s.status === 'AVAILABLE').length
  const reserved  = visible.filter((s) => s.status === 'RESERVED').length

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background px-5 py-3 flex items-center gap-3 shrink-0 flex-wrap min-h-[56px]">

      {/* Logo */}
      <span className="font-semibold text-sm mr-1">SeatMap</span>

      {/* Search */}
      <div className="relative w-[300px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name or seat…"
          className="pl-8 pr-7 h-9 text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      {/* Status filter — ToggleGroup outline */}
      <ToggleGroup variant="outline">
        {STATUS_OPTIONS.map(({ value, label }) => (
          <ToggleGroupItem
            key={value}
            pressed={statusFilter.has(value)}
            onPressedChange={() => onStatusToggle(value)}
            className="text-sm h-9 px-3"
          >
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      {/* Team filter — Combobox */}
      {teams.length > 0 && (
        <div className="w-[180px]">
          <Combobox
            value={teamFilter ?? null}
            onValueChange={(v) => onTeamFilterChange(v ?? null)}
          >
            <ComboboxInput
              placeholder="All teams"
              showTrigger
              showClear={!!teamFilter}
              className="h-9 text-sm"
            />
            <ComboboxContent>
              <ComboboxList>
                {teams.map((t) => (
                  <ComboboxItem key={t} value={t}>{t}</ComboboxItem>
                ))}
                <ComboboxEmpty>No teams found</ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      )}

      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <StatPill colour={STAT_COLOURS.OCCUPIED}  label="occupied"  count={occupied}  />
        <StatPill colour={STAT_COLOURS.AVAILABLE} label="available" count={available} />
        <StatPill colour={STAT_COLOURS.RESERVED}  label="reserved"  count={reserved}  />
      </div>

      {/* Audit log */}
      <a href="/audit" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Audit log
      </a>

      {/* User + sign out */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{userEmail}</span>
        <button onClick={handleSignOut} className="hover:text-foreground transition-colors">
          Sign out
        </button>
      </div>
    </header>
  )
}

function StatPill({ colour, label, count }: { colour: string; label: string; count: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colour }} />
      <span className="font-medium text-foreground">{count}</span>
      <span>{label}</span>
    </span>
  )
}
