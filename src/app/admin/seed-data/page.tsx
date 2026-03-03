'use client';

import { useState, useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  useUser,
  useFirestore,
  useDoc,
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
  ShieldAlert,
  Download,
  Upload,
  Table as TableIcon,
  Plus,
  DatabaseZap,
  FilePlus,
  FileDown,
  FileUp,
  RefreshCcw,
  Sparkles,
  GraduationCap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { firebaseConfig } from '@/firebase/config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { enrichAllSchoolsAction, seedStudentLoanConfig, type BulkEnrichState } from './actions';

const collectionOptions = [
  'schools',
  'users',
  'roles_admin',
  'roles_verifiedTeachers',
  'forum_categories',
  'forum_posts',
  'app_metrics',
  'locations_costOfLiving',
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
  const [isSeedingLoans, setIsSeedingLoans] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

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
        const docId = 'id' in item ? item.id : item.locationName.toLowerCase().replace(/\s+/g, '-');
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

  const handleSeedLoanConfig = async () => {
    setIsSeedingLoans(true);
    try {
      await seedStudentLoanConfig();
      toast({ title: 'Config Deployed', description: '2026 loan thresholds and bands are now live.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Deployment Failed', description: error.message });
    } finally {
      setIsSeedingLoans(false);
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
          throw new Error("Invalid JSON format. Must be an array of objects, each with a unique 'id'.");
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
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">
            Data Hub
            </h1>
            <p className="text-muted-foreground text-center mt-4">
            Manage content, and run bulk & AI data operations for your application.
            </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center gap-4 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="font-bold text-muted-foreground uppercase tracking-widest text-xs">Checking admin status...</p>
          </div>
        )}
        {!isLoading && !user && (
          <Alert>
            <AlertTitle>Please Log In</AlertTitle>
            <AlertDescription>
              You must be logged in to perform administrative actions.
            </AlertDescription>
          </Alert>
        )}
        {!isLoading && user && !isAdmin && (
          <div className="space-y-4">
            <Alert variant="destructive">
              <ShieldOff className="h-4 w-4" />
              <AlertTitle>Admin Access Required</AlertTitle>
              <AlertDescription>
                {adminRoleError ? (
                  <>
                    <p>
                      A permission error occurred while checking your admin status. This is almost always caused by Firestore Security Rules.
                    </p>
                    <p className="mt-2 font-mono text-xs bg-black/30 p-2 rounded">
                      Error: {adminRoleError.message}
                    </p>
                  </>
                ) : (
                  'You do not have permission to perform this action.'
                )}
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="normal-case">How to become an Admin</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <p>
                  To use these tools, you need to be an administrator. To
                  grant yourself admin rights, follow these steps:
                </p>
                <Alert variant="destructive" className="text-left">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Important!</AlertTitle>
                  <AlertDescription>
                    The collection name must be exactly{' '}
                    <code className="bg-primary/20 text-primary-foreground p-1 rounded">
                      roles_admin
                    </code>
                    .
                  </AlertDescription>
                </Alert>
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>
                    Go to your{' '}
                    <a
                      href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore/data`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:underline"
                    >
                      Firebase Firestore Console
                    </a>
                    .
                  </li>
                  <li>
                    Click 'Start collection' and create a new collection
                    named{' '}
                    <code className="bg-muted px-1 py-0.5 rounded">
                      roles_admin
                    </code>
                    .
                  </li>
                  <li>
                    Click 'Add document'. For the 'Document ID', paste your
                    User ID.
                  </li>
                  <li className="p-2 bg-muted rounded-md">
                    <p className="font-semibold">Your User ID:</p>
                    <code className="block break-all mt-1">
                      {user.uid}
                    </code>
                  </li>
                  <li>
                    You can add a field, e.g., `isAdmin: true`, but the existence of the document is enough. Click 'Save'.
                  </li>
                  <li>
                    Refresh this page. The admin tools should become
                    available.
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && user && isAdmin && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <Alert
              variant="default"
              className="bg-green-500/10 border-green-500/50"
            >
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle className="text-green-400">
                Admin Access Granted
              </AlertTitle>
              <AlertDescription>
                You are authorized to perform administrative actions.
              </AlertDescription>
            </Alert>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 normal-case"><Sparkles className="text-primary"/>AI Data Tools</CardTitle>
                    <CardDescription>Use AI to enrich and update your database with real-world information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-background/50 border">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 normal-case"><RefreshCcw className="text-blue-400 size-4" /> Cost of Living Data</h3>
                        <p className="text-sm text-muted-foreground mb-4">The initial cost of living data is from mock files. Use this tool to fetch fresh, real-world estimates from public sources like Numbeo. This is the best way to address excessive or outdated rental estimates.</p>
                        <Button asChild variant="outline" size="sm">
                            <Link href="/admin/update-col">
                                <RefreshCcw className="mr-2 size-4" /> Update CoL Data
                            </Link>
                        </Button>
                    </div>
                    <div className="p-4 rounded-lg bg-background/50 border">
                        <h3 className="font-semibold flex items-center gap-2 mb-2 normal-case"><Sparkles className="text-green-400 size-4" /> Bulk School Enrichment</h3>
                        <p className="text-sm text-muted-foreground mb-4">Automatically find and fill in missing information (like descriptions and curriculum details) for all incomplete school records in your database.</p>
                        <form action={enrichFormAction}>
                          <BulkEnrichSubmitButton />
                        </form>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 normal-case"><FilePlus className="text-primary"/>Content Management</CardTitle>
                    <CardDescription>
                    Add new documents or view existing collection data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button asChild variant="outline">
                        <Link href="/admin/add-school" className="w-full">
                            <Plus className="mr-2 size-4" /> Add School
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                    <Link href="/admin/data-table" className="w-full">
                            <TableIcon className="mr-2 size-4" /> View School Data
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="md:col-span-2">
                        <Link href="/admin/cost-of-living-table" className="w-full text-center">
                            <TableIcon className="mr-2 size-4" /> View Cost of Living Registry
                        </Link>
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 normal-case"><DatabaseZap className="text-primary"/>Database Operations</CardTitle>
                <CardDescription>
                  Seed, import, or export entire collections.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="p-4 rounded-lg bg-background/50 border">
                    <h3 className="font-semibold flex items-center gap-2 mb-2 normal-case"><DatabaseZap className="text-amber-400 size-4" /> Seed Mock Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">Populate collections with a set of mock data. This will add or overwrite existing documents.</p>
                    <div className="flex flex-wrap gap-4">
                        <Button onClick={() => handleSeedData('schools')} disabled={isSeeding}>
                            {isSeeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Seed School Data
                        </Button>
                        <Button onClick={() => handleSeedData('locations_costOfLiving')} disabled={isSeedingCoL} variant="outline">
                            {isSeedingCoL ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Seed CoL Data
                        </Button>
                        <Button onClick={handleSeedLoanConfig} disabled={isSeedingLoans} variant="outline" className="border-primary/30 text-primary">
                            {isSeedingLoans ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}
                            Seed Loan Config (2026)
                        </Button>
                    </div>
                </div>
                
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 normal-case"><FileDown className="text-green-400 size-4" /> Export Collection</h3>
                         <Select value={exportSelection} onValueChange={setExportSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a collection" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {collectionOptions.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleExportData} disabled={isExporting} variant="outline" className="w-full">
                            {isExporting ? <Loader2 className="animate-spin size-4" /> : <Download className="size-4 mr-2" />}
                            Export to JSON
                        </Button>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 normal-case"><FileUp className="text-blue-400 size-4" /> Import Collection</h3>
                         <Select value={importSelection} onValueChange={setImportSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a collection" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {collectionOptions.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Input id="json-upload" type="file" accept=".json" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} className="bg-background/50 border-white/10" />
                        <Button onClick={handleImportData} disabled={isImporting || !importFile} className="w-full">
                          {isImporting ? <Loader2 className="animate-spin size-4" /> : <Upload className="size-4 mr-2" />}
                          Import from JSON
                        </Button>
                    </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
