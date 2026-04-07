import { useWikiStore } from '@/stores/wikiStore';
import { useAuthStore } from '@/stores/authStore';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const TopBar = () => {
  const { searchQuery, setSearchQuery } = useWikiStore();
  const user = useAuthStore((s) => s.user);

  const getInitials = (email?: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split(/[._-]/);
    if (parts.length >= 2 && parts[0].length > 0 && parts[1].length > 0) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border bg-background shrink-0">
      <div className="relative w-full max-w-md">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search pages..."
          className="pl-8 h-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
        />
      </div>

      {user && (
        <div className="flex items-center ml-4 shrink-0">
          <div 
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
            title={user.email}
          >
            {getInitials(user.email)}
          </div>
        </div>
      )}
    </header>
  );
};

export default TopBar;
