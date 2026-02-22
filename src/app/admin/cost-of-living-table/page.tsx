
'use client';

import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { LocationCostOfLiving } from '@/lib/types';
import { collection } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CostOfLivingTablePage() {
  const firestore = useFirestore();
  const costOfLivingQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'locations_costOfLiving') : null),
    [firestore]
  );
  const { data: locations, isLoading } = useCollection<LocationCostOfLiving>(costOfLivingQuery);

  const formatDate = (timestamp: any) => {
    if (timestamp && timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString();
    }
    return 'N/A';
  };

  return (
    <div className="container mx-auto px-4 md:px-6 py-12">
        <Button asChild variant="outline" className="mb-8">
            <Link href="/admin/seed-data">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Data Admin
            </Link>
        </Button>
      <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
        Cost of Living Data
      </h1>
      <p className="text-muted-foreground mb-12 text-center">
        View all cost of living data from the Firestore database.
      </p>
      {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
      )}
      {!isLoading && locations && (
        <div className="border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Country</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Rent (1BR)</TableHead>
                        <TableHead>Meal Cost</TableHead>
                        <TableHead>Last Updated</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {locations.map(location => (
                        <TableRow key={location.id}>
                            <TableCell className="font-medium">
                                {location.locationName}
                            </TableCell>
                            <TableCell>{location.countryName}</TableCell>
                            <TableCell><Badge variant="secondary">{location.locationType}</Badge></TableCell>
                            <TableCell>{location.monthlyRent1BR}</TableCell>
                            <TableCell>{location.averageMealCost}</TableCell>
                            <TableCell>{formatDate(location.lastUpdated)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
      )}
    </div>
  );
}
