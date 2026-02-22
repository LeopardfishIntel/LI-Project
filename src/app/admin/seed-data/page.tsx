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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { firebaseConfig } from '@/firebase/config';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

const viewableCollectionOptions = [
    { value: 'schools', label: 'Schools', href: '/admin/data-table', disabled: false },
    { value: 'users', label: 'Users (coming soon)', href: '#', disabled: true },
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
  const [addSelection, setAddSelection] = useState('schools');
  const [viewSelection, setViewSelection] = useState('schools');


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

  const selectedAddOption = addableCollectionOptions.find(opt => opt.value === addSelection);
  const selectedViewOption = viewableCollectionOptions.find(opt => opt.value === viewSelection);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto space-y-12">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">
            Data Administration
            </h1>
            <p className="text-muted-foreground text-center mt-4">
            Use this page to manage your application's Firestore data.
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
                  To seed the database, you need to be an administrator. To
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
                    . A common mistake is to use{' '}
                    <code className="bg-red-900 text-white p-1 rounded">
                      admin_roles
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
                    You can add a field to the document, e.g., `isAdmin:
                    true`, but the existence of the document is enough. Click
                    'Save'.
                  </li>
                  <li>
                    Refresh this page. The admin tools below should become
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
                <CardTitle>Add New Document</CardTitle>
                <CardDescription>
                  Select a data type to add a new document to the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                 <Select value={addSelection} onValueChange={setAddSelection}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a document type" />
                    </SelectTrigger>
                    <SelectContent>
                        {addableCollectionOptions.map(option => (
                             <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedAddOption ? (
                    <Button asChild variant="outline">
                        <Link href={selectedAddOption.href}>
                            <Plus className="mr-2" /> Add {selectedAddOption.label}
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" disabled>
                        <Plus className="mr-2" /> Select a type to add
                    </Button>
                )}
                <p className="text-xs text-muted-foreground pt-2">More document types coming soon.</p>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Seed Mock Data</CardTitle>
                <CardDescription>
                  Populate the 'schools' collection with a set of mock data.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  onClick={handleSeedData}
                  disabled={isSeeding}
                  size="lg"
                >
                  {isSeeding ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : null}
                  Seed School Data
                </Button>
                 <p className="text-xs text-muted-foreground pt-4">
                  This will add/overwrite schools from the local mock data file.
                </p>
              </CardContent>
            </Card>

             <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle>Export Collection</CardTitle>
                    <CardDescription>
                    Select a collection and download its data as a single JSON file.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <Select value={exportSelection} onValueChange={setExportSelection}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Select a collection" />
                        </SelectTrigger>
                        <SelectContent>
                            {collectionOptions.map(col => (
                                <SelectItem key={col} value={col}>{col}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={handleExportData} disabled={isExporting} variant="outline">
                        {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                        Export to JSON
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Import Collection</CardTitle>
                <CardDescription>
                  Select a collection and upload a JSON file to update your database. The file must be an array of objects, each with an 'id'.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                 <Select value={importSelection} onValueChange={setImportSelection}>
                    <SelectTrigger className="w-[280px] mx-auto">
                        <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                        {collectionOptions.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <div className="grid w-full max-w-sm items-center gap-1.5 mx-auto">
                    <Label htmlFor="json-upload" className="sr-only">JSON File</Label>
                    <Input id="json-upload" type="file" accept=".json" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                <Button onClick={handleImportData} disabled={isImporting || !importFile}>
                  {isImporting ? <Loader2 className="animate-spin" /> : <Upload />}
                  Import from JSON
                </Button>
                 <p className="text-xs text-muted-foreground pt-2">
                  This will update or create documents based on the IDs in your file.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>View Collection Data</CardTitle>
                <CardDescription>
                  Select a collection to view its documents in a table.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4">
                <Select value={viewSelection} onValueChange={setViewSelection}>
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a collection" />
                    </SelectTrigger>
                    <SelectContent>
                        {viewableCollectionOptions.map(option => (
                             <SelectItem key={option.value} value={option.value} disabled={option.disabled}>{option.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {selectedViewOption && !selectedViewOption.disabled ? (
                    <Button asChild variant="outline">
                        <Link href={selectedViewOption.href}>
                            <TableIcon className="mr-2" /> View {selectedViewOption.label} Table
                        </Link>
                    </Button>
                ) : (
                    <Button variant="outline" disabled>
                        <TableIcon className="mr-2" /> View Table
                    </Button>
                )}
                 <p className="text-xs text-muted-foreground pt-2">More data viewers coming soon.</p>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}
