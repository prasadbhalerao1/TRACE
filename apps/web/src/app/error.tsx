"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    <div className="flex flex-col flex-1 items-center justify-center min-h-[70vh] p-6 bg-card">
      <Card className="max-w-md w-full border-destructive/20 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            An unexpected error occurred in the application view.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {error.message && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive font-mono text-left overflow-auto max-h-32">
              {error.message}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => reset()} className="w-full sm:w-auto">
              Try Again
            </Button>
            <Button
              render={<Link href="/home" />}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
