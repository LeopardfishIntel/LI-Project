"use client";
"use client";
import { useState, useEffect } from "react";
import { db } from "../config";
import { doc, onSnapshot } from "firebase/firestore";
import { TeacherProfile } from "@/lib/types";

export function useTeacher(id: string) {
  const [data, setData] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!id) return;
    return onSnapshot(doc(db, "teachers", id), (d) => {
      setData(d.exists() ? (d.data() as TeacherProfile) : null);
      setLoading(false);
    });
  }, [id]);
  return { data, loading };
}
