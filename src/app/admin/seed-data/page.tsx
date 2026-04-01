"use client";

import React, { useState } from 'react';
import { 
  Database, Zap, Loader2, CheckCircle2, 
  AlertTriangle, FileJson, Beaker, ShieldCheck, 
  RefreshCw, Info, Terminal
} from 'lucide-react';
import { uploadRegistryJsonAction, enrichAllSchoolsAction, type BulkEnrichState } from './actions';
import { cn } from '@/lib/utils';

export default function SeedDataPage() {
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  const [enrichState, setEnrichState] = useState<BulkEnrichState>({
    message: null,
    error: null,
    summary: null
  });

  async function handleUpload() {
    try {
      setLoading(true);
      setStatus(null);
      const parsed = JSON.parse(jsonInput);
      const res = await uploadRegistryJsonAction(parsed);
      if (res.success) {
        setStatus({ type: 'success', msg: `UPLINK OK: ${res.count} documents synchronized.` });
        setJsonInput('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'Uplink failed.' });
      }
    } catch (e) {
      setStatus({ type: 'error', msg: 'SYNTAX ERROR: Invalid JSON format.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrich() {
    setEnriching(true);
    const result = await enrichAllSchoolsAction(enrichState);
    setEnrichState(result);
    setEnriching(false);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 md:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* BRAND HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Database className="size-10 text-[#f97316] animate-pulse" />
              <h1 className="text-5xl font-black uppercase italic tracking-tighter">
                Data <span className="text-[#f97316]">Command.</span>
              </h1>
            </div>
            <p className="text-[#94a3b8] font-black uppercase text-[10px] tracking-[0.5em] opacity-60">
              Level 5 Authorization: Registry Injection & AI Synthesis
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-sm">
            <ShieldCheck className="size-4 text-green-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Connection: Secure</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN COLUMN: JSON INJECTION */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-[#0b1224] border border-white/10 rounded-sm shadow-2xl overflow-hidden">
              <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileJson className="size-4 text-sky-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Registry JSON Uplink</span>
                </div>
                <Terminal className="size-4 text-slate-700" />
              </div>
              
              <div className="p-6 space-y-6">
                <div className="relative group">
                  <textarea 
                    className="w-full h-[450px] bg-black/60 border border-white/10 p-6 font-mono text-[11px] text-green-400 rounded-sm outline-none focus:border-[#f97316] transition-all resize-none shadow-inner"
                    placeholder="// Paste Tactical JSON Assets (Schools, Transport, or Lifestyle)..."
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                  />
                  {!jsonInput && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                      <Zap className="size-32" />
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleUpload}
                  disabled={loading || !jsonInput}
                  className="w-full h-16 bg-[#f97316] text-white font-black uppercase italic tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 group"
                >
                  {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                      <Zap className="size-5 group-hover:animate-bounce" />
                      Execute Injection Protocol
                    </>
                  )}
                </button>
              </div>
            </div>

            {status && (
              <div className={cn(
                "p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 transition-all animate-in fade-in slide-in-from-bottom-4",
                status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
              )}>
                {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                <span className="tracking-widest">{status.msg}</span>
              </div>
            )}
          </div>

          {/* SIDEBAR: OPS & INFO */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* AI SYNTHESIS CARD */}
            <div className="bg-[#0b1224] border border-white/10 rounded-sm p-8 space-y-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Beaker className="size-24" />
              </div>
              
              <div className="space-y-2 relative z-10">
                <h3 className="text-xs font-black text-sky-400 uppercase italic tracking-widest flex items-center gap-2">
                  <RefreshCw className="size-4 animate-spin-slow" /> AI Synthesis
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed tracking-tight">
                  Automatically enrich dossiers with AI descriptions and image mapping.
                </p>
              </div>

              <button 
                onClick={handleEnrich}
                disabled={enriching}
                className="w-full h-14 border border-white/10 text-white font-black uppercase italic tracking-widest hover:bg-sky-400 hover:text-black hover:border-sky-400 transition-all flex items-center justify-center gap-2"
              >
                {enriching ? <Loader2 className="animate-spin" /> : "Start Synthesis"}
              </button>

              {enrichState.summary && (
                <div className="bg-black/40 rounded-sm p-4 space-y-3 border border-white/5 animate-in zoom-in-95 duration-300">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                    <span className="text-slate-500">Fleet Scan:</span>
                    <span>{enrichState.summary.total}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                    <span className="text-green-500">Successful:</span>
                    <span>{enrichState.summary.enriched}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase italic">
                    <span className="text-red-500">Aborted:</span>
                    <span>{enrichState.summary.failed}</span>
                  </div>
                </div>
              )}
            </div>

            {/* PROTOCOL BRIEFING */}
            <div className="bg-black/40 border border-white/5 p-6 rounded-sm space-y-4">
              <div className="flex items-center gap-2 text-[#f97316]">
                <Info className="size-4" />
                <h4 className="text-[10px] font-black uppercase tracking-widest italic">Protocol Briefing</h4>
              </div>
              <ul className="space-y-3">
                <li className="text-[9px] font-bold text-slate-500 uppercase leading-tight flex gap-3">
                  <span className="text-[#f97316]">01</span>
                  <span>Direct ID priority ensures precise updates to single-city dossiers.</span>
                </li>
                <li className="text-[9px] font-bold text-slate-500 uppercase leading-tight flex gap-3">
                  <span className="text-[#f97316]">02</span>
                  <span>Financial fields are auto-cast to numbers for calculation stability.</span>
                </li>
                <li className="text-[9px] font-bold text-slate-500 uppercase leading-tight flex gap-3">
                  <span className="text-[#f97316]">03</span>
                  <span>AI Synthesis only processes dossiers missing descriptions or imagery.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </div>
      <div className="h-20" />
    </div>
  );
}