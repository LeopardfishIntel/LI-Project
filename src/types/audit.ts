export interface CompensationDrift {
  id: string;                  // e.g., "FLIS0220"
  schoolName: string;          // e.g., "Nibras International School"
  country: string;
  city: string;
  field: string;               // e.g., "salaryRange" | "base_salary_eur" | "housingprovision" | "package_descriptor"
  oldValue: string | number | boolean | null;   // Baseline (Master JSON Snapshot Value)
  newValue: string | number | boolean | null;   // Current Production Firestore Value
  reason: 
    | "🤖 Automated Web Scraper"
    | "💱 Currency Exchange Drift"
    | "✍️ Manual Admin Edit"
    | "⚡ Pipeline Batch Ingestion";
  updatedAt: string;           // Timestamp
  updatedBy?: string;          // User ID or System Process ID
}

export interface CompensationAuditSummary {
  totalProtected: number;
  lockedCount: number;
  driftCount: number;
  drifts: CompensationDrift[];
  status: "SECURED" | "ACTION REQUIRED";
  lastAuditedAt: string;
}
