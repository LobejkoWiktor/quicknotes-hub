import { useWikiStore, type Block } from '@/stores/wikiStore';
import { Input } from '@/components/ui/input';
import BlockRenderer from './BlockRenderer';
import {
  Type, Heading1, Heading2, Heading3,
  List, ListOrdered, CheckSquare, Table,
} from 'lucide-react';

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

const PageEditor = () => {
  const { pages, activePageId, renamePage, addBlock, updateBlock, deleteBlock } = useWikiStore();
  const page = pages.find((p) => p.id === activePageId);

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
        {/* Title */}
        <Input
          value={page.title}
          onChange={(e) => renamePage(page.id, e.target.value)}
          className="border-0 text-4xl font-bold tracking-tight h-auto py-2 px-0 focus-visible:ring-0 placeholder:text-muted-foreground/30 bg-transparent"
          placeholder="Untitled"
        />

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
    </div>
  );
};

export default PageEditor;
