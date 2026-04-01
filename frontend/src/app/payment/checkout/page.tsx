"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";
import Script from "next/script";
import Image from "next/image";
import styles from "./checkout.module.css";

/* ── Types ──────────────────────────────────────────────── */
type PaymentMethod = "card" | "momo" | null;
type MomoNetwork = "MTN" | "TELECEL" | "AIRTEL_TIGO";
type CheckoutStatus = "selecting" | "processing" | "otp" | "success" | "failed";

interface FlutterwaveInline {
  setup: (config: Record<string, unknown>) => { open: () => void };
}
declare global {
  interface Window {
    FlutterwaveCheckout?: FlutterwaveInline["setup"];
  }
}

const NETWORKS: { id: MomoNetwork; label: string; icon: string }[] = [
  { id: "MTN", label: "MTN MoMo", icon: "/icons/mtn.svg" },
  { id: "TELECEL", label: "Telecel Cash", icon: "/icons/telecel.svg" },
  { id: "AIRTEL_TIGO", label: "AirtelTigo Money", icon: "/icons/airteltigo.svg" },
];

/* ── Main Checkout Component ────────────────────────────── */
function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // URL params passed from settings page
  const orgId = searchParams.get("orgId") || "";
  const tier = searchParams.get("tier") || "";
  const email = searchParams.get("email") || "";
  const customerName = searchParams.get("name") || "";

  const [method, setMethod] = useState<PaymentMethod>(null);
  const [status, setStatus] = useState<CheckoutStatus>("selecting");
  const [errorMsg, setErrorMsg] = useState("");

  // Shared currency state
  const [currency, setCurrency] = useState("GHS");

  // MoMo form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [network, setNetwork] = useState<MomoNetwork>("MTN");
  const [txRef, setTxRef] = useState("");
  const [flwRef, setFlwRef] = useState("");
  const [otp, setOtp] = useState("");

  // Inline script loaded
  const [flwReady, setFlwReady] = useState(false);

  const tierLabel = tier.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

  // Price display
  const priceMap: Record<string, Record<string, string>> = {
    creator: { USD: "$9.99", GHS: "GHS 120", NGN: "₦8,000", KES: "KSh 1,300" },
    ministry_pro: { USD: "$29.99", GHS: "GHS 350", NGN: "₦24,000", KES: "KSh 3,900" },
  };
  const displayPrice = priceMap[tier]?.[currency] || priceMap[tier]?.["USD"] || "";

  /* ── Card payment via Flutterwave Inline ──────────────── */
  const handleCardPayment = useCallback(async () => {
    setStatus("processing");
    setErrorMsg("");

    try {
      // Initialize payment on backend to get txRef
      const res = await fetch("/api/payment/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          tier,
          email,
          customerName,
          currency,
          redirectUrl: `${window.location.origin}/payment/callback`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.txRef) throw new Error(data.message || "Failed to initialize");

      setTxRef(data.txRef);

      // Open Flutterwave inline modal
      if (!window.FlutterwaveCheckout) {
        throw new Error("Payment library not loaded. Please refresh and try again.");
      }

      window.FlutterwaveCheckout({
        public_key: process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY || "",
        tx_ref: data.txRef,
        amount: data.amount,
        currency: data.currency,
        payment_options: "card",
        customer: { email, name: customerName },
        customizations: {
          title: "FaithReach",
          description: `Upgrade to ${tierLabel}`,
          // Must be an absolute public URL for Flutterwave to load it
          logo: process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL}/icons/faithreach-logo.svg`
            : `${window.location.origin}/icons/faithreach-logo.svg`,
        },
        callback: () => {
          // Payment done — redirect to callback to verify
          window.location.href = `/payment/callback?tx_ref=${encodeURIComponent(data.txRef)}&status=successful`;
        },
        onclose: () => {
          setStatus("selecting");
        },
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Card payment failed");
      setStatus("failed");
    }
  }, [orgId, tier, email, customerName, tierLabel, currency]);

  /* ── MoMo payment via direct charge ───────────────────── */
  const handleMomoPayment = useCallback(async () => {
    if (!phoneNumber || phoneNumber.length < 9) {
      setErrorMsg("Enter a valid phone number");
      return;
    }

    setStatus("processing");
    setErrorMsg("");

    try {
      const res = await fetch("/api/payment/charge/momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId,
          tier,
          email,
          phoneNumber,
          network,
          currency,
          redirectUrl: `${window.location.origin}/payment/callback`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "MoMo charge failed");

      setTxRef(data.txRef);

      // If we got a flwRef (OTP mode), show OTP input
      if (data.flwRef && data.authMode !== "redirect") {
        setFlwRef(data.flwRef);
        setStatus("otp");
        return;
      }

      // If redirect mode — open in popup and poll for completion
      if (data.redirect) {
        const w = 500;
        const h = 600;
        const left = (window.screen.width - w) / 2;
        const top = (window.screen.height - h) / 2;
        window.open(
          data.redirect,
          "flw_momo_auth",
          `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );
        setStatus("processing");
        pollForCompletion(data.txRef);
        return;
      }

      // Otherwise poll for STK push completion
      pollForCompletion(data.txRef);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Mobile Money charge failed");
      setStatus("failed");
    }
  }, [orgId, tier, email, phoneNumber, network, currency]);

  /* ── Poll for payment completion ──────────────────────── */
  const pollForCompletion = useCallback((ref: string) => {
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds (MoMo approval can take time)

    const check = async () => {
      try {
        const res = await fetch(`/api/payment/verify/${encodeURIComponent(ref)}`);
        const data = await res.json();
        if (data.success) {
          setStatus("success");
          return true;
        }
        if (data.status === "failed") {
          setErrorMsg("Payment was not completed. Please try again.");
          setStatus("failed");
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
        setErrorMsg("Payment verification timed out. Check your phone and try again.");
        setStatus("failed");
      }
    };

    poll();
  }, []);

  /* ── OTP validation ───────────────────────────────────── */
  const handleOtpSubmit = useCallback(async () => {
    if (!otp || otp.length < 4) {
      setErrorMsg("Enter a valid OTP");
      return;
    }

    setStatus("processing");
    setErrorMsg("");

    try {
      const res = await fetch("/api/payment/validate-momo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txRef, otp }),
      });
      const data = await res.json();

      if (data.success) {
        setStatus("success");
      } else {
        setErrorMsg(data.message || "OTP validation failed. Please try again.");
        setStatus("otp"); // Stay on OTP screen to retry
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "OTP validation failed");
      setStatus("failed");
    }
  }, [otp, txRef]);

  /* ── Missing params guard ─────────────────────────────── */
  if (!orgId || !tier || !email) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>⚠️</div>
          <h2 className={styles.title}>Invalid Checkout</h2>
          <p className={styles.subtitle}>Missing required payment information.</p>
          <button className={styles.btnSecondary} onClick={() => router.push("/settings?tab=billing")}>
            Back to Billing
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Script
        src="https://checkout.flutterwave.com/v3.js"
        onLoad={() => setFlwReady(true)}
      />

      <div className={styles.card}>
        {/* ── Header ────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.logoWrap}>
            <Image src="/icons/faithreach-logo.svg" alt="FaithReach" width={200} height={48} className={styles.logoImg} />
          </div>
          <h2 className={styles.title}>Upgrade to {tierLabel}</h2>
          <p className={styles.subtitle}>Choose how you&apos;d like to pay</p>
        </div>

        {/* ── Selecting payment method ──────────────────── */}
        {status === "selecting" && (
          <>
            {/* Method cards */}
            <div className={styles.methodGrid}>
              <button
                className={`${styles.methodCard} ${method === "card" ? styles.methodCardActive : ""}`}
                onClick={() => { setMethod("card"); setErrorMsg(""); }}
              >
                <div className={styles.methodIconWrap}>
                  <svg width="36" height="28" viewBox="0 0 36 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="35" height="27" rx="4.5" fill="#F3F4F6" stroke="#D1D5DB"/>
                    <rect x="0" y="6" width="36" height="5" fill="#374151"/>
                    <rect x="4" y="16" width="12" height="3" rx="1.5" fill="#D1D5DB"/>
                    <rect x="4" y="21" width="8" height="2" rx="1" fill="#E5E7EB"/>
                    <circle cx="27" cy="19" r="4" fill="#EF4444" opacity="0.8"/>
                    <circle cx="31" cy="19" r="4" fill="#F59E0B" opacity="0.8"/>
                  </svg>
                </div>
                <span className={styles.methodLabel}>Card</span>
                <span className={styles.methodDesc}>Visa, Mastercard</span>
              </button>
              <button
                className={`${styles.methodCard} ${method === "momo" ? styles.methodCardActive : ""}`}
                onClick={() => { setMethod("momo"); setErrorMsg(""); }}
              >
                <div className={styles.methodIconWrap}>
                  <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0.5" y="0.5" width="27" height="35" rx="5.5" fill="#F3F4F6" stroke="#D1D5DB"/>
                    <rect x="3" y="4" width="22" height="22" rx="2" fill="#E5E7EB"/>
                    <rect x="6" y="7" width="16" height="16" rx="1" fill="white"/>
                    <circle cx="14" cy="15" r="4" fill="#7C3AED" opacity="0.2"/>
                    <path d="M12 15l2 2 4-4" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="14" cy="31" r="2" fill="#D1D5DB"/>
                  </svg>
                </div>
                <span className={styles.methodLabel}>Mobile Money</span>
                <span className={styles.methodDesc}>MTN, Telecel, AirtelTigo</span>
              </button>
            </div>

            {/* ── Currency selector (shared) ─────────── */}
            {method && (
              <div className={styles.momoForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Currency</label>
                  <select
                    className={styles.formSelect}
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    <option value="GHS">GHS — Ghana Cedis</option>
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="KES">KES — Kenyan Shilling</option>
                    <option value="USD">USD — US Dollar</option>
                  </select>
                </div>
              </div>
            )}

            {/* ── MoMo form ─────────────────────────────── */}
            {method === "momo" && (
              <div className={styles.momoForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Network</label>
                  <div className={styles.networkGrid}>
                    {NETWORKS.map((n) => (
                      <button
                        key={n.id}
                        className={`${styles.networkBtn} ${network === n.id ? styles.networkBtnActive : ""}`}
                        onClick={() => setNetwork(n.id)}
                        type="button"
                      >
                        <Image src={n.icon} alt={n.label} width={36} height={36} className={styles.networkIcon} />
                        <span className={styles.networkName}>{n.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Phone Number</label>
                  <input
                    type="tel"
                    className={styles.formInput}
                    placeholder="0551234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                    maxLength={12}
                  />
                </div>
              </div>
            )}

            {/* ── Price + Pay button ────────────────────── */}
            {method && (
              <div className={styles.paySection}>
                <div className={styles.priceTag}>
                  <span className={styles.priceLabel}>Total</span>
                  <span className={styles.priceAmount}>{displayPrice}<span className={styles.pricePeriod}>/month</span></span>
                </div>
                <button
                  className={styles.payBtn}
                  onClick={method === "card" ? handleCardPayment : handleMomoPayment}
                  disabled={method === "card" && !flwReady}
                >
                  {method === "card" ? "Pay with Card" : `Pay with ${network} MoMo`}
                </button>
              </div>
            )}

            {errorMsg && <p className={styles.error}>{errorMsg}</p>}

            <button
              className={styles.backLink}
              onClick={() => router.push("/settings?tab=billing")}
            >
              ← Back to Billing
            </button>
          </>
        )}

        {/* ── Processing ────────────────────────────────── */}
        {status === "processing" && (
          <div className={styles.statusBox}>
            <div className={styles.spinner} />
            {method === "momo" ? (
              <>
                <h3 className={styles.statusTitle}>Complete Authorization</h3>
                <p className={styles.statusDesc}>
                  A popup window has opened for you to authorize the payment.
                  <br />Complete the verification there, then come back here.
                </p>
                <p className={styles.statusHint}>
                  Don&apos;t see the popup? <button className={styles.linkBtn} onClick={() => {
                    // Re-open the popup if blocked
                    if (txRef) pollForCompletion(txRef);
                  }}>Check again</button>
                </p>
              </>
            ) : (
              <>
                <h3 className={styles.statusTitle}>Processing Payment…</h3>
                <p className={styles.statusDesc}>Please complete the payment in the popup window.</p>
              </>
            )}
          </div>
        )}

        {/* ── OTP Input ─────────────────────────────────── */}
        {status === "otp" && (
          <div className={styles.statusBox}>
            <div className={styles.otpIcon}>🔐</div>
            <h3 className={styles.statusTitle}>Enter OTP</h3>
            <p className={styles.statusDesc}>
              A one-time password has been sent to <strong>{phoneNumber}</strong>.
              <br />Enter it below to complete your payment.
            </p>
            <div className={styles.otpForm}>
              <input
                type="text"
                className={styles.otpInput}
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                maxLength={6}
                autoFocus
              />
              <button className={styles.payBtn} onClick={handleOtpSubmit}>
                Verify &amp; Pay {displayPrice}
              </button>
            </div>
            {errorMsg && <p className={styles.error}>{errorMsg}</p>}
            <button
              className={styles.backLink}
              onClick={() => { setStatus("selecting"); setOtp(""); setErrorMsg(""); }}
            >
              ← Start Over
            </button>
          </div>
        )}

        {/* ── Success ───────────────────────────────────── */}
        {status === "success" && (
          <div className={styles.statusBox}>
            <div className={styles.successIcon}>✓</div>
            <h3 className={styles.statusTitle} style={{ color: "#059669" }}>Payment Successful!</h3>
            <p className={styles.statusDesc}>
              You&apos;ve been upgraded to <strong>{tierLabel}</strong>. Enjoy your new features!
            </p>
            <button className={styles.payBtn} onClick={() => router.push("/settings?tab=billing")}>
              Go to Billing Settings
            </button>
          </div>
        )}

        {/* ── Failed ────────────────────────────────────── */}
        {status === "failed" && (
          <div className={styles.statusBox}>
            <div className={styles.failedIcon}>✕</div>
            <h3 className={styles.statusTitle} style={{ color: "#dc2626" }}>Payment Failed</h3>
            <p className={styles.statusDesc}>
              {errorMsg || "Something went wrong. If money was deducted, it will be refunded automatically."}
            </p>
            <div className={styles.failedActions}>
              <button className={styles.payBtn} onClick={() => { setStatus("selecting"); setErrorMsg(""); }}>
                Try Again
              </button>
              <button className={styles.btnSecondary} onClick={() => router.push("/settings?tab=billing")}>
                Back to Settings
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────── */}
        <div className={styles.footer}>
          <span className={styles.secureIcon}>🔒</span> Secured by Flutterwave
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutContent />
    </Suspense>
  );
}
