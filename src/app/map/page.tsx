import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { MapClient } from '@/components/MapClient'
import type { Seat } from '@/types'

export default async function MapPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  const [{ data: floor }, { data: seats }, { data: teamRows }, { data: divisionRows }] = await Promise.all([
    db.from('floors').select('id, name, svg_content').single(),
    db.from('seats').select('*').order('label'),
    db.from('seats').select('occupant_team').not('occupant_team', 'is', null),
    db.from('seats').select('occupant_division').not('occupant_division', 'is', null),
  ])

  if (!floor) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No floor plan found. Run <code>npm run seed</code> first.
      </div>
    )
  }

  const teams     = [...new Set((teamRows     ?? []).map((r) => r.occupant_team     as string))].sort()
  const divisions = [...new Set((divisionRows ?? []).map((r) => r.occupant_division as string))].sort()

  return (
    <div className="flex flex-col h-full">
      <MapClient
        floor={floor}
        initialSeats={(seats ?? []) as Seat[]}
        teams={teams}
        divisions={divisions}
        userEmail={user.email ?? ''}
      />
    </div>
  )
}
