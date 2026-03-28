"use client";

import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import styles from "../../auth.module.css";

export default function SignUpPage() {
  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
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
        </div>
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
                },
              }}
              fallbackRedirectUrl="/dashboard"
            />
            <div className={styles.switchText}>
              Already have an account?{" "}
              <Link href="/sign-in" className={styles.switchLink}>
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
