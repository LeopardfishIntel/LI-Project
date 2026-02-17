'use client';

import { useState } from 'react';
import {
  useUser,
  useFirestore,
  useDoc,
  useMemoFirebase,
  setDocumentNonBlocking,
} from '@/firebase';
import { doc, collection } from 'firebase/firestore';
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
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { firebaseConfig } from '@/firebase/config';

export default function SeedDataPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSeeding, setIsSeeding] = useState(false);

  const adminRoleRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'roles_admin', user.uid) : null),
    [firestore, user]
  );
  const {
    data: adminRole,
    isLoading: isAdminLoading,
    error: adminRoleError,
  } = useDoc(adminRoleRef);
  const isAdmin = !!adminRole;

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
        // Using the non-blocking version
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

  const isLoading = isUserLoading || isAdminLoading;

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-center">
          Data Administration
        </h1>
        <p className="text-muted-foreground text-center mt-4 mb-12">
          Use this page to populate your Firestore database with initial data.
        </p>

        <Card className="bg-card/70 backdrop-blur-sm border-border">
          <CardHeader>
            <CardTitle>Seed Database</CardTitle>
            <CardDescription>
              Populate the 'schools' collection in Firestore with the mock data.
              This requires admin privileges.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        <p className="mt-2">
                          Please double-check that the `roles_admin` collection and your user ID document exist in the Firebase Console.
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
                        Refresh this page. The button below should become
                        enabled.
                      </li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            )}

            {!isLoading && user && isAdmin && (
              <div className="text-center space-y-4">
                <Alert
                  variant="default"
                  className="bg-green-500/10 border-green-500/50 text-left"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <AlertTitle className="text-green-400">
                    Admin Access Granted
                  </AlertTitle>
                  <AlertDescription>
                    You are authorized to perform administrative actions.
                  </AlertDescription>
                </Alert>
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
                <p className="text-xs text-muted-foreground pt-2">
                  This will add all schools from the local mock data file to
                  your live Firestore database.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
