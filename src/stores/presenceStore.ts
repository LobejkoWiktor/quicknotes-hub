import { create } from 'zustand';

interface PresenceEntry {
  userId: string;
  userName: string;
  pageId: string;
  lastSeen: number;
}

interface PresenceState {
  entries: PresenceEntry[];
  setPresence: (userId: string, userName: string, pageId: string) => void;
  removePresence: (userId: string) => void;
  getOtherEditors: (pageId: string, currentUserId: string) => PresenceEntry[];
}

const PRESENCE_TIMEOUT = 20_000; // 20 seconds

export const usePresenceStore = create<PresenceState>((set, get) => ({
  entries: [],

  setPresence: (userId, userName, pageId) =>
    set((s) => {
      const now = Date.now();
      const filtered = s.entries.filter(
        (e) => e.userId !== userId && now - e.lastSeen < PRESENCE_TIMEOUT,
      );
      return { entries: [...filtered, { userId, userName, pageId, lastSeen: now }] };
    }),

  removePresence: (userId) =>
    set((s) => ({ entries: s.entries.filter((e) => e.userId !== userId) })),

  getOtherEditors: (pageId, currentUserId) => {
    const now = Date.now();
    return get().entries.filter(
      (e) => e.pageId === pageId && e.userId !== currentUserId && now - e.lastSeen < PRESENCE_TIMEOUT,
    );
  },
}));
