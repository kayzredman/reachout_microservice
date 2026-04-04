"use client";
import { useRouter } from 'next/navigation';
import '../../auth-panel.css';

export default function SignUpPage() {
  const router = useRouter();
  return (
    <div className="auth-panel-bg">
      <div className="auth-panel-container">
        <div className="auth-panel-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 8, color: '#fff' }}>Sign Up</h2>
          <p style={{ color: '#bfc4ca', marginBottom: 32, fontSize: '1.1rem' }}>
            Create your account to get started and unlock all features.
          </p>
          <button
            type="button"
            style={{
              background: '#2de1fc',
              color: '#181b20',
              border: 'none',
              borderRadius: 24,
              padding: '12px 40px',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              marginTop: 8,
              marginBottom: 16,
              transition: 'background 0.2s',
              width: '100%',
              maxWidth: 220,
            }}
            onClick={() => router.push('/sign-up/clerk')}
          >
            SIGN UP
          </button>
        </div>
        <div className="auth-panel-side" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2>Welcome Back!</h2>
          <p>Already have an account? Sign in to continue your journey with us.</p>
          <button
            type="button"
            style={{
              background: '#2de1fc',
              color: '#181b20',
              border: 'none',
              borderRadius: 24,
              padding: '12px 40px',
              fontWeight: 700,
              fontSize: '1.1rem',
              cursor: 'pointer',
              marginTop: 8,
              marginBottom: 16,
              transition: 'background 0.2s',
              width: '100%',
              maxWidth: 220,
            }}
            onClick={() => router.push('/sign-in')}
          >
            SIGN IN
          </button>
        </div>
      </div>
    </div>
  );
}
