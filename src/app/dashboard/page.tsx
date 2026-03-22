 "use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ShieldCheck, Users, Zap } from 'lucide-react';

/**
 * COMMAND CENTER DASHBOARD
 * Status: Repaired for Build Stability
 */
export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#020617] p-8 uppercase font-black italic">
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="border-b border-white/10 pb-8">
          <h1 className="text-6xl md:text-8xl tracking-tighter text-white leading-none">
            Command Center
          </h1>
          <p className="text-primary text-xs tracking-[0.5em] mt-4 opacity-80">
            Strategic Intelligence & Field Operations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="bg-[#1f2937]/50 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-[#94a3b8]">System Status</CardTitle>
              <ShieldCheck className="size-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-white">Operational</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1f2937]/50 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-[#94a3b8]">Active Intel</CardTitle>
              <Zap className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-white">Live Feed</div>
            </CardContent>
          </Card>

          <Card className="bg-[#1f2937]/50 border-white/10 backdrop-blur-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm text-[#94a3b8]">Field Agents</CardTitle>
              <Users className="size-4 text-[#007FFF]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl text-white">Registry Online</div>
            </CardContent>
          </Card>
        </div>

        <div className="p-12 border-2 border-dashed border-white/5 rounded-sm flex flex-col items-center justify-center text-center space-y-4">
          <div className="text-[#94a3b8] text-[10px] tracking-[0.3em]">Operational Readiness Achieved</div>
          <p className="text-white/40 text-xs italic">
            Intelligence modules and operative directories are currently being synchronized with the primary registry.
          </p>
        </div>
      </div>
    </main>
  );
}