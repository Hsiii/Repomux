import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
    supabaseUrl === undefined || supabaseKey === undefined
        ? undefined
        : createClient(supabaseUrl, supabaseKey);
