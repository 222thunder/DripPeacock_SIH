'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown, Clock, Zap, FileText, Check, ScanLine, Save } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { apiClient, type AnalysisResponse, type ReviewEntry } from '@/lib/api';
import { ExtractedDeclarations } from '../findings/ExtractedDeclarations';
import { FindingsList } from '../findings/FindingsList';
import { easeOut, STAGGER, viewSwap } from '@/lib/motion';

type ScanState = 'idle' | 'uploading' | 'analyzing' | 'results';

const CATEGORY_OPTIONS = [
  { value: '', label: 'General / Uncategorised' },
  { value: 'food', label: 'Food' },
  { value: 'beverage', label: 'Beverage' },
  { value: 'cosmetic', label: 'Cosmetic / Personal Care' },
  { value: 'household', label: 'Household' },
  { value: 'electronic', label: 'Electronics' },
  { value: 'textile', label: 'Textile / Apparel' },
];

export default function ScannerView() {
  const router = useRouter();
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<AnalysisResponse | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [category, setCategory] = useState<string>('');
  const [reviewedFindings, setReviewedFindings] = useState<Record<string, ReviewEntry>>({});
  const [reviewSaved, setReviewSaved] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isOcrExpanded, setIsOcrExpanded] = useState(false);
  const [timing, setTiming] = useState({ ocr: 0, parsing: 0, total: 0 });
  const [scanError, setScanError] = useState<string | null>(null);
  const reduce = useReducedMotion();
  const swap = reduce
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0.15, ease: easeOut } },
        exit: { opacity: 0, transition: { duration: 0.12, ease: easeOut } },
      }
    : viewSwap;

  const handleImagesAccepted = (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    if (selectedFiles.length > 0) {
      setPreviewUrls(selectedFiles.map(f => URL.createObjectURL(f)));
    } else {
      setPreviewUrls([]);
    }
  };

  const handleScan = async () => {
    if (files.length === 0) return;
    
    try {
      setScanError(null);
      setScanState('uploading');
      // Simulate slight delay for uploading visual
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setScanState('analyzing');
      const startTime = Date.now();
      
      // Call the real API
      const response = await apiClient.analyzeImage(files, category || undefined);

      
      const totalTime = Date.now() - startTime;
      setTiming({
        ocr: response.timing_ms?.ocr || totalTime * 0.4,
        parsing: response.timing_ms?.deterministic_parsing || totalTime * 0.6,
        total: response.timing_ms?.total || totalTime
      });
      
      setResults(response);
      setScanState('results');
    } catch (error: unknown) {
      console.error('Scan failed:', error);
      setScanError(error instanceof Error ? error.message : 'Analysis failed. Check that all services are running.');
      setScanState('idle');
    }
  };

  const handleReset = () => {
    setScanState('idle');
    setFiles([]);
    setResults(null);
    setReviewedFindings({});
    setReviewSaved(null);
    setReviewError(null);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  const handleReviewDecision = (key: string, entry: ReviewEntry) => {
    setReviewedFindings((prev) => ({ ...prev, [key]: entry }));
    setReviewSaved(null);
    setReviewError(null);
  };

  const handleSaveReview = async () => {
    if (!results?._id) return;
    setReviewSaved(null);
    setReviewError(null);
    try {
      const updated = await apiClient.updateInspectionReview(results._id, { reviewedFindings });
      setResults((prev) => (prev ? { ...prev, reviewedFindings: updated.reviewedFindings } : prev));
      setReviewSaved('Review decisions saved.');
    } catch (err: unknown) {
      setReviewError(err instanceof Error ? err.message : 'Could not save review decisions.');
    }
  };

  const handleGenerateReport = () => {
    if (!results) return;
    try {
      sessionStorage.setItem('sih_analysis_report', JSON.stringify(results));
    } catch {
      /* sessionStorage may not be available; ignore */
    }
    router.push('/report');
  };

  const handleSaveField = async (key: string, value: any) => {
    if (!results?._id) return;
    try {
      const extractedDeclarations = {
        [key]: {
          value,
        }
      };
      const updated = await apiClient.updateDeclarations(results._id, extractedDeclarations, category);
      setResults(updated);
    } catch (err: unknown) {
      console.error('Failed to save field:', err);
      setReviewError('Failed to save field: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto min-h-[600px] flex flex-col">
      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div
            key="idle"
            initial={swap.initial}
            animate={swap.animate}
            exit={swap.exit}
            className="flex-1 flex flex-col items-center justify-center pt-12 pb-24"
          >
            <div className="w-full max-w-3xl bg-white/70 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/80 ring-1 ring-zinc-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-20 -mr-20 w-64 h-64 bg-blue-400/10 blur-[80px] rounded-md pointer-events-none" />
              <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-64 h-64 bg-indigo-400/10 blur-[80px] rounded-md pointer-events-none" />
              
              <div className="relative z-10">
                <ImageDropZone onImagesAccepted={handleImagesAccepted} />
                
                <AnimatePresence>
                  {files.length > 0 && (
                    <motion.div
                      initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
                      animate={{ opacity: 1, transform: 'translateY(0px)' }}
                      exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
                      transition={{ duration: 0.2, ease: easeOut }}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-zinc-100 pt-6 mt-8"
                    >
                      <label className="flex items-center gap-2 text-sm">
                        <span className="text-zinc-500 font-medium whitespace-nowrap">Category</span>
                        <select
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </label>
                      <motion.button
                        whileHover={reduce ? undefined : { transform: 'scale(1.01)' }}
                        whileTap={reduce ? undefined : { transform: 'scale(0.98)' }}
                        transition={{ duration: 0.14, ease: easeOut }}
                        onClick={handleScan}
                        className="bg-zinc-900 text-white px-8 py-3.5 rounded-2xl font-medium shadow-lg shadow-zinc-900/20 flex items-center justify-center gap-2 transition-shadow hover:shadow-zinc-900/30"
                      >
                        <ScanLine className="w-5 h-5" />
                        Start Analysis
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {scanError && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
                    <p className="font-medium">Scan failed</p>
                    <p className="mt-1 text-red-600">{scanError}</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {(scanState === 'uploading' || scanState === 'analyzing') && (
          <motion.div
            key="analyzing"
            initial={swap.initial}
            animate={swap.animate}
            exit={swap.exit}
            className="flex-1 flex flex-col items-center justify-center pt-24 pb-32"
          >
            <div className="relative w-56 h-56 mb-12">
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 90, 180, 270, 360],
                  borderRadius: ["30%", "50%", "30%", "50%", "30%"]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-3xl shadow-[0_0_40px_rgba(99,102,241,0.1)]"
              />
              <motion.div
                animate={{ 
                  scale: [1.1, 1, 1.1],
                  rotate: [360, 270, 180, 90, 0],
                  borderRadius: ["50%", "30%", "50%", "30%", "50%"]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 bg-blue-500/10 border border-blue-500/20 backdrop-blur-xl"
              />
              
              {previewUrls.length > 0 && (
                <div className="absolute inset-8 rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrls[0]} alt="Scanning" className="w-full h-full object-cover scale-105" />
                  <div className="absolute inset-0 bg-zinc-900/10" />
                  
                  {/* Scanning beam */}
                  <motion.div
                    animate={reduce ? undefined : { transform: ['translateY(-20%)', 'translateY(120%)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 right-0 h-32 bg-gradient-to-b from-transparent via-indigo-500/30 to-indigo-500/80 border-b-2 border-indigo-400 z-10"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.8))' }}
                  />
                  
                  {/* Scanning grid overlay */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff20_1px,transparent_1px),linear-gradient(to_bottom,#ffffff20_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none z-20 opacity-30 mix-blend-overlay" />
                </div>
              )}
            </div>
            
            <div className="text-center space-y-3">
              <h2 className="text-2xl font-semibold text-zinc-900 tracking-tight">
                {scanState === 'uploading' ? 'Encrypting & Uploading' : 'Analyzing Labels'}
              </h2>
              <div className="h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={scanState}
                    initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(8px)' }}
                    animate={{ opacity: 1, transform: 'translateY(0px)' }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(-8px)' }}
                    transition={{ duration: 0.2, ease: easeOut }}
                    className="text-neutral-500 font-medium"
                  >
                    {scanState === 'uploading' ? 'Encrypting and transferring...' : 'Running OCR & Extracting Declarations...'}
                  </motion.p>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}

        {scanState === 'results' && (
          <motion.div
            key="results"
            initial={swap.initial}
            animate={swap.animate}
            className="flex flex-col gap-6"
          >
            {/* Header Actions */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/70 backdrop-blur-xl px-6 py-5 rounded-[2rem] shadow-sm border border-zinc-200/60 sticky top-4 z-20">
              <div className="flex items-center gap-4 mb-4 sm:mb-0">
                <div className="w-12 h-12 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600 ring-4 ring-white shadow-sm">
                  <Check className="w-6 h-6" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 leading-tight">Analysis Complete</h2>
                  <p className="text-sm text-zinc-500 font-medium">{results?.findings?.length || 0} findings logged for review</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {Object.keys(reviewedFindings).length > 0 && (
                  <motion.button
                    whileHover={reduce ? undefined : { transform: 'scale(1.01)' }}
                    whileTap={reduce ? undefined : { transform: 'scale(0.98)' }}
                    transition={{ duration: 0.14, ease: easeOut }}
                    onClick={handleSaveReview}
                    className="flex-1 sm:flex-none px-6 py-3 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 hover:bg-emerald-100 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save Review
                  </motion.button>
                )}
                <motion.button
                  whileHover={reduce ? undefined : { transform: 'scale(1.01)' }}
                  whileTap={reduce ? undefined : { transform: 'scale(0.98)' }}
                  transition={{ duration: 0.14, ease: easeOut }}
                  onClick={handleReset}
                  className="flex-1 sm:flex-none px-6 py-3 text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 rounded-xl transition-colors shadow-sm"
                >
                  New Scan
                </motion.button>
                <motion.button
                  whileHover={reduce ? undefined : { transform: 'scale(1.01)' }}
                  whileTap={reduce ? undefined : { transform: 'scale(0.98)' }}
                  transition={{ duration: 0.14, ease: easeOut }}
                  onClick={handleGenerateReport}
                  className="flex-1 sm:flex-none px-6 py-3 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </motion.button>
              </div>
            </div>
            {(reviewSaved || reviewError) && (
              <div className={`px-5 py-3 rounded-2xl text-sm font-medium ${reviewSaved ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {reviewSaved || reviewError}
              </div>
            )}

            {/* Split View */}
            <div className="flex flex-col xl:flex-row gap-6">
              {/* Left Column: Image & OCR */}
              <div className="w-full xl:w-[45%] flex flex-col gap-6">
                <div className="bg-white rounded-[2rem] p-3 shadow-sm border border-zinc-200/60">
                  <div className="flex gap-3 overflow-x-auto snap-x hide-scrollbar pb-2">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-[3/4] w-full flex-none snap-center rounded-[1.5rem] overflow-hidden bg-zinc-100/50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Analyzed ${idx}`} className="w-full h-full object-contain mix-blend-multiply" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Raw OCR */}
                <div className="bg-white rounded-[2rem] border border-zinc-200/60 overflow-hidden shadow-sm transition-[border-color] duration-200 hover:border-zinc-300">
                  <button
                    onClick={() => setIsOcrExpanded(!isOcrExpanded)}
                    className="w-full flex items-center justify-between p-6 bg-zinc-50/30 hover:bg-zinc-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-neutral-700 font-medium">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      Raw OCR Text
                    </div>
                    <motion.div
                      animate={{ transform: isOcrExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                      transition={{ duration: 0.2, ease: easeOut }}
                    >
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    </motion.div>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOcrExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: easeOut }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 pt-0 text-sm text-neutral-600 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto bg-neutral-50/50">
                          {results?.raw_ocr || 'No text extracted.'}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Right Column: Extracted Data & Findings */}
              <div className="w-full xl:w-[55%] flex flex-col gap-6">
                <motion.div
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: STAGGER } },
                  }}
                  className="space-y-6"
                >
                  <motion.div
                    variants={{
                      hidden: reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' },
                      show: {
                        opacity: 1,
                        transform: 'translateY(0px)',
                        transition: { duration: 0.22, ease: easeOut },
                      },
                    }}
                  >
                    <ExtractedDeclarations 
                      declarations={results?.declarations || {}} 
                      missing_fields={results?.missing_fields || []} 
                      onSaveField={handleSaveField}
                    />
                  </motion.div>
                  
                  <motion.div
                    variants={{
                      hidden: reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' },
                      show: {
                        opacity: 1,
                        transform: 'translateY(0px)',
                        transition: { duration: 0.22, ease: easeOut },
                      },
                    }}
                  >
                    <FindingsList
                      findings={results?.findings}
                      reviewed={reviewedFindings}
                      onReviewDecision={handleReviewDecision}
                    />
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Timing Footer */}
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(6px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.22, ease: easeOut, delay: reduce ? 0 : 0.12 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs font-semibold tracking-wide uppercase text-black bg-white py-4 px-8 rounded-md self-center border border-zinc-200 shadow-md"
            >
              <div className="flex items-center gap-2">
                <ScanLine className="w-4 h-4 text-black" />
                OCR {(timing.ocr / 1000).toFixed(2)}s
              </div>
              <div className="w-1.5 h-1.5 rounded-md bg-zinc-400" />
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-black" />
                AI Parse {(timing.parsing / 1000).toFixed(2)}s
              </div>
              <div className="w-1.5 h-1.5 rounded-md bg-zinc-400" />
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-black" />
                Total {(timing.total / 1000).toFixed(2)}s
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
