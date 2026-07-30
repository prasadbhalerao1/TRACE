import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import Link from "next/link";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
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
      <body className="min-h-full flex flex-col bg-zinc-50 dark:bg-zinc-950 text-ink dark:text-zinc-50" suppressHydrationWarning>
        <ClerkProvider appearance={{ theme: shadcn }}>
          <header className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 px-6 py-3 bg-white dark:bg-zinc-900 sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-heading text-lg font-bold text-ink dark:text-zinc-50 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400"></span>
                AI Talent Platform
              </Link>
              <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-slate">
                <Link href="/dashboard" className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition">Dashboard</Link>
                <Link href="/jobs" className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition">Candidate</Link>
                <Link href="/job-postings" className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition">Recruiter</Link>
                <Link href="/organizer/hackathons/new" className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition">Organizer</Link>
                <Link href="/evaluations" className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition">Judge</Link>
                <Link href="/users" className="px-2.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-zinc-800 transition">Admin</Link>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <Show when="signed-out">
                <SignInButton />
                <SignUpButton />
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>
          <div className="flex flex-1 flex-col">{children}</div>
        </ClerkProvider>
      </body>
    </html>
  );
}