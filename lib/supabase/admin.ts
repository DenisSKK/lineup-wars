import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase service role configuration')
}

/**
 * WARNING: Supabase Admin Client - Use with Extreme Caution
 *
 * This client uses the Supabase service role key and has full admin privileges:
 * - Bypasses all Row Level Security (RLS) policies
 * - Has unrestricted read/write access to the entire database
 * - Can perform any administrative operation
 *
 * SECURITY REQUIREMENTS:
 * - Must ONLY be used in trusted server-side code (API routes, Server Components, cron jobs)
 * - Must NEVER be imported into any client-side/browser bundle
 * - Must NEVER be used in Next.js "use client" components
 * - Must NEVER expose the service role key or this client to the browser
 *
 * Exposing this client or the service role key to the browser would completely
 * compromise your database security, allowing anyone to read, modify, or delete any data.
 *
 * For client-side operations, always use the regular Supabase client with RLS enabled.
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
