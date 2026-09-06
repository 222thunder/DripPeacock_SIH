'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ScanLine, Scale, FileCheck, ArrowRight } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring' as const,
      bounce: 0,
      duration: 0.4,
    },
  },
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden">
      <motion.div 
        className="max-w-5xl w-full flex flex-col items-center text-center space-y-12"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants} className="space-y-6 max-w-3xl">
          <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[1.05] tracking-[-0.03em] text-zinc-900 dark:text-zinc-50">
            Legal Metrology Compliance
          </h1>
          <p className="text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 leading-relaxed font-medium">
            AI-powered package label inspection for Legal Metrology (Packaged Commodities) Rules, 2011
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 items-center justify-center">
          <Link href="/scanner" className="group">
            <button className="flex items-center gap-2 rounded-full px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold text-lg transition-colors active:scale-[0.97]">
              Start Scanning
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          <Link href="/dashboard">
            <button className="rounded-full px-8 py-4 border border-zinc-300 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold text-lg transition-colors active:scale-[0.97] backdrop-blur-md">
              View Dashboard
            </button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-16">
          <FeatureCard 
            icon={<ScanLine className="w-8 h-8 text-blue-500" />}
            title="Smart OCR"
            description="Extract text from package labels with Tesseract OCR and AI-powered field extraction."
          />
          <FeatureCard 
            icon={<Scale className="w-8 h-8 text-blue-500" />}
            title="Rule Engine"
            description="Automatic compliance checks against Legal Metrology Rules with traceable findings."
          />
          <FeatureCard 
            icon={<FileCheck className="w-8 h-8 text-blue-500" />}
            title="Evidence & Reports"
            description="Store inspection evidence, generate PDF reports, and maintain audit trails."
          />
        </motion.div>
      </motion.div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex flex-col items-start p-8 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-zinc-200/50 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-2xl mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h3>
      <p className="text-zinc-600 dark:text-zinc-400 text-left leading-relaxed">
        {description}
      </p>
    </div>
  );
}
