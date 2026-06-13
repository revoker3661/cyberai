"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
    >
      Download as PDF (Print)
    </button>
  );
}
