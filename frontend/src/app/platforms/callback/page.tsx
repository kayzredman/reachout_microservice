"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

function CallbackHandler() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processing connection...");

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      const stateParam = searchParams.get("state");

      if (!code || !stateParam) {
        setStatus("error");
        setMessage("Missing authorization code or state. Please try again.");
        return;
      }

      try {
        const stateStr = atob(stateParam.replace(/-/g, "+").replace(/_/g, "/"));
        const { platform, organizationId } = JSON.parse(stateStr);

        const token = await getToken();
        const res = await fetch(`/api/platforms/${organizationId}/callback`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ platform, code }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Connection failed");
        }

        setStatus("success");
        setMessage(`${platform} connected successfully! Redirecting...`);
        setTimeout(() => {
          window.location.href = "/settings";
        }, 2000);
      } catch (e) {
        setStatus("error");
        setMessage(e instanceof Error ? e.message : "Failed to connect platform");
      }
    }

    handleCallback();
  }, [searchParams, getToken]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#f8f9fb",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: 16,
        padding: "48px 40px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
        textAlign: "center",
        maxWidth: 420,
      }}>
        {status === "loading" && (
          <>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "3px solid #e5e7eb", borderTopColor: "#7c3aed",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }} />
            <p style={{ color: "#64748b", fontSize: "1rem" }}>{message}</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "#dcfce7", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: "1.5rem",
            }}>✓</div>
            <p style={{ color: "#16a34a", fontWeight: 600, fontSize: "1.1rem" }}>{message}</p>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "#fee2e2", display: "flex",
              alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px", fontSize: "1.5rem",
            }}>✗</div>
            <p style={{ color: "#dc2626", fontWeight: 600, fontSize: "1rem" }}>{message}</p>
            <button
              onClick={() => window.location.href = "/settings"}
              style={{
                marginTop: 16, padding: "10px 24px", borderRadius: 8,
                border: "none", background: "#181b20", color: "#fff",
                fontWeight: 600, cursor: "pointer",
              }}
            >
              Back to Settings
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function PlatformCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", background: "#f8f9fb",
      }}>
        <p style={{ color: "#64748b" }}>Loading...</p>
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
