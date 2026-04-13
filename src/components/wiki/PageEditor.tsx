import { useRef, useEffect, useCallback, useState } from 'react';
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
  Save, Check, Users, Bold, Italic, Link,
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
  const { pages, activePageId, renamePage, addBlock, updateBlock, deleteBlock, changeBlockType, savePageContent, hasUnsavedChanges } = useWikiStore();
  const user = useAuthStore((s) => s.user);
  const { lockedBy, checkLock, claimLock, releaseLock } = usePresenceStore();
  const isLocked = lockedBy !== null;
  const weHaveLockRef = useRef(false);

  const page = pages.find((p) => p.id === activePageId);
  const unsaved = activePageId ? hasUnsavedChanges(activePageId) : false;

  const [showSaved, setShowSaved] = useState(false);
  const [pendingNavId, setPendingNavId] = useState<string | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);
  const [formatState, setFormatState] = useState({ bold: false, italic: false });

  // Track bold/italic state at cursor position
  useEffect(() => {
    const update = () => {
      setFormatState({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
      });
    };
    document.addEventListener('selectionchange', update);
    return () => document.removeEventListener('selectionchange', update);
  }, []);

  const handleAddBlock = useCallback((pageId: string, type: Block['type'], afterBlockId?: string, initialData?: Record<string, unknown>) => {
    const newId = addBlock(pageId, type, afterBlockId, initialData);
    setFocusBlockId(newId);
  }, [addBlock]);

  // Lock polling and heartbeat
  useEffect(() => {
    if (!activePageId || !user) return;
    
    let isCancelled = false;

    const runChecks = async () => {
      if (isCancelled) return;
      const locked = await checkLock(activePageId, user.id);
      if (isCancelled) return;

      if (!locked) {
        await claimLock(activePageId, user.id);
        weHaveLockRef.current = true;
      } else {
        weHaveLockRef.current = false;
      }
    };

    runChecks();
    const pollInterval = setInterval(runChecks, 30_000);
    const heartbeatInterval = setInterval(() => {
       if (weHaveLockRef.current && activePageId && user) {
         claimLock(activePageId, user.id);
       }
    }, 60_000);

    const onUnload = () => {
      if (weHaveLockRef.current && activePageId && user) {
        releaseLock(activePageId, user.id);
      }
    };

    window.addEventListener('beforeunload', onUnload);

    return () => {
      isCancelled = true;
      clearInterval(pollInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener('beforeunload', onUnload);
      if (weHaveLockRef.current && activePageId && user) {
        releaseLock(activePageId, user.id);
      }
    };
  }, [activePageId, user, checkLock, claimLock, releaseLock]);

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

  // Expose handleNavigate so the sidebar can use it
  // Store in a ref to avoid re-render loops
  useEffect(() => {
    (window as any).__wikiNavigate = handleNavigate;
    return () => { delete (window as any).__wikiNavigate; };
  }, [handleNavigate]);

  const handleSave = useCallback(() => {
    if (!activePageId) return;
    savePageContent(activePageId);
    if (user && weHaveLockRef.current) {
      releaseLock(activePageId, user.id);
      weHaveLockRef.current = false;
    }
    setShowSaved(true);
    toast.success('Page saved');
    setTimeout(() => setShowSaved(false), 2000);
  }, [activePageId, savePageContent, user, releaseLock]);

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
              readOnly={isLocked}
              className="border-0 text-4xl font-bold tracking-tight h-auto py-2 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent"
              placeholder="Untitled"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* Presence indicator */}
            {isLocked && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Users className="h-3 w-3" />
                  Locked
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-xs px-2"
                  onClick={() => checkLock(activePageId!, user!.id)}
                >
                  Refresh Lock
                </Button>
              </div>
            )}

            {/* Unsaved changes indicator */}
            {unsaved && !showSaved && (
              <Badge variant="outline" className="text-xs text-destructive border-destructive/30">
                Unsaved changes
              </Badge>
            )}

            {/* Saved confirmation */}
            {showSaved && (
              <Badge variant="outline" className="text-xs text-primary border-primary/30 gap-1">
                <Check className="h-3 w-3" />
                Saved
              </Badge>
            )}

            {/* Save button */}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!unsaved || isLocked}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        {!isLocked && (
          <div className="flex items-center gap-0.5 mt-4 mb-6 p-1 rounded-lg bg-muted/50 w-fit">
            {/* Block type buttons */}
            {blockTypes.map(({ type, icon: Icon, label }) => (
              <button
                key={type}
                onClick={() => handleAddBlock(page.id, type)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
                title={`Add ${label}`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}

            {/* Separator */}
            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            {/* Inline formatting buttons — use onMouseDown to preserve editor selection */}
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand('bold');
                document.activeElement?.dispatchEvent(new Event('input', { bubbles: true }));
                setFormatState(f => ({ ...f, bold: document.queryCommandState('bold') }));
              }}
              title="Bold (Ctrl+B)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                formatState.bold
                  ? 'bg-background text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
            >
              <Bold className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Bold</span>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                document.execCommand('italic');
                document.activeElement?.dispatchEvent(new Event('input', { bubbles: true }));
                setFormatState(f => ({ ...f, italic: document.queryCommandState('italic') }));
              }}
              title="Italic (Ctrl+I)"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                formatState.italic
                  ? 'bg-background text-foreground shadow-sm italic'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background'
              }`}
            >
              <Italic className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Italic</span>
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                const selection = window.getSelection();
                const selectedText = selection?.toString() || '';
                const url = window.prompt('Enter URL:', 'https://');
                if (!url) return;
                const label = selectedText || url;
                document.execCommand(
                  'insertHTML',
                  false,
                  `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">${label}</a>`,
                );
                document.activeElement?.dispatchEvent(new Event('input', { bubbles: true }));
              }}
              title="Insert Link"
              className="flex items-center gap-1 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-background rounded-md transition-colors"
            >
              <Link className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Link</span>
            </button>
          </div>
        )}

        {/* Blocks */}
        <div className="pl-7 space-y-0.5">
          {(() => {
            const listCounters: number[] = [];
            
            return page.blocks.map((block, index) => {
              let listIndex = index;
              const isList = ['bullet', 'numbered', 'checklist'].includes(block.type);
              
              if (isList) {
                const indent = (block.data.indent as number) || 0;
                // Reset counters for deeper nested levels
                listCounters.length = indent + 1;
                
                if (block.type === 'numbered') {
                  listCounters[indent] = (listCounters[indent] || 0) + 1;
                  // listIndex is 0-based to match existing BlockRenderer logic (+1 on render)
                  listIndex = listCounters[indent] - 1;
                }
              } else {
                // Break list, reset counters entirely
                listCounters.length = 0;
              }

              return (
                <BlockRenderer
                  key={block.id}
                  block={{ ...block, data: { ...block.data, index: listIndex } }}
                  index={index}
                  autoFocus={focusBlockId === block.id}
                  readOnly={isLocked}
                  onUpdate={(data) => updateBlock(page.id, block.id, data)}
                  onDelete={() => deleteBlock(page.id, block.id)}
                  onAddAfter={(type, initialData) => handleAddBlock(page.id, type, block.id, initialData)}
                  onChangeType={(type) => changeBlockType(page.id, block.id, type)}
                />
              );
            });
          })()}
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
