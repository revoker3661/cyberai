"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Brain, Lightbulb, CheckCircle, XCircle, ArrowRight,
  Trophy, AlertTriangle, RefreshCw, Eye, EyeOff, Shield,
} from "lucide-react";
import type { Module, QuizQuestion } from "@/lib/content";
import { allocatePoints, shuffleArray, isPassed, PASS_THRESHOLD, QUIZ_SERVE_COUNT, CONFIDENCE_BONUS_MULTIPLIER, CONFIDENT_WRONG_PENALTY } from "@/lib/game";

type Confidence = "confident" | "guessing";

interface ServedQuestion extends QuizQuestion {
  servedOptions: string[];   // shuffled options
  servedCorrectIndex: number; // correct index in servedOptions
  allocatedPoints: number;
}

interface Answer {
  questionId: string;
  selectedIndex: number; // index in servedOptions
  correct: boolean;
  confidence: Confidence;
  topic: string;
  chosenText: string;
  correctText: string;
}

interface QuizEngineProps {
  mod: Module;
  userId: string;
  readOnly?: boolean;
  existingAnswers?: Answer[];
}

function buildServedQuestions(mod: Module): ServedQuestion[] {
  const pool = [...mod.quiz];
  shuffleArray(pool);
  const selected = pool.slice(0, Math.min(QUIZ_SERVE_COUNT, pool.length));
  const pts = allocatePoints(mod.maxPoints, selected.length);

  return selected.map((q, i) => {
    const opts = [...q.options];
    const correctText = opts[q.correctIndex];
    shuffleArray(opts);
    const servedCorrectIndex = opts.indexOf(correctText);
    return {
      ...q,
      servedOptions: opts,
      servedCorrectIndex,
      allocatedPoints: pts[i],
    };
  });
}

const MAX_TAB_SWITCHES = 3;

export function QuizEngine({ mod, userId, readOnly = false, existingAnswers }: QuizEngineProps) {
  const router = useRouter();

  // Build served questions once per quiz session
  const servedRef = useRef<ServedQuestion[]>(
    readOnly && existingAnswers
      ? (existingAnswers.map((a, i) => {
          const q = mod.quiz.find((q) => q.id === a.questionId);
          if (!q) return null;
          const pts = allocatePoints(mod.maxPoints, existingAnswers.length);
          return {
            ...q,
            servedOptions: q.options,
            servedCorrectIndex: q.correctIndex,
            allocatedPoints: pts[i],
          };
        }).filter(Boolean) as ServedQuestion[])
      : buildServedQuestions(mod)
  );
  const served = servedRef.current;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>(existingAnswers ?? []);
  const [selectedOption, setSelectedOption] = useState<number | null>(
    readOnly && existingAnswers ? existingAnswers[0]?.selectedIndex ?? null : null
  );
  const [confidence, setConfidence] = useState<Confidence>(
    readOnly && existingAnswers ? existingAnswers[0]?.confidence ?? "confident" : "confident"
  );
  const [locked, setLocked] = useState(readOnly || !!existingAnswers);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [coachData, setCoachData] = useState<Record<string, unknown> | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [serverPassed, setServerPassed] = useState<boolean | null>(null);

  // Proctoring state
  const tabSwitchCountRef = useRef(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showTabWarning, setShowTabWarning] = useState(false);
  const [quizTerminated, setQuizTerminated] = useState(false);

  // Request fullscreen on quiz start
  useEffect(() => {
    if (readOnly) return;
    document.documentElement.requestFullscreen?.().catch(() => {});
    return () => {
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    };
  }, [readOnly]);

  // Tab-switch detection (1.5s delay avoids false-positive from fullscreen animation)
  useEffect(() => {
    if (readOnly || done) return;
    let active = false;
    const activateTimer = setTimeout(() => { active = true; }, 1500);
    const handleVisibility = () => {
      if (!active || !document.hidden) return;
      tabSwitchCountRef.current += 1;
      const n = tabSwitchCountRef.current;
      setTabSwitchCount(n);
      setShowTabWarning(true);
      if (n >= MAX_TAB_SWITCHES) setQuizTerminated(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(activateTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [readOnly, done]);

  // Fullscreen exit detection (ESC key) — re-requests fullscreen and counts as violation
  useEffect(() => {
    if (readOnly || done) return;
    let active = false;
    const activateTimer = setTimeout(() => { active = true; }, 1500);
    const handleFullscreenChange = () => {
      if (!active || document.fullscreenElement) return;
      tabSwitchCountRef.current += 1;
      const n = tabSwitchCountRef.current;
      setTabSwitchCount(n);
      setShowTabWarning(true);
      if (n >= MAX_TAB_SWITCHES) {
        setQuizTerminated(true);
      } else {
        setTimeout(() => document.documentElement.requestFullscreen?.().catch(() => {}), 100);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      clearTimeout(activateTimer);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [readOnly, done]);

  const question = served[currentIdx];
  const currentAnswer = readOnly ? existingAnswers?.[currentIdx] : answers[currentIdx];

  function handleSelect(idx: number) {
    if (locked || readOnly || !question) return;
    setSelectedOption(idx);
    const correct = idx === question.servedCorrectIndex;
    const answer: Answer = {
      questionId: question.id,
      selectedIndex: idx,
      correct,
      confidence,
      topic: question.question.slice(0, 60),
      chosenText: question.servedOptions[idx],
      correctText: question.servedOptions[question.servedCorrectIndex],
    };
    const newAnswers = [...answers];
    newAnswers[currentIdx] = answer;
    setAnswers(newAnswers);
    setLocked(true);
  }

  async function handleNext() {
    if (currentIdx < served.length - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      if (readOnly && existingAnswers) {
        setSelectedOption(existingAnswers[nextIdx]?.selectedIndex ?? null);
        setConfidence(existingAnswers[nextIdx]?.confidence ?? "confident");
        setLocked(true);
      } else {
        setSelectedOption(null);
        setConfidence("confident");
        setLocked(false);
      }
    } else {
      await handleFinish();
    }
  }

  const handleFinish = useCallback(async () => {
    if (readOnly) { setDone(true); return; }
    setSaving(true);

    const maxServedPoints = served.reduce((s, q) => s + q.allocatedPoints, 0);
    const servedQuestionIds = served.map((q) => q.id);
    const optionOrders: Record<string, string[]> = {};
    served.forEach((q) => { optionOrders[q.id] = q.servedOptions; });

    let passed = false;
    try {
      const res = await fetch("/api/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId: mod.id,
          answers,
          servedQuestionIds,
          optionOrders,
          maxServedPoints,
          tabSwitchCount: tabSwitchCountRef.current,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        passed = data.passed ?? false;
      }
    } catch {}

    setServerPassed(passed);

    // Get coach analysis
    setCoachLoading(true);
    try {
      const coachRes = await fetch("/api/ai/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleTitle: mod.title,
          passed,
          questions: answers.map((a) => ({
            topic: a.topic,
            chosen: a.chosenText,
            correct: a.correctText,
            wasCorrect: a.correct,
            confidence: a.confidence,
          })),
        }),
      });
      if (coachRes.ok) setCoachData(await coachRes.json());
    } catch {}
    setCoachLoading(false);
    setSaving(false);
    setDone(true);
  }, [answers, mod, served, readOnly]);

  // Quiz terminated due to too many tab switches
  if (quizTerminated && !done) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto">
          <EyeOff size={40} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Quiz Terminated</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            You switched tabs {MAX_TAB_SWITCHES} or more times. This quiz session has been ended.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Please review the lesson and start a fresh attempt.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
          <button
            onClick={() => router.push(`/modules/${mod.id}/lesson`)}
            className="py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Review Lesson
          </button>
          <button
            onClick={() => router.push(`/modules/${mod.id}/quiz`)}
            className="py-3 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: mod.hexAccent }}
          >
            Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  if (done && !readOnly) {
    const baseScore = answers.reduce((sum, a) => {
      const q = served.find((q) => q.id === a.questionId);
      return sum + (a.correct && q ? q.allocatedPoints : 0);
    }, 0);
    const confidenceBonus = answers.reduce((sum, a) => {
      const q = served.find((q) => q.id === a.questionId);
      if (!a.correct || !q || a.confidence !== "confident") return sum;
      return sum + (Math.round(q.allocatedPoints * CONFIDENCE_BONUS_MULTIPLIER) - q.allocatedPoints);
    }, 0);
    const confidencePenalty = answers.reduce((sum, a) => {
      const q = served.find((q) => q.id === a.questionId);
      if (a.correct || !q || a.confidence !== "confident") return sum;
      return sum + Math.round(q.allocatedPoints * CONFIDENT_WRONG_PENALTY);
    }, 0);
    const totalScore = baseScore + confidenceBonus - confidencePenalty;
    const maxServedPoints = served.reduce((s, q) => s + q.allocatedPoints, 0);
    const passed = serverPassed ?? isPassed(totalScore, maxServedPoints);
    const pct = Math.round((totalScore / maxServedPoints) * 100);

    return (
      <ResultsScreen
        mod={mod}
        answers={answers}
        served={served}
        totalScore={totalScore}
        maxServedPoints={maxServedPoints}
        confidenceBonus={confidenceBonus}
        confidencePenalty={confidencePenalty}
        pct={pct}
        passed={passed}
        coachData={coachData}
        coachLoading={coachLoading}
        tabSwitchCount={tabSwitchCount}
      />
    );
  }

  if (!question) return null;

  const effectiveLocked = readOnly ? true : locked;
  const effectiveSelected = readOnly ? currentAnswer?.selectedIndex ?? null : selectedOption;
  const isCorrect = effectiveLocked && effectiveSelected === question.servedCorrectIndex;

  const progressPct = ((currentIdx + 1) / served.length) * 100;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Tab-switch warning banner */}
      {showTabWarning && !quizTerminated && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-amber-50 dark:bg-amber-900/30 border-2 border-amber-400 rounded-xl p-4 shadow-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-amber-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                Focus violation detected! ({tabSwitchCount}/{MAX_TAB_SWITCHES})
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                You left the quiz or exited fullscreen. {MAX_TAB_SWITCHES - tabSwitchCount} more and your quiz will be terminated.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowTabWarning(false)}
            className="text-amber-600 hover:text-amber-800 dark:hover:text-amber-200 text-lg leading-none flex-shrink-0"
            aria-label="Dismiss warning"
          >✕</button>
        </div>
      )}

      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">{mod.title} Quiz</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Question {currentIdx + 1} of {served.length} · +{question.allocatedPoints} pts
        </p>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%`, backgroundColor: mod.hexAccent }}
        />
      </div>

      <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4">
        <p className="font-semibold text-gray-900 dark:text-white text-sm leading-relaxed">
          {question.question}
        </p>
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Answer options">
        {question.servedOptions.map((option, idx) => {
          const isSelected = effectiveSelected === idx;
          const isCorrectOption = idx === question.servedCorrectIndex;
          let cls = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-400";

          if (effectiveLocked) {
            if (isCorrectOption) {
              cls = "border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200";
            } else if (isSelected && !isCorrectOption) {
              cls = "border-2 border-red-400 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200";
            } else {
              cls = "border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500";
            }
          } else if (isSelected) {
            cls = "border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-200";
          }

          return (
            <button
              key={idx}
              role="radio"
              aria-checked={isSelected}
              onClick={() => handleSelect(idx)}
              disabled={effectiveLocked}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between ${cls} focus:outline-none focus:ring-2 focus:ring-indigo-400`}
            >
              <span>{option}</span>
              {effectiveLocked && isCorrectOption && <CheckCircle size={16} className="text-emerald-500 flex-shrink-0" />}
              {effectiveLocked && isSelected && !isCorrectOption && <XCircle size={16} className="text-red-500 flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Confidence selector */}
      {!readOnly && (
        <div className="grid grid-cols-2 gap-3" aria-label="Confidence level">
          {(["confident", "guessing"] as Confidence[]).map((c) => (
            <button
              key={c}
              onClick={() => !locked && setConfidence(c)}
              disabled={locked}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                confidence === c
                  ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                  : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800"
              }`}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${confidence === c ? "border-indigo-500" : "border-gray-400"}`}>
                {confidence === c && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
              </div>
              {c === "confident" ? <><Brain size={16} /> Confident</> : <><Lightbulb size={16} /> Just Guessing</>}
            </button>
          ))}
        </div>
      )}

      {/* Explanation */}
      {effectiveLocked && (
        <div
          aria-live="polite"
          className={`rounded-xl p-4 ${
            isCorrect
              ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Lightbulb size={16} className={isCorrect ? "text-emerald-600" : "text-red-600"} />
            <span className={`text-sm font-semibold ${isCorrect ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
              Explanation:
            </span>
          </div>
          <p className={`text-sm ${isCorrect ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"}`}>
            {question.explanation}
          </p>
        </div>
      )}

      {effectiveLocked && (
        <button
          onClick={handleNext}
          disabled={saving}
          className="w-full py-3 rounded-xl text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          style={{ backgroundColor: mod.hexAccent }}
        >
          {saving ? "Saving…" : currentIdx < served.length - 1 ? "Next Question" : readOnly ? "Done" : "Finish Quiz"}
          {!saving && <ArrowRight size={16} className="inline ml-2" />}
        </button>
      )}
    </div>
  );
}

function ResultsScreen({
  mod, answers, served, totalScore, maxServedPoints, confidenceBonus, confidencePenalty, pct, passed, coachData, coachLoading, tabSwitchCount,
}: {
  mod: Module;
  answers: Answer[];
  served: ServedQuestion[];
  totalScore: number;
  maxServedPoints: number;
  confidenceBonus: number;
  confidencePenalty: number;
  pct: number;
  passed: boolean;
  coachData: Record<string, unknown> | null;
  coachLoading: boolean;
  tabSwitchCount: number;
}) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Pass/Fail Banner */}
      <div className={`rounded-2xl p-5 text-center ${passed ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700" : "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700"}`}>
        <div className="flex items-center justify-center gap-3 mb-3">
          {passed
            ? <Trophy size={36} className="text-emerald-500" />
            : <AlertTriangle size={36} className="text-red-500" />
          }
          <div>
            <h2 className={`text-2xl font-bold ${passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
              {passed ? "PASSED!" : "NOT PASSED"}
            </h2>
            <p className={`text-sm ${passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {passed ? `Great job! You scored above the ${Math.round(PASS_THRESHOLD * 100)}% threshold.` : `You need ${Math.round(PASS_THRESHOLD * 100)}% to pass. Keep studying and try again!`}
            </p>
          </div>
        </div>

        {/* Score gauge */}
        <div className="relative w-28 h-28 mx-auto">
          <svg width="112" height="112" className="-rotate-90">
            <circle cx="56" cy="56" r="46" fill="none" stroke="#e5e7eb" strokeWidth="10" />
            <circle
              cx="56" cy="56" r="46"
              fill="none"
              stroke={passed ? "#10b981" : "#ef4444"}
              strokeWidth="10"
              strokeDasharray={2 * Math.PI * 46}
              strokeDashoffset={2 * Math.PI * 46 * (1 - pct / 100)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{pct}%</span>
          </div>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Score: <strong className="text-gray-900 dark:text-white">{totalScore - confidenceBonus + confidencePenalty} / {maxServedPoints} pts</strong>
          {confidenceBonus > 0 && (
            <span className="ml-2 text-amber-600 dark:text-amber-400 font-semibold">+{confidenceBonus} confidence bonus 🎯</span>
          )}
          {confidencePenalty > 0 && (
            <span className="ml-2 text-red-600 dark:text-red-400 font-semibold">−{confidencePenalty} overconfidence penalty</span>
          )}
          {" · "}Pass mark: <strong>{Math.round(PASS_THRESHOLD * maxServedPoints)} pts</strong>
        </p>
        {/* Tab switch integrity report */}
        <div className={`inline-flex items-center gap-2 mt-2 px-3 py-1.5 rounded-full text-xs font-medium ${
          tabSwitchCount === 0
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
            : tabSwitchCount < MAX_TAB_SWITCHES
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
        }`}>
          {tabSwitchCount === 0
            ? <><Shield size={12} /> Full focus — 0 tab switches</>
            : <><Eye size={12} /> {tabSwitchCount} tab switch{tabSwitchCount !== 1 ? "es" : ""} detected</>
          }
        </div>
      </div>

      {/* Per-question recap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5 space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Question Review</h3>
        {answers.map((ans, i) => {
          const q = served.find((q) => q.id === ans.questionId);
          if (!q) return null;
          return (
            <div
              key={ans.questionId}
              className={`flex items-start gap-3 p-3 rounded-lg ${ans.correct ? "bg-emerald-50 dark:bg-emerald-900/10" : "bg-red-50 dark:bg-red-900/10"}`}
            >
              {ans.correct
                ? <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                : <XCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              }
              <div className="min-w-0">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Q{i + 1}: {q.question}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Your answer: {ans.chosenText} ·{" "}
                  <span className={ans.correct ? "text-emerald-600" : "text-red-600"}>
                    {ans.correct
                      ? `+${ans.confidence === "confident" ? Math.round(q.allocatedPoints * CONFIDENCE_BONUS_MULTIPLIER) : q.allocatedPoints} pts${ans.confidence === "confident" ? " 🎯" : ""}`
                      : ans.confidence === "confident"
                        ? `-${Math.round(q.allocatedPoints * CONFIDENT_WRONG_PENALTY)} pts`
                        : "0 pts"}
                  </span>
                  {" · "}<span className="text-gray-400">{ans.confidence === "confident" ? "Confident" : "Just Guessing"}</span>
                </p>
                {!ans.correct && (
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Correct: {ans.correctText}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* AI Cognitive Security Report */}
      <CognitiveReport coachData={coachData} coachLoading={coachLoading} />

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => router.push("/dashboard")}
          className="py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Back to Dashboard
        </button>
        {passed ? (
          <button
            onClick={() => router.push(`/modules/${mod.id}/lesson`)}
            className="py-3 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: mod.hexAccent }}
          >
            Review Lesson
          </button>
        ) : (
          <button
            onClick={() => router.push(`/modules/${mod.id}/quiz`)}
            className="py-3 rounded-xl text-white font-medium text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ backgroundColor: mod.hexAccent }}
          >
            <RefreshCw size={14} /> Retake Quiz
          </button>
        )}
      </div>
    </div>
  );
}

function CognitiveReport({
  coachData, coachLoading,
}: {
  coachData: Record<string, unknown> | null;
  coachLoading: boolean;
}) {
  if (!coachLoading && !coachData) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-5">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Brain size={18} className="text-indigo-500" /> Cognitive Security Report
      </h3>
      {coachLoading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          Analyzing your answers…
        </div>
      ) : coachData && (
        <div className="space-y-4 text-sm">
          {typeof coachData.headline === "string" && (
            <p className="font-medium text-gray-800 dark:text-gray-200 text-base">{coachData.headline}</p>
          )}
          {typeof coachData.overallComment === "string" && (
            <p className="text-gray-600 dark:text-gray-400">{coachData.overallComment}</p>
          )}

          {Array.isArray(coachData.blindSpots) && (coachData.blindSpots as Array<{topic:string;advice:string}>).length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <p className="font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Blind Spots — Confident but Wrong
              </p>
              <ul className="space-y-2">
                {(coachData.blindSpots as Array<{topic:string;advice:string}>).map((s, i) => (
                  <li key={i}>
                    <span className="font-medium text-red-800 dark:text-red-200">{s.topic}</span>
                    <span className="text-red-700 dark:text-red-300"> — {s.advice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(coachData.luckyGuesses) && (coachData.luckyGuesses as Array<{topic:string;advice:string}>).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <p className="font-semibold text-amber-700 dark:text-amber-300 mb-2">
                🍀 Lucky Guesses — Guessing but Correct
              </p>
              <ul className="space-y-2">
                {(coachData.luckyGuesses as Array<{topic:string;advice:string}>).map((s, i) => (
                  <li key={i}>
                    <span className="font-medium text-amber-800 dark:text-amber-200">{s.topic}</span>
                    <span className="text-amber-700 dark:text-amber-300"> — {s.advice}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(coachData.nextSteps) && (coachData.nextSteps as string[]).length > 0 && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
              <p className="font-semibold text-indigo-700 dark:text-indigo-300 mb-2">💡 Next Steps</p>
              <ul className="space-y-1">
                {(coachData.nextSteps as string[]).map((s, i) => (
                  <li key={i} className="text-indigo-800 dark:text-indigo-200 flex gap-2">
                    <span className="text-indigo-400">{i + 1}.</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
