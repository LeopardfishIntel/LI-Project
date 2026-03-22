 "use client";
import { useState } from "react";
import { generateIntelBriefing } from "@/ai/flows/generate-intel-briefing";

export function IntelBriefing() {
  const [intel, setIntel] = useState("");
  const [loading, setLoading] = useState(false);

  async function getBriefing() {
    setLoading(true);
    // Increased the prompt specificity to encourage structured data
    const res = await generateIntelBriefing("Provide a detailed strategic summary with clear paragraph breaks.");
    if (res.success) setIntel(res.data || "");
    setLoading(false);
  }

  return (
    <div className="border border-azure/30 bg-background/50 p-6 mb-8 backdrop-blur-sm">
      {/* REMOVED UPPERCASE - Using font-black and tracking-tighter for impact instead */}
      <h2 className="text-2xl font-black text-azure mb-4 tracking-tighter">
        Intel Briefing
      </h2>
      
      <button 
        onClick={getBriefing} 
        disabled={loading} 
        className="bg-azure text-white px-6 py-2 font-bold hover:bg-white hover:text-azure transition-all duration-200 disabled:opacity-50"
      >
        {loading ? "Decrypting..." : "Generate AI Briefing"}
      </button>

      {intel && (
        <div className="mt-6 text-gray-200 border-l-2 border-primary pl-6 py-2">
          {/* TACTICAL FIX: Splitting text by newlines to create real paragraphs */}
          <div className="space-y-4 leading-relaxed text-lg normal-case">
            {intel.split('\n').map((paragraph, index) => (
              paragraph.trim() && <p key={index}>{paragraph.trim()}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}