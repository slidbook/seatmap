import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// Supabase redirects to the root URL with ?code=... after magic link verification.
// Forward the code to the /auth/callback route handler, which can set cookies
// properly before redirecting to /map.
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>
}) {
  const { code } = await searchParams
  if (code) {
    redirect(`/auth/callback?code=${code}`)
  }
  redirect('/map')
}
