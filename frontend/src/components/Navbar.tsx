"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [pathname]); // Re-check on route change

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    router.push("/");
  };

  return (
    <nav className="glass sticky top-0 z-50 w-full transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 relative">
          {/* Left: Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link
              href="/"
              className="font-semibold text-lg tracking-tight-heading"
            >
              LM Compliance
            </Link>
          </div>

          {/* Center: Nav Items */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex space-x-8">
            <Link
              href="/scanner"
              className="text-sm font-medium hover:opacity-70 transition-opacity active-scale"
            >
              Scanner
            </Link>
            <Link
              href="/inspections"
              className="text-sm font-medium hover:opacity-70 transition-opacity active-scale"
            >
              Inspections
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-medium hover:opacity-70 transition-opacity active-scale"
            >
              Dashboard
            </Link>
          </div>

          {/* Right: Auth Buttons */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
              >
                Log Out
              </button>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors active-scale"
              >
                Login / SignUp
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
