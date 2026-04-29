"use client";

import React, { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { 
  Database, Zap, Loader2, CheckCircle2, AlertTriangle, 
  FileJson, Beaker, ShieldCheck, RefreshCw, Info, Terminal, 
  MapPin, Globe2, ServerCrash, Coins,
  Activity, Target, Map, MessageSquare 
} from 'lucide-react';
import { 
  uploadRegistryJsonAction, 
  enrichAllSchoolsAction, 
  updateLocationCostOfLivingAction, 
  getTelemetryData,
  uploadIkeaIntelAction,

  type BulkEnrichState,
  type EcoActionState 
} from './actions';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

export default function AdminCommandPage() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'registry' | 'economic' | 'telemetry' | 'ikea'>('registry');

  useEffect(() => {
    setMounted(true);
  }, []);

  const [jsonInput, setJsonInput] = useState('');
  const [ikeaJsonInput, setIkeaJsonInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  
  // Registry AI State
  const [enrichState, setEnrichState] = useState<BulkEnrichState>({ message: null, error: null, summary: null });

  // ✅ FIXED: Initial State matches EcoActionState interface exactly
  const [ecoState, ecoFormAction] = useActionState(updateLocationCostOfLivingAction, { 
    message: null, 
    error: null, 
    success: false, 
    data: null 
  } as EcoActionState);

  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);

  async function handleUpload() {
    try {
      setLoading(true); setStatus(null);
      const res = await uploadRegistryJsonAction(JSON.parse(jsonInput));
      if (res.success) {
        setStatus({ type: 'success', msg: `UPLINK OK: ${res.count} documents synchronized.` });
        setJsonInput('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'Uplink failed.' });
      }
    } catch {
      setStatus({ type: 'error', msg: 'SYNTAX ERROR: Invalid JSON format.' });
    } finally {
      setLoading(false);
    }
  }

  async function handleIkeaUpload() {
    try {
      setLoading(true); setStatus(null);
      const res = await uploadIkeaIntelAction(JSON.parse(ikeaJsonInput));
      if (res.success) {
        setStatus({ type: 'success', msg: `IKEA UPLINK OK: ${res.count} country documents pivoted and synchronized.` });
        setIkeaJsonInput('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'IKEA Uplink failed.' });
      }
    } catch {
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
    if (result.success) setTelemetry(result.data);
    setLoadingTelemetry(false);
  }

  useEffect(() => {
    if (activeTab === 'telemetry' && !telemetry && mounted) loadTelemetry();
  }, [activeTab, mounted, telemetry]);

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

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
                onClick={() => setActiveTab('ikea')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'ikea' ? "bg-yellow-500 text-black" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                IKEA Intel
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
                        <textarea 
                            className="w-full h-[450px] bg-black/60 border border-white/10 p-6 font-mono text-[11px] text-green-400 rounded-sm outline-none focus:border-[#f97316] transition-all resize-none shadow-inner"
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        />
                        <button 
                          onClick={handleUpload}
                          disabled={loading || !jsonInput}
                          className="w-full h-16 bg-[#f97316] text-white font-black uppercase italic tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {loading ? <Loader2 className="animate-spin size-5" /> : "Execute Injection Protocol"}
                        </button>
                    </div>
                    </div>
                    {status && (
                    <div className={cn("p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 animate-in zoom-in-95", status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500')}>
                        {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                        <span className="tracking-widest">{status.msg}</span>
                    </div>
                    )}
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-[#0b1224] border border-white/10 rounded-sm p-8 space-y-6">
                        <h3 className="text-xs font-black text-sky-400 uppercase italic tracking-widest flex items-center gap-2">
                          <RefreshCw className="size-4 animate-spin-slow" /> AI Synthesis
                        </h3>
                        <button onClick={handleEnrich} disabled={enriching} className="w-full h-14 border border-white/10 text-white font-black uppercase italic tracking-widest hover:bg-sky-400 hover:text-black transition-all flex items-center justify-center gap-2">
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
                        <div className="p-8">
                            <form action={ecoFormAction} className="space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Location Name</Label>
                                        <Input name="locationName" placeholder="Bangkok" required className="bg-black/40 border-white/10 h-12 text-white font-bold" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Country</Label>
                                        <Input name="countryName" placeholder="Thailand" required className="bg-black/40 border-white/10 h-12 text-white font-bold" />
                                    </div>
                                </div>
                                <EconomicSubmitButton />
                                {ecoState.error && <div className="p-4 bg-red-500/10 border border-red-500/50 text-red-500 text-[11px] font-black uppercase tracking-widest animate-in zoom-in-95">{ecoState.error}</div>}
                                {ecoState.message && <div className="p-4 bg-green-500/10 border border-green-500/50 text-green-500 text-[11px] font-black uppercase tracking-widest animate-in zoom-in-95">{ecoState.message}</div>}
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 3: IKEA INTEL */}
        {activeTab === 'ikea' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#0b1224] border border-yellow-500/20 rounded-sm shadow-2xl overflow-hidden">
                    <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <FileJson className="size-4 text-yellow-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Google Sheet JSON Uplink</span>
                        </div>
                        <Terminal className="size-4 text-slate-700" />
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-sm text-yellow-500/90 text-sm font-medium">
                          <strong>INSTRUCTIONS:</strong> Copy your transposed Google Sheet data and convert it to JSON (e.g. using a JSON export tool). The format must have <strong>Fields as Rows</strong> and <strong>Countries as Columns</strong>. The system will automatically pivot this data into country-specific documents and clean the numbers.
                        </div>
                        <textarea 
                            className="w-full h-[350px] bg-black/60 border border-white/10 p-6 font-mono text-[11px] text-yellow-400 rounded-sm outline-none focus:border-yellow-500 transition-all resize-none shadow-inner"
                            placeholder='[\n  {\n    "Field": "Currency",\n    "Norway": "NOK"\n  }\n]'
                            value={ikeaJsonInput}
                            onChange={(e) => setIkeaJsonInput(e.target.value)}
                        />
                        <button 
                          onClick={handleIkeaUpload}
                          disabled={loading || !ikeaJsonInput}
                          className="w-full h-16 bg-yellow-500 text-black font-black uppercase italic tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {loading ? <Loader2 className="animate-spin size-5 text-black" /> : "Execute Pivot & Injection"}
                        </button>
                    </div>
                    </div>
                    {status && activeTab === 'ikea' && (
                    <div className={cn("p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 animate-in zoom-in-95", status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500')}>
                        {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                        <span className="tracking-widest">{status.msg}</span>
                    </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 4: TELEMETRY */}
        {activeTab === 'telemetry' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Live Telemetry</h2>
                    <button onClick={loadTelemetry} className="text-[10px] font-black uppercase tracking-widest text-purple-400 hover:text-white flex items-center gap-2">
                        {loadingTelemetry ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Refresh Data
                    </button>
                </div>
                {telemetry && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                            <div className="text-[10px] font-black uppercase text-purple-400 mb-2">Total Site Visits</div>
                            <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">{telemetry.totalVisits?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                            <div className="text-[10px] font-black uppercase text-sky-400 mb-2">Briefings Generated</div>
                            <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">{telemetry.comparisons?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                            <div className="text-[10px] font-black uppercase text-[#f97316] mb-2">Verified Schools</div>
                            <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">{telemetry.totalSchools?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                            <div className="text-[10px] font-black uppercase text-blue-400 mb-2">Countries Covered</div>
                            <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">{telemetry.uniqueCountries?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                            <div className="text-[10px] font-black uppercase text-emerald-400 mb-2">City Cost Profiles</div>
                            <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">{telemetry.totalLocations?.toLocaleString() || 0}</div>
                        </div>
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                            <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Active Enquiries</div>
                            <div className="text-4xl md:text-5xl font-black italic tracking-tighter text-white">{telemetry.pendingEnquiries?.toLocaleString() || 0}</div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}