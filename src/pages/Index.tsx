import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWikiStore } from '@/stores/wikiStore';
import Login from './Login';
import WikiSidebar from '@/components/wiki/WikiSidebar';
import TopBar from '@/components/wiki/TopBar';
import PageEditor from '@/components/wiki/PageEditor';

const Index = () => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const loadWikiData = useWikiStore((s) => s.loadWikiData);
  const isDataLoaded = useWikiStore((s) => s.isDataLoaded);

  useEffect(() => {
    if (user && !isDataLoaded) {
      loadWikiData(user.id);
    }
  }, [user, isDataLoaded, loadWikiData]);

  if (isLoading || (user && !isDataLoaded)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <div className="flex h-screen w-full bg-background">
      <WikiSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <PageEditor />
      </div>
    </div>
  );
};

export default Index;
