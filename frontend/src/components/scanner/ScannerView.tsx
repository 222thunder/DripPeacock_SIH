'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Clock, Zap, FileText, Check, ScanLine } from 'lucide-react';
import ImageDropZone from './ImageDropZone';
import { apiClient } from '@/lib/api';
import { ExtractedDeclarations } from '../findings/ExtractedDeclarations';
import { FindingsList } from '../findings/FindingsList';

type ScanState = 'idle' | 'uploading' | 'analyzing' | 'results';

export default function ScannerView() {
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isOcrExpanded, setIsOcrExpanded] = useState(false);
  const [timing, setTiming] = useState({ ocr: 0, parsing: 0, total: 0 });
  const [scanError, setScanError] = useState<string | null>(null);

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
      const response = await apiClient.analyzeImage(files);
      console.log('API Response:', response);
      
      const totalTime = Date.now() - startTime;
      setTiming({
        ocr: response.timing_ms?.ocr || totalTime * 0.4,
        parsing: response.timing_ms?.deterministic_parsing || totalTime * 0.6,
        total: response.timing_ms?.total || totalTime
      });
      
      setResults(response);
      setScanState('results');
    } catch (error: any) {
      console.error('Scan failed:', error);
      setScanError(error?.message || 'Analysis failed. Check that all services are running.');
      setScanState('idle');
    }
  };

  const handleReset = () => {
    setScanState('idle');
    setFiles([]);
    setResults(null);
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
  };

  return (
    <div className="w-full max-w-6xl mx-auto min-h-[600px] flex flex-col">
      <AnimatePresence mode="wait">
        {scanState === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, filter: 'blur(4px)' }}
            transition={{ type: 'spring' as const, bounce: 0, duration: 0.4 }}
            className="flex-1 flex flex-col items-center justify-center pt-8"
          >
            <div className="w-full max-w-2xl bg-white p-8 rounded-[32px] shadow-sm border border-neutral-100">
              <ImageDropZone onImagesAccepted={handleImagesAccepted} />
              
              <AnimatePresence>
                {files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 32 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="flex justify-end"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleScan}
                      className="bg-neutral-900 text-white px-8 py-3.5 rounded-2xl font-medium shadow-md shadow-neutral-200 flex items-center gap-2"
                    >
                      <ScanLine className="w-5 h-5" />
                      Start Analysis
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {scanError && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
                  <p className="font-medium">Scan failed</p>
                  <p className="mt-1 text-red-600">{scanError}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(scanState === 'uploading' || scanState === 'analyzing') && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20, filter: 'blur(8px)' }}
            transition={{ type: 'spring' as const, bounce: 0, duration: 0.4 }}
            className="flex-1 flex flex-col items-center justify-center pt-12"
          >
            <div className="relative w-48 h-48 mb-8">
              {/* Morphing/Pulsing Shape */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 180, 270, 360],
                  borderRadius: ["20%", "50%", "30%", "50%", "20%"]
                }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-blue-100/50 border-2 border-blue-200/50 backdrop-blur-sm"
              />
              <motion.div
                animate={{ 
                  scale: [1.2, 1, 1.2],
                  rotate: [360, 270, 180, 90, 0],
                  borderRadius: ["50%", "20%", "50%", "30%", "50%"]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-2 bg-indigo-100/40 border-2 border-indigo-200/40 backdrop-blur-sm"
              />
              {/* Thumbnail inside */}
              {previewUrls.length > 0 && (
                <div className="absolute inset-4 rounded-3xl overflow-hidden shadow-lg border border-white/50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrls[0]} alt="Scanning" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
                  <motion.div
                    animate={{ top: ['-10%', '110%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-blue-400 shadow-[0_0_10px_3px_rgba(96,165,250,0.5)] z-10"
                  />
                </div>
              )}
            </div>
            
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                {scanState === 'uploading' ? 'Uploading Image...' : 'Analyzing Packaging...'}
              </h2>
              <div className="h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={scanState}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring' as const, bounce: 0, duration: 0.4 }}
            className="flex flex-col gap-6"
          >
            {/* Header Actions */}
            <div className="flex items-center justify-between bg-white/70 backdrop-blur-md px-6 py-4 rounded-3xl shadow-sm border border-neutral-200/50 sticky top-4 z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold tracking-tight text-neutral-900 leading-tight">Analysis Complete</h2>
                  <p className="text-sm text-neutral-500 font-medium">Found {results?.findings?.length || 0} items to review</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleReset}
                  className="px-5 py-2.5 text-sm font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
                >
                  New Scan
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-600/20 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Generate Report
                </motion.button>
              </div>
            </div>

            {/* Split View */}
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Column: Image & OCR */}
              <div className="w-full lg:w-5/12 flex flex-col gap-4">
                <div className="bg-white rounded-[32px] p-2 shadow-sm border border-neutral-200/60 overflow-hidden relative group">
                  <div className="flex gap-2 overflow-x-auto snap-x hide-scrollbar pb-2">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative aspect-[3/4] w-full flex-none snap-center rounded-[24px] overflow-hidden bg-neutral-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`Analyzed ${idx}`} className="w-full h-full object-contain" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Raw OCR */}
                <div className="bg-white rounded-3xl border border-neutral-200/60 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setIsOcrExpanded(!isOcrExpanded)}
                    className="w-full flex items-center justify-between p-5 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-neutral-700 font-medium">
                      <FileText className="w-4 h-4 text-neutral-400" />
                      Raw OCR Text
                    </div>
                    <motion.div
                      animate={{ rotate: isOcrExpanded ? 180 : 0 }}
                      transition={{ type: 'spring' as const, bounce: 0, duration: 0.4 }}
                    >
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isOcrExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
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
              <div className="w-full lg:w-7/12 flex flex-col gap-6">
                <motion.div
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: { transition: { staggerChildren: 0.1 } }
                  }}
                  className="space-y-6"
                >
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const } } }}>
                    <ExtractedDeclarations 
                      declarations={results?.declarations || {}} 
                      missing_fields={results?.missing_fields || []} 
                    />
                  </motion.div>
                  
                  <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { type: 'spring' as const } } }}>
                    <FindingsList 
                      findings={results?.findings} 
                      declarations={results?.declarations || {}} 
                      missing_fields={results?.missing_fields || []} 
                    />
                  </motion.div>
                </motion.div>
              </div>
            </div>

            {/* Timing Footer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap items-center justify-center gap-6 mt-4 text-xs font-medium text-neutral-500 bg-white/50 backdrop-blur-sm py-3 px-6 rounded-full self-center border border-neutral-200/50"
            >
              <div className="flex items-center gap-1.5">
                <ScanLine className="w-3.5 h-3.5 text-neutral-400" />
                OCR: {(timing.ocr / 1000).toFixed(2)}s
              </div>
              <div className="w-1 h-1 rounded-full bg-neutral-300" />
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                Parsing: {(timing.parsing / 1000).toFixed(2)}s
              </div>
              <div className="w-1 h-1 rounded-full bg-neutral-300" />
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                Total: {(timing.total / 1000).toFixed(2)}s
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
