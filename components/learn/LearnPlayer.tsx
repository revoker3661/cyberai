"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, BookOpen, PlayCircle, CheckCircle, Circle,
  ChevronDown, ChevronUp, ThumbsUp, ThumbsDown, Flag, ArrowRight,
} from "lucide-react";
import type { Module, LearnModule, LearnItem, LearnBodyBlock } from "@/lib/content";
import { markItemComplete } from "@/app/actions/lesson";

interface LearnPlayerProps {
  mod: Module;
  learnMod: LearnModule;
  userId: string;
  completedItemIds: string[];
}

export function LearnPlayer({ mod, learnMod, userId, completedItemIds }: LearnPlayerProps) {
  const [activeItemId, setActiveItemId] = useState(learnMod.items[0]?.id ?? "");
  const [completed, setCompleted] = useState<Set<string>>(new Set(completedItemIds));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const activeItem = learnMod.items.find((i) => i.id === activeItemId) ?? learnMod.items[0];
  const activeIdx = learnMod.items.findIndex((i) => i.id === activeItemId);
  const nextItem = learnMod.items[activeIdx + 1];
  const completedCount = completed.size;
  const totalCount = learnMod.items.length;

  function handleMarkComplete() {
    if (completed.has(activeItemId)) return;
    startTransition(async () => {
      await markItemComplete(userId, mod.id, activeItemId);
      setCompleted((prev) => new Set([...prev, activeItemId]));
    });
  }

  function handleNext() {
    if (nextItem) {
      setActiveItemId(nextItem.id);
      setDrawerOpen(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 min-h-screen -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Left Syllabus Panel */}
      <aside className="lg:w-72 xl:w-80 lg:flex-shrink-0 lg:border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        {/* Drawer toggle (mobile only) */}
        <button
          className="lg:hidden w-full flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-900 dark:text-white"
          onClick={() => setDrawerOpen((v) => !v)}
        >
          <span>Course Syllabus ({completedCount}/{totalCount})</span>
          {drawerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        <div className={`${drawerOpen ? "block" : "hidden"} lg:block`}>
          {/* Back link */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Link href="/learn" className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition-colors">
              <ArrowLeft size={14} /> Back to Learn
            </Link>
          </div>

          {/* Module header */}
          <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{mod.title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{learnMod.sectionSubtitle}</p>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{completedCount}/{totalCount} items</span>
                <span>{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`, backgroundColor: mod.hexAccent }}
                />
              </div>
            </div>
          </div>

          {/* Section header */}
          <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            {learnMod.sectionTitle}
          </div>

          {/* Items list */}
          <nav className="px-2 pb-4 space-y-0.5">
            {learnMod.items.map((item) => {
              const isActive = item.id === activeItemId;
              const isDone = completed.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveItemId(item.id); setDrawerOpen(false); }}
                  className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-2"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                  style={isActive ? { borderLeftColor: mod.hexAccent } : {}}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {isDone
                      ? <CheckCircle size={16} style={{ color: mod.hexAccent }} />
                      : <Circle size={16} className="text-gray-300 dark:text-gray-600" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs leading-snug ${isActive ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                      {item.type === "video"
                        ? <><PlayCircle size={10} /> Video</>
                        : <><BookOpen size={10} /> Reading</>
                      }
                      {" · "}{item.estMinutes} min
                    </p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main Content Panel */}
      <main className="flex-1 px-4 sm:px-8 py-6 max-w-3xl">
        {/* Progress indicator */}
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {completedCount}/{totalCount} items completed
        </p>

        {activeItem && (
          activeItem.type === "video"
            ? <VideoContent item={activeItem} mod={mod} />
            : <ReadingContent item={activeItem} mod={mod} />
        )}

        {/* Mark complete + Next */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 items-start">
          <button
            onClick={handleMarkComplete}
            disabled={completed.has(activeItemId) || isPending}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              completed.has(activeItemId)
                ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 cursor-default"
                : "text-white hover:opacity-90"
            }`}
            style={!completed.has(activeItemId) ? { backgroundColor: mod.hexAccent } : {}}
          >
            <CheckCircle size={16} />
            {completed.has(activeItemId) ? "Completed!" : isPending ? "Saving…" : "Mark as completed"}
          </button>

          {nextItem && (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Go to next item <ArrowRight size={14} />
            </button>
          )}
        </div>

        {/* Like/dislike row (cosmetic) */}
        <div className="mt-6 flex items-center gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
          <span className="text-xs text-gray-400">Helpful?</span>
          <button className="text-gray-400 hover:text-gray-600 transition-colors"><ThumbsUp size={15} /></button>
          <button className="text-gray-400 hover:text-gray-600 transition-colors"><ThumbsDown size={15} /></button>
          <button className="text-gray-400 hover:text-red-400 transition-colors ml-2 flex items-center gap-1 text-xs">
            <Flag size={13} /> Report an issue
          </button>
        </div>

        {/* Quiz CTA */}
        <div className="mt-8 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-5">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">Ready to test your knowledge?</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">15 random questions from a pool of 30 · Need 70% to pass</p>
          <Link
            href={`/modules/${mod.id}/quiz`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: mod.hexAccent }}
          >
            Take the Quiz <ArrowRight size={14} />
          </Link>
        </div>
      </main>
    </div>
  );
}

function ReadingContent({ item, mod }: { item: LearnItem; mod: Module }) {
  return (
    <article className="prose prose-sm dark:prose-invert max-w-none">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 not-prose">{item.title}</h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 not-prose flex items-center gap-1">
        <BookOpen size={12} /> Reading · {item.estMinutes} min
      </p>

      <div className="space-y-5 not-prose">
        {item.body?.map((block, i) => <BodyBlock key={i} block={block} hexAccent={mod.hexAccent} />)}
      </div>
    </article>
  );
}

function VideoContent({ item, mod }: { item: LearnItem; mod: Module }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{item.title}</h1>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-1">
        <PlayCircle size={12} /> Video · {item.estMinutes} min
      </p>

      {/* YouTube embed — lazy loaded */}
      <div className="relative w-full rounded-xl overflow-hidden bg-gray-900" style={{ paddingBottom: "56.25%" }}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube.com/embed/${item.videoId}?rel=0&modestbranding=1`}
          title={item.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      </div>

      {item.description && (
        <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.description}</p>
      )}
    </div>
  );
}

function BodyBlock({ block, hexAccent }: { block: LearnBodyBlock; hexAccent: string }) {
  switch (block.type) {
    case "heading":
      return <h2 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-2">{block.text}</h2>;

    case "paragraph":
      return <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{block.text}</p>;

    case "bullets":
      return (
        <ul className="space-y-3">
          {block.items?.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: hexAccent + "22" }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hexAccent }} />
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {item.title && <strong className="text-gray-900 dark:text-white">{item.title}: </strong>}
                {item.text}
              </div>
            </li>
          ))}
        </ul>
      );

    case "callout": {
      const isWarning = block.style === "warning";
      return (
        <div className={`rounded-xl p-4 text-sm ${
          isWarning
            ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200"
            : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200"
        }`}>
          {block.text}
        </div>
      );
    }

    default:
      return null;
  }
}
