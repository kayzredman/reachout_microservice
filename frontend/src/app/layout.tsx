
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import ClerkProviderWithConfig from "./clerk-provider";

const interSans = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FaithReach — Faith-Based Content Platform",
  description: "Empower your faith-based community with smart content creation, scheduling, and multi-platform publishing.",
};


import HideSidebarOnHome from "./HideSidebarOnHome";
import ClientUserMenuWrapper from "./ClientUserMenuWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${interSans.variable} ${robotoMono.variable}`}>
      <body>
        <ClerkProviderWithConfig>
          <ClientUserMenuWrapper />
          <HideSidebarOnHome>{children}</HideSidebarOnHome>
        </ClerkProviderWithConfig>
      </body>
    </html>
  );
}
