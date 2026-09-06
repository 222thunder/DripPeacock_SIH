'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

const publicPaths = ['/', '/login'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      
      if (publicPaths.includes(pathname)) {
        setIsAuthorized(true);
        return;
      }

      if (!token) {
        setIsAuthorized(false);
        router.push('/login');
      } else {
        setIsAuthorized(true);
      }
    };

    checkAuth();
  }, [pathname, router]);

  if (!isAuthorized && !publicPaths.includes(pathname)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return <>{children}</>;
}
