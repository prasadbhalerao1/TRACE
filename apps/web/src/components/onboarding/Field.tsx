"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Shown once the user has tried to advance, so the form doesn't scold them for
   * fields they simply haven't reached yet. */
  error?: string | null;
  hint?: string;
  required?: boolean;
  autoFocus?: boolean;
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  hint,
  required,
  autoFocus,
}: FieldProps) {
  // useId rather than a slugified label: two fields could share a label across steps,
  // and duplicate ids would make one label focus the wrong input.
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
        {!required && (
          <span className="ml-1.5 text-[11px] font-normal text-zinc-400">optional</span>
        )}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={error ? "border-rose-400 focus-visible:ring-rose-400/30" : undefined}
      />
      {error ? (
        <p id={`${id}-error`} className="text-xs text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-zinc-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
