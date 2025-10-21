// import { createBrowserClient } from '@supabase/ssr'

// export function createClient() {
//     return createBrowserClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         // process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//     )
// }


import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project values
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase