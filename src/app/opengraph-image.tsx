import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Leopardfish Intel - Strategic Insight for International Educators";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#020617",
          backgroundImage:
            "radial-gradient(circle at 25px 25px, rgba(255, 255, 255, 0.05) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(255, 107, 53, 0.08) 5%, transparent 0%)",
          backgroundSize: "50px 50px, 100px 100px",
          padding: "60px 70px",
          fontFamily: "sans-serif",
          color: "#ffffff",
          position: "relative",
        }}
      >
        {/* Glow corner accents */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 115, 230, 0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 350,
            height: 350,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255, 107, 53, 0.25) 0%, transparent 70%)",
          }}
        />

        {/* Brand Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              backgroundColor: "#FF6B35",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "24px",
              color: "#020617",
            }}
          >
            FL
          </div>
          <div style={{ display: "flex", fontSize: "36px", fontWeight: 900, letterSpacing: "-0.5px" }}>
            <span style={{ color: "#FF6B35" }}>Leopardfish</span>
            <span style={{ color: "#0073E6" }}>Intel</span>
          </div>
          <div
            style={{
              marginLeft: "16px",
              padding: "6px 14px",
              borderRadius: "9999px",
              backgroundColor: "rgba(255, 255, 255, 0.08)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "#94a3b8",
            }}
          >
            Tactical Dossier Platform
          </div>
        </div>

        {/* Main Value Proposition */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px", maxWidth: "950px" }}>
          <div
            style={{
              fontSize: "50px",
              fontWeight: 900,
              lineHeight: 1.15,
              letterSpacing: "-1.5px",
              textTransform: "uppercase",
              fontStyle: "italic",
            }}
          >
            Strategic Intelligence & Compensation Analytics for International Educators
          </div>
          <div
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              lineHeight: 1.4,
              fontWeight: 400,
            }}
          >
            Military-grade precision forecasting: verified school salary matrices, live cost of living calculators, and recruitment market intel.
          </div>
        </div>

        {/* Feature Badges Footer */}
        <div style={{ display: "flex", gap: "16px", width: "100%", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              color: "#34d399",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            🎯 490+ Verified Schools
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "rgba(0, 115, 230, 0.12)",
              border: "1px solid rgba(0, 115, 230, 0.3)",
              color: "#60a5fa",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            📊 Real Savings Forecaster
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 107, 53, 0.12)",
              border: "1px solid rgba(255, 107, 53, 0.3)",
              color: "#fb923c",
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            ⚡ Live Vacancy Radar
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              alignItems: "center",
              fontSize: "18px",
              fontWeight: 800,
              color: "#64748b",
              letterSpacing: "0.5px",
            }}
          >
            leopardfishintel.com
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
