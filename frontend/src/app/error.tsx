'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-6 px-6">
      <h2 className="font-display text-3xl text-[#1C1B1A] dark:text-[#F9F8F6]">Something went wrong</h2>
      <p className="font-sans text-sm text-[#57534E] dark:text-[#A8A29E] max-w-md text-center">
        {error.message || 'An unexpected error occurred.'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 border border-[#1C1B1A] dark:border-[#F9F8F6] font-sans text-xs uppercase tracking-widest font-bold hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A] transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
