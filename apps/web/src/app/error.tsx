"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to client console or monitoring service
    console.error("UI Runtime Error Boundary Captured:", error);
  }, [error]);

  return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] p-6 bg-zinc-50 dark:bg-black">
      <Card className="max-w-md w-full border-rose-500/30 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <CardTitle className="text-xl font-bold text-ink dark:text-zinc-50">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-xs text-slate dark:text-zinc-400">
            An unexpected error occurred in the application view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {error.message && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded text-xs text-rose-700 dark:text-rose-300 font-mono text-left overflow-auto max-h-32">
              {error.message}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => reset()} className="w-full sm:w-auto">
              Try Again
            </Button>
            <Button render={<Link href="/home" />} variant="outline" className="w-full sm:w-auto">
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
