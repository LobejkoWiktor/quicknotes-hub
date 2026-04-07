import { useRef, useEffect, type KeyboardEvent } from 'react';
import type { Block } from '@/stores/wikiStore';
import { GripVertical, Trash2 } from 'lucide-react';
import TableBlock from './TableBlock';

interface BlockRendererProps {
  block: Block;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onAddAfter: (type: Block['type']) => void;
  index: number;
  autoFocus?: boolean;
  readOnly?: boolean;
}

const BlockRenderer = ({ block, onUpdate, onDelete, onAddAfter, index, autoFocus, readOnly }: BlockRendererProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      // Focus the newly active block
      ref.current.focus();
      
      // Move cursor to the end in case there is text (for checklists with checkbox clicked, it might not be empty, but usually new blocks are empty)
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [autoFocus, block.id]);

  useEffect(() => {
    if (ref.current && ref.current.textContent !== (block.data.text as string)) {
      ref.current.textContent = (block.data.text as string) || '';
    }
  }, [block.id]); // only on mount/id change

  const handleInput = () => {
    if (ref.current) {
      onUpdate({ text: ref.current.textContent || '' });
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (readOnly) return;
    if (e.key === 'Enter' && !e.shiftKey) {
      if (['bullet', 'numbered', 'checklist'].includes(block.type)) {
        e.preventDefault();
        onAddAfter(block.type);
      }
      // For standard text (paragraph, h1, etc.), do not intercept Enter.
      // The browser's native contentEditable behavior will handle creating a newline.
    }
    if (e.key === 'Backspace' && !ref.current?.textContent) {
      e.preventDefault();
      onDelete();
    }
  };

  const baseClasses = 'outline-none w-full empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50';

  const renderEditable = () => {
    switch (block.type) {
      case 'h1':
        return (
          <div
            ref={ref}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={readOnly ? '' : "Heading 1"}
            className={`${baseClasses} text-3xl font-bold tracking-tight`}
          />
        );
      case 'h2':
        return (
          <div
            ref={ref}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={readOnly ? '' : "Heading 2"}
            className={`${baseClasses} text-2xl font-semibold tracking-tight`}
          />
        );
      case 'h3':
        return (
          <div
            ref={ref}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={readOnly ? '' : "Heading 3"}
            className={`${baseClasses} text-xl font-semibold`}
          />
        );
      case 'bullet':
        return (
          <div className="flex items-start gap-2">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-foreground/60 shrink-0" />
            <div
              ref={ref}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              data-placeholder={readOnly ? '' : "List item"}
              className={`${baseClasses} flex-1`}
            />
          </div>
        );
      case 'numbered':
        return (
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground text-sm mt-0.5 min-w-[1.2em] text-right shrink-0">
              {(block.data.index as number || 0) + 1}.
            </span>
            <div
              ref={ref}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              data-placeholder={readOnly ? '' : "List item"}
              className={`${baseClasses} flex-1`}
            />
          </div>
        );
      case 'checklist':
        return (
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={!!block.data.checked}
              onChange={(e) => !readOnly && onUpdate({ checked: e.target.checked })}
              disabled={readOnly}
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
            />
            <div
              ref={ref}
              contentEditable={!readOnly}
              suppressContentEditableWarning
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              data-placeholder={readOnly ? '' : "To-do"}
              className={`${baseClasses} flex-1 ${block.data.checked ? 'line-through text-muted-foreground' : ''}`}
            />
          </div>
        );
      case 'table':
        return (
          <div className={readOnly ? 'pointer-events-none' : ''}>
            <TableBlock
              rows={(block.data.rows as string[][]) || [['', ''], ['', '']]}
              onChange={(rows) => !readOnly && onUpdate({ rows })}
            />
          </div>
        );
      default:
        return (
          <div
            ref={ref}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            data-placeholder={readOnly ? '' : "Type something..."}
            className={`${baseClasses} text-base leading-relaxed`}
          />
        );
    }
  };

  return (
    <div className="group relative flex items-start gap-1 py-1 -ml-7">
      <div className={`flex items-center gap-0.5 pt-1 opacity-0 ${readOnly ? 'hidden' : 'group-hover:opacity-100'} transition-opacity`}>
        <button className="p-0.5 rounded hover:bg-wiki-hover cursor-grab text-muted-foreground/40">
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-w-0">
        {renderEditable()}
      </div>
      {!readOnly && (
        <button
          onClick={onDelete}
          className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all mt-0.5"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};

export default BlockRenderer;
