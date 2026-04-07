import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://sgavjnkjolcgcgzbnzrf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_jPT4Qskq6AZwg3HLz1fdCg_DZKkvikB';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
