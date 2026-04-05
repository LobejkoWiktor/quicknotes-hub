import { useEffect, useCallback, useState } from 'react';
import { useWikiStore, type Block } from '@/stores/wikiStore';
import { useAuthStore } from '@/stores/authStore';
import { usePresenceStore } from '@/stores/presenceStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BlockRenderer from './BlockRenderer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Table,
  Save, Check, Users,
} from 'lucide-react';
import { toast } from 'sonner';

const blockTypes: { type: Block['type']; icon: React.ElementType; label: string }[] = [
  { type: 'paragraph', icon: Type, label: 'Text' },
  { type: 'h1', icon: Heading1, label: 'H1' },
  { type: 'h2', icon: Heading2, label: 'H2' },
  { type: 'h3', icon: Heading3, label: 'H3' },
  { type: 'bullet', icon: List, label: 'Bullets' },
  { type: 'numbered', icon: ListOrdered, label: 'Numbers' },
  { type: 'checklist', icon: CheckSquare, label: 'Checklist' },
  { type: 'table', icon: Table, label: 'Table' },
];

const PRESENCE_INTERVAL = 15_000;

const PageEditor = () => {
  const { pages, activePageId, renamePage, addBlock, updateBlock, deleteBlock, savePageContent, hasUnsavedChanges } = useWikiStore();
  const user = useAuthStore((s) => s.user);
  const { setPresence, getOtherEditors } = usePresenceStore();

  const page = pages.find((p) => p.id === activePageId);
  const unsaved = activePageId ? hasUnsavedChanges(activePageId) : false;
  const otherEditors = activePageId && user ? getOtherEditors(activePageId, user.id) : [];

  const [showSaved, setShowSaved] = useState(false);
  const [pendingNavId, setPendingNavId] = useState<string | null>(null);

  // Presence heartbeat
  useEffect(() => {
    if (!activePageId || !user) return;
    setPresence(user.id, user.name, activePageId);
    const interval = setInterval(() => {
      setPresence(user.id, user.name, activePageId);
    }, PRESENCE_INTERVAL);
    return () => clearInterval(interval);
  }, [activePageId, user, setPresence]);

  // Warn on browser unload with unsaved changes
  useEffect(() => {
    if (!unsaved) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsaved]);

  // Intercept page navigation via store
  const setActivePage = useWikiStore((s) => s.setActivePage);
  const handleNavigate = useCallback(
    (targetId: string | null) => {
      if (unsaved && targetId !== activePageId) {
        setPendingNavId(targetId);
      } else {
        setActivePage(targetId);
      }
    },
    [unsaved, activePageId, setActivePage],
  );

  // Override setActivePage globally so sidebar navigations trigger warning
  useEffect(() => {
    // We patch the store's setActivePage temporarily
    // This is a lightweight approach; a middleware would be cleaner for production
    useWikiStore.setState({ setActivePage: handleNavigate } as any);
    return () => {
      useWikiStore.setState({ setActivePage: (id: string | null) => useWikiStore.setState({ activePageId: id }) } as any);
    };
  }, [handleNavigate]);

  const handleSave = useCallback(() => {
    if (!activePageId) return;
    savePageContent(activePageId);
    setShowSaved(true);
    toast.success('Page saved');
    setTimeout(() => setShowSaved(false), 2000);
  }, [activePageId, savePageContent]);

  // Keyboard shortcut: Ctrl/Cmd + S
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-2">
          <p className="text-lg">Select a page to start editing</p>
          <p className="text-sm">Or create a new page from the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-8 py-10">
        {/* Editor Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={page.title}
              onChange={(e) => renamePage(page.id, e.target.value)}
              className="border-0 text-4xl font-bold tracking-tight h-auto py-2 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent"
              placeholder="Untitled"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Presence indicator */}
            {otherEditors.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users className="h-3 w-3" />
                Someone else is editing
              </Badge>
            )}

            {/* Unsaved changes indicator */}
            {unsaved && !showSaved && (
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                Unsaved changes
              </Badge>
            )}

            {/* Saved confirmation */}
            {showSaved && (
              <Badge variant="outline" className="text-xs text-green-600 border-green-300 gap-1">
                <Check className="h-3 w-3" />
                Saved
              </Badge>
            )}

            {/* Save button */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!unsaved}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-0.5 mt-4 mb-6 p-1 rounded-lg bg-muted/50 w-fit">
          {blockTypes.map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              onClick={() => addBlock(page.id, type)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
              title={`Add ${label}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Blocks */}
        <div className="pl-7 space-y-0.5">
          {page.blocks.map((block, index) => (
            <BlockRenderer
              key={block.id}
              block={{ ...block, data: { ...block.data, index } }}
              index={index}
              onUpdate={(data) => updateBlock(page.id, block.id, data)}
              onDelete={() => deleteBlock(page.id, block.id)}
              onAddAfter={(type) => addBlock(page.id, type, block.id)}
            />
          ))}
        </div>

        {page.blocks.length === 0 && (
          <p className="text-muted-foreground/50 text-sm pl-7 mt-4">
            Use the toolbar above to add your first block
          </p>
        )}
      </div>

      {/* Navigation warning dialog */}
      <AlertDialog open={pendingNavId !== null} onOpenChange={(open) => !open && setPendingNavId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes on this page. Do you want to discard them and navigate away?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingNavId !== null) {
                  useWikiStore.setState({ activePageId: pendingNavId });
                  setPendingNavId(null);
                }
              }}
            >
              Discard &amp; Navigate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PageEditor;
