import { db, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import type { TeacherProfile } from "@/lib/types";

export async function seedTeacher() {
  console.log("TACTION: Initializing Tactical Teacher Seed...");

  // Protocol: Direct Database Write to bypass missing Server Actions
  const teacherId = "test-teacher-1";
  const docRef = doc(db, "users", teacherId, "teacherProfile", teacherId);

  const teacherData: TeacherProfile = {
    uid: teacherId,
    email: "fred@leopardfish.intel",
    id: teacherId,
    fullName: "Fred Leopardfish",
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${teacherId}`,
    isVerifiedTeacher: true,
    familyStatus: "Single",
    ageGroup: "30-40",
    memberSince: new Date(),
    yearsOfExperience: 12,
    qualifications: ["MA Education", "CELTA"],
    preferredRegions: ["Asia", "Middle East"],
    preferredCountries: ["Thailand", "Vietnam"],
    goal: "balanced" // Added to match TeacherProfile type
  };

  try {
    await setDocumentNonBlocking(docRef, teacherData);
    console.log("SUCCESS: Teacher operative seeded to registry.");
  } catch (error) {
    console.error("CRITICAL FAILURE: Seed aborted.", error);
  }
}