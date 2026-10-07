"use client";

import React, { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { 
  Database, Zap, Loader2, CheckCircle2, AlertTriangle, 
  FileJson, Beaker, ShieldCheck, RefreshCw, Info, Terminal, 
  MapPin, Globe2, ServerCrash, Coins,
  Activity, Target, Map, MessageSquare, Compass,
  Cpu, Clock, PlusCircle, MinusCircle, Layers, TrendingUp,
  Users, UserCheck, Calculator, Building2, Sliders, Eye, 
  GitCompare, FileCheck, FileText, ExternalLink, ArrowRight, Flame, Sparkles,
  Search, Filter, Award, Mail, ShieldAlert
} from 'lucide-react';
import { healthyLine } from '@/lib/crawler/engineHealth';
import { 
  getCrawlLogsAction, type CrawlLogItem, getEngineHealthAction, getCoolingStatusesAction, type EngineCoolingItem, 
  uploadRegistryJsonAction, 
  enrichAllSchoolsAction, 
  updateLocationCostOfLivingAction, 
  getTelemetryData,
  uploadIkeaIntelAction,
  uploadTransportIntelAction,
  updateCountryIndexesAction,
  clearCountryIndexesAction,
  getIngestionConflictAlertsAction,
  resolveIngestionConflictAction,
  getMembersDataAction,
  type MemberAccountItem,
  runJobAuditAction,
  type JobAuditResult,

  type BulkEnrichState,
  type EcoActionState 
} from './actions';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { CRAWLER_TIMETABLE } from '@/lib/crawler/timetableScheduler';
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
  const [activeTab, setActiveTab] = useState<'schools-data' | 'col-data' | 'telemetry' | 'members' | 'ikea' | 'matrix' | 'transport' | 'job-audit'>('col-data');
  const [jobAuditResult, setJobAuditResult] = useState<JobAuditResult | null>(null);
  const [loadingJobAudit, setLoadingJobAudit] = useState(false);
  const runJobAudit = async () => {
    setLoadingJobAudit(true);
    try {
      const res = await runJobAuditAction();
      setJobAuditResult(res);
    } finally {
      setLoadingJobAudit(false);
    }
  };

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
  const [members, setMembers] = useState<MemberAccountItem[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberTierFilter, setMemberTierFilter] = useState<'ALL' | 'free' | 'admin'>('ALL');
  const [crawlLogs, setCrawlLogs] = useState<CrawlLogItem[]>([]);
  const [engineHealth, setEngineHealth] = useState<{ engine: string; level: string; reason: string; lastGoodDay: string | null }[]>([]);
  const [loadingCrawlLogs, setLoadingCrawlLogs] = useState(false);
  const [selectedEngineFilter, setSelectedEngineFilter] = useState<string>("ALL");
  const [coolingStatuses, setCoolingStatuses] = useState<Record<string, EngineCoolingItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'All' | 'Schools' | 'Countries' | 'Regions'>('All');

  // Data Ingestion Conflict Alerts State
  const [conflictAlerts, setConflictAlerts] = useState<import('@/firebase/admin').IngestionConflictAlert[]>([]);
  const [loadingConflictAlerts, setLoadingConflictAlerts] = useState(false);
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null);

  // Matrix AI State
  const [matrixCountryId, setMatrixCountryId] = useState('');
  const [matrixCountryName, setMatrixCountryName] = useState('');

  async function loadMembers() {
    setLoadingMembers(true);
    try {
      const res = await getMembersDataAction();
      if (res.success && res.members) {
        setMembers(res.members);
      }
    } catch (err) {
      console.error("Failed loading members:", err);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function loadConflictAlerts() {
    setLoadingConflictAlerts(true);
    try {
      const res = await getIngestionConflictAlertsAction();
      if (res.success && res.alerts) {
        setConflictAlerts(res.alerts);
      }
    } catch (err) {
      console.error("Failed loading conflict alerts:", err);
    } finally {
      setLoadingConflictAlerts(false);
    }
  }

  async function handleResolveConflict(alertId: string, action: 'accept_dom' | 'keep_db') {
    setResolvingAlertId(alertId);
    try {
      const res = await resolveIngestionConflictAction(alertId, action);
      if (res.success) {
        setStatus({ type: 'success', msg: `Conflict resolved: ${action === 'accept_dom' ? 'DOM Value Accepted' : 'DB Value Kept'}` });
        await loadConflictAlerts();
      } else {
        setStatus({ type: 'error', msg: res.error || 'Resolution failed' });
      }
    } catch (err: any) {
      setStatus({ type: 'error', msg: err?.message || 'Resolution failed' });
    } finally {
      setResolvingAlertId(null);
    }
  }

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
        setStatus({ type: 'success', msg: `TRANSPORT INTEL UPLINK OK: ${res.count} country documents updated.` });
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
    setLoadingCrawlLogs(true);
    await loadConflictAlerts();
    const result = await getTelemetryData();
    if (result.success) setTelemetry(result.data);
    setLoadingTelemetry(false);
    const crawlRes = await getCrawlLogsAction();
    if (crawlRes.success) setCrawlLogs(crawlRes.data);
    const healthRes = await getEngineHealthAction();
    if (healthRes.success) setEngineHealth(healthRes.data);
    const coolRes = await getCoolingStatusesAction();
    if (coolRes.success) setCoolingStatuses(coolRes.data);
    setLoadingCrawlLogs(false);
  }

  useEffect(() => {
    if (mounted) {
      if (activeTab === 'telemetry') {
        loadTelemetry();
      }
      if (activeTab === 'members') {
        loadMembers();
      }
      // Engine warnings load in the background so the Daily Intelligence button can show a coloured dot from any tab.
      getEngineHealthAction().then((h) => { if (h.success) setEngineHealth(h.data); }).catch(() => {});
      // Load members count in background on mount
      if (members.length === 0) {
        loadMembers();
      }
    }
  }, [activeTab, mounted]);

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
            {/* <button 
                onClick={() => setActiveTab('schools-data')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'schools-data' ? "bg-[#d95f02] text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Schools Data
            </button> */}

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
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-1.5", activeTab === 'telemetry' ? "bg-purple-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                <Activity className="size-3.5" />
                Daily Intelligence
                {(() => {
                    const worst = engineHealth.some((h) => h.level === "red") ? "red" : engineHealth.some((h) => h.level === "amber") ? "amber" : engineHealth.some((h) => h.level === "yellow") ? "yellow" : null;
                    if (!worst) return null;
                    return <span title="An engine needs attention - open Daily Intelligence" className={cn("size-2.5 rounded-full", worst === "red" && "bg-red-500 animate-pulse", worst === "amber" && "bg-amber-400", worst === "yellow" && "bg-yellow-300")} />;
                })()}
            </button>
            <button 
                onClick={() => setActiveTab('members')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-1.5", activeTab === 'members' ? "bg-emerald-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                <UserCheck className="size-3.5" />
                Members ({members.length || '15'})
            </button>
            <button 
                onClick={() => setActiveTab('matrix')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm", activeTab === 'matrix' ? "bg-indigo-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                Matrix AI
            </button>
            <button
                onClick={() => setActiveTab('job-audit')}
                className={cn("px-6 py-2 text-[11px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-1.5", activeTab === 'job-audit' ? "bg-rose-500 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10")}
            >
                <ShieldAlert className="size-3.5" />
                Job Audit
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

        {/* TAB: JOB AUDIT — read-only quality assurance check over every live job */}
        {activeTab === 'job-audit' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Job Audit</h2>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                            Checks every job currently live on the public site for broken links, wrong schools, expired-but-live jobs, duplicates, and more. Read-only — makes no changes.
                        </p>
                    </div>
                    <button
                        onClick={runJobAudit}
                        disabled={loadingJobAudit}
                        className="h-12 px-6 bg-rose-500/10 border border-rose-500/50 text-rose-400 font-black uppercase italic tracking-widest hover:bg-rose-500 hover:text-white transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                    >
                        {loadingJobAudit ? <Loader2 className="animate-spin size-5" /> : <ShieldAlert className="size-5" />}
                        {loadingJobAudit ? 'Running…' : 'Run Job Audit'}
                    </button>
                </div>

                {jobAuditResult && !jobAuditResult.success && (
                    <div className="p-5 rounded-sm border font-black uppercase italic text-xs flex items-center gap-4 bg-red-500/10 border-red-500/50 text-red-500">
                        <AlertTriangle className="size-5" />
                        <span className="tracking-widest">{jobAuditResult.error || 'Job audit failed'}</span>
                    </div>
                )}

                {jobAuditResult && jobAuditResult.success && (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            <div className="bg-[#0b1224] border border-white/10 rounded-sm p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Unique Live Cards</p>
                                <p className="text-2xl font-black text-white mt-1">{jobAuditResult.uniqueLiveCards}</p>
                                <p className="text-[9px] text-slate-600 mt-0.5">what visitors actually see</p>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 rounded-sm p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Live Documents</p>
                                <p className="text-2xl font-black text-white mt-1">{jobAuditResult.totalLive}</p>
                                <p className="text-[9px] text-slate-600 mt-0.5">{jobAuditResult.multiEngineGroups} multi-engine groups</p>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 rounded-sm p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Documents</p>
                                <p className="text-2xl font-black text-white mt-1">{jobAuditResult.totalDocuments}</p>
                            </div>
                            <div className="bg-[#0b1224] border border-rose-500/30 rounded-sm p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Flagged Jobs</p>
                                <p className="text-2xl font-black text-rose-400 mt-1">{jobAuditResult.flagged.length}</p>
                            </div>
                            <div className="bg-[#0b1224] border border-white/10 rounded-sm p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Checked At</p>
                                <p className="text-xs font-bold text-slate-300 mt-2">{new Date(jobAuditResult.generatedAt).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {[
                                { key: 'BROKEN_LINK', label: 'Broken Link' },
                                { key: 'GENERIC_LINK', label: 'Generic Link' },
                                { key: 'SCHOOL_MISMATCH', label: 'Wrong School' },
                                { key: 'STALE_BUT_LIVE', label: 'Expired, Still Live' },
                                { key: 'BAD_TITLE', label: 'Bad Title' },
                                { key: 'MISSING_SCHOOL', label: 'Missing School' },
                                { key: 'UNVERIFIED_LIVE', label: 'Should Be Rejected' },
                            ].map(({ key, label }) => (
                                <div key={key} className="bg-black/30 border border-white/5 rounded-sm p-3">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                                    <p className="text-lg font-black text-amber-400 mt-1">{jobAuditResult.counts[key] || 0}</p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-[#0b1224] border border-white/10 rounded-sm overflow-hidden">
                            <div className="p-4 bg-black/20 border-b border-white/5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Flagged Jobs ({jobAuditResult.flagged.length})</span>
                            </div>
                            <div className="max-h-[600px] overflow-y-auto divide-y divide-white/5">
                                {jobAuditResult.flagged.length === 0 && (
                                    <div className="p-8 text-center text-slate-500 text-sm font-bold">No issues found. 🎉</div>
                                )}
                                {jobAuditResult.flagged.map((f) => (
                                    <div key={f.docId} className="p-4 hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                            <div>
                                                <p className="text-sm font-bold text-white">{f.title || '(no title)'}</p>
                                                <p className="text-[11px] text-slate-500">{f.schoolName || '(no school)'} · {f.schoolId || '—'} · source: {f.source || '—'}</p>
                                            </div>
                                            <div className="flex gap-1.5 flex-wrap">
                                                {f.issues.map((issue) => (
                                                    <span key={issue} className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-sm">
                                                        {issue}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <ul className="mt-2 space-y-1">
                                            {f.detail.map((d, i) => (
                                                <li key={i} className="text-[11px] text-slate-400">{d}</li>
                                            ))}
                                        </ul>
                                        <p className="text-[10px] text-slate-600 mt-1 font-mono">{f.docId}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {!jobAuditResult && !loadingJobAudit && (
                    <div className="p-8 text-center text-slate-500 text-sm font-bold bg-[#0b1224] border border-white/10 rounded-sm">
                        Click "Run Job Audit" to check every live job on the site.
                    </div>
                )}
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
                    <h2 className="text-xl font-black uppercase tracking-widest text-white italic">Live Telemetry & Ingestion Audit</h2>
                    <button onClick={loadTelemetry} className="text-[10px] font-black uppercase tracking-widest text-[#d95f02] hover:text-white flex items-center gap-2">
                        {loadingTelemetry ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />} Refresh Data
                    </button>
                </div>

                {/* 🚨 DATA INGESTION CONFLICT ALERTS PANEL */}
                <div className="bg-[#0b1224] border border-amber-500/30 rounded-sm p-6 space-y-4 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="size-5 text-amber-400 animate-pulse" />
                            <h3 className="text-xs font-black uppercase text-amber-300 tracking-wider">
                                Data Ingestion Conflict Alerts ({conflictAlerts.length})
                            </h3>
                        </div>
                        <button onClick={loadConflictAlerts} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white flex items-center gap-1.5">
                            {loadingConflictAlerts ? <Loader2 className="size-3 animate-spin text-amber-400" /> : <RefreshCw className="size-3" />} Refresh Alerts
                        </button>
                    </div>

                    {conflictAlerts.length === 0 ? (
                        <div className="border border-emerald-500/20 bg-emerald-950/20 p-4 rounded-sm text-center">
                            <CheckCircle2 className="size-6 text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Zero Ingestion Conflicts</p>
                            <p className="text-[11px] text-slate-400 mt-1">All extracted DOM benefits match existing database records cleanly.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {conflictAlerts.map((alert) => (
                                <div key={alert.id} className="bg-black/50 border border-amber-500/40 p-4 rounded-sm space-y-3">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-2">
                                        <div>
                                            <span className="text-[10px] font-mono text-amber-400 font-bold uppercase mr-2">[{alert.schoolId}]</span>
                                            <span className="text-sm font-black text-white">{alert.schoolName || alert.schoolId}</span>
                                            {alert.jobTitle && <span className="text-xs text-slate-300 ml-2 italic">— {alert.jobTitle}</span>}
                                        </div>
                                        <div className="text-[10px] font-mono text-slate-400">
                                            Field Contradiction: <span className="text-sky-400 font-bold">{alert.fieldName}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                                        <div className="bg-slate-900/90 border border-slate-800 p-3 rounded">
                                            <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">Existing DB Value</span>
                                            <span className="font-bold text-rose-400">{String(alert.dbValue)}</span>
                                        </div>
                                        <div className="bg-slate-900/90 border border-amber-500/40 p-3 rounded">
                                            <span className="text-[9px] uppercase font-bold text-amber-400 block mb-1">Extracted DOM Value</span>
                                            <span className="font-bold text-emerald-400">{String(alert.domValue)}</span>
                                        </div>
                                    </div>

                                    {alert.domSnippet && (
                                        <div className="bg-black/80 border border-white/5 p-2.5 rounded text-[11px] font-mono text-slate-300 italic">
                                            Snippet: "<span className="text-amber-200">{alert.domSnippet}</span>"
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between pt-2">
                                        {alert.sourceUrl ? (
                                            <a href={alert.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-sky-400 hover:underline">
                                                View Source Page &rarr;
                                            </a>
                                        ) : <div />}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleResolveConflict(alert.id, 'accept_dom')}
                                                disabled={resolvingAlertId === alert.id}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-extrabold uppercase tracking-wider rounded transition-all disabled:opacity-50"
                                            >
                                                {resolvingAlertId === alert.id ? "Processing..." : "Accept DOM Value"}
                                            </button>
                                            <button
                                                onClick={() => handleResolveConflict(alert.id, 'keep_db')}
                                                disabled={resolvingAlertId === alert.id}
                                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-extrabold uppercase tracking-wider rounded transition-all disabled:opacity-50"
                                            >
                                                Keep DB Value
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                {telemetry && (() => {
                    const total7Days = telemetry.visitsTrend?.reduce((acc: number, d: any) => acc + d.count, 0) || 0;
                    const dailyAvg = (total7Days / 7).toFixed(1);
                    const peakDay = telemetry.visitsTrend?.reduce((max: any, d: any) => d.count > max.count ? d : max, { count: 0 });
                    return (
                        <div className="space-y-8">
                            {/* 🏛️ DAILY INTELLIGENCE SNAPSHOT & 3-TIER CONVERSION ENGINE */}
                            {telemetry.funnel && (
                                <div className="space-y-6">
                                    {/* 07:00 PRAGUE SNAPSHOT HEADER BAR */}
                                    <div className="bg-gradient-to-r from-purple-950/60 via-[#0b1224] to-slate-900 border border-purple-500/30 rounded-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-purple-500/20 rounded-sm border border-purple-500/40 text-purple-400">
                                                <Activity className="size-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">Morning Dispatch</span>
                                                    <span className="size-1 rounded-full bg-slate-500" />
                                                    <span className="text-[10px] font-mono text-slate-400">07:00 Europe/Prague Standard</span>
                                                </div>
                                                <h3 className="text-sm font-black uppercase text-white tracking-wider">
                                                    Daily Intelligence Hub · Previous 24 Hours
                                                </h3>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-black/50 border border-white/10 px-3 py-1.5 rounded-sm">
                                                Live Grounded Ingestion
                                            </span>
                                        </div>
                                    </div>

                                    {/* 🚀 WHAT CHANGED SINCE YESTERDAY DELTA RIBBON */}
                                    {telemetry.funnel.whatChanged && (
                                        <div className="bg-[#0b1224] border border-white/10 rounded-sm p-5 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                                                    <TrendingUp className="size-3.5" /> What Changed Since Yesterday (24H Delta)
                                                </h4>
                                                <span className="text-[9px] font-mono text-slate-500">Trailing 24h vs Previous 24h</span>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 font-mono">
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Visitors</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.visitorsDelta.includes('+') ? "text-emerald-400" : telemetry.funnel.whatChanged.visitorsDelta.includes('-') ? "text-rose-400" : "text-slate-300")}>
                                                        {telemetry.funnel.whatChanged.visitorsDelta}
                                                    </span>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Forecaster Users</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.forecasterDelta.includes('+') ? "text-amber-400" : telemetry.funnel.whatChanged.forecasterDelta.includes('-') ? "text-rose-400" : "text-slate-300")}>
                                                        {telemetry.funnel.whatChanged.forecasterDelta}
                                                    </span>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Schools Evaluated</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.schoolsEvaluatedDelta.includes('+') ? "text-sky-400" : telemetry.funnel.whatChanged.schoolsEvaluatedDelta.includes('-') ? "text-rose-400" : "text-slate-300")}>
                                                        {telemetry.funnel.whatChanged.schoolsEvaluatedDelta}
                                                    </span>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Salary Adjusters</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.salaryAdjustersDelta.includes('+') ? "text-purple-400" : telemetry.funnel.whatChanged.salaryAdjustersDelta.includes('-') ? "text-rose-400" : "text-slate-300")}>
                                                        {telemetry.funnel.whatChanged.salaryAdjustersDelta}
                                                    </span>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Registrations</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.registrationsDelta.includes('+') ? "text-emerald-400" : "text-slate-400")}>
                                                        {telemetry.funnel.whatChanged.registrationsDelta}
                                                    </span>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Briefings</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.briefingsDelta.includes('+') ? "text-sky-400" : "text-slate-400")}>
                                                        {telemetry.funnel.whatChanged.briefingsDelta}
                                                    </span>
                                                </div>
                                                <div className="bg-black/50 border border-white/5 p-3 rounded">
                                                    <span className="text-[9px] uppercase font-bold text-slate-400 block truncate">Job Apply Clicks</span>
                                                    <span className={cn("text-base font-black truncate block", telemetry.funnel.whatChanged.jobClicksDelta.includes('+') ? "text-emerald-400" : "text-slate-400")}>
                                                        {telemetry.funnel.whatChanged.jobClicksDelta}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 3-TIER CONVERSION FUNNEL CARD */}
                                    <div className="bg-[#0b1224] border border-sky-500/30 rounded-sm p-6 space-y-6 shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 blur-3xl pointer-events-none rounded-full" />
                                        
                                        {/* Funnel Header */}
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                                        <Sparkles className="size-3" /> Core Conversion Funnel
                                                    </span>
                                                    <h3 className="text-lg font-black uppercase text-white tracking-wider">
                                                        Platform Conversion Engine
                                                    </h3>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Separating raw arrivals from active tool engagement and verified product conversions.
                                                </p>
                                            </div>

                                            {/* Funnel Readout Badge */}
                                            <div className="bg-black/60 border border-white/15 px-4 py-2.5 rounded-sm flex items-center gap-3">
                                                <div className="text-[10px] font-mono font-black uppercase tracking-wider text-slate-400">
                                                    Funnel Readout:
                                                </div>
                                                <div className="text-xs font-mono font-extrabold text-emerald-400 flex items-center gap-1.5 flex-wrap">
                                                    <span>{telemetry.funnel.tier1.totalSessions} Sessions</span>
                                                    <ArrowRight className="size-3 text-slate-500" />
                                                    <span className="text-amber-300">{telemetry.funnel.tier2.uniqueEngagedVisitors} Engaged ({telemetry.funnel.tier2.engagementRate}%)</span>
                                                    <ArrowRight className="size-3 text-slate-500" />
                                                    <span className="text-sky-300">{telemetry.funnel.tier3.registeredEducators} Registered</span>
                                                    <ArrowRight className="size-3 text-slate-500" />
                                                    <span className="text-emerald-300">{telemetry.funnel.tier3.briefingsGenerated + telemetry.funnel.tier3.jobApplicationsClicked} Briefings & Jobs</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 3 High-Contrast Tier Cards */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            {/* Tier 1: Visitors */}
                                            <div className="bg-slate-900/90 border border-sky-500/40 rounded-sm p-5 space-y-4 relative group hover:border-sky-400 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-sky-400">
                                                        <Users className="size-5" />
                                                        <span className="text-xs font-black uppercase tracking-wider">1. Visitors</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-sky-500/10 px-2 py-0.5 rounded">
                                                        Top of Funnel
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 min-h-[32px]">
                                                    {telemetry.funnel.tier1.description}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 font-mono">
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Total Sessions</span>
                                                        <span className="text-xl font-black text-white">{telemetry.funnel.tier1.totalSessions}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Unique Visitors</span>
                                                        <span className="text-xl font-black text-sky-400">{telemetry.funnel.tier1.uniqueVisitors}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Return Visitors</span>
                                                        <span className="text-base font-bold text-slate-300">{telemetry.funnel.tier1.returnVisitors}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Return Rate</span>
                                                        <span className="text-base font-bold text-emerald-400">{telemetry.funnel.tier1.returnVisitorRate}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tier 2: Engaged Prospects */}
                                            <div className="bg-slate-900/90 border border-amber-500/40 rounded-sm p-5 space-y-4 relative group hover:border-amber-400 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-amber-400">
                                                        <Flame className="size-5" />
                                                        <span className="text-xs font-black uppercase tracking-wider">2. Engaged Prospects</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                                                        {telemetry.funnel.tier2.engagementRate}% Rate
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 min-h-[32px]">
                                                    {telemetry.funnel.tier2.description}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 font-mono">
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Engaged Prospects</span>
                                                        <span className="text-xl font-black text-amber-400">{telemetry.funnel.tier2.uniqueEngagedVisitors}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Engaged Sessions</span>
                                                        <span className="text-xl font-black text-white">{telemetry.funnel.tier2.totalEngagedSessions}</span>
                                                    </div>
                                                    <div className="col-span-2 bg-amber-950/20 border border-amber-500/20 p-2.5 rounded flex items-center justify-between">
                                                        <span className="text-[10px] uppercase font-bold text-amber-300">Visitor Engagement Ratio</span>
                                                        <span className="text-sm font-black text-amber-400">{telemetry.funnel.tier2.engagementRate}%</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Tier 3: Conversions */}
                                            <div className="bg-slate-900/90 border border-emerald-500/40 rounded-sm p-5 space-y-4 relative group hover:border-emerald-400 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-emerald-400">
                                                        <UserCheck className="size-5" />
                                                        <span className="text-xs font-black uppercase tracking-wider">3. Conversions</span>
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                        {telemetry.funnel.tier3.conversionRate}% Overall
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-400 min-h-[32px]">
                                                    {telemetry.funnel.tier3.description}
                                                </p>
                                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5 font-mono">
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Registered Educators</span>
                                                        <span className="text-xl font-black text-emerald-400">{telemetry.funnel.tier3.registeredEducators}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Briefings Created</span>
                                                        <span className="text-xl font-black text-sky-400">{telemetry.funnel.tier3.briefingsGenerated}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Job Clicks (Apply)</span>
                                                        <span className="text-base font-bold text-purple-400">{telemetry.funnel.tier3.jobApplicationsClicked}</span>
                                                    </div>
                                                    <div className="bg-black/40 p-2.5 rounded">
                                                        <span className="text-[9px] uppercase font-bold text-slate-500 block">Engaged Conversion</span>
                                                        <span className="text-base font-bold text-emerald-400">{telemetry.funnel.tier3.engagedToConversionRate}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* 10 Granular KPIs Breakdown Grid with Intensity: X educators / Y interactions */}
                                        <div className="pt-4 border-t border-white/10 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-2">
                                                    <Activity className="size-4 text-sky-400" />
                                                    10 Granular Interaction Milestones
                                                </h4>
                                                <span className="text-[10px] text-slate-400 font-mono">Format: <strong className="text-white">X educators / Y interactions</strong></span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                                {telemetry.funnel.kpis.map((kpi: any) => {
                                                    const isTier3 = kpi.category.includes('Tier 3');
                                                    const isTier2 = kpi.category.includes('Tier 2');
                                                    return (
                                                        <div 
                                                            key={kpi.id}
                                                            className={cn(
                                                                "bg-black/50 border p-3.5 rounded-sm space-y-2.5 transition-all hover:bg-black/70",
                                                                isTier3 ? "border-emerald-500/30 hover:border-emerald-500/60" :
                                                                isTier2 ? "border-amber-500/30 hover:border-amber-500/60" :
                                                                "border-sky-500/30 hover:border-sky-500/60"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between gap-1">
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider",
                                                                    isTier3 ? "bg-emerald-500/20 text-emerald-400" :
                                                                    isTier2 ? "bg-amber-500/20 text-amber-300" :
                                                                    "bg-sky-500/20 text-sky-400"
                                                                )}>
                                                                    {kpi.category}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-bold text-slate-200 leading-tight">{kpi.title}</div>
                                                                <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-2">{kpi.description}</div>
                                                            </div>
                                                            <div className="pt-2 border-t border-white/5 font-mono">
                                                                <div className="text-xs font-black text-white flex items-center justify-between">
                                                                    <span className="text-emerald-400">{kpi.educators || 0} educators</span>
                                                                    <span className="text-slate-500">/</span>
                                                                    <span className="text-amber-300">{kpi.events || kpi.count || 0} interactions</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* 🔥 HIGH-INTENT EDUCATORS (SPOTLIGHT LIST) */}
                                        {telemetry.funnel.highIntentEducators && telemetry.funnel.highIntentEducators.length > 0 && (
                                            <div className="pt-4 border-t border-white/10 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-xs font-black uppercase text-amber-400 tracking-wider flex items-center gap-2">
                                                        <Flame className="size-4 text-amber-400" />
                                                        High-Intent Educator Journeys (Spotlight)
                                                    </h4>
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        {telemetry.funnel.highIntentEducators.length} deeply active educator profiles
                                                    </span>
                                                </div>

                                                <div className="overflow-x-auto border border-white/10 rounded-sm bg-black/40">
                                                    <table className="w-full text-left text-[11px] font-sans">
                                                        <thead className="bg-[#070d19] border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                            <tr>
                                                                <th className="py-2.5 px-4">Educator / Visitor</th>
                                                                <th className="py-2.5 px-4">Location</th>
                                                                <th className="py-2.5 px-4">Schools Investigated</th>
                                                                <th className="py-2.5 px-4 text-center">Surplus Modelled</th>
                                                                <th className="py-2.5 px-4 text-center">Briefing / Shootout</th>
                                                                <th className="py-2.5 px-4 text-center">Apply Clicked</th>
                                                                <th className="py-2.5 px-4 text-right">Total Actions</th>
                                                                <th className="py-2.5 px-4 text-right">Last Active</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                                                            {telemetry.funnel.highIntentEducators.map((edu: any, idx: number) => (
                                                                <tr key={idx} className="hover:bg-white/5 transition-all">
                                                                    <td className="py-2.5 px-4 font-bold">
                                                                        <div className="flex items-center gap-1.5">
                                                                            {edu.isAuthenticated ? (
                                                                                <span className="size-2 rounded-full bg-emerald-400" title="Authenticated User" />
                                                                            ) : (
                                                                                <span className="size-2 rounded-full bg-slate-500" title="Anonymous Visitor" />
                                                                            )}
                                                                            <span className="text-white">{edu.email || edu.visitorId.slice(0, 16)}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-slate-300 uppercase font-sans">
                                                                        {edu.country}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-slate-300 max-w-xs truncate font-sans" title={edu.schools?.join(', ')}>
                                                                        {edu.schools && edu.schools.length > 0 ? edu.schools.join(', ') : <span className="text-slate-600">—</span>}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-center">
                                                                        {edu.modelledSurplus ? (
                                                                            <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                                YES
                                                                            </span>
                                                                        ) : <span className="text-slate-600">—</span>}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-center">
                                                                        {edu.generatedBriefing || edu.completedEvaluation ? (
                                                                            <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                                                                                {edu.generatedBriefing ? 'BRIEFING' : 'SHOOTOUT'}
                                                                            </span>
                                                                        ) : <span className="text-slate-600">—</span>}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-center">
                                                                        {edu.jobClicked ? (
                                                                            <span className="px-2 py-0.5 text-[8px] font-black uppercase rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                                                                APPLY CLICK
                                                                            </span>
                                                                        ) : <span className="text-slate-600">—</span>}
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right font-black text-amber-400">
                                                                        {edu.actionsCount} actions
                                                                    </td>
                                                                    <td className="py-2.5 px-4 text-right text-slate-400 font-sans">
                                                                        {edu.lastActiveFormatted}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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

                            {/* Audience Engagement Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-sky-400">Unique Visitors</div>
                                        <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.uniqueVisitors?.toLocaleString() || 0}</div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right bg-white/5 px-2 py-1 rounded-sm">
                                        Device Fingerprints
                                    </div>
                                </div>
                                <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-purple-400">Engagement Depth</div>
                                        <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.avgVisitsPerUser || '0.0'} <span className="text-[11px] font-bold text-slate-500 not-italic uppercase tracking-normal">visits/user</span></div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right bg-white/5 px-2 py-1 rounded-sm">
                                        Visits Intensity
                                    </div>
                                </div>
                                <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm flex items-center justify-between">
                                    <div className="space-y-1">
                                        <div className="text-[10px] font-black uppercase text-emerald-400">Retention Loyalty</div>
                                        <div className="text-2xl font-black italic tracking-tighter text-white">{telemetry.repeatVisitorRate}%</div>
                                    </div>
                                    <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right bg-white/5 px-2 py-1 rounded-sm">
                                        Repeat Visitor Rate
                                    </div>
                                </div>
                            </div>

                            {/* Traffic Trend and Analytics Breakdown */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Visits Trend Bar Chart */}
                                <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4 lg:col-span-2 flex flex-col justify-between">
                                    <div className="space-y-1">
                                        <h3 className="text-xs font-black uppercase text-purple-400 tracking-wider">7-Day Traffic Trend (Daily Visits)</h3>
                                        <div className="flex gap-4 text-[9px] font-black uppercase text-slate-500 italic tracking-wider">
                                            <span>Total 7D: <span className="text-white">{total7Days}</span></span>
                                            <span>Avg/Day: <span className="text-purple-400">{dailyAvg}</span></span>
                                            {peakDay?.count > 0 && <span>Peak: <span className="text-[#d95f02]">{peakDay.count} ({peakDay.date})</span></span>}
                                        </div>
                                    </div>
                                    <div className="flex items-end justify-between h-36 pt-6 px-2">
                                        {telemetry.visitsTrend?.map((day: any, idx: number) => {
                                            const maxCount = Math.max(...telemetry.visitsTrend.map((d: any) => d.count), 1);
                                            const heightPct = (day.count / maxCount) * 100;
                                            const isPeak = day.count === peakDay?.count && peakDay?.count > 0;
                                            return (
                                                <div key={idx} className="flex flex-col items-center gap-2 flex-1 group relative">
                                                    {/* COUNT BADGE */}
                                                    <div className={cn(
                                                        "text-[9px] font-black px-1.5 py-0.5 rounded-sm transition-all duration-200",
                                                        isPeak 
                                                            ? "bg-[#d95f02] text-white" 
                                                            : "bg-purple-950/80 border border-purple-500/30 text-purple-300",
                                                        "opacity-40 group-hover:opacity-100 group-hover:-translate-y-0.5"
                                                    )}>
                                                        {day.count}
                                                    </div>
                                                    {/* BAR */}
                                                    <div 
                                                        style={{ height: `${Math.max(heightPct, 5)}%` }}
                                                        className={cn(
                                                            "w-8 rounded-t-sm transition-all duration-300 relative overflow-hidden",
                                                            isPeak 
                                                                ? "bg-gradient-to-t from-[#d95f02]/60 to-[#d95f02] hover:brightness-110" 
                                                                : "bg-gradient-to-t from-purple-600/40 to-purple-500 hover:from-purple-500/60 hover:to-purple-400"
                                                        )}
                                                    />
                                                    {/* DATE */}
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

                        {/* Telemetry Query System */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black uppercase text-[#d95f02] tracking-wider">Telemetry Query System</h3>
                                    <p className="text-[10px] text-slate-400">Search raw views and unique visitors for any school, country, or region.</p>
                                </div>
                                <div className="flex gap-2">
                                    {(['All', 'Schools', 'Countries', 'Regions'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setSearchFilter(type)}
                                            className={cn(
                                                "px-3 py-1 text-[9px] font-black uppercase tracking-wider transition-all rounded-sm border",
                                                searchFilter === type
                                                    ? "bg-[#d95f02] border-[#d95f02] text-white"
                                                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                            )}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Type school, country or region name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 h-10 px-4 rounded-sm text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:border-[#d95f02]/60"
                                />
                                {searchQuery && (
                                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-3 text-[10px] font-black uppercase text-slate-500 hover:text-white">
                                        Clear
                                    </button>
                                )}
                            </div>

                            {searchQuery.trim().length > 0 && (
                                <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2 pt-2 border-t border-white/5">
                                    {(() => {
                                        const queryLower = searchQuery.toLowerCase().trim();
                                        const matches: any[] = [];
                                        
                                        if (searchFilter === 'All' || searchFilter === 'Schools') {
                                            telemetry.allSchools?.forEach((s: any) => {
                                                if (s.name.toLowerCase().includes(queryLower)) {
                                                    matches.push({ ...s, type: 'School', color: 'text-[#d95f02]' });
                                                }
                                            });
                                        }
                                        if (searchFilter === 'All' || searchFilter === 'Countries') {
                                            telemetry.allCountries?.forEach((c: any) => {
                                                if (c.name.toLowerCase().includes(queryLower)) {
                                                    matches.push({ ...c, type: 'Country', color: 'text-sky-400' });
                                                }
                                            });
                                        }
                                        if (searchFilter === 'All' || searchFilter === 'Regions') {
                                            telemetry.allRegions?.forEach((r: any) => {
                                                if (r.name.toLowerCase().includes(queryLower)) {
                                                    matches.push({ ...r, type: 'Region', color: 'text-purple-400' });
                                                }
                                            });
                                        }

                                        matches.sort((a, b) => b.raw - a.raw);

                                        if (matches.length === 0) {
                                            return <p className="text-[10px] text-slate-500 italic">No matches found for "{searchQuery}".</p>;
                                        }

                                        return matches.map((match: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={cn("text-[8px] uppercase px-1.5 py-0.5 bg-white/5 rounded-sm", match.color)}>
                                                        {match.type}
                                                    </span>
                                                    <span className="text-slate-200 capitalize">{match.name}</span>
                                                </div>
                                                <div className="flex gap-4 text-[10px] font-black">
                                                    <span className="text-white"><span className="text-slate-500 not-italic">Raw:</span> {match.raw}</span>
                                                    <span className="text-emerald-400"><span className="text-slate-500 not-italic">Unique:</span> {match.unique}</span>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            )}
                        </div>

                        {/* Top Queries Listings - Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Top Schools */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-[#d95f02] tracking-wider">Top 20 Schools</h3>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {telemetry.topSchools?.length > 0 ? (
                                        telemetry.topSchools.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 truncate max-w-[130px]" title={item.name}>{i + 1}. {item.name}</span>
                                                <div className="flex gap-2 text-[9px] font-black">
                                                    <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-sm">{item.raw} views</span>
                                                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-sm">{item.unique} u</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No school views recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Top Countries */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-sky-400 tracking-wider">Top 20 Countries</h3>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {telemetry.topCountries?.length > 0 ? (
                                        telemetry.topCountries.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 capitalize truncate max-w-[130px]" title={item.name}>{i + 1}. {item.name}</span>
                                                <div className="flex gap-2 text-[9px] font-black">
                                                    <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-sm">{item.raw} searches</span>
                                                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-sm">{item.unique} u</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No country queries recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Top Regions */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-purple-400 tracking-wider">Top 20 Regions</h3>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {telemetry.topRegions?.length > 0 ? (
                                        telemetry.topRegions.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 capitalize truncate max-w-[130px]" title={item.name}>{i + 1}. {item.name}</span>
                                                <div className="flex gap-2 text-[9px] font-black">
                                                    <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-sm">{item.raw} views</span>
                                                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-sm">{item.unique} u</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No region views recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Top Queries Listings - Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Accessing Countries */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-emerald-400 tracking-wider">Accessing Countries</h3>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {telemetry.topClientCountries?.length > 0 ? (
                                        telemetry.topClientCountries.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 uppercase truncate max-w-[150px]">{item.name}</span>
                                                <div className="flex gap-2 text-[9px] font-black">
                                                    <span className="text-white bg-white/5 px-1.5 py-0.5 rounded-sm">{item.raw} visits</span>
                                                    <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1.5 py-0.5 rounded-sm">{item.unique} u</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No access locations recorded.</p>
                                    )}
                                </div>
                            </div>

                            {/* Checklist Friction */}
                            <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-4">
                                <h3 className="text-xs font-black uppercase text-pink-400 tracking-wider">Checklist Friction</h3>
                                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                                    {telemetry.checklistFriction?.length > 0 ? (
                                        telemetry.checklistFriction.map((item: any, i: number) => (
                                            <div key={i} className="flex justify-between items-center text-[11px] font-bold border-b border-white/5 pb-2">
                                                <span className="text-slate-300 truncate max-w-[180px]" title={item.item}>{item.item}</span>
                                                <span className="text-[#d95f02] font-black">{item.count} checked</span>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-[10px] text-slate-500 italic">No checklist toggles recorded.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 🛰️ SEARCH-ENGINE SPECIFIC TELEMETRY & DIFFERENTIAL JOB STATS */}
                        <div className="bg-[#0b1224] border border-white/10 p-6 rounded-sm space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black uppercase text-[#d95f02] tracking-wider flex items-center gap-2">
                                        <Cpu className="size-4 text-[#d95f02] animate-pulse" /> Search Engine Crawl Telemetry & Differential Stats
                                    </h3>
                                    <p className="text-[10px] text-slate-400">Search-engine-specific performance tracking (+ added, - removed, DB matched grounding rate, and execution speed per engine)</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-2.5 py-1 rounded-sm flex items-center gap-1.5">
                                        <Activity className="size-3" /> Live Telemetry System
                                    </span>
                                </div>
                            </div>

                            {/* ENGINE WARNING PILLS (admin only): red flashes = something broke, amber = probably broken, yellow = quiet for 14 days */}
                            {engineHealth.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2">
                                    {engineHealth.filter((h) => h.level !== "ok").length === 0 ? (
                                        <span className={cn("text-[10px] font-black uppercase tracking-wider", healthyLine().green ? "text-emerald-400" : "text-slate-400")}>{healthyLine().text}</span>
                                    ) : engineHealth.filter((h) => h.level !== "ok").map((h) => (
                                        <span
                                            key={h.engine}
                                            title={`${h.reason}${h.lastGoodDay ? ` Last good day: ${h.lastGoodDay}.` : ""}`}
                                            className={cn(
                                                "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border",
                                                h.level === "red" && "bg-red-600/20 text-red-300 border-red-500/60 animate-pulse",
                                                h.level === "amber" && "bg-amber-500/20 text-amber-300 border-amber-500/60",
                                                h.level === "yellow" && "bg-yellow-400/10 text-yellow-200 border-yellow-400/40"
                                            )}
                                        >
                                            {h.engine.replace(/_/g, " ")}: {h.reason}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* High-Level Differential Summary Cards */}
                            {(() => {
                                const filteredLogs = selectedEngineFilter === 'ALL' ? crawlLogs : crawlLogs.filter(l => l.engine.toUpperCase() === selectedEngineFilter);
                                const totalAdded = filteredLogs.reduce((acc, l) => acc + (l.addedCount || 0), 0);
                                const totalRemoved = filteredLogs.reduce((acc, l) => acc + (l.removedCount || 0), 0);
                                const totalScraped = filteredLogs.reduce((acc, l) => acc + (l.totalFound || 0), 0);
                                const totalMatched = filteredLogs.reduce((acc, l) => acc + (l.dbMatched || 0), 0);
                                const avgDuration = filteredLogs.length > 0 ? (filteredLogs.reduce((acc, l) => acc + (l.durationMs || 0), 0) / filteredLogs.length / 1000).toFixed(1) : "0.0";
                                const netDelta = totalAdded - totalRemoved;
                                const groundingPct = totalScraped > 0 ? Math.round((totalMatched / totalScraped) * 100) : 0;

                                return (
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-sm">
                                            <div className="text-[9px] font-black uppercase text-emerald-400 mb-1 flex items-center gap-1">
                                                <PlusCircle className="size-3" /> Jobs Added (+)
                                            </div>
                                            <div className="text-2xl font-black italic text-emerald-400">+{totalAdded}</div>
                                        </div>
                                        <div className="bg-black/40 border border-rose-500/20 p-4 rounded-sm">
                                            <div className="text-[9px] font-black uppercase text-rose-400 mb-1 flex items-center gap-1">
                                                <MinusCircle className="size-3" /> Jobs Removed (-)
                                            </div>
                                            <div className="text-2xl font-black italic text-rose-400">-{totalRemoved}</div>
                                        </div>
                                        <div className="bg-black/40 border border-purple-500/20 p-4 rounded-sm">
                                            <div className="text-[9px] font-black uppercase text-purple-400 mb-1 flex items-center gap-1">
                                                <TrendingUp className="size-3" /> Net Differential
                                            </div>
                                            <div className={cn("text-2xl font-black italic", netDelta >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                {netDelta >= 0 ? `+${netDelta}` : netDelta}
                                            </div>
                                        </div>
                                        <div className="bg-black/40 border border-sky-500/20 p-4 rounded-sm">
                                            <div className="text-[9px] font-black uppercase text-sky-400 mb-1 flex items-center gap-1">
                                                <Layers className="size-3" /> Grounded DB Matched
                                            </div>
                                            <div className="text-2xl font-black italic text-white">
                                                {totalMatched} <span className="text-[10px] text-slate-500 font-bold not-italic">/ {totalScraped} ({groundingPct}%)</span>
                                            </div>
                                        </div>
                                        <div className="bg-black/40 border border-amber-500/20 p-4 rounded-sm">
                                            <div className="text-[9px] font-black uppercase text-amber-400 mb-1 flex items-center gap-1">
                                                <Clock className="size-3" /> Avg Run Speed
                                            </div>
                                            <div className="text-2xl font-black italic text-amber-400">{avgDuration} <span className="text-[10px] font-bold not-italic">s</span></div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ENGINE FILTER PILLS */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <Terminal className="size-3 text-[#d95f02]" /> Filter Scraper Engine
                                    </h4>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                        {crawlLogs.length} Log Document(s) Loaded
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {["ALL", "GLOBEDUCATE", "ISP", "COGNITA", "INSPIRED", "MALVERN", "TES", "GRC", "GEMS", "TAYLORS", "DIRECT"].map((engineKey) => {
                                        const count = engineKey === "ALL" 
                                            ? crawlLogs.length 
                                            : crawlLogs.filter(l => l.engine.toUpperCase() === engineKey).length;
                                        return (
                                            <button
                                                key={engineKey}
                                                onClick={() => setSelectedEngineFilter(engineKey)}
                                                className={cn(
                                                    "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-sm border transition-all flex items-center gap-1.5",
                                                    selectedEngineFilter === engineKey
                                                        ? "bg-[#d95f02] border-[#d95f02] text-white shadow-lg shadow-[#d95f02]/20"
                                                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                <span>{engineKey}</span>
                                                <span className={cn(
                                                    "px-1.5 py-0.2 text-[8px] rounded-full font-bold",
                                                    selectedEngineFilter === engineKey ? "bg-black/30 text-white" : "bg-white/10 text-slate-400"
                                                )}>
                                                    {count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* DEDICATED SEARCH-ENGINE SPECIFIC TELEMETRY TABLE VIEW */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Globe2 className="size-3 text-sky-400" /> Search Engine Performance Table
                                </h4>
                                <div className="overflow-x-auto border border-white/10 rounded-sm bg-black/40">
                                    <table className="w-full text-left text-[11px] font-sans">
                                        <thead className="bg-[#070d19] border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                            <tr>
                                                <th className="py-3 px-4">Search Engine</th>
                                                <th className="py-3 px-4">Last Execution</th>
                                                <th className="py-3 px-4 text-right">Avg Speed</th>
                                                <th className="py-3 px-4 text-right">Scraped</th>
                                                <th className="py-3 px-4 text-right">Grounded DB</th>
                                                <th className="py-3 px-4 text-right">Grounding %</th>
                                                <th className="py-3 px-4 text-right">Added (+)</th>
                                                <th className="py-3 px-4 text-right">Removed (-)</th>
                                                <th className="py-3 px-4 text-right">Net Delta</th>
                                                <th className="py-3 px-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                                            {(() => {
                                                const allEngines = ["GLOBEDUCATE", "ISP", "COGNITA", "INSPIRED", "MALVERN", "TES", "GRC", "GEMS", "TAYLORS", "DIRECT"];
                                                const displayEngines = selectedEngineFilter === 'ALL' 
                                                    ? allEngines 
                                                    : allEngines.filter(e => e === selectedEngineFilter);

                                                return displayEngines.map((engineKey) => {
                                                    const engineLogs = crawlLogs.filter(l => l.engine.toUpperCase() === engineKey);
                                                    const latestLog = engineLogs[0];

                                                    const totalScraped = engineLogs.reduce((a, b) => a + b.totalFound, 0);
                                                    const totalMatched = engineLogs.reduce((a, b) => a + b.dbMatched, 0);
                                                    const totalAdded = engineLogs.reduce((a, b) => a + b.addedCount, 0);
                                                    const totalRemoved = engineLogs.reduce((a, b) => a + b.removedCount, 0);
                                                    const avgSpeed = engineLogs.length > 0 ? (engineLogs.reduce((a, b) => a + b.durationMs, 0) / engineLogs.length / 1000).toFixed(1) : "-";
                                                    const groundingPct = totalScraped > 0 ? Math.round((totalMatched / totalScraped) * 100) : 0;
                                                    const netDelta = totalAdded - totalRemoved;

                                                    return (
                                                        <tr key={engineKey} className="hover:bg-white/5 transition-all">
                                                            <td className="py-3 px-4 font-black uppercase text-purple-400 flex items-center gap-2">
                                                                <span className="size-2 rounded-full bg-purple-500 animate-pulse" />
                                                                {engineKey}
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-400 font-sans">
                                                                {latestLog ? new Date(latestLog.createdAt).toLocaleString() : <span className="text-slate-600 italic">No runs recorded</span>}
                                                            </td>
                                                            <td className="py-3 px-4 text-right text-amber-400">{avgSpeed !== "-" ? `${avgSpeed}s` : "-"}</td>
                                                            <td className="py-3 px-4 text-right text-slate-300 font-bold">{totalScraped}</td>
                                                            <td className="py-3 px-4 text-right text-sky-400 font-bold">{totalMatched}</td>
                                                            <td className="py-3 px-4 text-right text-slate-300 font-sans">
                                                                <span className={cn(
                                                                    "px-2 py-0.5 rounded-sm font-bold text-[9px]",
                                                                    groundingPct >= 60 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : groundingPct > 0 ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-white/5 text-slate-500"
                                                                )}>
                                                                    {groundingPct}%
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right font-black text-emerald-400">+{totalAdded}</td>
                                                            <td className="py-3 px-4 text-right font-black text-rose-400">-{totalRemoved}</td>
                                                            <td className="py-3 px-4 text-right font-black">
                                                                <span className={cn("px-2 py-0.5 rounded-sm text-[9px]", netDelta > 0 ? "bg-emerald-500/10 text-emerald-400" : netDelta < 0 ? "bg-rose-500/10 text-rose-400" : "bg-white/5 text-slate-400")}>
                                                                    {netDelta >= 0 ? `+${netDelta}` : netDelta}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-center">
                                                                {(() => {
                                                                    const config = CRAWLER_TIMETABLE[engineKey];
                                                                    const isRecentRun = latestLog && (Date.now() - new Date(latestLog.createdAt).getTime()) < 12 * 3600 * 1000;

                                                                    if (isRecentRun) {
                                                                        return (
                                                                            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-sm border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
                                                                                ACTIVE
                                                                            </span>
                                                                        );
                                                                    }

                                                                    if (config?.utcStartWindow) {
                                                                        return (
                                                                            <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-sm border bg-sky-500/10 border-sky-500/30 text-sky-400" title={`Scheduled Daily Window: ${config.utcStartWindow} - ${config.utcEndWindow} UTC (${config.peakSchedule})`}>
                                                                                TIMED ({config.utcStartWindow} UTC)
                                                                            </span>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <span className="px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-sm border bg-white/5 border-white/10 text-slate-400">
                                                                            TIMETABLED
                                                                        </span>
                                                                    );
                                                                })()}
                                                            </td>
                                                        </tr>
                                                    );
                                                });
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* RECENT HISTORICAL ENGINE EXECUTION LOGS STREAM */}
                            <div className="space-y-3 pt-2 border-t border-white/5">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Terminal className="size-3 text-[#d95f02]" /> Raw Engine Execution Log Stream
                                </h4>
                                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-white/5 rounded-sm bg-black/30">
                                    {loadingCrawlLogs ? (
                                        <div className="p-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                                            <Loader2 className="size-4 animate-spin text-[#d95f02]" /> Loading Crawler Logs...
                                        </div>
                                    ) : crawlLogs.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500 text-xs italic">
                                            No crawler telemetry logs recorded yet.
                                        </div>
                                    ) : (
                                        <table className="w-full text-left text-[11px] font-sans">
                                            <thead className="sticky top-0 bg-[#070d19] border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                                <tr>
                                                    <th className="py-2.5 px-4">Engine</th>
                                                    <th className="py-2.5 px-4">Timestamp</th>
                                                    <th className="py-2.5 px-4 text-right">Duration</th>
                                                    <th className="py-2.5 px-4 text-right">Scraped</th>
                                                    <th className="py-2.5 px-4 text-right">DB Grounded</th>
                                                    <th className="py-2.5 px-4 text-right">Added (+)</th>
                                                    <th className="py-2.5 px-4 text-right">Removed (-)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                                                {crawlLogs
                                                    .filter(l => selectedEngineFilter === 'ALL' || l.engine.toUpperCase() === selectedEngineFilter)
                                                    .map((log) => (
                                                        <tr key={log.id} className="hover:bg-white/5 transition-all">
                                                            <td className="py-2 px-4 font-black uppercase text-purple-400">{log.engine}</td>
                                                            <td className="py-2 px-4 text-slate-400 font-sans">{new Date(log.createdAt).toLocaleString()}</td>
                                                            <td className="py-2 px-4 text-right text-amber-400">{(log.durationMs / 1000).toFixed(2)}s</td>
                                                            <td className="py-2 px-4 text-right text-slate-300">{log.totalFound}</td>
                                                            <td className="py-2 px-4 text-right text-sky-400 font-bold">{log.dbMatched}</td>
                                                            <td className="py-2 px-4 text-right font-black text-emerald-400">+{log.addedCount}</td>
                                                            <td className="py-2 px-4 text-right font-black text-rose-400">-{log.removedCount}</td>
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                        </div>
                    );
                })()}
            </div>
        )}

        {/* TAB 7: MEMBERS DIRECTORY & REGISTRY */}
        {activeTab === 'members' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                {/* MEMBERS OVERVIEW & METRICS */}
                <div className="bg-[#0b1224] border border-emerald-500/30 rounded-sm p-6 space-y-6 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    <UserCheck className="size-3" /> Grounded Member Ledger
                                </span>
                                <h2 className="text-xl font-black uppercase tracking-widest text-white italic">
                                    Educator Membership Registry
                                </h2>
                            </div>
                            <p className="text-xs text-slate-400">
                                Real-time directory of all registered educator accounts, curriculum specialisms, license credentials, and intelligence allowances.
                            </p>
                        </div>
                        <button 
                            onClick={loadMembers} 
                            disabled={loadingMembers}
                            className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-sm transition-all flex items-center gap-2"
                        >
                            {loadingMembers ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
                            Refresh Members
                        </button>
                    </div>

                    {/* MEMBER METRIC SUMMARY CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
                        <div className="bg-black/50 border border-white/10 p-4 rounded-sm">
                            <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                                <Users className="size-3.5 text-sky-400" /> Total Members
                            </div>
                            <div className="text-2xl font-black text-white">{members.length}</div>
                            <div className="text-[9px] text-slate-500 mt-1 font-sans">Active Auth & Firestore profiles</div>
                        </div>

                        <div className="bg-black/50 border border-white/10 p-4 rounded-sm">
                            <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                                <Award className="size-3.5 text-emerald-400" /> Verified K-12 Licenses
                            </div>
                            <div className="text-2xl font-black text-emerald-400">
                                {members.filter(m => m.hasLicense).length}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 font-sans">
                                {members.length > 0 ? Math.round((members.filter(m => m.hasLicense).length / members.length) * 100) : 0}% verification rate
                            </div>
                        </div>

                        <div className="bg-black/50 border border-white/10 p-4 rounded-sm">
                            <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                                <ShieldCheck className="size-3.5 text-purple-400" /> Admin / Staff
                            </div>
                            <div className="text-2xl font-black text-purple-400">
                                {members.filter(m => m.tier === 'admin').length}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 font-sans">Elevated platform access</div>
                        </div>

                        <div className="bg-black/50 border border-white/10 p-4 rounded-sm">
                            <div className="text-[9px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1.5">
                                <Sparkles className="size-3.5 text-amber-400" /> Shootouts Allocated
                            </div>
                            <div className="text-2xl font-black text-amber-400">
                                {members.reduce((acc, m) => acc + (m.evaluationsAllowance || 20), 0)}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-1 font-sans">
                                {members.reduce((acc, m) => acc + (m.evaluationsUsed || 0), 0)} shootouts completed
                            </div>
                        </div>
                    </div>

                    {/* SEARCH AND FILTER BAR */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2">
                        <div className="relative w-full md:w-96">
                            <Search className="size-4 text-slate-500 absolute left-3.5 top-3" />
                            <input
                                type="text"
                                placeholder="Search teacher ID, name, email, curriculum, city..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full bg-black/60 border border-white/10 pl-10 pr-4 h-10 rounded-sm text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/60"
                            />
                            {memberSearchQuery && (
                                <button onClick={() => setMemberSearchQuery('')} className="absolute right-3 top-3 text-[9px] font-black uppercase text-slate-500 hover:text-white">
                                    Clear
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            {(['ALL', 'free', 'admin'] as const).map((tier) => (
                                <button
                                    key={tier}
                                    onClick={() => setMemberTierFilter(tier)}
                                    className={cn(
                                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-sm border transition-all",
                                        memberTierFilter === tier
                                            ? "bg-emerald-600 border-emerald-500 text-white"
                                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                                    )}
                                >
                                    {tier === 'ALL' ? 'All Tiers' : tier.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* MEMBERS DATA TABLE */}
                    <div className="overflow-x-auto border border-white/10 rounded-sm bg-black/40">
                        <table className="w-full text-left text-[11px] font-sans">
                            <thead className="bg-[#070d19] border-b border-white/10 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                <tr>
                                    <th className="py-3 px-4">Educator / Teacher ID</th>
                                    <th className="py-3 px-4">Email</th>
                                    <th className="py-3 px-4">Curriculum & Base</th>
                                    <th className="py-3 px-4 text-center">License & Tier</th>
                                    <th className="py-3 px-4 text-center">Shootout Allowance</th>
                                    <th className="py-3 px-4 text-right">Date Joined</th>
                                    <th className="py-3 px-4 text-right">Last Sign-in</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 font-mono text-[10px]">
                                {(() => {
                                    const q = memberSearchQuery.toLowerCase().trim();
                                    const filtered = members.filter((m) => {
                                        const matchesTier = memberTierFilter === 'ALL' || m.tier === memberTierFilter;
                                        if (!matchesTier) return false;
                                        if (!q) return true;
                                        return (
                                            (m.teacherId && m.teacherId.toLowerCase().includes(q)) ||
                                            (m.name && m.name.toLowerCase().includes(q)) ||
                                            (m.email && m.email.toLowerCase().includes(q)) ||
                                            (m.curriculum && m.curriculum.toLowerCase().includes(q)) ||
                                            (m.city && m.city.toLowerCase().includes(q))
                                        );
                                    });

                                    if (loadingMembers) {
                                        return (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-500 font-sans">
                                                    <Loader2 className="size-5 animate-spin mx-auto mb-2 text-emerald-400" />
                                                    <span className="text-xs uppercase font-bold tracking-wider">Loading Member Registry...</span>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    if (filtered.length === 0) {
                                        return (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-500 font-sans italic text-xs">
                                                    No member accounts matched query "{memberSearchQuery}".
                                                </td>
                                            </tr>
                                        );
                                    }

                                    return filtered.map((member) => (
                                        <tr key={member.uid} className="hover:bg-white/5 transition-all">
                                            {/* Educator / Teacher ID */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
                                                        {member.teacherId || '—'}
                                                    </span>
                                                    <span className="font-bold text-white font-sans truncate max-w-[140px]" title={member.name}>
                                                        {member.name}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="py-3 px-4 font-sans">
                                                <span className="text-slate-300 truncate max-w-[180px] block" title={member.email}>
                                                    {member.email}
                                                </span>
                                            </td>

                                            {/* Curriculum & Base */}
                                            <td className="py-3 px-4 font-sans">
                                                <div className="space-y-0.5">
                                                    <span className="text-white font-bold block">{member.curriculum}</span>
                                                    <span className="text-slate-400 text-[10px] block">{member.city}</span>
                                                </div>
                                            </td>

                                            {/* License & Tier */}
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={cn(
                                                        "px-2 py-0.5 text-[8px] font-black uppercase rounded tracking-wider",
                                                        member.tier === 'admin' 
                                                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                                                            : "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                                                    )}>
                                                        {member.tier}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[8px] font-bold uppercase",
                                                        member.hasLicense ? "text-emerald-400" : "text-slate-500"
                                                    )}>
                                                        {member.hasLicense ? "✓ K-12 License" : "Self-Declared"}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Shootout Allowance */}
                                            <td className="py-3 px-4 text-center font-sans">
                                                <div className="space-y-1">
                                                    <span className="text-xs font-mono font-black text-white">
                                                        {member.evaluationsUsed} / {member.evaluationsAllowance}
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                                        <div 
                                                            className="h-full bg-emerald-500" 
                                                            style={{ 
                                                                width: `${Math.min(100, (member.evaluationsUsed / (member.evaluationsAllowance || 20)) * 100)}%` 
                                                            }} 
                                                        />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Date Joined */}
                                            <td className="py-3 px-4 text-right text-slate-300 font-sans">
                                                {member.createdAtFormatted}
                                            </td>

                                            {/* Last Sign-in */}
                                            <td className="py-3 px-4 text-right text-slate-400 font-sans">
                                                {member.lastSignInFormatted}
                                            </td>
                                        </tr>
                                    ));
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}