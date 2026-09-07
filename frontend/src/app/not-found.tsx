import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6">
      <h2 className="font-display text-5xl text-[#1C1B1A] dark:text-[#F9F8F6]">404</h2>
      <p className="font-sans text-sm text-[#57534E] dark:text-[#A8A29E] uppercase tracking-widest">Page not found</p>
      <Link
        href="/dashboard"
        className="px-6 py-3 border border-[#1C1B1A] dark:border-[#F9F8F6] font-sans text-xs uppercase tracking-widest font-bold hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:text-[#1C1B1A] dark:hover:bg-[#F9F8F6] transition-colors"
      >
        Return to Dashboard
      </Link>
    </div>
  );
}
