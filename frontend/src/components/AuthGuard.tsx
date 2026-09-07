'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getStoredRole } from '@/lib/api';

const publicPaths = ['/', '/login'];

export default function AuthGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const isPublicPath = publicPaths.includes(pathname);
  const [isChecking, setIsChecking] = useState(!isPublicPath);
  const [isAuthorized, setIsAuthorized] = useState(isPublicPath);

  useEffect(() => {
    const checkAuth = () => {
      const isPublic = publicPaths.includes(pathname);
      const token = localStorage.getItem('token');
      const role = getStoredRole();

      if (isPublic) {
        setIsAuthorized(true);
        setIsChecking(false);
        // Optional UX enhancement: redirect away from login if already authenticated
        if (pathname === '/login' && token) {
          router.replace('/dashboard');
        }
        return;
      }

      if (!token) {
        setIsAuthorized(false);
        setIsChecking(false);
        router.replace('/login');
        return;
      }

      if (allowedRoles && allowedRoles.length > 0 && (!role || !allowedRoles.includes(role))) {
        setIsAuthorized(false);
        setIsChecking(false);
        router.replace('/dashboard');
        return;
      }

      setIsAuthorized(true);
      setIsChecking(false);
    };

    checkAuth();
  }, [pathname, router, allowedRoles]);

  if (isChecking || (!isAuthorized && !isPublicPath)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#57534E] dark:text-[#A8A29E]" />
      </div>
    );
  }

  return <>{children}</>;
}
