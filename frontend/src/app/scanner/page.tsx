import { Metadata } from 'next';
import ScannerView from '@/components/scanner/ScannerView';

export const metadata: Metadata = {
  title: 'Scanner | SIH Inspector',
  description: 'Inspect and analyze food packaging for compliance.',
};

export default function ScannerPage() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <ScannerView />
    </div>
  );
}
