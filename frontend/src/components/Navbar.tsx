"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Scale } from "lucide-react";
import { clearStoredSession, getStoredRole, getStoredUser } from "@/lib/api";

const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

const tokenSnapshot = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
const roleSnapshot = () => getStoredRole();
const serverSnapshot = () => null;

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = !!useSyncExternalStore(subscribe, tokenSnapshot, serverSnapshot);
  const role = useSyncExternalStore(subscribe, roleSnapshot, serverSnapshot) || "";
  const user = getStoredUser();

  const handleLogout = () => {
    clearStoredSession();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#F9F8F6] dark:bg-[#121212] border-b border-[#1C1B1A] dark:border-[#E7E5E4] transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center h-16">
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link
              href="/"
              className="font-display font-semibold text-xl tracking-tight text-[#1C1B1A] dark:text-[#F9F8F6] flex items-center gap-2"
            >
              <Scale className="w-5 h-5" />
              L.M.C.S.
            </Link>
          </div>

          {isAuthenticated && (
            <div className="hidden md:flex space-x-6">
              <NavLink href="/dashboard" currentPath={pathname}>Dashboard</NavLink>
              <NavLink href="/inspections" currentPath={pathname}>Inspections</NavLink>
              <NavLink href="/scanner" currentPath={pathname}>Scanner</NavLink>
            </div>
          )}

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {user.name && role && (
                  <span className="hidden lg:inline text-xs uppercase tracking-widest font-semibold text-[#78716C] dark:text-[#A8A29E]">
                    {user.name} <span className="text-[#1C1B1A] dark:text-[#F9F8F6]">· {role}</span>
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="text-xs uppercase tracking-widest font-semibold px-4 py-2 text-[#57534E] hover:text-[#1C1B1A] dark:text-[#E7E5E4] dark:hover:text-[#F9F8F6] transition-colors"
                >
                  Log Out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-xs uppercase tracking-widest font-semibold px-5 py-2 border border-[#1C1B1A] dark:border-[#F9F8F6] text-[#1C1B1A] dark:text-[#F9F8F6] hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, currentPath, children }: { href: string; currentPath: string; children: React.ReactNode }) {
  const isActive = currentPath.startsWith(href);
  return (
    <Link
      href={href}
      className={`text-xs uppercase tracking-widest font-semibold transition-colors ${
        isActive
          ? "text-[#1C1B1A] dark:text-[#F9F8F6] border-b-2 border-[#1C1B1A] dark:border-[#F9F8F6] py-1"
          : "text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1B1A] dark:hover:text-[#F9F8F6] py-1"
      }`}
    >
      {children}
    </Link>
  );
}