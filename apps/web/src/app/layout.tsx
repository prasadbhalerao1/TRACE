import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthHeaderControls } from "@/components/AuthHeaderControls";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";
import { RoleIndicator } from "@/components/RoleIndicator";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
});

const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AI Talent Intelligence & Recruitment Platform",
  description:
    "Verified talent identity, AI-driven matching, and fraud-resistant hiring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900" suppressHydrationWarning>
        <AuthProvider>
          {/* CurrentUserProvider wraps the header too: RoleIndicator calls useCurrentUser,
              which throws outside the provider. */}
          <CurrentUserProvider>
            <header className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
              <Link href="/" className="font-heading text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                AI Talent Platform
              </Link>
              <div className="flex items-center gap-4">
                <RoleIndicator />
                <AuthHeaderControls />
              </div>
            </header>
            <div className="flex flex-1 flex-col">{children}</div>
          </CurrentUserProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}