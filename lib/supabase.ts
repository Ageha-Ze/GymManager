import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh
    autoRefreshToken: true,
    persistSession: true,
    // Refresh tokens 5 minutes before expiry
    detectSessionInUrl: false,
    flowType: 'pkce'
  },
  global: {
    // Suppress fetch - we handle retries at the component level
    headers: {
      'X-Client-Info': 'gym-app-network-resilient'
    }
  },
})
