
import Link from 'next/link';
import { Zap, LogOut } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export function Header() {
  const { user, loading } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg mr-auto">
          <Zap className="h-6 w-6 text-primary" />
          <span className="text-foreground">Zivo</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {!loading && user && !user.isAnonymous && (
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
