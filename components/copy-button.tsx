"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Kopieren" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="shrink-0 rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-paper"
    >
      <span aria-live="polite">{copied ? "Kopiert" : label}</span>
    </button>
  );
}
