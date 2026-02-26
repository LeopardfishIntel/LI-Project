import { useState, useEffect } from 'react';
import { db } from '@/firebase/config';
import { collection, onSnapshot, query } from 'firebase/firestore';

export function useLiveStats() {
  const [stats, setStats] = useState({
    schools: 0,
    countries: 0,
    teachers: 100, // Starting baseline as requested
    comparisons: 0
  });

  useEffect(() => {
    // Listen for school count
    const unsubSchools = onSnapshot(collection(db, 'schools'), (snap) => {
      setStats(prev => ({ ...prev, schools: snap.size }));
      
      // Calculate unique countries from the schools collection
      const uniqueCountries = new Set(snap.docs.map(doc => doc.data().country));
      setStats(prev => ({ ...prev, countries: uniqueCountries.size }));
    });

    // Listen for registered teachers
    const unsubTeachers = onSnapshot(collection(db, 'teacher_profiles'), (snap) => {
      setStats(prev => ({ ...prev, teachers: 100 + snap.size }));
    });

    // Listen for comparisons (stored in application_metrics)
    const unsubMetrics = onSnapshot(collection(db, 'application_metrics'), (snap) => {
      const comparisonDoc = snap.docs.find(d => d.id === 'comparisons');
      setStats(prev => ({ ...prev, comparisons: comparisonDoc?.data()?.count || 0 }));
    });

    return () => {
      unsubSchools();
      unsubTeachers();
      unsubMetrics();
    };
  }, []);

  return stats;
}
