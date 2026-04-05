import { useWikiStore } from '@/stores/wikiStore';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TopBar = () => {
  const { searchQuery, setSearchQuery } = useWikiStore();

  return (
    <header className="h-12 flex items-center px-4 border-b border-border bg-background shrink-0">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pages..."
          className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>
    </header>
  );
};

export default TopBar;
