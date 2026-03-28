"use client";

import { UserButton, SignInButton, useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";


export default function UserMenu() {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const signInButtonChild = (
    <button
      type="button"
      style={{
        background: "#2de1fc",
        color: "#181b20",
        border: "none",
        borderRadius: 24,
        padding: "10px 28px",
        fontWeight: 700,
        fontSize: "1rem",
        cursor: "pointer"
      }}
    >
      Sign In
    </button>
  );

  if (isSignedIn) {
    return <div style={{ position: "fixed", top: 16, right: 24, zIndex: 200 }}><UserButton /></div>;
  }

  if (!isHome) {
    return <div style={{ position: "fixed", top: 16, right: 24, zIndex: 200 }}><SignInButton mode="modal">{signInButtonChild}</SignInButton></div>;
  }

  return null;
}
