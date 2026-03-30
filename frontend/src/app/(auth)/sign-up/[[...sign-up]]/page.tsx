"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import styles from "../../auth.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.authPage}>
      {/* Normal: brand panel on LEFT, form on RIGHT */}
      <div className={styles.authContainer}>
        {/* ── Brand panel (left side) — pitch sign-in ── */}
        <div className={styles.brandPanel}>
          <div className={styles.brandLogo}>
            Faith<span>Reach</span>
          </div>
          <h1 className={styles.brandTitle}>Welcome back</h1>
          <p className={styles.brandSubtitle}>
            Sign in to manage your content, schedule posts, and grow your
            faith-based community.
          </p>
          <ul className={styles.brandFeatures}>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              Multi-platform publishing
            </li>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              AI-powered content assistant
            </li>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              Analytics &amp; engagement tracking
            </li>
            <li>
              <span className={styles.featureIcon}>&#10003;</span>
              Smart scheduling &amp; planner
            </li>
          </ul>
          <Link href="/sign-in" className={styles.brandCta}>
            Sign In
          </Link>
        </div>

        {/* ── Clerk sign-up form (right side) ── */}
        <div className={styles.clerkPanel}>
          <div>
            <SignUp
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
