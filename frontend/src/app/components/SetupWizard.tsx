"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import styles from "./setup-wizard.module.css";

type Step = "welcome" | "profile" | "platforms" | "post" | "ai" | "plan" | "done";

const STEPS: Step[] = ["welcome", "profile", "platforms", "post", "ai", "plan", "done"];
const STORAGE_KEY = "faithreach_wizard";

interface WizardState {
  dismissed: boolean;
  completed: boolean;
  currentStep: number;
  stepsDone: Record<string, boolean>;
}

function loadState(): WizardState {
  if (typeof window === "undefined") return { dismissed: false, completed: false, currentStep: 0, stepsDone: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { dismissed: false, completed: false, currentStep: 0, stepsDone: {} };
}

function saveState(state: WizardState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export default function SetupWizard() {
  const { isSignedIn, getToken } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [wizState, setWizState] = useState<WizardState>(loadState);
  const [step, setStep] = useState<Step>(STEPS[wizState.currentStep] || "welcome");

  // Live data checks
  const [hasProfile, setHasProfile] = useState(false);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [hasPosts, setHasPosts] = useState(false);
  const [hasSub, setHasSub] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [profileBio, setProfileBio] = useState("");
  const [profileRole, setProfileRole] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");

  const orgId = organization?.id || "";

  // Fetch progress on mount
  const fetchProgress = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const token = await getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const [profileRes, platformRes, postsRes, billingRes] = await Promise.allSettled([
        fetch(`/api/users/${orgId}/profile`, { headers }),
        fetch(`/api/platforms/${orgId}`, { headers }),
        fetch(`/api/posts/${orgId}?limit=1`, { headers }),
        fetch(`/api/billing/${orgId}/subscription`, { headers }),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        const data = await profileRes.value.json();
        setHasProfile(!!(data?.bio || data?.displayName));
      }

      if (platformRes.status === "fulfilled" && platformRes.value.ok) {
        const data = await platformRes.value.json();
        const connected = Array.isArray(data) ? data.map((p: { platform: string }) => p.platform) : [];
        setPlatforms(connected);
      }

      if (postsRes.status === "fulfilled" && postsRes.value.ok) {
        const data = await postsRes.value.json();
        setHasPosts(Array.isArray(data) ? data.length > 0 : false);
      }

      if (billingRes.status === "fulfilled" && billingRes.value.ok) {
        const data = await billingRes.value.json();
        setHasSub(!!(data?.planId || data?.status === "active"));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [orgId, getToken]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Persist state
  useEffect(() => {
    saveState(wizState);
  }, [wizState]);

  // Auto-hide tooltip after 6s
  useEffect(() => {
    const t = setTimeout(() => setShowTooltip(false), 6000);
    return () => clearTimeout(t);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Don't render if not signed in, dismissed, or completed
  if (!isSignedIn) return null;
  if (wizState.dismissed || wizState.completed) return null;

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length - 1; // exclude "done" from count
  const progress = Math.round((stepIndex / totalSteps) * 100);
  const stepsRemaining = [
    !hasProfile && "profile",
    platforms.length === 0 && "platforms",
    !hasPosts && "post",
    !hasSub && "plan",
  ].filter(Boolean).length;

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) {
      setStep(next);
      setWizState((s) => ({ ...s, currentStep: stepIndex + 1 }));
    }
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) {
      setStep(prev);
      setWizState((s) => ({ ...s, currentStep: stepIndex - 1 }));
    }
  }

  function dismiss() {
    setWizState((s) => ({ ...s, dismissed: true }));
    setOpen(false);
  }

  function finish() {
    setWizState((s) => ({ ...s, completed: true }));
    setOpen(false);
  }

  function navigateTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  // ─── Render helpers ───

  function renderDots() {
    return (
      <div className={styles.stepDots}>
        {STEPS.slice(0, -1).map((s, i) => (
          <div
            key={s}
            className={i < stepIndex ? styles.dotDone : i === stepIndex ? styles.dotCurrent : styles.dotTodo}
          />
        ))}
      </div>
    );
  }

  function renderProgress() {
    const isComplete = step === "done";
    return (
      <div className={styles.progressWrap}>
        <div className={styles.progressTrack}>
          <div
            className={isComplete ? styles.progressFillGreen : styles.progressFillOrange}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className={styles.progressLabel}>
          {isComplete ? "Complete!" : `Step ${stepIndex} of ${totalSteps}`}
        </div>
      </div>
    );
  }

  // ─── Step screens ───

  function renderWelcome() {
    const items = [
      { label: "Complete your profile", done: hasProfile, key: "profile" },
      { label: "Connect your platforms", done: platforms.length > 0, key: "platforms" },
      { label: "Create your first post", done: hasPosts, key: "post" },
      { label: "Try the AI assistant", done: false, key: "ai" },
      { label: "Choose your plan", done: hasSub, key: "plan" },
    ];

    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>👋 Welcome to FaithReach!</div>
          <div className={styles.headerSub}>Let&apos;s get your ministry set up — it only takes 2 minutes</div>
        </div>
        {renderDots()}
        <div className={styles.body}>
          <h4>Here&apos;s what we&apos;ll set up:</h4>
          <ul className={styles.checklist}>
            {items.map((it, i) => (
              <li key={it.key} className={styles.checkItem}>
                <span className={it.done ? styles.checkDone : (i === items.findIndex(x => !x.done) ? styles.checkCurrent : styles.checkTodo)}>
                  {it.done ? "✓" : (i === items.findIndex(x => !x.done) ? "→" : "○")}
                </span>
                {it.label}
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={dismiss}>I&apos;ll do this later</button>
          <button className={styles.btnPrimary} onClick={goNext}>Let&apos;s Go! →</button>
        </div>
      </>
    );
  }

  function renderProfile() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>👤 Complete Your Profile</div>
          <div className={styles.headerSub}>Help your community know who you are</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <div className={styles.fieldGroup}>
            <label>Ministry / Organization Name</label>
            <input
              type="text"
              placeholder="e.g. Grace Community Church"
              defaultValue={organization?.name || ""}
              readOnly={!!organization?.name}
            />
          </div>
          <div className={styles.fieldGroup}>
            <label>Your Role</label>
            <select value={profileRole} onChange={(e) => setProfileRole(e.target.value)}>
              <option value="">Select your role...</option>
              <option value="pastor">Pastor / Minister</option>
              <option value="creator">Content Creator</option>
              <option value="media">Media Team Lead</option>
              <option value="admin">Church Administrator</option>
              <option value="worship">Worship Leader</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className={styles.fieldGroup}>
            <label>Short Bio</label>
            <textarea
              placeholder="Tell your audience about your ministry..."
              value={profileBio}
              onChange={(e) => setProfileBio(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={goNext}>Skip for now</button>
          <button className={styles.btnPrimary} onClick={() => { navigateTo("/profile"); }}>
            Edit Full Profile →
          </button>
        </div>
      </>
    );
  }

  function renderPlatforms() {
    const allPlatforms = [
      { key: "Facebook", icon: "📘", label: "Facebook" },
      { key: "Instagram", icon: "📸", label: "Instagram" },
      { key: "X", icon: "🐦", label: "X (Twitter)" },
      { key: "YouTube", icon: "▶️", label: "YouTube" },
      { key: "WhatsApp", icon: "💬", label: "WhatsApp" },
    ];

    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>🔗 Connect Your Platforms</div>
          <div className={styles.headerSub}>Publish to all your channels from one place</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <p>Connect at least one platform to start publishing. You can always add more later.</p>
          <div className={styles.platformGrid}>
            {allPlatforms.map((p) => {
              const connected = platforms.includes(p.key);
              return (
                <div
                  key={p.key}
                  className={`${styles.platformCard} ${connected ? styles.platformConnected : ""}`}
                  onClick={() => !connected && navigateTo("/settings")}
                >
                  <span className={styles.platformIcon}>{p.icon}</span>
                  <div>
                    <div>{p.label}</div>
                    {connected && <div className={styles.platformStatus}>✓ Connected</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={goNext}>Skip for now</button>
          <button className={styles.btnPrimary} onClick={() => navigateTo("/settings")}>
            Connect in Settings →
          </button>
        </div>
      </>
    );
  }

  function renderPost() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>✏️ Create Your First Post</div>
          <div className={styles.headerSub}>Share something with your community</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <p>Write a quick post or let our AI help you craft one.</p>
          <div className={styles.miniComposer}>
            <textarea placeholder="What's on your heart today? Share a verse, thought, or announcement..." />
            <div className={styles.miniComposerBar}>
              <div className={styles.composerIcons}>📷 🎥 📎</div>
              <button className={styles.btnAction}>✨ AI Assist</button>
            </div>
          </div>
          <div className={styles.btnRow}>
            <button className={styles.btnSecondary} onClick={() => navigateTo("/post")}>Open Full Editor →</button>
            <button className={styles.btnPrimary} onClick={goNext}>Continue →</button>
          </div>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={goNext}>Skip for now</button>
          <span />
        </div>
      </>
    );
  }

  function renderAI() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>🤖 Meet Your AI Assistant</div>
          <div className={styles.headerSub}>Content creation, powered by faith + intelligence</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <p>Try a quick example — give the AI a topic and watch it generate content for your ministry:</p>
          <div className={styles.fieldGroup}>
            <label>Give me a topic</label>
            <input
              type="text"
              defaultValue="Sunday sermon on finding peace in storms"
              style={{ color: "#7c3aed", fontWeight: 500 }}
            />
          </div>
          <div className={styles.aiDemo}>
            <div className={styles.aiDemoLabel}>✨ AI Generated Preview</div>
            <div className={styles.aiDemoOutput}>
              &ldquo;In the midst of life&apos;s storms, remember — the same God who calmed the sea of Galilee
              is with you right now. Peace isn&apos;t the absence of storms; it&apos;s His presence in them. 🕊️
              #Faith #Peace #Sunday&rdquo;
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#888" }}>
            The AI adapts to your ministry&apos;s voice and style over time.
          </p>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={goNext}>Skip for now</button>
          <button className={styles.btnPrimary} onClick={goNext}>Amazing! Continue →</button>
        </div>
      </>
    );
  }

  function renderPlan() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>💎 Choose Your Plan</div>
          <div className={styles.headerSub}>Start free, upgrade when you&apos;re ready</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <div className={styles.planGrid}>
            <div
              className={`${styles.planCard} ${selectedPlan === "free" ? styles.planCardSelected : ""}`}
              onClick={() => setSelectedPlan("free")}
            >
              <div className={styles.planName}>🆓 Starter</div>
              <div className={styles.planPrice}>Free</div>
              <div className={styles.planPriceSub}>Forever</div>
              <div className={styles.planFeatures}>
                ✓ 3 platforms<br />
                ✓ 10 posts/month<br />
                ✓ Basic analytics<br />
                ✓ Email support
              </div>
            </div>
            <div
              className={`${styles.planCard} ${selectedPlan === "pro" ? styles.planCardSelected : ""}`}
              onClick={() => setSelectedPlan("pro")}
            >
              <div className={styles.planName}>⭐ Ministry Pro</div>
              <div className={styles.planPrice}>$19</div>
              <div className={styles.planPriceSub}>per month</div>
              <div className={styles.planFeatures}>
                ✓ Unlimited platforms<br />
                ✓ Unlimited posts<br />
                ✓ AI assistant<br />
                ✓ Advanced analytics<br />
                ✓ Priority support<br />
                ✓ Content planner
              </div>
            </div>
          </div>
          <p style={{ fontSize: 11, color: "#888", textAlign: "center" }}>
            No credit card required for Starter. Upgrade anytime.
          </p>
        </div>
        <div className={styles.footer}>
          <button className={styles.btnSkip} onClick={goNext}>Stay on Free</button>
          <button className={styles.btnPrimary} onClick={() => {
            if (selectedPlan === "pro") navigateTo("/payment/checkout");
            else goNext();
          }}>
            {selectedPlan === "pro" ? "Subscribe →" : "Continue →"}
          </button>
        </div>
      </>
    );
  }

  function renderDone() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerGreen}`}>
          <button className={styles.closeBtn} onClick={() => { finish(); }}>✕</button>
          <div className={styles.headerTitle}>🎉 You&apos;re All Set!</div>
          <div className={styles.headerSub}>Your ministry is ready to reach the world</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <div className={styles.celebration}>
            <div className={styles.confetti}>
              <span className={styles.confettiPiece}>🎊</span>
              <span className={styles.confettiPiece}>✨</span>
              <span className={styles.confettiPiece}>🎉</span>
              <span className={styles.confettiPiece}>⭐</span>
              <span className={styles.confettiPiece}>🎊</span>
            </div>
            <div className={styles.celebrationEmoji}>🙌</div>
            <h4>Welcome to FaithReach!</h4>
            <p>
              Your profile is set, platforms are connected, and you&apos;re ready to create
              impactful content for your community.
            </p>
          </div>
          <ul className={styles.checklist}>
            <li className={styles.checkItem}>
              <span className={styles.checkDone}>✓</span> Profile completed
            </li>
            <li className={styles.checkItem}>
              <span className={styles.checkDone}>✓</span> Platforms connected
            </li>
            <li className={styles.checkItem}>
              <span className={styles.checkDone}>✓</span> First post created
            </li>
            <li className={styles.checkItem}>
              <span className={styles.checkDone}>✓</span> AI assistant explored
            </li>
            <li className={styles.checkItem}>
              <span className={styles.checkDone}>✓</span> Plan selected
            </li>
          </ul>
        </div>
        <div className={styles.footer}>
          <span />
          <button className={`${styles.btnPrimary} ${styles.btnGreen}`} onClick={finish}>
            Go to Dashboard 🚀
          </button>
        </div>
      </>
    );
  }

  const RENDERERS: Record<Step, () => React.JSX.Element> = {
    welcome: renderWelcome,
    profile: renderProfile,
    platforms: renderPlatforms,
    post: renderPost,
    ai: renderAI,
    plan: renderPlan,
    done: renderDone,
  };

  return (
    <div className={styles.wrapper}>
      {/* Panel (when open) */}
      {open && (
        <div className={styles.panel} ref={panelRef}>
          {loading ? (
            <>
              <div className={`${styles.header} ${styles.headerPurple}`}>
                <div className={styles.headerTitle}>Loading...</div>
              </div>
              <div className={styles.body} style={{ textAlign: "center", padding: 40 }}>
                <p>Checking your setup progress...</p>
              </div>
            </>
          ) : (
            RENDERERS[step]()
          )}
        </div>
      )}

      {/* Tooltip */}
      {!open && showTooltip && stepsRemaining > 0 && (
        <div className={styles.tooltip}>
          ✨ Complete your setup! ({stepsRemaining} step{stepsRemaining > 1 ? "s" : ""} left)
        </div>
      )}

      {/* FAB */}
      {!open && (
        <button
          className={styles.fab}
          onClick={() => { setOpen(true); setShowTooltip(false); }}
          aria-label="Open setup wizard"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          🚀
          {stepsRemaining > 0 && <span className={styles.badge}>{stepsRemaining}</span>}
        </button>
      )}
    </div>
  );
}
