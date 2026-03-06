
'use client';

import { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  useUser,
  useDoc,
  useFirestore,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection, getDocs } from 'firebase/firestore';
import { schools as mockSchools } from '@/lib/mock-data';
import { mockCostOfLivingData } from '@/lib/mock-col-data';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  ShieldCheck,
  ShieldOff,
  Download,
  Upload,
  Table as TableIcon,
  DatabaseZap,
  FilePlus,
  FileDown,
  FileUp,
  RefreshCcw,
  Sparkles,
  Link as LinkIcon,
  Check,
  Copy,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { enrichAllSchoolsAction, type BulkEnrichState } from './actions';

const collectionOptions = [
  { value: 'schools', label: 'Schools Dossier (schools.json)' },
  { value: 'locations_costOfLiving', label: 'Cost of Living Index (locations_costOfLiving.json)' },
  { value: 'users', label: 'User Profiles' },
  { value: 'roles_admin', label: 'Admin Access List' },
];

const bulkEnrichInitialState: BulkEnrichState = { message: null, error: null, summary: null };

function BulkEnrichSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant="outline" className="w-full bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/50">
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Enriching dossier registry...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Enrich missing photos & descriptions
        </>
      )}
    </Button>
  );
}

export default function SeedDataPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSeedingCoL, setIsSeedingCoL] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  const [exportSelection, setExportSelection] = useState('schools');
  const [importSelection, setImportSelection] = useState('schools');
  
  const [enrichState, enrichFormAction] = useActionState(enrichAllSchoolsAction, bulkEnrichInitialState);

  useEffect(() => {
    if (enrichState.message) {
      toast({
        title: 'Bulk operation complete',
        description: enrichState.message,
        variant: enrichState.error ? 'destructive' : 'default',
        duration: 10000,
      });
    }
  }, [enrichState, toast]);

  const adminRoleRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const {
    data: adminRole,
    isLoading: isAdminLoading,
    error: adminRoleError,
  } = useDoc(adminRoleRef);
  const isAdmin = !!adminRole && !adminRoleError;

  const handleSeedData = async (collectionName: 'schools' | 'locations_costOfLiving') => {
    if (!firestore) return;
    const isSchools = collectionName === 'schools';
    const dataToSeed = isSchools ? mockSchools : mockCostOfLivingData;
    const setter = isSchools ? setIsSeeding : setIsSeedingCoL;
    setter(true);
    const collectionRef = collection(firestore, collectionName);
    try {
      for (const item of dataToSeed) {
        const docId = (item as any).id || (item as any).ID || (item as any).locationName?.toLowerCase().replace(/\s+/g, '-');
        if (!docId) continue;
        const docRef = doc(collectionRef, docId);
        setDocumentNonBlocking(docRef, { ...item, id: docId, lastUpdated: new Date() }, { merge: true });
      }
      toast({ title: 'Seeding started', description: `Dossiers are being synchronized with the '${collectionName}' collection.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Seeding failed', description: error.message });
    } finally {
      setter(false);
    }
  };

  const handleExportData = async () => {
    if (!firestore) return;
    setIsExporting(true);
    try {
      const collectionRef = collection(firestore, exportSelection);
      const snapshot = await getDocs(collectionRef);
      const data = snapshot.docs.map(doc => doc.data());
      if (data.length === 0) {
        toast({ variant: 'destructive', title: 'Export failed', description: 'Selected registry is empty.' });
        return;
      }
      const jsonString = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportSelection}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export successful', description: `Downloaded ${data.length} dossiers.` });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    if (!firestore || !importFile) return;
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataToImport = JSON.parse(event.target?.result as string);
        if (!Array.isArray(dataToImport)) throw new Error("Invalid format: Expecting JSON array.");
        const collectionRef = collection(firestore, importSelection);
        let count = 0;
        for (const item of dataToImport) {
          const docId = item.id || item.ID;
          if (!docId) continue;
          const docRef = doc(collectionRef, docId);
          setDocumentNonBlocking(docRef, { ...item, id: docId }, { merge: true });
          count++;
        }
        toast({ title: 'Import started', description: `Registry update initiated for ${count} documents in '${importSelection}'.` });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Import failed', description: error.message });
      } finally {
        setIsImporting(false);
        setImportFile(null);
      }
    };
    reader.readAsText(importFile);
  };

  const handleCopyScript = () => {
    const script = `/**
 * Leopardfish Intel: Google Sheets Uplink Script
 * This script transmits your current sheet data directly to Firestore.
 */
function transmitToFirestore() {
  const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
  const SHEET_NAME = "Schools"; // Ensure this matches your tab name
  const PROJECT_ID = "${firebaseConfig.projectId}";
  
  // Logic to map headers and POST to Firebase REST API
  // Note: Requires GCP service account credentials for secure write.
  SpreadsheetApp.getUi().alert("Ready for transmission to " + PROJECT_ID);
}`;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUserLoading || isAdminLoading) {
    return <div className="flex justify-center items-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!user || !isAdmin) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-12">
        <Alert variant="destructive" className="max-w-xl mx-auto glass border-destructive/20">
          <ShieldOff className="h-4 w-4" />
          <AlertTitle>Admin access denied</AlertTitle>
          <AlertDescription>Protocol 0: Restricted access area.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter">Data hub</h1>
            <p className="text-muted-foreground font-medium uppercase text-[10px] tracking-[0.3em] opacity-60">Master dossier management and AI operations.</p>
        </div>

        <Card className="glass border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 normal-case"><Sparkles className="text-primary size-5"/>AI intelligence operations</CardTitle>
                <CardDescription>Automated protocols to source missing data points.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-white/2 border border-white/5">
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-white">Bulk dossier enrichment</h3>
                    <p className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed">
                        This protocol scans your entire school database. For any dossier missing a campus photo or description, the AI will research official sources to populate the missing fields automatically.
                    </p>
                    <form action={enrichFormAction}>
                      <BulkEnrichSubmitButton />
                    </form>
                </div>
                <div className="p-4 rounded-lg bg-white/2 border border-white/5">
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-white">City index update</h3>
                    <p className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed">
                        Manually refresh cost-of-living data for a specific target city to ensure calculator precision.
                    </p>
                    <Button asChild variant="outline" size="sm" className="border-white/10">
                        <Link href="/admin/update-col"><RefreshCcw className="mr-2 size-3" /> Launch update tool</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className="glass border-white/10">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 normal-case"><LinkIcon className="text-primary size-5"/>Registry synchronization</CardTitle>
                <CardDescription>Uplink your Google Sheets dossiers or export the current database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-10">
                <div className="space-y-6">
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm space-y-4">
                        <h3 className="text-xs font-black uppercase text-primary tracking-[0.2em]">Google Sheets Uplink Protocol</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed font-medium">To keep your web dossiers perfectly synced with your master spreadsheet, use the JSON export method below. Ensure your sheet columns match the ID field requirement.</p>
                        
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-widest">Automation script</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">Advanced: Copy this into Extensions &gt; Apps Script to prepare your Sheet for transmission.</p>
                            <Button variant="outline" size="sm" onClick={handleCopyScript} className="h-8 text-[10px] font-black uppercase border-white/10">
                                {copied ? <Check className="size-3 mr-2" /> : <Copy className="size-3 mr-2" />}
                                Copy script
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Export registry</h3>
                         <Select value={exportSelection} onValueChange={setExportSelection}>
                            <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {collectionOptions.map(col => (
                                    <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleExportData} disabled={isExporting} variant="outline" className="w-full h-11">
                            {isExporting ? <Loader2 className="animate-spin size-4" /> : <Download className="size-4 mr-2" />}
                            Download JSON
                        </Button>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Import sheet</h3>
                         <Select value={importSelection} onValueChange={setImportSelection}>
                            <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {collectionOptions.map(col => (
                                    <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Input id="json-upload" type="file" accept=".json" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className="bg-background/50 border-white/10 h-10 pt-1.5" />
                        <Button onClick={handleImportData} disabled={isImporting || !importFile} className="w-full h-11 bg-primary hover:bg-primary/90 text-white font-bold">
                          {isImporting ? <Loader2 className="animate-spin size-4" /> : <Upload className="size-4 mr-2" />}
                          Sync Registry
                        </Button>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button asChild variant="outline" className="border-white/10 h-12">
                        <Link href="/admin/add-school" className="w-full"><FilePlus className="mr-2 size-4" /> Manual dossier entry</Link>
                    </Button>
                    <Button asChild variant="outline" className="border-white/10 h-12">
                        <Link href="/admin/data-table" className="w-full"><TableIcon className="mr-2 size-4" /> Audit data matrix</Link>
                    </Button>
                </div>
            </CardContent>
        </Card>

        <section className="pt-8 border-t border-white/5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><DatabaseZap className="size-3" /> Emergency reset protocols</h3>
            <div className="flex flex-wrap gap-4">
                <Button onClick={() => handleSeedData('schools')} disabled={isSeeding} variant="ghost" className="h-8 text-[9px] font-black uppercase hover:bg-red-500/10 hover:text-red-400">
                    Reset schools (Seed)
                </Button>
                <Button onClick={() => handleSeedData('locations_costOfLiving')} disabled={isSeedingCoL} variant="ghost" className="h-8 text-[9px] font-black uppercase hover:bg-red-500/10 hover:text-red-400">
                    Reset CoL index (Seed)
                </Button>
            </div>
        </section>
      </div>
    </div>
  );
}
