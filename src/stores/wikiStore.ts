import { create } from 'zustand';

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

  setSearchQuery: (q: string) => void;
  setActivePage: (id: string | null) => void;

  addFolder: (name: string) => void;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  toggleFolder: (id: string) => void;
  reorderFolders: (fromIndex: number, toIndex: number) => void;

  addPage: (folderId: string) => void;
  renamePage: (id: string, title: string) => void;
  deletePage: (id: string) => void;
  reorderPages: (folderId: string, fromIndex: number, toIndex: number) => void;

  addBlock: (pageId: string, type: Block['type'], afterBlockId?: string) => void;
  updateBlock: (pageId: string, blockId: string, data: Record<string, unknown>) => void;
  deleteBlock: (pageId: string, blockId: string) => void;
  changeBlockType: (pageId: string, blockId: string, type: Block['type']) => void;
  reorderBlocks: (pageId: string, fromIndex: number, toIndex: number) => void;
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

export const useWikiStore = create<WikiState>((set, get) => ({
  folders: [{ id: seedFolderId, name: 'Getting Started', position: 0, isOpen: true }],
  pages: [{
    id: seedPageId,
    folderId: seedFolderId,
    title: 'Welcome',
    position: 0,
    blocks: [
      { id: uid(), type: 'h1', data: { text: 'Welcome to your Wiki' } },
      { id: uid(), type: 'paragraph', data: { text: 'Start writing here. Use the toolbar to add different block types.' } },
    ],
  }],
  activePageId: seedPageId,
  searchQuery: '',

  setSearchQuery: (q) => set({ searchQuery: q }),
  setActivePage: (id) => set({ activePageId: id }),

  addFolder: (name) => set((s) => ({
    folders: [...s.folders, { id: uid(), name, position: s.folders.length, isOpen: true }],
  })),
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
    const newPage: Page = {
      id: uid(),
      folderId,
      title: 'Untitled',
      position: folderPages.length,
      blocks: [defaultBlock('paragraph')],
    };
    set({ pages: [...s.pages, newPage], activePageId: newPage.id });
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

  addBlock: (pageId, type, afterBlockId) => set((s) => ({
    pages: s.pages.map((p) => {
      if (p.id !== pageId) return p;
      const newBlock = defaultBlock(type);
      if (!afterBlockId) return { ...p, blocks: [...p.blocks, newBlock] };
      const idx = p.blocks.findIndex((b) => b.id === afterBlockId);
      const blocks = [...p.blocks];
      blocks.splice(idx + 1, 0, newBlock);
      return { ...p, blocks };
    }),
  })),
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
}));
