import { useRef, useEffect, type KeyboardEvent } from 'react';
import type { Block, InlineText } from '@/stores/wikiStore';
import { GripVertical, Trash2 } from 'lucide-react';
import TableBlock from './TableBlock';

interface BlockRendererProps {
  block: Block;
  onUpdate: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  onAddAfter: (type: Block['type'], initialData?: Record<string, unknown>) => void;
  onChangeType?: (type: Block['type']) => void;
  index: number;
  autoFocus?: boolean;
  readOnly?: boolean;
}

// ─── Inline serialization helpers ────────────────────────────────────────────

/** Convert an InlineText[] to an HTML string for contentEditable display. */
function inlineToHtml(content: InlineText[]): string {
  return content.map(({ text, bold, italic, href }) => {
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    if (bold) html = `<strong>${html}</strong>`;
    if (italic) html = `<em>${html}</em>`;
    if (href) {
      html = `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">${html}</a>`;
    }
    return html;
  }).join('');
}

/** Walk a DOM node tree and build an InlineText[]. */
function walkNode(
  node: Node,
  bold: boolean,
  italic: boolean,
  href: string | undefined,
  result: InlineText[],
) {
  if (node.nodeType === Node.TEXT_NODE) {
    // Strip zero-width spaces used as cursor-escape anchors
    const text = (node.textContent || '').replace(/\u200B/g, '');
    if (text) {
      const seg: InlineText = { text };
      if (bold) seg.bold = true;
      if (italic) seg.italic = true;
      if (href) seg.href = href;
      result.push(seg);
    }
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const newBold = bold || tag === 'strong' || tag === 'b';
  const newItalic = italic || tag === 'em' || tag === 'i';
  const newHref = href ?? (tag === 'a' ? (el.getAttribute('href') ?? undefined) : undefined);

  for (const child of el.childNodes) {
    walkNode(child, newBold, newItalic, newHref, result);
  }
}

/** Parse an innerHTML string into an InlineText[]. */
function htmlToInline(html: string): InlineText[] {
  const div = document.createElement('div');
  div.innerHTML = html;
  const result: InlineText[] = [];
  for (const child of div.childNodes) {
    walkNode(child, false, false, undefined, result);
  }
  return result;
}

/** Get the InlineText[] from a block's data, with backward-compat for old plain text. */
function getContent(block: Block): InlineText[] {
  if (Array.isArray(block.data.content)) {
    return block.data.content as InlineText[];
  }
  // Backward compat: old plain-text blocks stored a `text` string
  const t = (block.data.text as string) || '';
  return t ? [{ text: t }] : [];
}

// ─── Component ────────────────────────────────────────────────────────────────

const BlockRenderer = ({
  block,
  onUpdate,
  onDelete,
  onAddAfter,
  onChangeType,
  index,
  autoFocus,
  readOnly,
}: BlockRendererProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isMorphing = useRef(false);

  // Focus & cursor positioning after autoFocus or new block
  useEffect(() => {
    if (autoFocus && ref.current && !isMorphing.current) {
      ref.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      if (ref.current.childNodes.length === 0) {
        ref.current.appendChild(document.createTextNode(''));
      }
      range.selectNodeContents(ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [autoFocus, block.id]);

  // Sync DOM content when block id or type changes (mount / morph)
  useEffect(() => {
    if (ref.current) {
      const expected = inlineToHtml(getContent(block));
      if (ref.current.innerHTML !== expected) {
        ref.current.innerHTML = expected;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id, block.type]);

  // After a morph (block type change), restore focus & cursor
  useEffect(() => {
    if (isMorphing.current && ref.current) {
      isMorphing.current = false;
      ref.current.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      if (ref.current.childNodes.length === 0) {
        ref.current.appendChild(document.createTextNode(''));
      }
      range.selectNodeContents(ref.current);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }, [block.type]);

  // ── Input handler ──────────────────────────────────────────────────────────

  const handleInput = () => {
    if (!ref.current) return;

    const rawText = ref.current.textContent || '';

    // Block-type markdown shortcuts (only from a paragraph)
    if (block.type === 'paragraph') {
      let newType: Block['type'] | null = null;
      let prefixLen = 0;

      if (rawText.startsWith('### ')) {
        newType = 'h3'; prefixLen = 4;
      } else if (rawText.startsWith('## ')) {
        newType = 'h2'; prefixLen = 3;
      } else if (rawText.startsWith('# ')) {
        newType = 'h1'; prefixLen = 2;
      } else if (rawText.startsWith('- ') || rawText.startsWith('* ')) {
        newType = 'bullet'; prefixLen = 2;
      } else if (rawText.startsWith('1. ')) {
        newType = 'numbered'; prefixLen = 3;
      } else if (rawText.startsWith('[] ')) {
        newType = 'checklist'; prefixLen = 3;
      }

      if (newType) {
        // Serialize current DOM → InlineText[], then strip prefix chars
        const fullContent = htmlToInline(ref.current.innerHTML);
        let charsToStrip = prefixLen;
        for (const seg of fullContent) {
          if (charsToStrip <= 0) break;
          if (seg.text.length <= charsToStrip) {
            charsToStrip -= seg.text.length;
            seg.text = '';
          } else {
            seg.text = seg.text.slice(charsToStrip);
            charsToStrip = 0;
          }
        }
        const remainingContent = fullContent.filter(seg => seg.text.length > 0);

        ref.current.innerHTML = inlineToHtml(remainingContent);
        onUpdate({ content: remainingContent });
        if (onChangeType) {
          isMorphing.current = true;
          onChangeType(newType);
        }
        return;
      }
    }

    // Default: serialize current innerHTML → InlineText[]
    onUpdate({ content: htmlToInline(ref.current.innerHTML) });
  };

  // ── Inline markdown shortcut (triggered on Space) ─────────────────────────

  /**
   * After inserting formatted HTML via execCommand, the cursor typically stays
   * inside the formatted element (e.g. <strong>). This helper moves it OUT so
   * subsequent typing is unformatted.
   */
  const escapeCursorFromFormatting = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Walk up from the cursor to find the nearest formatting wrapper
    let cursor: Node | null = sel.getRangeAt(0).endContainer;
    let formattedEl: Element | null = null;

    while (cursor && cursor !== ref.current) {
      if (cursor.nodeType === Node.ELEMENT_NODE) {
        const tag = (cursor as Element).tagName.toLowerCase();
        if (['strong', 'b', 'em', 'i', 'a'].includes(tag)) {
          formattedEl = cursor as Element;
        }
      }
      cursor = cursor.parentNode;
    }

    if (!formattedEl) return;

    // Create a zero-width space text node right after the formatted element
    // so the cursor has somewhere un-formatted to land.
    const zws = document.createTextNode('\u200B');
    formattedEl.parentNode?.insertBefore(zws, formattedEl.nextSibling);

    const r = document.createRange();
    r.setStart(zws, 1);
    r.collapse(true);
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const tryInlineMarkdown = (): boolean => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return false;
    const range = selection.getRangeAt(0);
    if (!range.collapsed) return false;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;

    const text = node.textContent || '';
    const offset = range.startOffset;
    const textBefore = text.slice(0, offset);

    // [text](url) → link
    const linkMatch = textBefore.match(/\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const start = offset - linkMatch[0].length;
      const sel = window.getSelection()!;
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, offset);
      sel.removeAllRanges();
      sel.addRange(r);
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${linkMatch[2]}" target="_blank" rel="noopener noreferrer" class="text-primary underline underline-offset-2 hover:opacity-80">${linkMatch[1]}</a>`,
      );
      escapeCursorFromFormatting();
      return true;
    }

    // **bold**
    const boldMatch = textBefore.match(/\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      const start = offset - boldMatch[0].length;
      const sel = window.getSelection()!;
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, offset);
      sel.removeAllRanges();
      sel.addRange(r);
      document.execCommand('insertHTML', false, `<strong>${boldMatch[1]}</strong>`);
      escapeCursorFromFormatting();
      return true;
    }

    // *italic* (single star, not double)
    const italicMatch = textBefore.match(/(?<!\*)\*([^*]+)\*$/);
    if (italicMatch) {
      const start = offset - italicMatch[0].length;
      const sel = window.getSelection()!;
      const r = document.createRange();
      r.setStart(node, start);
      r.setEnd(node, offset);
      sel.removeAllRanges();
      sel.addRange(r);
      document.execCommand('insertHTML', false, `<em>${italicMatch[1]}</em>`);
      escapeCursorFromFormatting();
      return true;
    }

    return false;
  };

  // ── Key handler ────────────────────────────────────────────────────────────

  const handleKeyDown = (e: KeyboardEvent) => {
    if (readOnly) return;

    // Bold: Ctrl/Cmd + B
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold');
      onUpdate({ content: htmlToInline(ref.current?.innerHTML || '') });
      return;
    }

    // Italic: Ctrl/Cmd + I
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      document.execCommand('italic');
      onUpdate({ content: htmlToInline(ref.current?.innerHTML || '') });
      return;
    }

    // Tab: indent / de-indent list items
    if (e.key === 'Tab' && ['bullet', 'numbered', 'checklist'].includes(block.type)) {
      e.preventDefault();
      const currentIndent = (block.data.indent as number) || 0;
      if (e.shiftKey) {
        if (currentIndent > 0) onUpdate({ indent: currentIndent - 1 });
      } else {
        onUpdate({ indent: Math.min(currentIndent + 1, 4) });
      }
      return;
    }

    // Space: try inline markdown shortcuts
    if (e.key === ' ') {
      const replaced = tryInlineMarkdown();
      if (replaced) {
        e.preventDefault();
        onUpdate({ content: htmlToInline(ref.current?.innerHTML || '') });
        return;
      }
    }

    // Enter: split block at cursor
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();

      if (!ref.current) {
        onAddAfter(block.type === 'paragraph' ? 'paragraph' : block.type);
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) {
        onAddAfter(block.type === 'paragraph' ? 'paragraph' : block.type);
        return;
      }

      const cursorRange = sel.getRangeAt(0);

      // Content before cursor
      const beforeRange = document.createRange();
      beforeRange.selectNodeContents(ref.current);
      beforeRange.setEnd(cursorRange.startContainer, cursorRange.startOffset);

      // Content after cursor
      const afterRange = document.createRange();
      afterRange.selectNodeContents(ref.current);
      afterRange.setStart(cursorRange.endContainer, cursorRange.endOffset);

      const beforeFrag = beforeRange.cloneContents();
      const afterFrag = afterRange.cloneContents();

      const tempDiv = document.createElement('div');
      tempDiv.appendChild(beforeFrag);
      const beforeContent = htmlToInline(tempDiv.innerHTML);

      tempDiv.innerHTML = '';
      tempDiv.appendChild(afterFrag);
      const afterContent = htmlToInline(tempDiv.innerHTML);

      // Update current block with before-cursor content
      ref.current.innerHTML = inlineToHtml(beforeContent);
      onUpdate({ content: beforeContent });

      // Determine what type the new block should be
      if (['bullet', 'numbered', 'checklist'].includes(block.type)) {
        // Empty current block → demote to paragraph instead of adding new list item
        if (!beforeContent.length && !afterContent.length) {
          if (onChangeType) {
            isMorphing.current = true;
            onChangeType('paragraph');
          }
          return;
        }
        onAddAfter(block.type, { indent: block.data.indent, content: afterContent });
      } else if (['h1', 'h2', 'h3'].includes(block.type)) {
        // After a heading, always create a paragraph
        onAddAfter('paragraph', { content: afterContent });
      } else {
        onAddAfter('paragraph', { content: afterContent });
      }
      return;
    }

    // Backspace: demote list → paragraph, or delete empty block
    if (e.key === 'Backspace') {
      const isEmpty = !ref.current?.textContent;

      if (isEmpty) {
        e.preventDefault();
        // List items → demote to paragraph first
        if (['bullet', 'numbered', 'checklist'].includes(block.type)) {
          if (onChangeType) {
            isMorphing.current = true;
            onChangeType('paragraph');
          }
        } else {
          onDelete();
        }
      }
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  const baseClasses =
    'outline-none w-full empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50';

  const editableProps = {
    ref,
    contentEditable: !readOnly as true,
    suppressContentEditableWarning: true,
    onInput: handleInput,
    onKeyDown: handleKeyDown,
  };

  const renderEditable = () => {
    switch (block.type) {
      case 'h1':
        return (
          <div
            key={block.type}
            {...editableProps}
            data-placeholder={readOnly ? '' : 'Heading 1'}
            className={`${baseClasses} text-3xl font-bold tracking-tight`}
          />
        );
      case 'h2':
        return (
          <div
            key={block.type}
            {...editableProps}
            data-placeholder={readOnly ? '' : 'Heading 2'}
            className={`${baseClasses} text-2xl font-semibold tracking-tight`}
          />
        );
      case 'h3':
        return (
          <div
            key={block.type}
            {...editableProps}
            data-placeholder={readOnly ? '' : 'Heading 3'}
            className={`${baseClasses} text-xl font-semibold`}
          />
        );
      case 'bullet':
        return (
          <div
            key={block.type}
            className="flex items-start gap-2"
            style={{ marginLeft: `${(block.data.indent as number || 0) * 1.5}rem` }}
          >
            <span
              className={`mt-2 h-1.5 w-1.5 shrink-0 ${
                (block.data.indent as number || 0) % 3 === 1
                  ? 'border border-foreground/60 rounded-full bg-transparent'
                  : (block.data.indent as number || 0) % 3 === 2
                  ? 'bg-foreground/60'
                  : 'rounded-full bg-foreground/60'
              }`}
            />
            <div
              {...editableProps}
              data-placeholder={readOnly ? '' : 'List item'}
              className={`${baseClasses} flex-1`}
            />
          </div>
        );
      case 'numbered':
        return (
          <div
            key={block.type}
            className="flex items-start gap-2"
            style={{ marginLeft: `${(block.data.indent as number || 0) * 1.5}rem` }}
          >
            <span className="text-muted-foreground text-sm mt-0.5 min-w-[1.2em] text-right shrink-0">
              {(block.data.index as number || 0) + 1}.
            </span>
            <div
              {...editableProps}
              data-placeholder={readOnly ? '' : 'List item'}
              className={`${baseClasses} flex-1`}
            />
          </div>
        );
      case 'checklist':
        return (
          <div
            key={block.type}
            className="flex items-start gap-2"
            style={{ marginLeft: `${(block.data.indent as number || 0) * 1.5}rem` }}
          >
            <input
              type="checkbox"
              checked={!!block.data.checked}
              onChange={(e) => !readOnly && onUpdate({ checked: e.target.checked })}
              disabled={readOnly}
              className="mt-1 h-4 w-4 rounded border-border accent-primary"
            />
            <div
              {...editableProps}
              data-placeholder={readOnly ? '' : 'To-do'}
              className={`${baseClasses} flex-1 ${
                block.data.checked ? 'line-through text-muted-foreground' : ''
              }`}
            />
          </div>
        );
      case 'table':
        return (
          <div key={block.type} className={readOnly ? 'pointer-events-none' : ''}>
            <TableBlock
              rows={(block.data.rows as string[][]) || [['', ''], ['', '']]}
              onChange={(rows) => !readOnly && onUpdate({ rows })}
            />
          </div>
        );
      default:
        return (
          <div
            key={block.type}
            {...editableProps}
            data-placeholder={readOnly ? '' : 'Type something...'}
            className={`${baseClasses} text-base leading-relaxed`}
          />
        );
    }
  };

  return (
    <div className="group relative flex items-start gap-1 py-1 -ml-7">
      <div
        className={`flex items-center gap-0.5 pt-1 opacity-0 ${
          readOnly ? 'hidden' : 'group-hover:opacity-100'
        } transition-opacity`}
      >
        <button className="p-0.5 rounded hover:bg-wiki-hover cursor-grab text-muted-foreground/40">
          <GripVertical className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 min-w-0">{renderEditable()}</div>
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
