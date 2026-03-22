 "use client";

import { useState } from "react";
import { auth, db, setDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { TeacherProfile } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const profileRef = doc(db, "teachers", user.uid);
      
      // FIXED: Added uid and email to meet TeacherProfile requirements
      const newProfile: TeacherProfile = {
        uid: user.uid,
        email: user.email || email,
        fullName: "",
        isVerifiedTeacher: false,
        familyStatus: "single",
        ageGroup: "not-specified",
        memberSince: new Date(),
        yearsOfExperience: 0,
        qualifications: [],
        preferredRegions: [],
        preferredCountries: [],
        goal: "balanced"
      };

      // FIXED: Removed the 3rd { merge: true } argument as it's now handled inside the helper
      await setDocumentNonBlocking(profileRef, newProfile);
      
      router.push("/profile");
    } catch (error) {
      console.error("Signup Error:", error);
    }
  };

  return (
    // ... your JSX
    <form onSubmit={handleSignup}>
       <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
       <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
       <button type="submit">Initialize Intel Profile</button>
    </form>
  );
}