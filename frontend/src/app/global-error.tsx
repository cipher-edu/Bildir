"use client";
import { useEffect } from "react";
import { RefreshCw, Home, AlertTriangle, GraduationCap } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="uz">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", backgroundColor: "#020816", color: "#e2e8f0", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: "0 24px" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 32 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 12,
              background: "linear-gradient(135deg, #6366f1, #7c3aed)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <GraduationCap style={{ width: 18, height: 18, color: "white" }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "white" }}>
              Bildir
            </span>
          </div>

          {/* Icon */}
          <div style={{
            width: 80, height: 80, borderRadius: 24,
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <AlertTriangle style={{ width: 40, height: 40, color: "#f87171" }} />
          </div>

          <h1 style={{ fontSize: 28, fontWeight: 800, color: "white", marginBottom: 12 }}>
            Kritik xatolik
          </h1>
          <p style={{ color: "#64748b", lineHeight: 1.6, marginBottom: 32 }}>
            Ilova yuklanishida muammo yuz berdi. Sahifani yangilang yoki bosh sahifaga qayting.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button onClick={reset}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 28px", borderRadius: 16, cursor: "pointer",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "white", fontWeight: 600, fontSize: 14,
                border: "none",
                boxShadow: "0 0 30px rgba(99,102,241,0.4)",
              }}>
              <RefreshCw style={{ width: 16, height: 16 }} />
              Qayta urinish
            </button>
            <button onClick={() => window.location.href = "/"}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "14px 28px", borderRadius: 16, cursor: "pointer",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                color: "#94a3b8", fontWeight: 600, fontSize: 14,
              }}>
              <Home style={{ width: 16, height: 16 }} />
              Bosh sahifa
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
