"use client";

import UserMenu from "./UserMenu";
import { usePathname } from "next/navigation";

export default function ClientUserMenuWrapper() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  if (isHome) return null;
  return <UserMenu />;
}
