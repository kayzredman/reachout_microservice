"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import styles from "../../auth.module.css";

export default function SignInPage() {
  return (
    <div className={styles.authPage}>
      {/* Reversed: form on LEFT, brand panel on RIGHT */}
      <div className={styles.authContainerReversed}>
        {/* ── Brand panel (right side) — pitch sign-up ── */}
        <div className={styles.brandPanel}>
          <div className={styles.brandLogo}>
            Faith<span>Reach</span>
          </div>
          <h1 className={styles.brandTitle}>Get started free</h1>
          <p className={styles.brandSubtitle}>
            Create your account and start reaching your community with
            faith-driven content in minutes.
          </p>
          <ul className={styles.brandFeatures}>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              No credit card required
            </li>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              Set up in under 2 minutes
            </li>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              Connect your social accounts
            </li>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              Start publishing immediately
            </li>
          </ul>
          <Link href="/sign-up" className={styles.brandCta}>
            Sign Up
          </Link>
        </div>

        {/* ── Clerk sign-in form (left side) ── */}
        <div className={styles.clerkPanel}>
          <div>
            <SignIn
              appearance={{
                elements: {
                  rootBox: { width: "100%" },
                  card: {
                    boxShadow: "none",
                    border: "none",
                    width: "100%",
                  },
                  socialButtonsIconButton: {
                    border: "1px solid #e2e8f0",
                    borderRadius: "50%",
                    width: "40px",
                    height: "40px",
                  },
                },
                layout: {
                  socialButtonsPlacement: "top",
                  socialButtonsVariant: "iconButton",
                },
              }}
              fallbackRedirectUrl="/dashboard"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
