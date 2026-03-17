import { ClientShield } from "@/components/ClientShield";

export default function RecoveryPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-24">
      <ClientShield>
        <h1 className="text-6xl font-black tracking-tighter text-primary uppercase">
          System Recovered
        </h1>
        <p className="mt-4 text-azure font-medium">
          Fred, the tactical environment is now stable.
        </p>
      </ClientShield>
    </main>
  );
}
