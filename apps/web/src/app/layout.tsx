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
import { Toaster } from "@/components/ui/sonner";
import { CurrentUserProvider } from "@/components/CurrentUserProvider";
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
        <ClerkProvider appearance={{ theme: shadcn }}>
          <header className="flex items-center justify-between border-b border-zinc-200/80 px-6 py-3 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
            <div className="flex items-center gap-6">
              <Link href="/" className="font-heading text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                AI Talent Platform
              </Link>
              <nav className="hidden md:flex items-center gap-1 text-xs font-medium text-zinc-500">
                <Link href="/dashboard" className="px-2.5 py-1 rounded hover:bg-zinc-100 hover:text-zinc-900 transition">Dashboard</Link>
                <Link href="/jobs" className="px-2.5 py-1 rounded hover:bg-zinc-100 hover:text-zinc-900 transition">Candidate</Link>
                <Link href="/job-postings" className="px-2.5 py-1 rounded hover:bg-zinc-100 hover:text-zinc-900 transition">Recruiter</Link>
                <Link href="/organizer/hackathons/new" className="px-2.5 py-1 rounded hover:bg-zinc-100 hover:text-zinc-900 transition">Organizer</Link>
                <Link href="/evaluations" className="px-2.5 py-1 rounded hover:bg-zinc-100 hover:text-zinc-900 transition">Judge</Link>
                <Link href="/users" className="px-2.5 py-1 rounded hover:bg-zinc-100 hover:text-zinc-900 transition">Admin</Link>
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
          <CurrentUserProvider>
            <div className="flex flex-1 flex-col">{children}</div>
          </CurrentUserProvider>
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}