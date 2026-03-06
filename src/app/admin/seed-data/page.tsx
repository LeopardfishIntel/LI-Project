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
  Copy,
  Check,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { enrichAllSchoolsAction, type BulkEnrichState, seedStudentLoanConfig } from './actions';
import { firebaseConfig } from '@/firebase/config';

const collectionOptions = [
  { value: 'schools', label: 'Schools Dossier (schools.json)' },
  { value: 'locations_costOfLiving', label: 'Cost of Living Index (locations_costOfLiving.json)' },
  { value: 'users', label: 'User Profiles' },
  { value: 'forum_posts', label: 'Forum Content' },
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
          Enriching All Schools...
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Enrich Incomplete Schools
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
  const [isSeedingConfig, setIsSeedingConfig] = useState(false);
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
        title: 'Bulk Enrichment Complete',
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

  const handleCopyScript = () => {
    const script = `/**
 * Leopardfish Intel: Google Sheets Sync Script
 * Instructions: 
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code and update your FIREBASE_PROJECT_ID.
 */

const FIREBASE_PROJECT_ID = "${firebaseConfig.projectId}";

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('L.F.I. Sync')
    .addItem('Push to Registry', 'pushToFirestore')
    .addToUi();
}

function pushToFirestore() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const entries = [];

  for (let i = 1; i < data.length; i++) {
    let entry = {};
    headers.forEach((header, index) => {
      // Handle the field mapping here to match Firebase schema
      const key = header.toLowerCase().replace(/\\s+/g, '_');
      entry[key] = data[i][index];
    });
    entries.push(entry);
  }

  SpreadsheetApp.getUi().alert('Data extracted. Export this Sheet as ' + SpreadsheetApp.getActiveSpreadsheet().getName() + '.json and upload via Data Hub.');
}`;
    navigator.clipboard.writeText(script);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSeedData = async (collectionName: 'schools' | 'locations_costOfLiving') => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }
  
    const isSchools = collectionName === 'schools';
    const dataToSeed = isSchools ? mockSchools : mockCostOfLivingData;
    const setter = isSchools ? setIsSeeding : setIsSeedingCoL;
  
    setter(true);
  
    const collectionRef = collection(firestore, collectionName);
    let successCount = 0;
  
    try {
      for (const item of dataToSeed) {
        const docId = 'id' in item ? (item as any).id : (item as any).locationName.toLowerCase().replace(/\s+/g, '-');
        const docRef = doc(collectionRef, docId);
        const dataToSave = { ...item, id: docId, lastUpdated: new Date() };
        setDocumentNonBlocking(docRef, dataToSave, { merge: true });
        successCount++;
      }
  
      toast({
        title: 'Seeding Started',
        description: `${successCount} documents are being added to the '${collectionName}' collection.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message,
      });
    } finally {
      setter(false);
    }
  };

  const handleSeedConfig = async () => {
    setIsSeedingConfig(true);
    try {
      await seedStudentLoanConfig();
      toast({ title: 'Config Sync Successful', description: '2026 Student Loan thresholds deployed.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Config Sync Failed', description: e.message });
    } finally {
      setIsSeedingConfig(false);
    }
  };

  const handleExportData = async () => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }
    setIsExporting(true);

    try {
      const collectionRef = collection(firestore, exportSelection);
      const snapshot = await getDocs(collectionRef);
      const data = snapshot.docs.map(doc => doc.data());

      if (data.length === 0) {
        toast({ variant: 'destructive', title: 'Export Failed', description: `The '${exportSelection}' collection is empty.` });
        setIsExporting(false);
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

      toast({
        title: 'Export Successful',
        description: `Exported ${data.length} documents from '${exportSelection}'.`,
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Export Failed', description: error.message });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    if (!firestore || !importFile) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a file to import.' });
      return;
    }
    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (event: ProgressEvent<FileReader>) => {
      try {
        if (typeof event.target?.result !== 'string') {
            throw new Error("Failed to read file.");
        }
        const dataToImport = JSON.parse(event.target.result);

        if (!Array.isArray(dataToImport) || dataToImport.some(s => !s.id)) {
          throw new Error("Invalid JSON format. Must be an array of objects, each with a unique 'id' field.");
        }

        const collectionRef = collection(firestore, importSelection);
        let successCount = 0;

        for (const item of dataToImport) {
          const docRef = doc(collectionRef, item.id);
          setDocumentNonBlocking(docRef, item, { merge: true });
          successCount++;
        }

        toast({
          title: 'Import Started',
          description: `${successCount} documents are being updated in the '${importSelection}' collection.`,
        });
      } catch (error: any) {
        toast({ variant: 'destructive', title: 'Import Failed', description: error.message });
      } finally {
        setIsImporting(false);
        setImportFile(null);
      }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Import Failed', description: "An error occurred while reading the file." });
        setIsImporting(false);
    }
    reader.readAsText(importFile);
  };

  const isLoading = isUserLoading || isAdminLoading;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-center">
            Data Hub
            </h1>
            <p className="text-muted-foreground text-center mt-4 font-medium leading-relaxed max-w-lg mx-auto">
            Manage your Google Sheets imports and run bulk AI data operations.
            </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Checking admin status...</p>
          </div>
        )}
        
        {!isLoading && user && isAdmin && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Alert
              variant="default"
              className="bg-green-500/10 border-green-500/50"
            >
              <ShieldCheck className="h-4 w-4 text-green-400" />
              <AlertTitle className="text-green-400 normal-case font-bold">
                Admin access granted
              </AlertTitle>
              <AlertDescription className="font-medium">
                You are authorized to manage the L.F.I. Registry.
              </AlertDescription>
            </Alert>

            {/* Google Sheets Sync Guide */}
            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 normal-case"><LinkIcon className="text-primary size-5"/>Google Sheets uplink protocol</CardTitle>
                    <CardDescription>How to name and sync your spreadsheet dossiers.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-background/50 border border-white/5 space-y-6">
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest">Filename requirements</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-3 bg-white/5 rounded-sm border border-white/5">
                                    <p className="text-xs font-bold text-white mb-1">schools.json</p>
                                    <p className="text-[10px] text-muted-foreground">For your main school dossiers. Ensure the first column is 'id'.</p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-sm border border-white/5">
                                    <p className="text-xs font-bold text-white mb-1">locations_costOfLiving.json</p>
                                    <p className="text-[10px] text-muted-foreground">For city cost data. Links via 'locationId'.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black mt-0.5">1</div>
                                <p className="text-sm font-medium text-muted-foreground">Export your sheet as a <strong>JSON file</strong>. Ensure headers match the dossier fields.</p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="h-5 w-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-black mt-0.5">2</div>
                                <p className="text-sm font-medium text-muted-foreground">Select the correct target registry in the <strong>Import</strong> section below.</p>
                            </div>
                        </div>
                        
                        <div className="space-y-3">
                            <h4 className="text-xs font-black uppercase text-primary tracking-widest">Automation script</h4>
                            <p className="text-xs text-muted-foreground leading-relaxed font-medium italic">Advanced: Copy this into Extensions &gt; Apps Script to prepare your Sheet for transmission.</p>
                            <Button variant="outline" size="sm" onClick={handleCopyScript} className="h-8 text-[10px] font-black uppercase border-white/10">
                                {copied ? <Check className="size-3 mr-2" /> : <Copy className="size-3 mr-2" />}
                                Copy script
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 normal-case"><Sparkles className="text-primary"/>Intelligence operations</CardTitle>
                    <CardDescription>Automated AI protocols for database enrichment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-background/50 border border-white/5">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 normal-case"><RefreshCcw className="text-blue-400 size-4" /> Sync cost of living</h3>
                        <p className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed">Use AI to refresh local cost estimates for a specific city. This draws fresh data from global hubs to ensure your 'True Net' calculations are accurate.</p>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/update-col">
                                <RefreshCcw className="mr-2 size-4" /> Open Update Tool
                            </Link>
                        </Button>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border border-white/5">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 normal-case"><Sparkles className="text-green-400 size-4" /> Bulk school enrichment</h3>
                        <p className="text-sm text-muted-foreground mb-4 font-medium leading-relaxed">Scan your dossier registry for incomplete files. AI will automatically source missing descriptions, curricula, and accreditation data.</p>
                        <form action={enrichFormAction}>
                          <BulkEnrichSubmitButton />
                        </form>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 normal-case"><DatabaseZap className="text-primary"/>Registry synchronization</CardTitle>
                <CardDescription>
                  Import or export your Google Sheets data. Ensure your ID fields match across sheets to maintain relational integrity.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 normal-case"><FileDown className="text-green-400 size-4" /> Export registry</h3>
                         <Select value={exportSelection} onValueChange={setExportSelection}>
                            <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                                <SelectValue placeholder="Select collection" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {collectionOptions.map(col => (
                                    <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleExportData} disabled={isExporting} variant="outline" className="w-full">
                            {isExporting ? <Loader2 className="animate-spin size-4" /> : <Download className="size-4 mr-2" />}
                            Download JSON
                        </Button>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 normal-case"><FileUp className="text-blue-400 size-4" /> Import Sheet</h3>
                         <Select value={importSelection} onValueChange={setImportSelection}>
                            <SelectTrigger className="bg-background/50 border-white/10 rounded-sm">
                                <SelectValue placeholder="Select target" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {collectionOptions.map(col => (
                                    <SelectItem key={col.value} value={col.value}>{col.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Input id="json-upload" type="file" accept=".json" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className="bg-background/50 border-white/10" />
                        <Button onClick={handleImportData} disabled={isImporting || !importFile} className="w-full">
                          {isImporting ? <Loader2 className="animate-spin size-4" /> : <Upload className="size-4 mr-2" />}
                          Sync with Registry
                        </Button>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <DatabaseZap className="size-4 text-amber-400" />
                        <h3 className="font-semibold normal-case">Emergency protocols</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                            <p className="text-[10px] font-black uppercase text-amber-400 mb-2">Factory reset (Seed)</p>
                            <p className="text-xs text-muted-foreground mb-4 font-medium leading-relaxed">Restore local mock datasets. This will overwrite existing dossiers.</p>
                            <div className="flex gap-2">
                                <Button onClick={() => handleSeedData('schools')} disabled={isSeeding} variant="ghost" className="h-7 text-[9px] font-black uppercase hover:bg-amber-500/10 hover:text-amber-400 px-2">
                                    Schools
                                </Button>
                                <Button onClick={() => handleSeedData('locations_costOfLiving')} disabled={isSeedingCoL} variant="ghost" className="h-7 text-[9px] font-black uppercase hover:bg-amber-500/10 hover:text-amber-400 px-2">
                                    City index
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 rounded-lg bg-black/30 border border-white/5">
                            <p className="text-[10px] font-black uppercase text-primary mb-2">Calculator calibration</p>
                            <p className="text-xs text-muted-foreground mb-4 font-medium leading-relaxed">Update global tax and student loan thresholds for 2026/27.</p>
                            <Button onClick={handleSeedConfig} disabled={isSeedingConfig} variant="ghost" className="h-7 text-[9px] font-black uppercase hover:bg-primary/10 hover:text-primary px-2">
                                Sync 2026 Config
                            </Button>
                        </div>
                    </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button asChild variant="outline" className="border-white/5">
                    <Link href="/admin/data-table" className="w-full">
                        <TableIcon className="mr-2 size-4" /> Audit School Registry
                    </Link>
                </Button>
                <Button asChild variant="outline" className="border-white/5">
                    <Link href="/admin/cost-of-living-table" className="w-full">
                        <TableIcon className="mr-2 size-4" /> Audit CoL Index
                    </Link>
                </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
