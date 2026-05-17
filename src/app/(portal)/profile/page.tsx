"use client";

import { useState, useEffect } from 'react';
import { useUser, useDoc, setDocumentNonBlocking } from '@/firebase';
import { auth } from "@/firebase/utils/memo"; // 🛰️ Added for reset protocol
import { sendPasswordResetEmail } from "firebase/auth"; // 🛰️ Added for reset protocol
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Fingerprint, MapPin, Calendar, 
  Users, ShieldCheck, Edit3, Save, X,
  KeyRound, Mail, CheckCircle2, AlertCircle // 🛡️ Tactical icons added
} from 'lucide-react';
import { cn } from '@/lib/utils';

const AGE_RANGES = ["25-34", "35-49", "50-54", "55-60", "61-64", "65+"];
const FAMILY_STATUS = ["Single", "Family", "Family +1", "Family +2", "Family +3"];
const REGIONS = ["SE Asia", "East Asia", "Middle East", "Europe", "Africa", "Americas"];

export default function ProfilePage() {
    const { customId, isAdmin, loading: authLoading } = useUser();
    const [mounted, setMounted] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editBuffer, setEditBuffer] = useState<any>(null);
    
    // 🛰️ Reset Protocol States
    const [resetLoading, setResetLoading] = useState(false);
    const [resetStatus, setResetStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    // 🕵️ TARGETING: Fetching from teachers/FLI007 directly
    const { data: teacher, isLoading: dataLoading } = useDoc<any>(
        customId ? `teachers/${customId}` : null
    );

    useEffect(() => { 
        setMounted(true); 
        if (teacher) {
            setEditBuffer(teacher);
        }
    }, [teacher]);

    const handleSave = async () => {
        if (!customId) return;
        setIsSaving(true);
        await setDocumentNonBlocking('teachers', customId, editBuffer);
        setIsEditing(false);
        setIsSaving(false);
    };

    // 🛰️ SECURITY PROTOCOL: Dispatching the encrypted reset link
    const handleResetPassword = async () => {
        const userEmail = auth.currentUser?.email;
        if (!userEmail) return;

        setResetLoading(true);
        setResetStatus(null);
        try {
            await sendPasswordResetEmail(auth, userEmail);
            setResetStatus({ type: 'success', msg: "RECOVERY LINK DISPATCHED TO SECURE INBOX" });
        } catch (error) {
            setResetStatus({ type: 'error', msg: "DISPATCH FAILED. CHECK UPLINK" });
        } finally {
            setResetLoading(false);
        }
    };

    if (authLoading || !mounted) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#020617]">
                <Loader2 className="animate-spin text-[#f97316] size-10" />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12 bg-[#020617] min-h-screen text-white">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* 🛡️ DOSSIER HEADER */}
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b border-white/10 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="size-24 bg-gradient-to-br from-[#0b1224] to-[#1f2937] border-2 border-[#f97316]/50 rounded-full flex items-center justify-center shadow-2xl relative">
                           {isAdmin ? <ShieldCheck className="size-12 text-[#f97316]" /> : <Fingerprint className="size-12 text-[#007FFF]" />}
                        </div>
                        <div>
                            {isEditing ? (
                                <Input 
                                    value={editBuffer?.fullName || ""} 
                                    onChange={(e) => setEditBuffer({...editBuffer, fullName: e.target.value})}
                                    className="bg-black/40 border-[#f97316]/50 text-2xl font-black italic uppercase rounded-none h-12 w-full md:w-96"
                                    placeholder="OPERATIVE NAME"
                                />
                            ) : (
                                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                                    {teacher?.fullName || "Unidentified Operative"}
                                </h1>
                            )}
                            <div className="flex items-center gap-3 mt-3">
                                <Badge variant="outline" className="border-[#f97316] text-[#f97316] font-black italic px-4 py-1">
                                    {customId || "AWAITING DESIGNATION"}
                                </Badge>
                                {isAdmin && <Badge className="bg-[#f97316] text-white font-black uppercase text-[10px] tracking-widest px-3 py-0.5">Level 4 Admin</Badge>}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button onClick={() => setIsEditing(false)} variant="ghost" className="text-slate-500 hover:text-white uppercase font-black text-xs tracking-widest"><X className="mr-2 size-4" /> Abort</Button>
                                <Button onClick={handleSave} disabled={isSaving} className="bg-[#f97316] hover:bg-white hover:text-black rounded-none font-black uppercase text-xs tracking-widest h-10 px-6">
                                    {isSaving ? <Loader2 className="animate-spin size-4" /> : <><Save className="mr-2 size-4" /> Commit Changes</>}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} variant="outline" className="border-white/10 hover:border-[#f97316] hover:text-[#f97316] bg-transparent rounded-none uppercase font-black text-[10px] tracking-[0.2em] h-10 px-6">
                                <Edit3 className="mr-2 size-3" /> Modify Dossier
                            </Button>
                        )}
                    </div>
                </div>

                {/* 📊 CORE INTELLIGENCE GRID */}
                {dataLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-500" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* STATUS CARD */}
                        <Card className="bg-[#0b1224] border-white/5 relative overflow-hidden group">
                            {isEditing && <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316]" />}
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <Users className="size-4 text-sky-400" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-1 mt-2">
                                        {FAMILY_STATUS.map(v => (
                                            <button key={v} onClick={() => setEditBuffer({...editBuffer, familyStatus: v})} className={cn("py-2 text-[8px] font-bold border transition-all uppercase", editBuffer?.familyStatus === v ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{v.replace('Family ', '')}</button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xl font-black italic">{teacher?.familyStatus || "N/A"}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* AGE GROUP CARD */}
                        <Card className="bg-[#0b1224] border-white/5 relative overflow-hidden">
                            {isEditing && <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316]" />}
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <Calendar className="size-4 text-emerald-400" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Age Group</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    <div className="grid grid-cols-3 gap-1 mt-2">
                                        {AGE_RANGES.map(v => (
                                            <button key={v} onClick={() => setEditBuffer({...editBuffer, age: v})} className={cn("py-2 text-[8px] font-bold border transition-all", editBuffer?.age === v ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}>{v}</button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xl font-black italic">{teacher?.age || teacher?.ageGroup || "N/A"}</p>
                                )}
                            </CardContent>
                        </Card>

                        {/* TARGET ZONES CARD */}
                        <Card className="bg-[#0b1224] border-white/5 relative overflow-hidden">
                            {isEditing && <div className="absolute top-0 left-0 w-1 h-full bg-[#f97316]" />}
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <MapPin className="size-4 text-rose-400" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Zones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    <div className="grid grid-cols-2 gap-1 mt-2">
                                        {REGIONS.map(r => (
                                            <button 
                                                key={r} 
                                                onClick={() => {
                                                    const current = editBuffer?.preferredCountries || editBuffer?.regions || [];
                                                    const next = current.includes(r) ? current.filter((i: string) => i !== r) : [...current, r].slice(-2);
                                                    setEditBuffer({...editBuffer, preferredCountries: next});
                                                }} 
                                                className={cn("py-2 text-[8px] font-bold border transition-all uppercase", (editBuffer?.preferredCountries || editBuffer?.regions || []).includes(r) ? "bg-[#f97316] border-[#f97316] text-white" : "bg-white/5 border-white/10 text-slate-600 hover:text-white")}
                                            >
                                                {r}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {(teacher?.preferredCountries || teacher?.regions)?.length > 0 ? (teacher.preferredCountries || teacher.regions).map((c: string) => (
                                            <span key={c} className="text-xs font-bold text-white/80 italic">{c}</span>
                                        )) : <span className="text-xs italic text-slate-500">No zones specified</span>}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* 🔐 SECURITY PROTOCOLS SECTION */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="bg-white/5 border border-white/5 p-8 shadow-2xl">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-[#f97316]/10 border border-[#f97316]/20">
                                    <KeyRound className="size-6 text-[#f97316]" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase italic tracking-tight text-white leading-none">Security Protocols</h3>
                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-2 flex items-center gap-2">
                                        <Mail className="size-3" /> {auth.currentUser?.email || "Uplink Secure"}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="w-full md:w-auto">
                                <Button 
                                    onClick={handleResetPassword}
                                    disabled={resetLoading}
                                    className="w-full md:w-auto bg-[#007FFF] hover:bg-white hover:text-black rounded-none font-black uppercase text-[10px] tracking-[0.2em] h-12 px-8 transition-all"
                                >
                                    {resetLoading ? <Loader2 className="animate-spin size-4" /> : "Request Password Reset"}
                                </Button>
                            </div>
                        </div>

                        {/* Status Feedback Banner */}
                        {resetStatus && (
                            <div className={cn(
                                "mt-6 p-4 border-l-4 text-[10px] font-black tracking-widest uppercase animate-in fade-in slide-in-from-top-2",
                                resetStatus.type === 'success' ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" : "bg-rose-500/10 border-rose-500 text-rose-500"
                            )}>
                                <div className="flex items-center gap-3">
                                    {resetStatus.type === 'success' ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                                    {resetStatus.msg}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}