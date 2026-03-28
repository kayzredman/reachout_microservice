"use client";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import styles from "./layout.module.css";

export default function HideSidebarOnHome({ children }: { children: React.ReactNode }) {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const showSidebar = isSignedIn && pathname !== "/";
  return (
    <>
      {showSidebar && <Sidebar />}
      <main className={styles.mainContent}>{children}</main>
    </>
  );
}
