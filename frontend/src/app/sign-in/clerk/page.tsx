"use client";
import { SignIn } from "@clerk/nextjs";

export default function ClerkSignInPage() {
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
      <SignIn 
        appearance={{ elements: { card: { boxShadow: "0 8px 32px rgba(24,27,32,0.18)", borderRadius: 24 } } }} 
      />
    </div>
  );
}
