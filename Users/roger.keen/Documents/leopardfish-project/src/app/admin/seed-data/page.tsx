
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

export default function SeedDataPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

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
      const schoolCollectionRef = collection(firestore, 'schools');
      const snapshot = await getDocs(schoolCollectionRef);
      const schoolData = snapshot.docs.map(doc => doc.data());

      if (schoolData.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Export Failed',
          description: 'The schools collection is empty. Seed data first.',
        });
        setIsExporting(false);
        return;
      }

      const jsonString = JSON.stringify(schoolData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schools.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${schoolData.length} schools to schools.json`,
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
        const schoolsToImport = JSON.parse(event.target.result);

        if (!Array.isArray(schoolsToImport) || schoolsToImport.some(s => !s.id)) {
          throw new Error("Invalid JSON format. Must be an array of objects, each with an 'id'.");
        }

        const schoolCollectionRef = collection(firestore, 'schools');
        let successCount = 0;

        for (const school of schoolsToImport) {
          const schoolDocRef = doc(schoolCollectionRef, school.id);
          setDocumentNonBlocking(schoolDocRef, school, { merge: true });
          successCount++;
        }

        toast({
          title: 'Import Started',
          description: `${successCount} schools are being updated in the database.`,
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
                <CardTitle>Add New School</CardTitle>
                <CardDescription>
                  Add a new school record to the database.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild variant="outline">
                  <Link href="/admin/add-school">
                    <Plus className="mr-2" /> Add School
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Seed Database</CardTitle>
                <CardDescription>
                  Populate the 'schools' collection with the initial set of mock data. This is a good starting point for your app.
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
                  This will add all schools from the local mock data file to
                  your live Firestore database. Existing schools with the same ID will be overwritten.
                </p>
              </CardContent>
            </Card>

             <Card className="bg-card/70 backdrop-blur-sm border-border">
                <CardHeader>
                    <CardTitle>Export Data</CardTitle>
                    <CardDescription>
                    Download the current 'schools' collection as a single JSON file. You can edit this file locally.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Button onClick={handleExportData} disabled={isExporting} variant="outline">
                    {isExporting ? <Loader2 className="animate-spin" /> : <Download />}
                    Export to JSON
                    </Button>
                </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>Import Data</CardTitle>
                <CardDescription>
                  Upload a `schools.json` file to update your database. The file must be an array of school objects, each with a unique 'id'.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="json-upload">JSON File</Label>
                    <Input id="json-upload" type="file" accept=".json" onChange={(e) => setImportFile(e.target.files ? e.target.files[0] : null)} />
                </div>
                <Button onClick={handleImportData} disabled={isImporting || !importFile}>
                  {isImporting ? <Loader2 className="animate-spin" /> : <Upload />}
                  Import from JSON
                </Button>
                 <p className="text-xs text-muted-foreground pt-2">
                  This will update or create schools based on the IDs in your JSON file. This action is non-destructive for other documents.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle>View Data Table</CardTitle>
                <CardDescription>
                  View all school data in a tabular format.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button asChild variant="outline">
                  <Link href="/admin/data-table">
                    <TableIcon className="mr-2" /> View Data Table
                  </Link>
                </Button>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </div>
  );
}