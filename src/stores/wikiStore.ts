import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from './authStore';

export interface Block {
  id: string;
  type: 'paragraph' | 'h1' | 'h2' | 'h3' | 'bullet' | 'numbered' | 'checklist' | 'table';
  data: Record<string, unknown>;
}

export interface Page {
  id: string;
  folderId: string;
  title: string;
  position: number;
  blocks: Block[];
}

export interface Folder {
  id: string;
  name: string;
  position: number;
  isOpen: boolean;
}

interface WikiState {
  folders: Folder[];
  pages: Page[];
  activePageId: string | null;
  searchQuery: string;
  savedBlocksMap: Record<string, Block[]>;
  isDataLoaded: boolean;

  loadWikiData: (userId: string) => Promise<void>;
  
  setSearchQuery: (q: string) => void;
  setActivePage: (id: string | null) => void;

  addFolder: (name: string) => Promise<void>;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  toggleFolder: (id: string) => void;
  reorderFolders: (fromIndex: number, toIndex: number) => void;

  addPage: (folderId: string) => void;
  renamePage: (id: string, title: string) => void;
  deletePage: (id: string) => void;
  reorderPages: (folderId: string, fromIndex: number, toIndex: number) => void;

  addBlock: (pageId: string, type: Block['type'], afterBlockId?: string) => string;
  updateBlock: (pageId: string, blockId: string, data: Record<string, unknown>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  changeBlockType: (pageId: string, blockId: string, type: Block['type']) => void;
  reorderBlocks: (pageId: string, fromIndex: number, toIndex: number) => void;

  savePageContent: (pageId: string) => Promise<void>;
  hasUnsavedChanges: (pageId: string) => boolean;
}

const uid = () => crypto.randomUUID();

const defaultBlock = (type: Block['type'] = 'paragraph'): Block => {
  if (type === 'table') {
    return { id: uid(), type, data: { rows: [['', ''], ['', '']] } };
  }
  if (type === 'checklist') {
    return { id: uid(), type, data: { text: '', checked: false } };
  }
  return { id: uid(), type, data: { text: '' } };
};

// Seed data
const seedFolderId = uid();
const seedPageId = uid();

const seedBlocks: Block[] = [
  { id: uid(), type: 'h1', data: { text: 'Welcome to your Wiki' } },
  { id: uid(), type: 'paragraph', data: { text: 'Start writing here. Use the toolbar to add different block types.' } },
];

export const useWikiStore = create<WikiState>((set, get) => ({
  folders: [],
  pages: [],
  activePageId: null,
  searchQuery: '',
  savedBlocksMap: {},
  isDataLoaded: false,

  loadWikiData: async (userId) => {
    const [{ data: dbFolders }, { data: dbPages }] = await Promise.all([
      supabase.from('folders').select('*').eq('user_id', userId).order('position', { ascending: true }),
      supabase.from('pages').select('*').eq('user_id', userId).order('position', { ascending: true }),
    ]);

    const folders: Folder[] = (dbFolders || []).map(f => ({
      id: f.id,
      name: f.name,
      position: f.position,
      isOpen: true,
    }));

    const pages: Page[] = (dbPages || []).map(p => ({
      id: p.id,
      folderId: p.folder_id,
      title: p.title,
      position: p.position,
      blocks: typeof p.blocks === 'string' ? JSON.parse(p.blocks) : (p.blocks || []),
    }));

    const savedBlocksMap: Record<string, Block[]> = {};
    pages.forEach(p => {
      savedBlocksMap[p.id] = structuredClone(p.blocks);
    });

    set({
      folders,
      pages,
      savedBlocksMap,
      isDataLoaded: true,
      activePageId: pages.length > 0 ? pages[0].id : null,
    });
  },

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActivePage: (id) => set({ activePageId: id }),

  addFolder: async (name) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const s = get();
    const newFolder = { id: uid(), name, position: s.folders.length, isOpen: true };
    
    set({ folders: [...s.folders, newFolder] });

    await supabase.from('folders').insert({
      id: newFolder.id,
      user_id: userId,
      name: newFolder.name,
      position: newFolder.position,
    });
  },
  renameFolder: (id, name) => set((s) => ({
    folders: s.folders.map((f) => f.id === id ? { ...f, name } : f),
  })),
  deleteFolder: (id) => set((s) => ({
    folders: s.folders.filter((f) => f.id !== id),
    pages: s.pages.filter((p) => p.folderId !== id),
    activePageId: s.activePageId && s.pages.find((p) => p.id === s.activePageId)?.folderId === id ? null : s.activePageId,
  })),
  toggleFolder: (id) => set((s) => ({
    folders: s.folders.map((f) => f.id === id ? { ...f, isOpen: !f.isOpen } : f),
  })),
  reorderFolders: (from, to) => set((s) => {
    const arr = [...s.folders];
    const [item] = arr.splice(from, 1);
    arr.splice(to, 0, item);
    return { folders: arr.map((f, i) => ({ ...f, position: i })) };
  }),

  addPage: (folderId) => {
    const s = get();
    const folderPages = s.pages.filter((p) => p.folderId === folderId);
    const initialBlocks = [defaultBlock('paragraph')];
    const newPage: Page = {
      id: uid(),
      folderId,
      title: 'Untitled',
      position: folderPages.length,
      blocks: initialBlocks,
    };
    set({
      pages: [...s.pages, newPage],
      activePageId: newPage.id,
      savedBlocksMap: { ...s.savedBlocksMap, [newPage.id]: structuredClone(initialBlocks) },
    });
  },
  renamePage: (id, title) => set((s) => ({
    pages: s.pages.map((p) => p.id === id ? { ...p, title } : p),
  })),
  deletePage: (id) => set((s) => ({
    pages: s.pages.filter((p) => p.id !== id),
    activePageId: s.activePageId === id ? null : s.activePageId,
  })),
  reorderPages: (folderId, from, to) => set((s) => {
    const folderPages = s.pages.filter((p) => p.folderId === folderId).sort((a, b) => a.position - b.position);
    const otherPages = s.pages.filter((p) => p.folderId !== folderId);
    const [item] = folderPages.splice(from, 1);
    folderPages.splice(to, 0, item);
    return { pages: [...otherPages, ...folderPages.map((p, i) => ({ ...p, position: i }))] };
  }),

  addBlock: (pageId, type, afterBlockId) => {
    const newBlock = defaultBlock(type);
    set((s) => ({
      pages: s.pages.map((p) => {
        if (p.id !== pageId) return p;
        if (!afterBlockId) return { ...p, blocks: [...p.blocks, newBlock] };
        const idx = p.blocks.findIndex((b) => b.id === afterBlockId);
        const blocks = [...p.blocks];
        blocks.splice(idx + 1, 0, newBlock);
        return { ...p, blocks };
      }),
    }));
    return newBlock.id;
  },
  updateBlock: (pageId, blockId, data) => set((s) => ({
    pages: s.pages.map((p) =>
      p.id !== pageId ? p : {
        ...p,
        blocks: p.blocks.map((b) => b.id === blockId ? { ...b, data: { ...b.data, ...data } } : b),
      }
    ),
  })),
  deleteBlock: (pageId, blockId) => set((s) => ({
    pages: s.pages.map((p) =>
      p.id !== pageId ? p : { ...p, blocks: p.blocks.filter((b) => b.id !== blockId) }
    ),
  })),
  changeBlockType: (pageId, blockId, type) => set((s) => ({
    pages: s.pages.map((p) =>
      p.id !== pageId ? p : {
        ...p,
        blocks: p.blocks.map((b) => {
          if (b.id !== blockId) return b;
          if (type === 'table') return { ...b, type, data: { rows: [['', ''], ['', '']] } };
          if (type === 'checklist') return { ...b, type, data: { text: b.data.text || '', checked: false } };
          return { ...b, type };
        }),
      }
    ),
  })),
  reorderBlocks: (pageId, from, to) => set((s) => ({
    pages: s.pages.map((p) => {
      if (p.id !== pageId) return p;
      const blocks = [...p.blocks];
      const [item] = blocks.splice(from, 1);
      blocks.splice(to, 0, item);
      return { ...p, blocks };
    }),
  })),

  savePageContent: async (pageId) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const s = get();
    const page = s.pages.find((p) => p.id === pageId);
    if (!page) return;

    set({ savedBlocksMap: { ...s.savedBlocksMap, [pageId]: structuredClone(page.blocks) } });

    await supabase.from('pages').upsert({
      id: page.id,
      user_id: userId,
      folder_id: page.folderId,
      title: page.title,
      blocks: page.blocks as any, // casting to any so supabase types don't complain about jsonb structure
      position: page.position,
    });
  },

  hasUnsavedChanges: (pageId) => {
    const s = get();
    const page = s.pages.find((p) => p.id === pageId);
    if (!page) return false;
    const saved = s.savedBlocksMap[pageId];
    if (!saved) return page.blocks.length > 0;
    return JSON.stringify(page.blocks) !== JSON.stringify(saved);
  },
}));
