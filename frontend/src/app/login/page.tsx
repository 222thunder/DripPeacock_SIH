'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { apiClient } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { easeOut, fadeUp, fadeUpReduced } from '@/lib/motion';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const reduce = useReducedMotion();
  const enter = reduce ? fadeUpReduced : fadeUp;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (isLogin) {
        const { token } = await apiClient.login(email, password);
        localStorage.setItem('token', token);
        router.push('/dashboard');
      } else {
        await apiClient.register(email, password);
        const { token } = await apiClient.login(email, password);
        localStorage.setItem('token', token);
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred. Please verify your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-32 grid grid-cols-1 md:grid-cols-2 gap-16 lg:gap-24 items-start">
      
      <motion.div
        className="flex flex-col justify-between h-full"
        initial="hidden"
        animate="show"
        variants={enter}
      >
        <div>
          <h2 className="font-display text-4xl lg:text-5xl text-[#1C1B1A] dark:text-[#F9F8F6] tracking-tight mb-6">
            Platform Access
          </h2>
          <p className="font-sans text-sm text-[#57534E] dark:text-[#E7E5E4] max-w-sm leading-relaxed border-l-2 border-[#1C1B1A] dark:border-[#F9F8F6] pl-4">
            Secure authentication for the Legal Metrology Compliance System. Authorized personnel only.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="w-full max-w-md"
        initial="hidden"
        animate="show"
        variants={enter}
        transition={{ duration: 0.22, ease: easeOut }}
      >
        <div className="border-t-2 border-[#1C1B1A] dark:border-[#F9F8F6] pt-8">
          <h1 className="font-sans text-xs uppercase tracking-widest font-semibold text-[#1C1B1A] dark:text-[#F9F8F6] mb-8">
            {isLogin ? 'Authenticate Identity' : 'Register Credentials'}
          </h1>
          
          <AnimatePresence mode="wait">
            {error ? (
              <motion.div
                key={error}
                role="alert"
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-4px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={{ opacity: 0, transform: reduce ? undefined : 'translateY(-4px)' }}
                transition={{ duration: 0.15, ease: easeOut }}
                className={cn(
                  "p-4 mb-8 text-xs font-semibold uppercase tracking-widest border",
                  error.includes('successful') 
                    ? "border-[#3F6212] text-[#3F6212] bg-[#ECFCCB]" 
                    : "border-[#991B1B] text-[#991B1B] bg-[#FEE2E2] dark:border-[#FCA5A5] dark:text-[#FCA5A5] dark:bg-[#991B1B]/20"
                )}
              >
                {error}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">
                Official Email
              </label>
              <input 
                id="email"
                type="email" 
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-sm focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] transition-colors rounded-none disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="font-sans text-xs uppercase tracking-widest font-semibold text-[#57534E] dark:text-[#A8A29E]">
                Password
              </label>
              <input 
                id="password"
                type="password" 
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-3 bg-transparent border border-[#E7E5E4] dark:border-[#292524] text-[#1C1B1A] dark:text-[#F9F8F6] font-sans text-sm focus:outline-none focus:border-[#1C1B1A] dark:focus:border-[#F9F8F6] transition-colors rounded-none disabled:opacity-50"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="active-scale w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#1C1B1A] dark:bg-[#F9F8F6] text-[#F9F8F6] dark:text-[#1C1B1A] font-bold text-xs uppercase tracking-widest transition-colors hover:bg-[#57534E] dark:hover:bg-[#E7E5E4] border-none rounded-none disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin ? 'Log In' : 'Register'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-8 border-t border-[#E7E5E4] dark:border-[#292524]">
            <p className="font-sans text-xs uppercase tracking-widest text-[#57534E] dark:text-[#A8A29E] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <span>{isLogin ? "No existing credentials?" : "Already hold credentials?"}</span>
              <button 
                type="button" 
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                disabled={loading}
                className="font-bold text-[#1C1B1A] dark:text-[#F9F8F6] hover:opacity-70 transition-opacity text-left sm:text-right"
              >
                {isLogin ? 'Request Access' : 'Authenticate Here'}
              </button>
            </p>
          </div>

        </div>
      </motion.div>
      
    </div>
  );
}
