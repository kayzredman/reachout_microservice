"use client";
import { SignUp } from "@clerk/nextjs";

export default function ClerkSignUpPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        background: `url('/reachoutbkg.png') center center / cover no-repeat fixed`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <SignUp appearance={{ elements: { card: { boxShadow: "0 8px 32px rgba(24,27,32,0.18)", borderRadius: 24 } } }} />
    </div>
  );
}
