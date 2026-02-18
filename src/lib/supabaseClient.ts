import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vyuyyvuolbeuhsotbypn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LJvwdEWybTE1XwagTOBz-w_x53pKLqw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
