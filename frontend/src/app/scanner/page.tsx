import { Metadata } from 'next';
import ScannerView from '@/components/scanner/ScannerView';

export const metadata: Metadata = {
  title: 'Scanner | SIH Inspector',
  description: 'Inspect and analyze food packaging for compliance.',
};

export default function ScannerPage() {
  return (
    <main className="min-h-screen bg-neutral-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
            Scanner
          </h1>
          <p className="mt-2 text-neutral-500">
            Upload food packaging images for instant compliance analysis.
          </p>
        </div>
        
        <ScannerView />
      </div>
    </main>
  );
}
