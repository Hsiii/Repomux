import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as
    | string
    | undefined;

export const supabase =
    supabaseUrl === undefined || supabaseKey === undefined
        ? undefined
        : createClient(supabaseUrl, supabaseKey);
