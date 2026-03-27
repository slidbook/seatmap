import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listSnapshots } from '@/app/actions/floor'
import { AdminClient } from './AdminClient'

export default async function AdminPage() {
  // Auth guard
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const snapshots = await listSnapshots()

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b px-6 py-4 flex items-center gap-4">
        <a href="/map" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to map
        </a>
        <h1 className="font-semibold text-sm">Floor plan</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 py-10">
        <AdminClient initialSnapshots={snapshots} />
      </main>
    </div>
  )
}
