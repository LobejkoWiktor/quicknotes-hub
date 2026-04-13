import { useState } from 'react';
import { useWikiStore, type Folder } from '@/stores/wikiStore';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';
import {
  ChevronRight, ChevronDown, FolderIcon, FileText,
  Plus, Trash2, LogOut, MoreHorizontal, PenLine, FolderPlus,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const WikiSidebar = () => {
  const {
    folders, pages, activePageId, searchQuery,
    setActivePage, addFolder, addPage, deleteFolder,
    deletePage, toggleFolder, renameFolder, renamePage,
  } = useWikiStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const releaseLock = usePresenceStore((s) => s.releaseLock);

  const handleLogout = () => {
    if (activePageId && user) {
      releaseLock(activePageId, user.id);
    }
    logout();
  };

  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filteredPages = searchQuery
    ? pages.filter((p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : pages;

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim(), newFolderParentId);
      setNewFolderName('');
      setShowNewFolder(false);
      setNewFolderParentId(null);
    }
  };

  const startNewFolder = (parentId: string | null = null) => {
    setNewFolderParentId(parentId);
    setNewFolderName('');
    setShowNewFolder(true);
  };

  const startEdit = (id: string, value: string) => {
    setEditingId(id);
    setEditValue(value);
  };

  const commitEdit = (type: 'folder' | 'page') => {
    if (editingId && editValue.trim()) {
      if (type === 'folder') renameFolder(editingId, editValue.trim());
      else renamePage(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  /** Check if any descendant folder contains a matching page (for search mode). */
  const hasMatchingPages = (folderId: string): boolean => {
    if (filteredPages.some(p => p.folderId === folderId)) return true;
    return folders
      .filter(f => f.parentId === folderId)
      .some(f => hasMatchingPages(f.id));
  };

  // Root-level folders (no parent)
  const rootFolders = [...folders]
    .filter(f => f.parentId === null)
    .sort((a, b) => a.position - b.position);

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const childFolders = [...folders]
      .filter(f => f.parentId === folder.id)
      .sort((a, b) => a.position - b.position);

    const folderPages = filteredPages
      .filter((p) => p.folderId === folder.id)
      .sort((a, b) => a.position - b.position);

    // In search mode, hide folders that have no matching pages in their subtree
    if (searchQuery && folderPages.length === 0 && !childFolders.some(f => hasMatchingPages(f.id))) {
      return null;
    }

    return (
      <FolderItem
        key={folder.id}
        folder={folder}
        pages={folderPages}
        childFolders={childFolders}
        depth={depth}
        activePageId={activePageId}
        editingId={editingId}
        editValue={editValue}
        showNewFolder={showNewFolder && newFolderParentId === folder.id}
        newFolderName={newFolderName}
        onToggle={() => toggleFolder(folder.id)}
        onSelectPage={(id) => {
          const nav = (window as any).__wikiNavigate;
          if (nav) nav(id); else setActivePage(id);
        }}
        onAddPage={() => addPage(folder.id)}
        onAddSubfolder={() => {
          // Auto-open the folder so the user sees the input
          if (!folder.isOpen) toggleFolder(folder.id);
          startNewFolder(folder.id);
        }}
        onDeleteFolder={() => deleteFolder(folder.id)}
        onDeletePage={(id) => deletePage(id)}
        onStartEdit={startEdit}
        onEditChange={setEditValue}
        onCommitEdit={commitEdit}
        onNewFolderNameChange={setNewFolderName}
        onNewFolderSubmit={handleAddFolder}
        onNewFolderCancel={() => { setShowNewFolder(false); setNewFolderParentId(null); }}
        renderFolder={renderFolder}
      />
    );
  };

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-border bg-sidebar shrink-0">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 text-foreground font-semibold text-lg">
          <FileText className="h-5 w-5" />
          <span>Wiki</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {rootFolders.map((folder) => renderFolder(folder, 0))}

        {showNewFolder && newFolderParentId === null ? (
          <div className="flex gap-1 p-1">
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddFolder();
                if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderParentId(null); }
              }}
              placeholder="Folder name"
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleAddFolder}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => startNewFolder(null)}
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-wiki-hover rounded-md transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            New Folder
          </button>
        )}
      </div>

      <div className="p-3 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-wiki-hover rounded-md transition-colors"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

// ────────────────────────────────────────────────────────────────────────────

interface FolderItemProps {
  folder: Folder;
  pages: { id: string; title: string }[];
  childFolders: Folder[];
  depth: number;
  activePageId: string | null;
  editingId: string | null;
  editValue: string;
  showNewFolder: boolean;
  newFolderName: string;
  onToggle: () => void;
  onSelectPage: (id: string) => void;
  onAddPage: () => void;
  onAddSubfolder: () => void;
  onDeleteFolder: () => void;
  onDeletePage: (id: string) => void;
  onStartEdit: (id: string, value: string) => void;
  onEditChange: (v: string) => void;
  onCommitEdit: (type: 'folder' | 'page') => void;
  onNewFolderNameChange: (v: string) => void;
  onNewFolderSubmit: () => void;
  onNewFolderCancel: () => void;
  renderFolder: (folder: Folder, depth: number) => React.ReactNode;
}

const FolderItem = ({
  folder, pages, childFolders, depth, activePageId, editingId, editValue,
  showNewFolder, newFolderName,
  onToggle, onSelectPage, onAddPage, onAddSubfolder, onDeleteFolder,
  onDeletePage, onStartEdit, onEditChange, onCommitEdit,
  onNewFolderNameChange, onNewFolderSubmit, onNewFolderCancel,
  renderFolder,
}: FolderItemProps) => (
  <div>
    <div className="group flex items-center gap-1 px-1 py-1 rounded-md hover:bg-wiki-hover transition-colors">
      <button onClick={onToggle} className="p-0.5 rounded hover:bg-wiki-active transition-colors">
        {folder.isOpen
          ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      <FolderIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

      {editingId === folder.id ? (
        <Input
          value={editValue}
          onChange={(e) => onEditChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onCommitEdit('folder')}
          onBlur={() => onCommitEdit('folder')}
          className="h-6 text-sm flex-1"
          autoFocus
        />
      ) : (
        <span className="text-sm truncate flex-1">{folder.name}</span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-wiki-active transition-all">
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onAddPage}>
            <Plus className="h-3.5 w-3.5 mr-2" /> New Page
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAddSubfolder}>
            <FolderPlus className="h-3.5 w-3.5 mr-2" /> New Subfolder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onStartEdit(folder.id, folder.name)}>
            <PenLine className="h-3.5 w-3.5 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDeleteFolder} className="text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>

    {folder.isOpen && (
      <div className="ml-4 space-y-0.5 mt-0.5">
        {/* Child folders */}
        {childFolders.map((child) => renderFolder(child, depth + 1))}

        {/* Inline new subfolder input */}
        {showNewFolder && (
          <div className="flex gap-1 p-1">
            <Input
              value={newFolderName}
              onChange={(e) => onNewFolderNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onNewFolderSubmit();
                if (e.key === 'Escape') onNewFolderCancel();
              }}
              onBlur={onNewFolderCancel}
              placeholder="Subfolder name"
              className="h-7 text-sm"
              autoFocus
            />
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onNewFolderSubmit}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Pages */}
        {pages.map((page) => (
          <div
            key={page.id}
            className={`group flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-colors text-sm ${
              activePageId === page.id
                ? 'bg-wiki-active text-foreground font-medium'
                : 'text-muted-foreground hover:bg-wiki-hover hover:text-foreground'
            }`}
            onClick={() => onSelectPage(page.id)}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />

            {editingId === page.id ? (
              <Input
                value={editValue}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') onCommitEdit('page'); }}
                onBlur={() => onCommitEdit('page')}
                className="h-6 text-sm flex-1"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className="truncate flex-1">{page.title}</span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-wiki-active transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => onStartEdit(page.id, page.title)}>
                  <PenLine className="h-3.5 w-3.5 mr-2" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDeletePage(page.id)} className="text-destructive">
                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ))}
      </div>
    )}
  </div>
);

export default WikiSidebar;
