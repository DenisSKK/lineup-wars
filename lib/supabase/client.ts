import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!url || !key) {
    console.warn('Missing Supabase environment variables')
    // Return a dummy client during build
    return createBrowserClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  return createBrowserClient(url, key)
}
