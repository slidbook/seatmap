'use client'

import type { Seat, SeatStatus } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

const STATUS_OPTIONS: { value: SeatStatus; label: string; colour: string }[] = [
  { value: 'OCCUPIED',  label: 'Occupied',  colour: '#ef4444' },
  { value: 'AVAILABLE', label: 'Available', colour: '#22c55e' },
  { value: 'RESERVED',  label: 'Reserved',  colour: '#f59e0b' },
]

interface NavBarProps {
  seats:               Seat[]
  userEmail:           string
  teams:               string[]
  // search
  searchQuery:         string
  onSearchChange:      (q: string) => void
  // status filter
  statusFilter:        Set<SeatStatus>
  onStatusToggle:      (status: SeatStatus) => void
  // team filter
  teamFilter:          string | null
  onTeamFilterChange:  (team: string | null) => void
}

export function NavBar({
  seats,
  userEmail,
  teams,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusToggle,
  teamFilter,
  onTeamFilterChange,
}: NavBarProps) {
  const router = useRouter()

  // Stats reflect only the currently-visible filtered seats
  const visible = seats.filter((s) => statusFilter.has(s.status))
  const occupied  = visible.filter((s) => s.status === 'OCCUPIED').length
  const available = visible.filter((s) => s.status === 'AVAILABLE').length
  const reserved  = visible.filter((s) => s.status === 'RESERVED').length

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="border-b bg-background px-4 py-2 flex items-center gap-3 shrink-0 flex-wrap">
      {/* Logo */}
      <span className="font-semibold text-sm mr-1">SeatMap</span>

      {/* Search */}
      <div className="relative w-44">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search name or seat…"
          className="pl-8 pr-7 h-8 text-xs"
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

      {/* Status filter toggles */}
      <div className="flex items-center gap-1">
        {STATUS_OPTIONS.map(({ value, label, colour }) => {
          const active = statusFilter.has(value)
          return (
            <button
              key={value}
              onClick={() => onStatusToggle(value)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40'
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: active ? 'currentColor' : colour }}
              />
              {label}
            </button>
          )
        })}
      </div>

      {/* Team filter */}
      {teams.length > 0 && (
        <Select
          value={teamFilter ?? '__all__'}
          onValueChange={(v) => onTeamFilterChange(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="h-8 text-xs w-36">
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All teams</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <StatPill colour="#ef4444" label="occupied"  count={occupied}  />
        <StatPill colour="#22c55e" label="available" count={available} />
        <StatPill colour="#f59e0b" label="reserved"  count={reserved}  />
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
