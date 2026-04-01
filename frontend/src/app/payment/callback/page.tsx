"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [tier, setTier] = useState("");

  useEffect(() => {
    const txRef = searchParams.get("tx_ref");
    const flwStatus = searchParams.get("status");

    if (!txRef) {
      setStatus("failed");
      return;
    }

    if (flwStatus === "cancelled") {
      setStatus("failed");
      return;
    }

    // Poll backend to check if the webhook already processed
    let attempts = 0;
    const maxAttempts = 10;

    const check = async () => {
      try {
        const res = await fetch(`/api/payment/verify/${encodeURIComponent(txRef)}`);
        const data = await res.json();
        if (data.success) {
          setStatus("success");
          setTier(data.tier || "");
          return true;
        }
      } catch { /* retry */ }
      return false;
    };

    const poll = async () => {
      const done = await check();
      if (done) return;
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setStatus("failed");
      }
    };

    poll();
  }, [searchParams]);

  const tierLabel = tier.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "48px 40px", maxWidth: 440, width: "100%", textAlign: "center", boxShadow: "0 2px 16px rgba(0,0,0,.06)" }}>
        {status === "verifying" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8 }}>Verifying Payment…</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>Please wait while we confirm your payment.</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8, color: "#059669" }}>Payment Successful!</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: 24 }}>
              You&apos;ve been upgraded to <strong>{tierLabel}</strong>. Enjoy your new features!
            </p>
            <button
              onClick={() => router.push("/settings?tab=billing")}
              style={{ background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.9rem", cursor: "pointer" }}
            >
              Go to Billing Settings
            </button>
          </>
        )}

        {status === "failed" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>😔</div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: 8, color: "#dc2626" }}>Payment Not Confirmed</h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", marginBottom: 24 }}>
              We couldn&apos;t confirm your payment. If money was deducted, it will be refunded automatically. You can try again from settings.
            </p>
            <button
              onClick={() => router.push("/settings?tab=billing")}
              style={{ background: "#6b7280", color: "#fff", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: "0.9rem", cursor: "pointer" }}
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense>
      <PaymentCallbackContent />
    </Suspense>
  );
}
