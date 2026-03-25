'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function getEditorEmail(): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? 'unknown'
}

async function writeAudit(
  seatId: string,
  action: string,
  editorEmail: string,
  opts?: { field?: string; oldValue?: string | null; newValue?: string | null }
) {
  const db = createAdminClient()
  await db.from('audit_logs').insert({
    seat_id: seatId,
    editor_email: editorEmail,
    action,
    field: opts?.field ?? null,
    old_value: opts?.oldValue ?? null,
    new_value: opts?.newValue ?? null,
  })
}

export async function assignSeat(
  seatId: string,
  occupantName: string,
  occupantTeam: string,
  notes: string
) {
  const db = createAdminClient()
  const email = await getEditorEmail()

  const { data: old } = await db.from('seats').select('occupant_name').eq('id', seatId).single()

  const { error } = await db.from('seats').update({
    status: 'OCCUPIED',
    occupant_name: occupantName,
    occupant_team: occupantTeam || null,
    notes: notes || null,
  }).eq('id', seatId)
  if (error) throw new Error(error.message)

  await writeAudit(seatId, 'ASSIGN', email, {
    field: 'occupant_name',
    oldValue: old?.occupant_name ?? null,
    newValue: occupantName,
  })
}

export async function unassignSeat(seatId: string) {
  const db = createAdminClient()
  const email = await getEditorEmail()

  const { data: old } = await db.from('seats').select('occupant_name').eq('id', seatId).single()

  const { error } = await db.from('seats').update({
    status: 'AVAILABLE',
    occupant_name: null,
    occupant_team: null,
  }).eq('id', seatId)
  if (error) throw new Error(error.message)

  await writeAudit(seatId, 'UNASSIGN', email, {
    field: 'occupant_name',
    oldValue: old?.occupant_name ?? null,
  })
}

export async function reserveSeat(seatId: string, notes: string) {
  const db = createAdminClient()
  const email = await getEditorEmail()

  const { error } = await db.from('seats').update({
    status: 'RESERVED',
    notes: notes || null,
  }).eq('id', seatId)
  if (error) throw new Error(error.message)

  await writeAudit(seatId, 'RESERVE', email, {
    field: 'status',
    newValue: notes ? `RESERVED — ${notes}` : 'RESERVED',
  })
}

export async function makeAvailable(seatId: string) {
  const db = createAdminClient()
  const email = await getEditorEmail()

  const { data: old } = await db.from('seats').select('status').eq('id', seatId).single()

  const { error } = await db.from('seats').update({
    status: 'AVAILABLE',
    occupant_name: null,
    occupant_team: null,
    notes: null,
  }).eq('id', seatId)
  if (error) throw new Error(error.message)

  await writeAudit(seatId, 'UPDATE', email, {
    field: 'status',
    oldValue: old?.status ?? null,
    newValue: 'AVAILABLE',
  })
}

export async function updateSeat(
  seatId: string,
  updates: {
    label?: string
    occupant_name?: string
    occupant_team?: string | null
    notes?: string | null
  }
) {
  const db = createAdminClient()
  const email = await getEditorEmail()

  const { data: old } = await db.from('seats').select('*').eq('id', seatId).single()

  const { error } = await db.from('seats').update(updates).eq('id', seatId)
  if (error) throw new Error(error.message)

  const fields = Object.keys(updates) as (keyof typeof updates)[]
  for (const field of fields) {
    if (old && updates[field] !== old[field]) {
      await writeAudit(seatId, 'UPDATE', email, {
        field,
        oldValue: old[field] ?? null,
        newValue: updates[field] ?? null,
      })
    }
  }
}

export async function moveSeat(fromSeatId: string, toSeatId: string) {
  const db = createAdminClient()
  const email = await getEditorEmail()

  const { data: fromSeat } = await db.from('seats').select('*').eq('id', fromSeatId).single()
  const { data: toSeat }   = await db.from('seats').select('*').eq('id', toSeatId).single()
  if (!fromSeat || !toSeat) throw new Error('Seat not found')

  const isSwap = toSeat.status === 'OCCUPIED'

  if (isSwap) {
    await db.from('seats').update({
      occupant_name: toSeat.occupant_name,
      occupant_team: toSeat.occupant_team,
      status: 'OCCUPIED',
    }).eq('id', fromSeatId)

    await db.from('seats').update({
      occupant_name: fromSeat.occupant_name,
      occupant_team: fromSeat.occupant_team,
      status: 'OCCUPIED',
    }).eq('id', toSeatId)

    await writeAudit(fromSeatId, 'MOVE', email, {
      field: 'seat',
      oldValue: fromSeat.label,
      newValue: `${toSeat.label} (swapped with ${toSeat.occupant_name})`,
    })
    await writeAudit(toSeatId, 'MOVE', email, {
      field: 'seat',
      oldValue: toSeat.label,
      newValue: `${fromSeat.label} (swapped with ${fromSeat.occupant_name})`,
    })
  } else {
    await db.from('seats').update({
      status: 'AVAILABLE',
      occupant_name: null,
      occupant_team: null,
    }).eq('id', fromSeatId)

    await db.from('seats').update({
      status: 'OCCUPIED',
      occupant_name: fromSeat.occupant_name,
      occupant_team: fromSeat.occupant_team,
    }).eq('id', toSeatId)

    await writeAudit(fromSeatId, 'MOVE', email, {
      field: 'seat',
      oldValue: fromSeat.label,
      newValue: toSeat.label,
    })
  }

  return { isSwap, swapPersonName: isSwap ? (toSeat.occupant_name as string) : null }
}
