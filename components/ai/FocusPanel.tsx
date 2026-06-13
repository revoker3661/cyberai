"use client";
import { useEffect, useState } from "react";
import { Target, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface ModuleResult {
  moduleTitle: string;
  scorePercent: number;
  passed: boolean;
}

interface FocusData {
  focusAreas: string[];
  summary: string;
}

export function FocusPanel({ modules }: { modules: ModuleResult[] }) {
  const [data, setData] = useState<FocusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (modules.length === 0) { setLoading(false); return; }
    fetch("/api/ai/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modules }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  if (modules.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl overflow-hidden">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/40 rounded-full flex items-center justify-center">
            <Target size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
              Your Personalized Focus Areas
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">AI-powered analysis based on your quiz results</p>
          </div>
        </div>
        {collapsed
          ? <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
          : <ChevronUp size={16} className="text-gray-400 flex-shrink-0" />
        }
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
              <Loader2 size={16} className="animate-spin" />
              Analyzing your results…
            </div>
          ) : data ? (
            <>
              {data.summary && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">{data.summary}</p>
              )}
              <ul className="space-y-2">
                {data.focusAreas.map((area, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {area}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Could not load focus areas. Keep working through your modules!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
