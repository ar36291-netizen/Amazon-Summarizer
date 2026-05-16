/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import { Search, ShieldAlert, BarChart3, MessageSquare, AlertCircle, CheckCircle2, ChevronRight, Loader2, BookOpen, User, LineChart, BadgeCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

export default function App() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const analyzeReviews = async (reviews: any[], asin: string | null, marketplace: string) => {
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviews, asin, marketplace })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Intelligence extraction failed.");
      
      setReport(data.report);
    } catch (err: any) {
      throw new Error(err.message || "Failed to generate AI report.");
    }
  };

  const handleRunAnalysis = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: input })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to fetch reviews.");
        await analyzeReviews(data.reviews, data.asin, data.marketplace);
      } else {
        const text = await res.text();
        console.error("Non-JSON response received:", text);
        throw new Error(`Server returned non-JSON response (${res.status}). Check terminal logs.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete analysis.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-accent/30 lowercase-headings">
      {/* Top Navigation Bar */}
      <nav className="h-14 border-b border-brand-border bg-brand-bg/80 backdrop-blur-md sticky top-0 z-[100] flex items-center px-4 justify-between">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-brand-accent flex items-center justify-center text-brand-bg">
            <BarChart3 size={18} strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <h1 className="text-xs font-bold tracking-[0.2em] font-mono mb-0.5">AMZ_INTEL_ANALYST</h1>
            <p className="text-[9px] font-mono text-brand-muted uppercase tracking-widest">SECURE DATA EXTRACTION v3.1</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:flex gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-brand-muted uppercase tracking-tighter">Status</span>
              <span className="text-[10px] font-mono font-bold text-green-500 uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Operational
              </span>
            </div>
            <div className="w-px h-8 bg-brand-border mx-1" />
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-mono text-brand-muted uppercase tracking-tighter">Engine</span>
              <span className="text-[10px] font-mono font-bold text-brand-accent uppercase">
                Production
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 relative overflow-hidden rounded-2xl border border-brand-border bg-brand-card p-12">
          {/* Subtle grid background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(var(--color-brand-accent) 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-brand-accent/10 border border-brand-accent/20 text-brand-accent text-[10px] font-mono font-bold tracking-widest uppercase mb-6">
              <ShieldAlert size={12} /> Target Identification
            </div>
            <h2 className="text-4xl font-bold tracking-tighter mb-4 max-w-xl">
              Extract intelligence from <span className="text-brand-accent italic font-mono px-1">Amazon</span> reviews.
            </h2>
            <p className="text-brand-muted text-sm max-w-lg mb-8 leading-relaxed">
              Identify sentiment anomalies, competitive switchings, and red-flag fraud patterns using high-fidelity extraction and analysis logic.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 group">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="INPUT FULL PRODUCT URL OR ASIN"
                  className="w-full bg-brand-bg border border-brand-border rounded-lg pl-4 pr-12 py-3.5 focus:outline-none focus:ring-1 focus:ring-brand-accent focus:border-brand-accent transition-all font-mono text-xs tracking-wider placeholder:text-brand-muted/40"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-border/50 px-1.5 py-0.5 rounded text-[10px] font-mono text-brand-muted">⌘K</kbd>
              </div>
              <button 
                onClick={handleRunAnalysis}
                disabled={isLoading || !input}
                className="bg-brand-accent hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-brand-bg font-bold px-8 py-3.5 rounded-lg shadow-[0_4px_20px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest active:scale-[0.98]"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <ChevronRight size={18} strokeWidth={3} />}
                {isLoading ? 'Processing' : 'Execute Analysis'}
              </button>
            </div>
          </div>
        </div>

        {/* Global Flags / Errors */}
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg flex items-center gap-3 font-mono text-[11px]"
            >
              <AlertCircle size={16} />
              <span>[SYSTEM_ERROR]: {error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Analysis Status */}
        {isLoading && (
          <div className="mb-12">
            <div className="flex justify-between items-end mb-3">
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-brand-accent" size={16} />
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-brand-accent">Extraction in progress</span>
              </div>
              <span className="text-[10px] font-mono text-brand-muted">Phase: Scrape & Sentiment</span>
            </div>
            <div className="h-1 w-full bg-brand-border rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-brand-accent"
                initial={{ width: "0%" }}
                animate={{ width: "95%" }}
                transition={{ duration: 10, ease: "circOut" }}
              />
            </div>
          </div>
        )}

        {/* Intelligence Report Display */}
        {report && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            {/* Left Column: Key Metrics & Verdict */}
            <div className="lg:col-span-1 space-y-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-brand-card border border-brand-border p-6 rounded-xl"
              >
                <div className="flex items-center gap-2 text-brand-muted text-[10px] font-mono mb-4 uppercase tracking-widest">
                  <CheckCircle2 size={12} className="text-green-500" /> Confidence Level
                </div>
                <div className="text-2xl font-bold font-mono text-brand-text mb-1">HIGH [0.94]</div>
                <div className="w-full h-1 bg-brand-bg rounded-full mt-2">
                  <div className="h-full bg-brand-accent w-[94%]" />
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-brand-card border border-brand-border p-6 rounded-xl"
              >
                <div className="flex items-center gap-2 text-brand-muted text-[10px] font-mono mb-4 uppercase tracking-widest">
                  <AlertCircle size={12} className="text-brand-accent" /> Investigation Source
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-brand-border/50 pb-2">
                    <span className="text-[10px] text-brand-muted">ASIN</span>
                    <span className="text-xs font-mono font-bold">B08XYZ123</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-brand-border/50 pb-2">
                    <span className="text-[10px] text-brand-muted">Market</span>
                    <span className="text-xs font-mono font-bold">amazon.in</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-brand-muted">Reviews</span>
                    <span className="text-xs font-mono font-bold">142 Analyzed</span>
                  </div>
                </div>
              </motion.div>

              <div className="pt-4">
                <button 
                  onClick={() => window.print()}
                  className="w-full bg-brand-card hover:bg-brand-border border border-brand-border text-brand-text py-3 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                >
                  <BookOpen size={14} /> Export Technical Dossier
                </button>
              </div>
            </div>

            {/* Main Column: Content Analysis */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-brand-card border border-brand-border rounded-xl overflow-hidden">
                <div className="bg-brand-bg/50 px-6 py-3 border-b border-brand-border flex justify-between items-center">
                  <span className="text-[10px] font-mono font-bold text-brand-accent tracking-widest uppercase">Intelligent Analyst Output</span>
                  <div className="flex gap-1">
                    {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-brand-border" />)}
                  </div>
                </div>
                
                <div className="p-8 font-mono text-sm leading-relaxed max-w-full">
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown 
                      components={{
                        h1: ({children}) => <h1 className="text-lg font-bold text-brand-accent mb-6 flex items-center gap-3 border-l-4 border-brand-accent pl-4 uppercase tracking-tighter">{children}</h1>,
                        h2: ({children}) => <h2 className="text-sm font-bold text-brand-text mt-12 mb-4 uppercase tracking-widest opacity-80 border-b border-brand-border pb-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-lg font-bold text-brand-accent mt-8 mb-6 flex items-center gap-3 uppercase tracking-tighter">{children}</h3>,
                        p: ({children}) => <p className="mb-4 text-brand-muted text-[13px] last:mb-0 leading-[1.7]">{children}</p>,
                        table: ({children}) => (
                          <div className="my-6 overflow-x-auto rounded-lg border border-brand-border">
                            <table className="w-full border-collapse font-mono text-[11px] bg-brand-bg/30">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({children}) => <th className="bg-brand-border/40 text-brand-accent p-3 text-left border-b border-brand-border font-bold uppercase tracking-tighter">{children}</th>,
                        td: ({children}) => <td className="p-3 text-brand-muted border-b border-brand-border/30">{children}</td>,
                        li: ({children}) => (
                          <li className="mb-2 flex items-start gap-2 text-[12px]">
                            <ChevronRight size={12} className="mt-1 text-brand-accent shrink-0" />
                            <span className="text-brand-muted">{children}</span>
                          </li>
                        ),
                        hr: () => <hr className="my-10 border-brand-border border-dashed" />
                      }}
                    >
                      {report}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Initial Empty State / Features */}
        {!report && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldAlert, title: "Pattern Detection", desc: "Detection of unverified purchase date spikes and incentivized language markers." },
              { icon: BarChart3, title: "Sentiment Mapping", desc: "Clustering of recurring praise themes versus critical failure points." },
              { icon: LineChart, title: "Competitive Edge", desc: "Scanning for 'recommended instead' signals to identify market threats." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="group cursor-default"
              >
                <div className="bg-brand-card border border-brand-border p-8 rounded-xl h-full transition-all group-hover:border-brand-accent/50 group-hover:translate-y-[-4px]">
                  <div className="w-12 h-12 bg-brand-bg rounded-lg border border-brand-border flex items-center justify-center text-brand-accent mb-6 group-hover:bg-brand-accent group-hover:text-brand-bg transition-colors">
                    <feature.icon size={22} />
                  </div>
                  <h3 className="font-bold text-lg mb-3 tracking-tight group-hover:text-brand-accent transition-colors">{feature.title}</h3>
                  <p className="text-brand-muted text-xs leading-relaxed font-mono opacity-60 group-hover:opacity-100 transition-opacity uppercase tracking-wider">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      {/* Analyst Console Footer */}
      <footer className="border-t border-brand-border mt-20 bg-brand-card/50">
        <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-1.5">
              {[1,2,3].map(i => (
                <div key={i} className="w-5 h-5 rounded-full bg-brand-border border-2 border-brand-bg" />
              ))}
            </div>
            <p className="text-[10px] font-mono text-brand-muted uppercase tracking-[0.2em]">INTELLIGENCE_ANALYST_VERSION_3.12</p>
          </div>
          
          <div className="flex items-center gap-10">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono text-brand-muted uppercase tracking-tighter mb-1">Encrypted</span>
              <BadgeCheck className="text-brand-accent" size={16} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-mono text-brand-muted uppercase tracking-tighter mb-1">Verified</span>
              <CheckCircle2 className="text-green-500" size={16} />
            </div>
            <div className="text-[10px] font-mono text-brand-muted px-4 py-2 border border-brand-border rounded bg-brand-bg">
              SYS::TERMINAL::READY
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

