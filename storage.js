// Browser storage is only for local UI preferences. Shared business data lives in Supabase.
export const storage = {
  pref(k, v) {
    const key = 'ddm:' + k;
    if (v === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, v);
  }
};