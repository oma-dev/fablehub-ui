import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (see Supabase Dashboard → Project Settings → API).',
  )
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey)
