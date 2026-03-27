import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listSnapshots } from '@/app/actions/floor'
import { AdminClient } from './AdminClient'
import type { AuditLog } from '@/types'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createAdminClient()

  const [snapshots, { data: logs }] = await Promise.all([
    listSnapshots(),
    db
      .from('audit_logs')
      .select('*, seat:seats(label)')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <a href="/map" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to map
        </a>
        <h1 className="font-semibold text-sm">Admin</h1>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10">
        <AdminClient
          initialSnapshots={snapshots}
          initialLogs={(logs ?? []) as AuditLog[]}
        />
      </main>
    </div>
  )
}
