import { getAdminDb } from "../src/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";

async function updateAustriaSalaries() {
  const db = getAdminDb();

  const updates = [
    {
      id: "FLIS0097",
      name: "Danube International School Vienna",
      data: {
        startingSalary: "€50,456",
        maxSalary: "€56,000",
        salaryRange: "€50,456 - €56,000 per year",
        grossSalary5Years: "€53,000",
        expectedSalary5Years: "€3,440/month",
        salary5YearsExp: "€3,440/month",
        monthlySalary: "€3,440 net",
        salary: "€3,440/month",
        netbase: "€3,440",
      },
      deleteFields: [] as string[]
    },
    {
      id: "FLIS0077",
      name: "American International School Vienna",
      data: {
        startingSalary: "€49,000",
        startingSalaryBA: "€49,000",
        maxSalary: "€56,000",
        salaryRange: "€49,000 - €56,000",
        grossSalary5Years: "€55,000",
        expectedSalary5Years: "€3,615/month",
        salary5YearsExp: "€3,615/month",
        monthlySalary: "€3,615 net",
        salary: "€3,615/month",
        netbase: "€3,615",
      },
      deleteFields: [
        "startingSalaryPhD",
        "maxEntrySalaryBA",
        "maxEntrySalaryPhD",
        "startingSalaryMA",
        "maxEntrySalaryMA"
      ]
    },
    {
      id: "FLIS0204",
      name: "St. Gilgen International School",
      data: {
        startingSalary: "€40,000",
        maxSalary: "€45,000",
        salaryRange: "€40,000 - €45,000",
        grossSalary5Years: "€45,000",
        expectedSalary5Years: "€2,915/month",
        salary5YearsExp: "€2,915/month",
        monthlySalary: "€2,915 net",
        salary: "€2,915/month",
        netbase: "€2,915",
      },
      deleteFields: [] as string[]
    }
  ];

  console.log("🚀 Updating Firestore documents...");
  for (const item of updates) {
    const docRef = db.collection("schools").doc(item.id);
    const payload: Record<string, any> = { ...item.data };
    for (const f of item.deleteFields) {
      payload[f] = FieldValue.delete();
    }
    await docRef.update(payload);
    console.log(`✅ Firestore updated for ${item.id} (${item.name})`);
  }

  // Update JSON exports
  const jsonPaths = [
    path.join(process.cwd(), "complete_school_fields_export.json"),
    path.join(process.cwd(), "public", "complete_school_fields_export.json")
  ];

  for (const p of jsonPaths) {
    if (fs.existsSync(p)) {
      console.log(`Updating JSON file: ${p}`);
      const raw = fs.readFileSync(p, "utf-8");
      const list = JSON.parse(raw);
      let updatedCount = 0;
      for (const item of updates) {
        const found = list.find((s: any) => s.id === item.id || s.schoolId === item.id);
        if (found) {
          for (const f of item.deleteFields) {
            delete found[f];
          }
          Object.assign(found, item.data);
          updatedCount++;
        }
      }
      fs.writeFileSync(p, JSON.stringify(list, null, 2), "utf-8");
      console.log(`✅ Updated ${updatedCount} entries in ${path.basename(p)}`);
    }
  }

  console.log("🎉 All Austria school salaries successfully updated in database!");
}

updateAustriaSalaries()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("❌ Error updating salaries:", err);
    process.exit(1);
  });
