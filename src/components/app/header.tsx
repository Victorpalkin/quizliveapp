
import { LogOut } from 'lucide-react';
import { useAuth, useUser } from '@/firebase';
import { Button } from '../ui/button';
import { ThemeToggle } from './theme-toggle';
import { ZivoLogo } from './zivo-logo';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

interface HeaderProps {
  children?: ReactNode;
  logoHref?: string;
}

export function Header({ children, logoHref = '/' }: HeaderProps) {
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
        <ZivoLogo href={logoHref} className="mr-4 flex-shrink-0" />
        {children && (
          <nav className="flex-1 flex items-center overflow-x-auto min-w-0">
            {children}
          </nav>
        )}
        {!children && <div className="flex-1" />}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
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
