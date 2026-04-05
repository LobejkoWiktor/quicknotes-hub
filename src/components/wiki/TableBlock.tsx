import { Plus, Minus } from 'lucide-react';

interface TableBlockProps {
  rows: string[][];
  onChange: (rows: string[][]) => void;
}

const TableBlock = ({ rows, onChange }: TableBlockProps) => {
  const updateCell = (r: number, c: number, value: string) => {
    const next = rows.map((row, ri) =>
      ri === r ? row.map((cell, ci) => (ci === c ? value : cell)) : [...row]
    );
    onChange(next);
  };

  const addRow = () => onChange([...rows, new Array(rows[0]?.length || 2).fill('')]);
  const removeRow = (i: number) => {
    if (rows.length <= 1) return;
    onChange(rows.filter((_, ri) => ri !== i));
  };
  const addCol = () => onChange(rows.map((row) => [...row, '']));
  const removeCol = (c: number) => {
    if ((rows[0]?.length || 0) <= 1) return;
    onChange(rows.map((row) => row.filter((_, ci) => ci !== c)));
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="border-r border-border last:border-0 p-0">
                  <input
                    value={cell}
                    onChange={(e) => updateCell(ri, ci, e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-transparent outline-none text-sm"
                    placeholder="Type here..."
                  />
                </td>
              ))}
              <td className="w-8 p-0">
                <button
                  onClick={() => removeRow(ri)}
                  className="flex items-center justify-center w-full h-full p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-1 p-1 bg-muted/30">
        <button
          onClick={addRow}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          <Plus className="h-3 w-3" /> Row
        </button>
        <button
          onClick={addCol}
          className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground rounded transition-colors"
        >
          <Plus className="h-3 w-3" /> Column
        </button>
        {(rows[0]?.length || 0) > 1 && (
          <button
            onClick={() => removeCol((rows[0]?.length || 1) - 1)}
            className="flex items-center gap-1 px-2 py-0.5 text-xs text-muted-foreground hover:text-destructive rounded transition-colors"
          >
            <Minus className="h-3 w-3" /> Column
          </button>
        )}
      </div>
    </div>
  );
};

export default TableBlock;
