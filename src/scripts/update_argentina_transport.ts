import admin from "firebase-admin";
import path from "path";

const saPath = path.resolve(process.cwd(), "service-account.json");
const serviceAccount = require(saPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function main() {
  console.log("Updating Argentina baseline transport cost in Firestore locations_costOfLiving...");

  // 130,000 ARS baseline single.
  // With 1200 ARS/GBP and 1.27 USD/GBP -> 1 USD = 944.88 ARS.
  // 130,000 ARS = ~137.58 USD single.
  const singleUsd = 137.58;
  
  const transportData = {
    publicTransport: {
      single: singleUsd,
      marriedDualIncome: Math.round(singleUsd * 1.8 * 100) / 100,
      family1Child: Math.round(singleUsd * 2.1 * 100) / 100,
      family2Children: Math.round(singleUsd * 2.5 * 100) / 100,
      family3PlusChildren: Math.round(singleUsd * 2.9 * 100) / 100
    }
  };

  const targets = ["argentina", "buenos-aires-argentina"];
  for (const t of targets) {
    const ref = db.collection("locations_costOfLiving").doc(t);
    const snap = await ref.get();
    if (snap.exists) {
      const existing = snap.data();
      const mergedTransport = {
        ...(existing?.transport || {}),
        publicTransport: transportData.publicTransport
      };
      await ref.set({
        publicTransport: transportData.publicTransport,
        transport: mergedTransport
      }, { merge: true });
      console.log(`Updated locations_costOfLiving/${t} baseline publicTransport to 130,000 ARS (~$137.58 USD single).`);
    } else {
      console.log(`Target ${t} doc not found, creating merge entry.`);
      await ref.set(transportData, { merge: true });
    }
  }

  console.log("SUCCESS! Argentina baseline transport updated in Firestore.");
}

main().catch(err => {
  console.error("Failed to update Argentina transport:", err);
  process.exit(1);
});
