import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function isAllowedEmail(email: string) {
  return /^[^@]+@([a-z0-9-]+\.)*open\.gov\.sg$/i.test(email)
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Hard-enforce email domain — sign out and reject if not allowed
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email || !isAllowedEmail(user.email)) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=domain`)
    }
  }

  return NextResponse.redirect(`${origin}/map`)
}
