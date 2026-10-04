iimport { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const url = 'https://absqkaxcadexjlihlzfg.supabase.co';

const key = 'sb_publishable_96AohkOE7VLdRKVsAFPyoQ_xz39cUmx';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
