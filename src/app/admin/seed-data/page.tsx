
'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { firebaseConfig } from '@/firebase/config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

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

const addableCollectionOptions = [
    { value: 'schools', label: 'School', href: '/admin/add-school' },
    // Future addable types can be added here
];

export default function SeedDataPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [exportSelection, setExportSelection] = useState('schools');
  const [importSelection, setImportSelection] = useState('schools');
  
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

  const handleSeedData = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }
    setIsSeeding(true);

    const schoolCollectionRef = collection(firestore, 'schools');
    let successCount = 0;

    try {
      for (const school of mockSchools) {
        const schoolDocRef = doc(schoolCollectionRef, school.id);
        setDocumentNonBlocking(schoolDocRef, school, { merge: true });
        successCount++;
      }

      toast({
        title: 'Seeding Started',
        description: `${successCount} schools are being added to the database.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Seeding Failed',
        description: error.message,
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleExportData = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Firestore is not available.',
      });
      return;
    }
    setIsExporting(true);

    try {
      const collectionRef = collection(firestore, exportSelection);
      const snapshot = await getDocs(collectionRef);
      const data = snapshot.docs.map(doc => doc.data());

      if (data.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Export Failed',
          description: `The '${exportSelection}' collection is empty.`,
        });
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
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: error.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportData = () => {
    if (!firestore || !importFile) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a file to import.',
      });
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
        toast({
          variant: 'destructive',
          title: 'Import Failed',
          description: error.message,
        });
      } finally {
        setIsImporting(false);
        setImportFile(null);
      }
    };
    reader.onerror = () => {
        toast({
            variant: 'destructive',
            title: 'Import Failed',
            description: "An error occurred while reading the file.",
        });
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
            Data Administration
            </h1>
            <p className="text-muted-foreground text-center mt-4">
            Manage your application's Firestore data, including content and bulk operations.
            </p>
        </div>

        {isLoading && (
          <div className="flex justify-center items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>Checking admin status...</p>
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
                <CardTitle>How to become an Admin</CardTitle>
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
                <ol className="list-decimal list-inside space-y-2">
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
          <div className="space-y-8">
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
                    <CardTitle className="flex items-center gap-3"><FilePlus className="text-primary"/>Content Management</CardTitle>
                    <CardDescription>
                    Add new documents or view existing collection data.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="flex flex-col items-center gap-4 text-center p-4 rounded-lg bg-background/50">
                        <h3 className="font-semibold">Add New Document</h3>
                        <Button asChild variant="outline">
                            <Link href="/admin/add-school">
                                <Plus className="mr-2" /> Add School
                            </Link>
                        </Button>
                        <p className="text-xs text-muted-foreground pt-2">More document types coming soon.</p>
                    </div>
                     <div className="flex flex-col items-center gap-4 text-center p-4 rounded-lg bg-background/50">
                        <h3 className="font-semibold">View Data Tables</h3>
                         <div className='flex flex-col gap-2'>
                            <Button asChild variant="outline">
                            <Link href="/admin/data-table">
                                    <TableIcon className="mr-2" /> View Schools
                                </Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link href="/admin/cost-of-living-table">
                                    <TableIcon className="mr-2" /> View Cost of Living
                                </Link>
                            </Button>
                         </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><DatabaseZap className="text-primary"/>Bulk Data Operations</CardTitle>
                <CardDescription>
                  Seed, import, or export entire collections. Use with caution.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="p-4 rounded-lg bg-background/50">
                    <h3 className="font-semibold flex items-center gap-2 mb-2"><DatabaseZap className="text-amber-400" /> Seed Mock Data</h3>
                    <p className="text-sm text-muted-foreground mb-4">Populate the 'schools' collection with a set of mock data. This will add or overwrite existing documents.</p>
                    <Button
                        onClick={handleSeedData}
                        disabled={isSeeding}
                        >
                        {isSeeding ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Seed School Data
                    </Button>
                </div>
                
                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><FileDown className="text-green-400" /> Export Collection</h3>
                         <Select value={exportSelection} onValueChange={setExportSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a collection" />
                            </SelectTrigger>
                            <SelectContent>
                                {collectionOptions.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleExportData} disabled={isExporting} variant="outline" className="w-full">
                            {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                            Export to JSON
                        </Button>
                    </div>
                    <div className="space-y-4">
                        <h3 className="font-semibold flex items-center gap-2"><FileUp className="text-blue-400" /> Import Collection</h3>
                         <Select value={importSelection} onValueChange={setImportSelection}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a collection" />
                            </SelectTrigger>
                            <SelectContent>
                                {collectionOptions.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <Input id="json-upload" type="file" accept=".json" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} />
                        <Button onClick={handleImportData} disabled={isImporting || !importFile} className="w-full">
                          {isImporting ? <Loader2 className="animate-spin" /> : <Upload />}
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
