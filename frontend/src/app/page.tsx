"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn } = useUser();

  React.useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isSignedIn, router]);

  if (isSignedIn) return null;

  return (
    <div className={styles.landing}>
      <nav className={styles.nav}>
        <div className={styles.logo}>
          Faith<span>Reach</span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.signInBtn} onClick={() => router.push("/sign-in")}>
            Sign In
          </button>
          <button className={styles.signUpBtn} onClick={() => router.push("/sign-up")}>
            Get Started Free
          </button>
        </div>
      </nav>

      <main className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Amplify Your <span>Faith-Based</span> Content
        </h1>
        <p className={styles.heroSubtitle}>
          Create, schedule, and publish across every platform — powered by AI,
          designed for ministries, churches, and faith-driven creators.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.ctaPrimary} onClick={() => router.push("/sign-up")}>
            Start for Free
          </button>
          <button className={styles.ctaSecondary} onClick={() => router.push("/sign-in")}>
            Sign In
          </button>
        </div>
      </main>

      <section className={styles.features}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>&#9998;</div>
          <h3>AI Content Assistant</h3>
          <p>Generate sermon summaries, devotionals, and social posts with AI tailored for faith content.</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>&#128197;</div>
          <h3>Smart Scheduler</h3>
          <p>Plan your content calendar and auto-publish at the best times for maximum engagement.</p>
        </div>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>&#128200;</div>
          <h3>Analytics Dashboard</h3>
          <p>Track reach, engagement, and growth across all your connected platforms in one place.</p>
        </div>
      </section>
    </div>
  );
}
