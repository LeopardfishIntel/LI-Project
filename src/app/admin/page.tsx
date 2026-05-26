"use client";

import React, { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { 
  Database, Zap, Loader2, CheckCircle2, AlertTriangle, 
  FileJson, Beaker, ShieldCheck, RefreshCw, Info, Terminal, 
  MapPin, Globe2, ServerCrash, Coins,
  Activity, Target, Map, MessageSquare, Compass
} from 'lucide-react';
import { 
  uploadRegistryJsonAction, 
  enrichAllSchoolsAction, 
  updateLocationCostOfLivingAction, 
  getTelemetryData,
  uploadIkeaIntelAction,
  uploadTransportIntelAction,
  updateCountryIndexesAction,
  clearCountryIndexesAction,

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
  const [activeTab, setActiveTab] = useState<'schools-data' | 'col-data' | 'telemetry' | 'ikea' | 'matrix' | 'transport'>('schools-data');

  useEffect(() => {
    setMounted(true);
  }, []);

  const [schoolsJsonInput, setSchoolsJsonInput] = useState('');
  const [colJsonInput, setColJsonInput] = useState('');
  const [ikeaJsonInput, setIkeaJsonInput] = useState('');
  const [transportJsonInput, setTransportJsonInput] = useState('');
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

  // Matrix AI State
  const [matrixCountryId, setMatrixCountryId] = useState('');
  const [matrixCountryName, setMatrixCountryName] = useState('');

  async function handleUpdateMatrix() {
    setLoading(true); setStatus(null);
    const res = await updateCountryIndexesAction(matrixCountryId, matrixCountryName);
    if (res.success) setStatus({ type: 'success', msg: `Matrix Indexes updated for ${matrixCountryName}` });
    else setStatus({ type: 'error', msg: res.error || 'Failed to update.' });
    setLoading(false);
  }

  async function handleClearMatrix() {
    setLoading(true); setStatus(null);
    const res = await clearCountryIndexesAction(matrixCountryId);
    if (res.success) setStatus({ type: 'success', msg: `Matrix Indexes cleared for ${matrixCountryId}` });
    else setStatus({ type: 'error', msg: res.error || 'Failed to clear.' });
    setLoading(false);
  }

  async function handleSchoolsUpload() {
    try {
      setLoading(true); setStatus(null);
      const res = await uploadRegistryJsonAction(JSON.parse(schoolsJsonInput));
      if (res.success) {
        setStatus({ type: 'success', msg: `SCHOOLS UPLINK OK: ${res.count} documents synchronized.` });
        setSchoolsJsonInput('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'Uplink failed.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `SYNTAX ERROR: Invalid JSON format. ${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleColUpload() {
    try {
      setLoading(true); setStatus(null);
      const res = await uploadRegistryJsonAction(JSON.parse(colJsonInput));
      if (res.success) {
        setStatus({ type: 'success', msg: `COST OF LIVING UPLINK OK: ${res.count} documents synchronized.` });
        setColJsonInput('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'Uplink failed.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `SYNTAX ERROR: Invalid JSON format. ${e.message}` });
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
    } catch (e: any) {
      setStatus({ type: 'error', msg: `SYNTAX ERROR: Invalid JSON format. ${e.message}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleTransportUpload() {
    try {
      setLoading(true); setStatus(null);
      const res = await uploadTransportIntelAction(JSON.parse(transportJsonInput));
      if (res.success) {
        setStatus({ type: 'success', msg: `TRANSPORT UPLINK OK: ${res.count} documents synchronized.` });
        setTransportJsonInput('');
      } else {
        setStatus({ type: 'error', msg: res.error || 'Transport Uplink failed.' });
      }
    } catch (e: any) {
      setStatus({ type: 'error', msg: `SYNTAX ERROR: Invalid JSON format. ${e.message}` });
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
    <div className="min-h-screen bg-[#020617] text-white p-8 md:p-12 font-sans selection:bg-[#d95f02]">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* BRAND HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <Database className="size-10 text-[#d95f02] animate-pulse" />
              <h1 className="text-5xl font-black uppercase italic tracking-tighter">
                Data <span className="text-[#d95f02]">Command.</span>
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
        <div className="flex flex-wrap gap-4 border-b border-white/10 pb-4">
            <button 
                onClick={() => setActiveTab('schools-data')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'schools-data' ? "bg-[#d95f02] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Schools Data
            </button>

            <button 
                onClick={() => setActiveTab('col-data')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'col-data' ? "bg-[#10b981] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Cost of Living Hub
            </button>

            <button 
                onClick={() => setActiveTab('ikea')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'ikea' ? "bg-yellow-500 text-black" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                IKEA Intel
            </button>
            <button 
                onClick={() => setActiveTab('transport')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'transport' ? "bg-blue-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Transport Intel
            </button>

            <button 
                onClick={() => setActiveTab('telemetry')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'telemetry' ? "bg-purple-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Telemetry
            </button>
            <button 
                onClick={() => setActiveTab('matrix')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'matrix' ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Matrix AI
            </button>
        </div>

        {/* TAB 1: SCHOOLS DATA INJECTION */}
        {activeTab === 'schools-data' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#0b1224] border border-white/10 rounded-sm shadow-2xl overflow-hidden">
                    <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <FileJson className="size-4 text-sky-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Schools JSON Uplink</span>
                        </div>
                        <Terminal className="size-4 text-slate-700" />
                    </div>
                    <div className="p-6 space-y-6">
                        <textarea 
                            className="w-full h-[450px] bg-black/60 border border-white/10 p-6 font-mono text-[11px] text-green-400 rounded-sm outline-none focus:border-[#d95f02] transition-all resize-none shadow-inner"
                            placeholder={`[\n  {\n    "id": "FLIS0001",\n    "schoolname": "German Swiss Int'l",\n    "academicscore": "9.8",\n    "financescore": "9.0",\n    "country": "Hong Kong",\n    "city": "Hong Kong"\n  }\n]`}
                            value={schoolsJsonInput}
                            onChange={(e) => setSchoolsJsonInput(e.target.value)}
                        />
                        <button 
                          onClick={handleSchoolsUpload}
                          disabled={loading || !schoolsJsonInput}
                          className="w-full h-16 bg-[#d95f02] text-white font-black uppercase italic tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {loading ? <Loader2 className="animate-spin size-5" /> : "Execute Schools Injection Protocol"}
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

        {/* TAB 2: COST OF LIVING HUB */}
        {activeTab === 'col-data' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* LEFT COLUMN: AI TARGET SWEEPER */}
                <div className="space-y-6">
                    <div className="bg-[#0b1224] border border-emerald-500/20 rounded-sm shadow-2xl overflow-hidden">
                        <div className="p-4 bg-black/20 border-b border-white/5 flex items-center gap-2">
                            <Target className="size-4 text-emerald-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">AI Target Sweeper</span>
                        </div>
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

                {/* RIGHT COLUMN: BULK JSON UPLINK */}
                <div className="space-y-6">
                    <div className="bg-[#0b1224] border border-white/10 rounded-sm shadow-2xl overflow-hidden">
                        <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <FileJson className="size-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cost of Living JSON Uplink</span>
                            </div>
                            <Terminal className="size-4 text-slate-700" />
                        </div>
                        <div className="p-6 space-y-6">
                            <textarea 
                                className="w-full h-[300px] bg-black/60 border border-white/10 p-6 font-mono text-[11px] text-green-400 rounded-sm outline-none focus:border-[#10b981] transition-all resize-none shadow-inner"
                                placeholder={`[\n  {\n    "id": "FLIC0001",\n    "region": "Middle East",\n    "country": "UAE",\n    "city": "Abu Dhabi",\n    "currencyCode": "AED",\n    "dataCurrency": "USD",\n    "rent1br": "2215.00"\n  }\n]`}
                                value={colJsonInput}
                                onChange={(e) => setColJsonInput(e.target.value)}
                            />
                            <button 
                                onClick={handleColUpload}
                                disabled={loading || !colJsonInput}
                                className="w-full h-16 bg-[#10b981] text-white font-black uppercase italic tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? <Loader2 className="animate-spin size-5" /> : "Execute Cost of Living Protocol"}
                            </button>
                        </div>
                    </div>
                    {status && activeTab === 'col-data' && (
                        <div className={cn("p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 animate-in zoom-in-95", status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500')}>
                            {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                            <span className="tracking-widest">{status.msg}</span>
                        </div>
                    )}
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

        {/* TAB 4: MATRIX AI */}
        {activeTab === 'matrix' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#0b1224] border border-indigo-500/20 rounded-sm shadow-2xl overflow-hidden">
                        <div className="p-4 bg-black/20 border-b border-white/5 flex items-center gap-2">
                            <Compass className="size-4 text-indigo-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Adventure & Culture Indexes</span>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Country Name (e.g. Thailand)</Label>
                                    <Input value={matrixCountryName} onChange={(e) => setMatrixCountryName(e.target.value)} placeholder="Thailand" className="bg-black/40 border-white/10 h-12 text-white font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Document ID (e.g. thailand)</Label>
                                    <Input value={matrixCountryId} onChange={(e) => setMatrixCountryId(e.target.value)} placeholder="thailand" className="bg-black/40 border-white/10 h-12 text-white font-bold" />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={handleUpdateMatrix} 
                                    disabled={loading || !matrixCountryId || !matrixCountryName}
                                    className="flex-1 h-14 bg-indigo-500/10 border border-indigo-500/50 text-indigo-400 font-black uppercase italic tracking-widest hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                >
                                    {loading ? <Loader2 className="animate-spin size-5" /> : <><RefreshCw className="size-5" /> Generate Indexes</>}
                                </button>
                                <button 
                                    onClick={handleClearMatrix} 
                                    disabled={loading || !matrixCountryId}
                                    className="px-8 h-14 bg-red-500/10 border border-red-500/50 text-red-400 font-black uppercase italic tracking-widest hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                    {status && activeTab === 'matrix' && (
                        <div className={cn("p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 animate-in zoom-in-95", status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500')}>
                            {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                            <span className="tracking-widest">{status.msg}</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 6: TRANSPORT INTEL */}
        {activeTab === 'transport' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-[#0b1224] border border-blue-500/20 rounded-sm shadow-2xl overflow-hidden">
                    <div className="p-4 bg-black/20 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                        <Map className="size-4 text-blue-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">LFI Transport JSON Uplink</span>
                        </div>
                        <Terminal className="size-4 text-slate-700" />
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-sm text-blue-400/90 text-sm font-medium">
                          <strong className="text-blue-400">PIVOTED UPLINK:</strong> Paste the transposed JSON matrix (Country vs Personas). Data will be saved to the dedicated <code className="text-white">transport_intel</code> collection.
                        </div>
                        <textarea 
                            className="w-full h-[350px] bg-black/60 border border-white/10 p-6 font-mono text-[11px] text-blue-400 rounded-sm outline-none focus:border-blue-500 transition-all resize-none shadow-inner"
                            placeholder='[\n  {\n    "field1": "Country",\n    "Car Hire (Monthly USD)": "Single",\n    "field3": "Married (Dual Income)",\n    "field22": "Best Option Driver",\n    "field23": "Best Option No Driver"\n  },\n  {\n    "field1": "India",\n    "Car Hire (Monthly USD)": "850",\n    "field3": "950",\n    "field22": "Driver strategy...",\n    "field23": "No-driver strategy..."\n  }\n]'
                            value={transportJsonInput}
                            onChange={(e) => setTransportJsonInput(e.target.value)}
                        />
                        <button 
                          onClick={handleTransportUpload}
                          disabled={loading || !transportJsonInput}
                          className="w-full h-16 bg-blue-600 text-white font-black uppercase italic tracking-[0.2em] hover:bg-white hover:text-black transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                          {loading ? <Loader2 className="animate-spin size-5" /> : "Execute Transport Uplink"}
                        </button>
                    </div>
                    </div>
                    {status && activeTab === 'transport' && (
                    <div className={cn("p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 animate-in zoom-in-95", status.type === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-500' : 'bg-red-500/10 border-red-500/50 text-red-500')}>
                        {status.type === 'success' ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" />}
                        <span className="tracking-widest">{status.msg}</span>
                    </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB 5: TELEMETRY */}
        {activeTab === 'telemetry' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Live Telemetry</h2>
                    <button onClick={loadTelemetry} className="text-[10px] font-black uppercase tracking-widest text-[#d95f02] hover:text-white flex items-center gap-2">
                        {loadingTelemetry ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Refresh Data
                    </button>
                </div>
                
                {telemetry && (
                    <div className="space-y-8">
                        {/* High Level Cards Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                                <div className="text-[10px] font-black uppercase text-purple-400 mb-2">Total Site Visits</div>
                                <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.totalVisits?.toLocaleString() || 0}</div>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                                <div className="text-[10px] font-black uppercase text-sky-400 mb-2">Briefings Generated</div>
                                <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.comparisons?.toLocaleString() || 0}</div>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                                <div className="text-[10px] font-black uppercase text-[#d95f02] mb-2">Verified Schools</div>
                                <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.totalSchools?.toLocaleString() || 0}</div>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                                <div className="text-[10px] font-black uppercase text-blue-400 mb-2">Countries Covered</div>
                                <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.uniqueCountries?.toLocaleString() || 0}</div>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                                <div className="text-[10px] font-black uppercase text-emerald-400 mb-2">City Cost Profiles</div>
                                <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.totalLocations?.toLocaleString() || 0}</div>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm">
                                <div className="text-[10px] font-black uppercase text-slate-400 mb-2">Active Enquiries</div>
                                <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.pendingEnquiries?.toLocaleString() || 0}</div>
                            </div>
                        </div>

                        {/* Traffic Trend and Analytics Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Visits Trend Bar Chart */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4 lg:col-span-2">
                                <h3 className="text-xs font-black uppercase text-purple-400 tracking-wider">7-Day Traffic Trend (Daily Visits)</h3>
                                <div className="flex items-end justify-between h-36 pt-6 px-2">
                                    {telemetry.visitsTrend?.map((day: any, idx: number) => {
                                        const maxCount = Math.max(...telemetry.visitsTrend.map((d: any) => d.count), 1);
                                        const heightPct = (day.count / maxCount) * 100;
                                        return (
                                            <div key={idx} className="flex flex-col items-center gap-2 flex-1 group">
                                                <div className="text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {day.count}
                                                </div>
                                                <div 
                                                    style={{ height: `${Math.max(heightPct, 5)}%` }}
                                                    className="w-8 bg-purple-500/80 hover:bg-[#d95f02] transition-all duration-200"
                                                />
                                                <div className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">
                                                    {day.date}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* User breakdown */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">User Segmentation</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Authenticated</p>
                                            <p className="text-2xl font-black italic text-sky-400">{telemetry.userTypeBreakdown?.authenticated || 0}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Anonymous Guests</p>
                                            <p className="text-2xl font-black italic text-slate-400">{telemetry.userTypeBreakdown?.guest || 0}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Email Copied</p>
                                        <p className="text-lg font-black italic text-purple-400">{telemetry.emailCopies || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Uninsured Views</p>
                                        <p className="text-lg font-black italic text-rose-400">{telemetry.uninsuredWarnings || 0}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Flight Simulator and Surplus Analysis */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-6">
                            <h3 className="text-xs font-black uppercase text-[#d95f02] tracking-wider">Flight Simulator Insights</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                                <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                    <div className="border-r border-white/5 pr-4 space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Avg Net Salary</p>
                                        <p className="text-2xl font-black italic text-white">£{telemetry.avgNetSalary?.toLocaleString() || 0}</p>
                                    </div>
                                    <div className="border-r border-white/5 pr-4 space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Housing Downgrades</p>
                                        <p className="text-2xl font-black italic text-[#d95f02]">{telemetry.housingDowngrades || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase leading-none">Partner Income Added</p>
                                        <p className="text-2xl font-black italic text-emerald-400">{telemetry.partnerSalaryAdditions || 0}</p>
                                    </div>
                                </div>
                                
                                {/* Surplus Status Distribution */}
                                <div className="space-y-3 md:col-span-1 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Surplus Distribution</h4>
                                    <div className="h-3 w-full bg-slate-800 flex overflow-hidden">
                                        {(() => {
                                            const total = (telemetry.surplusBreakdown?.thriving || 0) + (telemetry.surplusBreakdown?.limited || 0) + (telemetry.surplusBreakdown?.negative || 0) || 1;
                                            const thrivingPct = ((telemetry.surplusBreakdown?.thriving || 0) / total) * 100;
                                            const limitedPct = ((telemetry.surplusBreakdown?.limited || 0) / total) * 100;
                                            const negativePct = ((telemetry.surplusBreakdown?.negative || 0) / total) * 100;
                                            return (
                                                <>
                                                    <div style={{ width: `${thrivingPct}%` }} className="bg-emerald-500" title={`Thriving: ${Math.round(thrivingPct)}%`} />
                                                    <div style={{ width: `${limitedPct}%` }} className="bg-amber-500" title={`Limited: ${Math.round(limitedPct)}%`} />
                                                    <div style={{ width: `${negativePct}%` }} className="bg-rose-500" title={`Deficit: ${Math.round(negativePct)}%`} />
                                                </>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase">
                                        <span className="flex items-center gap-1"><span className="size-2 bg-emerald-500 block rounded-full" /> Thriving ({telemetry.surplusBreakdown?.thriving || 0})</span>
                                        <span className="flex items-center gap-1"><span className="size-2 bg-amber-500 block rounded-full" /> Limited ({telemetry.surplusBreakdown?.limited || 0})</span>
                                        <span className="flex items-center gap-1"><span className="size-2 bg-rose-500 block rounded-full" /> Deficit ({telemetry.surplusBreakdown?.negative || 0})</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Queries and Checklist friction */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Top Schools */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-[#d95f02] tracking-wider">Top Schools Queried</h3>
                                <div className="space-y-3">
                                    {telemetry.topSchools?.length > 0 ? (
                                        telemetry.topSchools.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 truncate max-w-[150px]">{item.name}</span>
                                                <span className="text-white bg-white/5 px-2 py-0.5 rounded-sm">{item.count} views</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No school views recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Top Countries */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">Top Countries Searched</h3>
                                <div className="space-y-3">
                                    {telemetry.topCountries?.length > 0 ? (
                                        telemetry.topCountries.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 capitalize">{item.name}</span>
                                                <span className="text-white bg-white/5 px-2 py-0.5 rounded-sm">{item.count} queries</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No country queries recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Accessing Countries */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">Accessing Countries</h3>
                                <div className="space-y-3">
                                    {telemetry.topClientCountries?.length > 0 ? (
                                        telemetry.topClientCountries.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 uppercase">{item.name}</span>
                                                <span className="text-white bg-white/5 px-2 py-0.5 rounded-sm">{item.count} visits</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No access locations recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Checklist Friction */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-purple-400 tracking-wider">Checklist Friction Points</h3>
                                <div className="space-y-3">
                                    {telemetry.checklistFriction?.length > 0 ? (
                                        telemetry.checklistFriction.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 truncate max-w-[150px]">{item.item}</span>
                                                <span className="text-[#d95f02] font-black">{item.count} checked</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No checklist toggles recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
}