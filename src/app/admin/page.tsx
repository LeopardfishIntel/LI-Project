"use client";

import React, { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { 
  Database, Zap, Loader2, CheckCircle2, AlertTriangle, 
  FileJson, Beaker, ShieldCheck, RefreshCw, Info, Terminal, 
  MapPin, Globe2, ServerCrash, Coins,
  Activity, Target, Map, MessageSquare // 🛰️ Telemetry Icons
} from 'lucide-react';
import { 
  uploadRegistryJsonAction, 
  enrichAllSchoolsAction, 
  updateLocationCostOfLivingAction, 
  getTelemetryData, // 🛰️ Telemetry Action
  type BulkEnrichState 
} from './actions';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- UI SUB-COMPONENT: Economic AI Form Submit Button ---
function EconomicSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full h-14 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 font-black uppercase italic tracking-widest hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
    >
      {pending ? <Loader2 className="animate-spin size-5" /> : (
        <>
          <RefreshCw className="size-5" />
          Initiate Target Scan
        </>
      )}
    </button>
  );
}

// --- MAIN COMMAND CENTER ---
export default function AdminCommandPage() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'registry' | 'economic' | 'telemetry'>('registry');

  // Registry State
  const [jsonInput, setJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [enrichState, setEnrichState] = useState<BulkEnrichState>({ message: null, error: null, summary: null });

  // Economic AI State
  const [ecoState, ecoFormAction] = useActionState(updateLocationCostOfLivingAction, { message: null, error: null });

  // Telemetry State
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  // --- Handlers ---
  async function handleUpload() {
    try {
      setLoading(true); setStatus(null);
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

  async function loadTelemetry() {
    setLoadingTelemetry(true);
    const result = await getTelemetryData();
    if (result.success) {
      setTelemetry(result.data);
    }
    setLoadingTelemetry(false);
  }

  // Auto-load telemetry when the tab is clicked
  useEffect(() => {
    if (activeTab === 'telemetry' && !telemetry) {
      loadTelemetry();
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 md:p-12 font-sans selection:bg-[#f97316]">
      <div className="max-w-6xl mx-auto space-y-8">
        
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
              Level 5 Authorization Active
            </p>
          </div>
          
          <div className="flex items-center gap-3 bg-black/40 border border-white/10 px-4 py-2 rounded-sm">
            <ShieldCheck className="size-4 text-green-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Connection: Secure</span>
          </div>
        </div>

        {/* TACTICAL TABS */}
        <div className="flex gap-4 border-b border-white/10 pb-4">
            <button 
                onClick={() => setActiveTab('registry')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'registry' ? "bg-[#f97316] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Registry Injection
            </button>
            <button 
                onClick={() => setActiveTab('economic')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'economic' ? "bg-emerald-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Economic AI
            </button>
            <button 
                onClick={() => setActiveTab('telemetry')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'telemetry' ? "bg-purple-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Telemetry
            </button>
        </div>

        {/* TAB 1: REGISTRY INJECTION */}
        {activeTab === 'registry' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                        {loading ? <Loader2 className="animate-spin size-5" /> : (
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
                        "p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 transition-all animate-in zoom-in-95",
                        status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500'
                    )}>
                        {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                        <span className="tracking-widest">{status.msg}</span>
                    </div>
                    )}
                </div>

                <div className="lg:col-span-4 space-y-6">
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
                        {enriching ? <Loader2 className="animate-spin size-5" /> : "Start Synthesis"}
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
                </div>
            </div>
        )}

        {/* TAB 2: ECONOMIC AI */}
        {activeTab === 'economic' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#0b1224] border border-emerald-500/20 rounded-sm shadow-2xl overflow-hidden">
                        <div className="p-4 bg-black/20 border-b border-emerald-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Coins className="size-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Cost of Living Drone</span>
                            </div>
                        </div>
                        
                        <div className="p-8">
                            <form action={ecoFormAction} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="locationName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <MapPin className="size-3 text-emerald-500" /> Location Name
                                        </Label>
                                        <Input id="locationName" name="locationName" placeholder="e.g., Bangkok" required className="bg-black/40 border-white/10 h-12 text-white font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="countryName" className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                            <Globe2 className="size-3 text-sky-500" /> Country
                                        </Label>
                                        <Input id="countryName" name="countryName" placeholder="e.g., Thailand" required className="bg-black/40 border-white/10 h-12 text-white font-bold" />
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <EconomicSubmitButton />
                                </div>

                                {ecoState.error && (
                                    <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in zoom-in-95">
                                        <ServerCrash className="size-4" /> {ecoState.error}
                                    </div>
                                )}
                                {ecoState.message && (
                                    <div className="p-4 bg-green-500/10 border border-green-500/50 text-green-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-3 animate-in zoom-in-95">
                                        <CheckCircle2 className="size-4" /> {ecoState.message}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-4">
                    <div className="bg-black/40 border border-white/5 p-6 rounded-sm space-y-4">
                        <div className="flex items-center gap-2 text-emerald-500">
                            <Info className="size-4" />
                            <h4 className="text-[10px] font-black uppercase tracking-widest italic">Economic Protocol</h4>
                        </div>
                        <ul className="space-y-3">
                            <li className="text-[9px] font-bold text-slate-500 uppercase leading-tight flex gap-3">
                            <span className="text-emerald-500">01</span>
                            <span>Target must already exist in the locations_costOfLiving registry.</span>
                            </li>
                            <li className="text-[9px] font-bold text-slate-500 uppercase leading-tight flex gap-3">
                            <span className="text-emerald-500">02</span>
                            <span>AI scans public web matrices to update housing, internet, and transport nodes.</span>
                            </li>
                            <li className="text-[9px] font-bold text-slate-500 uppercase leading-tight flex gap-3">
                            <span className="text-emerald-500">03</span>
                            <span>Cycle time: ~30 seconds. Do not disengage during scan.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 3: TELEMETRY */}
        {activeTab === 'telemetry' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Activity className="size-5 text-purple-400" />
                        <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Live Telemetry</h2>
                    </div>
                    <button onClick={loadTelemetry} className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-white flex items-center gap-2">
                        {loadingTelemetry ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Refresh Data
                    </button>
                </div>

                {loadingTelemetry && !telemetry ? (
                    <div className="h-64 flex items-center justify-center border border-white/5 bg-black/20 rounded-sm">
                        <Loader2 className="size-8 text-purple-500 animate-spin" />
                    </div>
                ) : telemetry ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        
                        {/* Metric 1: Comparisons */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-5"><Activity className="size-24" /></div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-2">Shootouts Executed</div>
                            <div className="text-5xl font-black italic tracking-tighter text-white">{telemetry.comparisons}</div>
                        </div>

                        {/* Metric 2: Schools */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-5"><Target className="size-24" /></div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-[#f97316] mb-2">Active Targets</div>
                            <div className="text-5xl font-black italic tracking-tighter text-white">{telemetry.totalSchools}</div>
                        </div>

                        {/* Metric 3: Locations */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-5"><Map className="size-24" /></div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Economic Nodes</div>
                            <div className="text-5xl font-black italic tracking-tighter text-white">{telemetry.totalLocations}</div>
                        </div>

                        {/* Metric 4: Enquiries */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm relative overflow-hidden group">
                            <div className="absolute -right-4 -top-4 opacity-5"><MessageSquare className="size-24" /></div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2">Pending Comms</div>
                            <div className={cn("text-5xl font-black italic tracking-tighter", telemetry.pendingEnquiries > 0 ? "text-purple-400" : "text-slate-500")}>
                                {telemetry.pendingEnquiries}
                            </div>
                        </div>

                    </div>
                ) : null}
            </div>
        )}
      </div>
      <div className="h-20" />
    </div>
  );
}