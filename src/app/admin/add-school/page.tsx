 "use client";

import { useState, useEffect } from 'react';
import IntelForm from '@/components/forms/IntelForm'; 
// ✅ HARD-WIRED: Three levels up to 'src'
import { db } from '../../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';

export default function AddSchoolPage() {
  const [schools, setSchools] = useState<any[]>([]);

  useEffect(() => {
    async function fetchSchools() {
      try {
        const querySnapshot = await getDocs(collection(db, 'schools'));
        setSchools(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Fetch failed", err);
      }
    }
    fetchSchools();
  }, []);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-12">
      <header className="border-b pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight">Intelligence Command</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <section className="bg-slate-50 p-6 rounded-2xl border">
          <h2 className="text-xl font-bold mb-4">Add Target</h2>
          <IntelForm />
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-bold">Active Targets</h2>
          <div className="grid gap-4">
            {schools.map((school) => (
              <div key={school.id} className="p-4 border rounded-xl bg-white shadow-sm">
                <h3 className="font-bold">{school.name}</h3>
                <p className="text-sm text-muted-foreground">{school.location}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}