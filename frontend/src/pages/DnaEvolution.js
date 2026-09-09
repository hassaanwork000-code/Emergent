import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, Loading } from "@/components/common";
import { Dna, ArrowRight, TrendingUp } from "lucide-react";

export default function DnaEvolution() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dna").then(({ data }) => setD(data)); }, []);
  if (!d) return <Loading label="Reading your DNA" />;

  return (
    <div>
      <PageHeader title="DNA Evolution" icon={Dna}
        subtitle="Your Player DNA evolves from real accumulated data — not one session." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* current vs previous */}
          <div className="surface p-6 fade-up">
            <span className="text-xs uppercase tracking-widest text-[#7C3AED]">Current DNA</span>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <h2 className="heading text-3xl text-white" data-testid="dna-current-label">{d.current_label}</h2>
              {d.dev_index != null && <span className="font-mono-nums text-2xl text-[#C6FF00]">{d.dev_index}</span>}
            </div>
            {d.previous_label && d.previous_label !== d.current_label && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">{d.previous_label} <ArrowRight className="h-3.5 w-3.5" /> {d.current_label}</p>
            )}
          </div>

          {/* categories */}
          <div className="surface p-6 fade-up">
            <span className="text-xs uppercase tracking-widest text-gray-500">DNA Categories</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3">
              {d.categories.map((c) => (
                <div key={c.key} data-testid={`dna-cat-${c.key}`}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400">{c.label}</span>
                    <span className="font-mono-nums text-white">{c.score != null ? c.score : "—"}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0A0A0C]">
                    {c.score != null
                      ? <div className="h-full rounded-full bg-gradient-to-r from-[#7C3AED] to-[#2F80FF]" style={{ width: `${c.score}%` }} />
                      : <div className="h-full rounded-full bg-[#282C37] w-full opacity-40" />}
                  </div>
                  {c.score == null && <span className="text-[10px] text-gray-600">Not enough data yet</span>}
                </div>
              ))}
            </div>
          </div>

          {/* development story */}
          <div className="surface p-6 fade-up border-l-2 border-l-[#7C3AED]">
            <span className="text-xs uppercase tracking-widest text-[#7C3AED]">Development Story</span>
            <p className="mt-2 text-sm text-gray-200 leading-relaxed" data-testid="dna-story">{d.story}</p>
          </div>

          {/* changes */}
          {d.changes?.length > 0 && (
            <div className="space-y-3">
              {d.changes.map((ch, i) => (
                <div key={i} className="surface p-5 fade-up" data-testid="dna-change">
                  <h4 className="heading text-lg text-white">{ch.what}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-xs text-gray-400">
                    <p><span className="text-[#C6FF00]">Why: </span>{ch.why}</p>
                    <p><span className="text-[#C6FF00]">Data: </span>{ch.data}</p>
                    <p><span className="text-[#2F80FF]">Means: </span>{ch.meaning}</p>
                    <p><span className="text-[#2F80FF]">Next: </span>{ch.next}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* timeline */}
        <div className="surface p-6 fade-up h-fit">
          <span className="text-xs uppercase tracking-widest text-gray-500 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Evolution Timeline</span>
          <div className="mt-4 space-y-4" data-testid="dna-timeline">
            {d.timeline.map((t, i) => (
              <div key={t.month} className="relative pl-6">
                <span className={`absolute left-0 top-1 h-3 w-3 rounded-full ${i === d.timeline.length - 1 ? "bg-[#C6FF00]" : "bg-[#7C3AED]"}`} />
                {i < d.timeline.length - 1 && <span className="absolute left-1.5 top-4 h-full w-px bg-[#282C37]" />}
                <div className="text-[10px] uppercase tracking-widest text-gray-500">{t.month}</div>
                <div className="text-sm text-white font-semibold">{t.label}</div>
                {t.dev_index != null && <div className="text-xs font-mono-nums text-gray-500">index {t.dev_index}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
