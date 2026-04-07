import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

interface PresenceState {
  lockedBy: string | null; 
  checkLock: (pageId: string, currentUserId: string) => Promise<boolean>;
  claimLock: (pageId: string, currentUserId: string) => Promise<void>;
  releaseLock: (pageId: string, currentUserId: string) => Promise<void>;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  lockedBy: null,

  checkLock: async (pageId, currentUserId) => {
    const ninetySecondsAgo = new Date(Date.now() - 90000).toISOString();
    
    const { data } = await supabase
      .from('page_editors')
      .select('user_id, last_seen')
      .eq('page_id', pageId)
      .neq('user_id', currentUserId)
      .gte('last_seen', ninetySecondsAgo)
      .order('last_seen', { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      set({ lockedBy: data[0].user_id });
      return true;
    } else {
      set({ lockedBy: null });
      return false;
    }
  },

  claimLock: async (pageId, currentUserId) => {
    await supabase.from('page_editors').upsert({
      page_id: pageId,
      user_id: currentUserId,
      last_seen: new Date().toISOString(),
    });
    set({ lockedBy: null }); 
  },

  releaseLock: async (pageId, currentUserId) => {
    await supabase.from('page_editors').delete().match({
      page_id: pageId,
      user_id: currentUserId,
    });
  },
}));
