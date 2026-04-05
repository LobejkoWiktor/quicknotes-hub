import { useAuthStore } from '@/stores/authStore';
import Login from './Login';
import WikiSidebar from '@/components/wiki/WikiSidebar';
import TopBar from '@/components/wiki/TopBar';
import PageEditor from '@/components/wiki/PageEditor';

const Index = () => {
  const user = useAuthStore((s) => s.user);

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
