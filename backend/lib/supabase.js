import 'dotenv/config' ; 
import { createClient } from '@supabase/supabase-js/dist/index.cjs';

export const supabase = createClient(
    process.env.SUPABASE_URL,
    process.eventNames.SUPABASE_ANON_KEY,
    {auth: { autoRefreshToken: false, persistSession: false }}
)
export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)