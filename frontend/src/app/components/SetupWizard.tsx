"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth, useOrganization, useUser } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";
import {
  FaFacebook,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
  FaWhatsapp,
} from "react-icons/fa6";
import { HiOutlineArrowLeft } from "react-icons/hi";
import styles from "./setup-wizard.module.css";

type Step = "welcome" | "profile" | "platforms" | "post" | "ai" | "plan" | "done";

const STEPS: Step[] = ["welcome", "profile", "platforms", "post", "ai", "plan", "done"];
const STORAGE_KEY = "faithreach_wizard";

interface WizardState {
  dismissed: boolean;
  completed: boolean;
  currentStep: number;
}

function loadState(): WizardState {
  if (typeof window === "undefined") return { dismissed: false, completed: false, currentStep: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { dismissed: false, completed: false, currentStep: 0 };
}

function saveState(state: WizardState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const PLATFORM_META = [
  { key: "Facebook", icon: <FaFacebook color="#1877F2" size={22} />, label: "Facebook" },
  { key: "Instagram", icon: <FaInstagram color="#E4405F" size={22} />, label: "Instagram" },
  { key: "X", icon: <FaXTwitter color="#000" size={22} />, label: "X (Twitter)" },
  { key: "YouTube", icon: <FaYoutube color="#FF0000" size={22} />, label: "YouTube" },
  { key: "WhatsApp", icon: <FaWhatsapp color="#25D366" size={22} />, label: "WhatsApp" },
];

export default function SetupWizard() {
  const { isSignedIn, getToken } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();
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
  const [profileRole, setProfileRole] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro">("free");

  // Drag state
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const orgId = organization?.id || "";

  // ─── Fetch real progress from APIs ───
  const fetchProgress = useCallback(async () => {
    if (!orgId) { setLoading(false); return; }
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

      // Profile: check for real data
      let profileDone = false;
      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        try {
          const data = await profileRes.value.json();
          profileDone = !!(data?.bio || data?.displayName || data?.role);
        } catch { /* not valid json */ }
      }
      setHasProfile(profileDone);

      // Platforms: check array has items
      let connectedPlatforms: string[] = [];
      if (platformRes.status === "fulfilled" && platformRes.value.ok) {
        try {
          const data = await platformRes.value.json();
          if (Array.isArray(data)) {
            connectedPlatforms = data
              .filter((p: { platform?: string; connected?: boolean }) => p.platform)
              .map((p: { platform: string }) => p.platform);
          }
        } catch { /* not valid json */ }
      }
      setPlatforms(connectedPlatforms);

      // Posts: check array has at least 1
      let postsDone = false;
      if (postsRes.status === "fulfilled" && postsRes.value.ok) {
        try {
          const data = await postsRes.value.json();
          if (Array.isArray(data)) postsDone = data.length > 0;
          else if (data?.data && Array.isArray(data.data)) postsDone = data.data.length > 0;
          else if (data?.total) postsDone = data.total > 0;
        } catch { /* not valid json */ }
      }
      setHasPosts(postsDone);

      // Billing: check for active subscription
      let subDone = false;
      if (billingRes.status === "fulfilled" && billingRes.value.ok) {
        try {
          const data = await billingRes.value.json();
          subDone = !!(data?.planId || data?.status === "active");
        } catch { /* not valid json */ }
      }
      setHasSub(subDone);
    } catch { /* network error */ }
    setLoading(false);
  }, [orgId, getToken]);

  // Re-fetch when wizard opens or when returning from a page
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress, pathname]);

  // Persist state
  useEffect(() => { saveState(wizState); }, [wizState]);

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

  // ─── Drag logic ───
  const onDragStart = useCallback((e: React.MouseEvent) => {
    const wrapper = panelRef.current?.parentElement;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: rect.left, origY: rect.top };
    e.preventDefault();
  }, []);

  useEffect(() => {
    if (!dragRef.current) return;
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
    };
    const onUp = () => { dragRef.current = null; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  // Don't render if not signed in, dismissed, or completed
  if (!isSignedIn) return null;
  if (wizState.dismissed || wizState.completed) return null;

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length - 1; // exclude "done" from count
  const progress = Math.round((stepIndex / totalSteps) * 100);

  // Real verification — count only truly incomplete steps
  const stepsRemaining = [
    !hasProfile,
    platforms.length === 0,
    !hasPosts,
    !hasSub,
  ].filter(Boolean).length;

  function goTo(s: Step) {
    const idx = STEPS.indexOf(s);
    setStep(s);
    setWizState((prev) => ({ ...prev, currentStep: idx }));
  }

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) goTo(next);
  }

  function goBack() {
    const prev = STEPS[stepIndex - 1];
    if (prev) goTo(prev);
  }

  function dismiss() {
    setWizState((s) => ({ ...s, dismissed: true }));
    setOpen(false);
  }

  function finish() {
    setWizState((s) => ({ ...s, completed: true }));
    setOpen(false);
    router.push("/dashboard");
  }

  function navigateTo(path: string) {
    setOpen(false);
    router.push(path);
  }

  // ─── Render helpers ───
  function renderBackBtn() {
    if (stepIndex <= 0) return <span />;
    return (
      <button className={styles.btnBack} onClick={goBack} aria-label="Go back">
        <HiOutlineArrowLeft size={16} /> Back
      </button>
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

  function renderDragHandle() {
    return (
      <div className={styles.dragHandle} onMouseDown={onDragStart} title="Drag to move">
        ⠿
      </div>
    );
  }

  // ─── Step screens ───

  function renderWelcome() {
    const items = [
      { label: "Complete your profile", done: hasProfile, key: "profile" as Step },
      { label: "Connect your platforms", done: platforms.length > 0, key: "platforms" as Step },
      { label: "Create your first post", done: hasPosts, key: "post" as Step },
      { label: "Try the AI assistant", done: false, key: "ai" as Step },
      { label: "Choose your plan", done: hasSub, key: "plan" as Step },
    ];

    const incomplete = items.filter((i) => !i.done).length;

    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>👋 Welcome to FaithReach!</div>
          <div className={styles.headerSub}>Let&apos;s get your ministry set up — it only takes 2 minutes</div>
        </div>
        <div className={styles.body}>
          <h4>Here&apos;s what we&apos;ll set up:</h4>
          {incomplete > 0 && (
            <p className={styles.encourageMsg}>
              🌟 Complete all {incomplete} remaining step{incomplete > 1 ? "s" : ""} to unlock the full FaithReach experience!
            </p>
          )}
          <ul className={styles.checklist}>
            {items.map((it) => {
              const isCurrent = !it.done && items.findIndex((x) => !x.done) === items.indexOf(it);
              return (
                <li
                  key={it.key}
                  className={`${styles.checkItem} ${!it.done ? styles.checkItemClickable : ""}`}
                  onClick={() => !it.done && goTo(it.key)}
                >
                  <span className={it.done ? styles.checkDone : isCurrent ? styles.checkCurrent : styles.checkTodo}>
                    {it.done ? "✓" : isCurrent ? "→" : "○"}
                  </span>
                  <span style={it.done ? { textDecoration: "line-through", opacity: 0.6 } : {}}>
                    {it.label}
                  </span>
                </li>
              );
            })}
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
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>👤 Complete Your Profile</div>
          <div className={styles.headerSub}>Help your community know who you are</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          {hasProfile ? (
            <div className={styles.stepDoneNotice}>
              ✅ Profile already completed! You can update it anytime from the Profile page.
            </div>
          ) : (
            <p className={styles.encourageMsg}>
              A complete profile helps your community connect with your ministry.
            </p>
          )}
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
          {renderBackBtn()}
          <button className={styles.btnPrimary} onClick={() => navigateTo("/profile")}>
            {hasProfile ? "Update Profile →" : "Edit Full Profile →"}
          </button>
        </div>
      </>
    );
  }

  function renderPlatforms() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>🔗 Connect Your Platforms</div>
          <div className={styles.headerSub}>Publish to all your channels from one place</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          {platforms.length > 0 ? (
            <p className={styles.stepDoneNotice}>
              ✅ {platforms.length} platform{platforms.length > 1 ? "s" : ""} connected! Add more anytime.
            </p>
          ) : (
            <p className={styles.encourageMsg}>
              Connect at least one platform to start publishing to your community.
            </p>
          )}
          <div className={styles.platformGrid}>
            {PLATFORM_META.map((p) => {
              const connected = platforms.includes(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  className={`${styles.platformCard} ${connected ? styles.platformConnected : ""}`}
                  onClick={() => navigateTo("/settings")}
                >
                  <span className={styles.platformIcon}>{p.icon}</span>
                  <div>
                    <div>{p.label}</div>
                    {connected && <div className={styles.platformStatus}>✓ Connected</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className={styles.footer}>
          {renderBackBtn()}
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
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>✏️ Create Your First Post</div>
          <div className={styles.headerSub}>Share something with your community</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          {hasPosts ? (
            <div className={styles.stepDoneNotice}>
              ✅ You&apos;ve already created posts! Keep the momentum going.
            </div>
          ) : (
            <p className={styles.encourageMsg}>
              Your first post is how your community hears from you. Let our AI help!
            </p>
          )}
          <div className={styles.miniComposer}>
            <textarea placeholder="What's on your heart today? Share a verse, thought, or announcement..." />
            <div className={styles.miniComposerBar}>
              <div className={styles.composerIcons}>📷 🎥 📎</div>
              <button className={styles.btnAction} type="button">✨ AI Assist</button>
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          {renderBackBtn()}
          <button className={styles.btnPrimary} onClick={() => navigateTo("/post")}>
            {hasPosts ? "Create Another Post →" : "Open Full Editor →"}
          </button>
        </div>
      </>
    );
  }

  function renderAI() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>🤖 Meet Your AI Assistant</div>
          <div className={styles.headerSub}>Content creation, powered by faith + intelligence</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          <p className={styles.encourageMsg}>
            Try a quick example — give the AI a topic and watch it generate content:
          </p>
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
          {renderBackBtn()}
          <button className={styles.btnPrimary} onClick={goNext}>Amazing! Continue →</button>
        </div>
      </>
    );
  }

  function renderPlan() {
    return (
      <>
        <div className={`${styles.header} ${styles.headerPurple}`}>
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>💎 Choose Your Plan</div>
          <div className={styles.headerSub}>Start free, upgrade when you&apos;re ready</div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          {hasSub ? (
            <div className={styles.stepDoneNotice}>
              ✅ You already have an active plan! You can change it anytime.
            </div>
          ) : (
            <p className={styles.encourageMsg}>
              Pick a plan that works for your ministry. Start free — upgrade anytime.
            </p>
          )}
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
        </div>
        <div className={styles.footer}>
          {renderBackBtn()}
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
    // Show real verification status
    const checks = [
      { label: "Profile completed", done: hasProfile },
      { label: "Platforms connected", done: platforms.length > 0 },
      { label: "First post created", done: hasPosts },
      { label: "AI assistant explored", done: true },
      { label: "Plan selected", done: hasSub },
    ];
    const incomplete = checks.filter((c) => !c.done);

    return (
      <>
        <div className={`${styles.header} ${incomplete.length === 0 ? styles.headerGreen : styles.headerPurple}`}>
          {renderDragHandle()}
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>✕</button>
          <div className={styles.headerTitle}>
            {incomplete.length === 0 ? "🎉 You're All Set!" : "📋 Setup Summary"}
          </div>
          <div className={styles.headerSub}>
            {incomplete.length === 0
              ? "Your ministry is ready to reach the world"
              : `${incomplete.length} step${incomplete.length > 1 ? "s" : ""} still need attention`}
          </div>
        </div>
        {renderProgress()}
        <div className={styles.body}>
          {incomplete.length === 0 ? (
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
          ) : (
            <p className={styles.encourageMsg}>
              🌟 You&apos;re almost there! Complete the remaining steps for the best experience.
            </p>
          )}
          <ul className={styles.checklist}>
            {checks.map((c) => (
              <li key={c.label} className={styles.checkItem}>
                <span className={c.done ? styles.checkDone : styles.checkTodo}>
                  {c.done ? "✓" : "○"}
                </span>
                <span style={!c.done ? { color: "#e65100", fontWeight: 500 } : {}}>
                  {c.label} {!c.done && "— not done yet"}
                </span>
              </li>
            ))}
          </ul>
          {incomplete.length > 0 && (
            <button
              className={styles.btnSecondary}
              style={{ marginTop: 12, width: "100%" }}
              onClick={() => goTo("welcome")}
            >
              ← Go back and complete setup
            </button>
          )}
        </div>
        <div className={styles.footer}>
          {renderBackBtn()}
          <button
            className={`${styles.btnPrimary} ${incomplete.length === 0 ? styles.btnGreen : ""}`}
            onClick={() => { finish(); }}
          >
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

  const wrapperStyle: React.CSSProperties = pos
    ? { position: "fixed", left: pos.x, top: pos.y, bottom: "auto", zIndex: 9998 }
    : {};

  return (
    <div className={styles.wrapper} style={wrapperStyle}>
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
          onClick={() => { setOpen(true); setShowTooltip(false); fetchProgress(); }}
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
