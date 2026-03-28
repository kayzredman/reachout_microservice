"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import styles from "../../auth.module.css";

export default function SignInPage() {
  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>
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
        </div>
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
                },
              }}
              fallbackRedirectUrl="/dashboard"
            />
            <div className={styles.switchText}>
              Don&apos;t have an account?{" "}
              <Link href="/sign-up" className={styles.switchLink}>
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
