"use client";

import Editor from "@monaco-editor/react";

export function CodeEditor({
  value,
  onChange,
  language = "python",
  height = "24rem",
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 overflow-hidden" style={{ height }}>
      <Editor
        height={height}
        language={language}
        theme="vs-dark"
        value={value}
        onChange={(v) => onChange(v ?? "")}
        options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
      />
    </div>
  );
}
