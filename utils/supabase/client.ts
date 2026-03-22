

import { createBrowserClient } from '@supabase/ssr';

// Replace these with your actual Supabase project values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const supabase = createBrowserClient(supabaseUrl, supabaseKey)

export default supabase