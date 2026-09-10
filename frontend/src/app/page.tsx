'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Mail, ExternalLink } from 'lucide-react';
import { easeOut } from '@/lib/motion';

export default function LandingPage() {
  const reduce = useReducedMotion();

  return (
    <main className="min-h-[calc(100vh-4rem)] flex flex-col items-center">
      
      {/* Hero Section - Asymmetric */}
      <section className="w-full max-w-7xl mx-auto px-6 lg:px-12 py-20 lg:py-32 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-start">
        
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.28, ease: easeOut }}
          >
            <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#57534E] dark:text-[#A8A29E] mb-6">
              Platform Edition 2026
            </p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-[#1C1B1A] dark:text-[#F9F8F6]">
              Standardizing <br/><i className="italic text-[#78716C]">Metrology</i> Compliance.
            </h1>
          </motion.div>
        </div>

        <div className="lg:col-span-4 lg:pt-24 space-y-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.24, ease: easeOut, delay: reduce ? 0 : 0.08 }}
          >
            <p className="text-base text-[#57534E] dark:text-[#E7E5E4] leading-relaxed font-sans mb-8 border-l border-[#1C1B1A] dark:border-[#F9F8F6] pl-6">
              AI-assisted visual inspection designed for scale. We automate the verification of the Legal Metrology (Packaged Commodities) Rules, 2011 to ensure absolute market confidence.
            </p>

            <div className="flex flex-col gap-4">
              <Link href="/scanner" className="group">
                <button className="active-scale w-full flex items-center justify-between px-6 py-4 bg-[#1C1B1A] dark:bg-[#F9F8F6] text-[#F9F8F6] dark:text-[#1C1B1A] font-semibold text-sm uppercase tracking-widest transition-colors hover:bg-[#57534E] dark:hover:bg-[#E7E5E4]">
                  <span>Initiate Scan</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-[160ms] ease-[var(--ease-out)] group-hover:translate-x-1" />
                </button>
              </Link>
              <Link href="/dashboard">
                <button className="active-scale w-full flex items-center justify-center px-6 py-4 border border-[#1C1B1A] dark:border-[#F9F8F6] text-[#1C1B1A] dark:text-[#F9F8F6] font-semibold text-sm uppercase tracking-widest transition-colors hover:bg-[#1C1B1A] hover:text-[#F9F8F6] dark:hover:bg-[#F9F8F6] dark:hover:text-[#1C1B1A]">
                  Platform Dashboard
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

      </section>

      {/* Editorial Features Section */}
      <section className="w-full bg-[#1C1B1A] text-[#F9F8F6] dark:bg-[#F9F8F6] dark:text-[#1C1B1A] py-24 mt-12">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-12 gap-y-16">
            <FeatureBlock 
              number="01"
              title="Optical Extraction"
              description="Computer vision precision isolates mandatory declarations and manufacturer typography across complex package geometries."
            />
            <FeatureBlock 
              number="02"
              title="Rule Engine"
              description="Extracted entities are parsed through an immutable ledger of current legislative frameworks to determine strict compliance."
            />
            <FeatureBlock 
              number="03"
              title="Audit Continuity"
              description="Human-in-the-loop verification processes ensure unassailable evidence preservation and official reporting."
            />
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="w-full bg-[#1C1B1A] text-[#F9F8F6] dark:bg-[#F9F8F6] dark:text-[#1C1B1A] border-t border-[#44403C] dark:border-[#D6D3D1] mt-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-3">
            <p className="font-sans text-xs uppercase tracking-widest font-semibold text-[#A8A29E] dark:text-[#78716C]">
              Contact
            </p>
            <a
              href="mailto:sanyamdhawan2007@gmail.com"
              className="flex items-center gap-3 text-sm font-sans hover:opacity-70 transition-opacity"
            >
              <Mail className="w-4 h-4" />
              sanyamdhawan2007@gmail.com
            </a>
            <a
              href="https://github.com/222thunder"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-sm font-sans hover:opacity-70 transition-opacity"
            >
              <ExternalLink className="w-4 h-4" />
              github.com/222thunder
            </a>
          </div>
          <p className="text-xs font-sans text-[#A8A29E] dark:text-[#78716C]">
            Legal Metrology Compliance System · SIH 2026
          </p>
        </div>
      </footer>

    </main>
  );
}

function FeatureBlock({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex flex-col border-t border-[#57534E] dark:border-[#A8A29E] pt-6">
      <span className="font-sans text-xs uppercase tracking-widest font-semibold mb-8">{number}</span>
      <h3 className="font-display text-3xl mb-4 leading-tight">{title}</h3>
      <p className="font-sans text-sm leading-relaxed opacity-80">
        {description}
      </p>
    </div>
  );
}
