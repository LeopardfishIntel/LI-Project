"use client";

import { useState, useEffect } from 'react';
import { useUser, useDoc } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Fingerprint, MapPin, Calendar, Users, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
    const { customId, isAdmin, loading: authLoading } = useUser();
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // 🕵️ FETCH THE ACTUAL 007 DATA
    const { data: agent, isLoading: dataLoading } = useDoc<any>(
        mounted && customId ? `teachers/${customId}` : null
    );

    if (authLoading || !mounted) {
        return <div className="h-screen flex items-center justify-center bg-[#020617]"><Loader2 className="animate-spin text-[#f97316] size-10" /></div>;
    }

    return (
        <div className="container mx-auto px-4 py-12 bg-[#020617] min-h-screen text-white">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* 🛡️ DOSSIER HEADER */}
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between border-b border-white/10 pb-8">
                    <div className="flex items-center gap-6">
                        <div className="size-24 bg-gradient-to-br from-[#0b1224] to-[#1f2937] border-2 border-[#f97316]/50 rounded-full flex items-center justify-center shadow-2xl">
                           {isAdmin ? <ShieldCheck className="size-12 text-[#f97316]" /> : <Fingerprint className="size-12 text-[#007FFF]" />}
                        </div>
                        <div>
                            <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
                                {agent?.fullName || "Unidentified Operative"}
                            </h1>
                            <div className="flex items-center gap-3 mt-2">
                                <Badge variant="outline" className="border-[#f97316] text-[#f97316] font-black italic">
                                    {customId || "AWAITING ID"}
                                </Badge>
                                {isAdmin && <Badge className="bg-[#f97316] text-white">Level 4 Admin</Badge>}
                                {agent?.isVerifiedTeacher && <Badge className="bg-[#007FFF]">Verified Agent</Badge>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 📊 CORE INTELLIGENCE */}
                {dataLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="animate-spin text-slate-500" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="bg-[#0b1224] border-white/5">
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <Users className="size-4 text-sky-400" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-black italic">{agent?.familyStatus || "N/A"}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0b1224] border-white/5">
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <Calendar className="size-4 text-emerald-400" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Age Group</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xl font-black italic">{agent?.ageGroup || "N/A"}</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-[#0b1224] border-white/5">
                            <CardHeader className="flex flex-row items-center gap-2 pb-2">
                                <MapPin className="size-4 text-rose-400" />
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-500">Target Zones</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {agent?.preferredCountries?.length > 0 ? agent.preferredCountries.map((c: string) => (
                                        <span key={c} className="text-xs font-bold text-white/80">{c}</span>
                                    )) : <span className="text-xs italic text-slate-500">No zones specified</span>}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}