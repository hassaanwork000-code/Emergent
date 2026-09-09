import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Target, ChevronRight, ChevronLeft, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";

const POSITIONS = ["PG", "SG", "SF", "PF", "C"];
const HANDS = ["Right", "Left", "Ambi"];
const LEVELS = ["Rookie", "JV", "Varsity", "College", "Pro / Semi-Pro"];
const EXPERIENCE = ["< 1 year", "1-3 years", "3-5 years", "5-10 years", "10+ years"];
const COURTS = ["Full court", "Half court / driveway", "Gym access", "Limited / no hoop"];
const EQUIPMENT = ["Basketball", "Hoop", "Cones", "Resistance bands", "Weights", "Shooting machine", "Partner"];

export default function Onboarding() {
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const [step, setStep] = useState(0);
  const [archetypes, setArchetypes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    age: "", height: "", position: "PG", dominant_hand: "Right",
    experience: "1-3 years", level: "Varsity", court_access: "Full court",
    equipment: ["Basketball", "Hoop"], training_time_min: 45, training_days: 4,
    primary_archetype: "", secondary_archetype: "", target_archetype: "",
    goals: [], strengths: [], weaknesses: [],
  });

  useEffect(() => {
    api.get("/archetypes").then(({ data }) => {
      setArchetypes(data.archetypes);
      setF((p) => ({ ...p, primary_archetype: data.archetypes[0], target_archetype: data.archetypes[0] }));
    });
  }, []);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const toggleEquip = (e) =>
    set("equipment", f.equipment.includes(e) ? f.equipment.filter((x) => x !== e) : [...f.equipment, e]);

  const steps = ["Basics", "Your Game", "Identity", "Goals"];

  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/onboarding", {
        ...f,
        age: f.age ? parseInt(f.age) : null,
        training_time_min: parseInt(f.training_time_min),
        training_days: parseInt(f.training_days),
      });
      await refreshUser();
      toast.success("Profile locked in. Let's get to work.");
      navigate("/");
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSaving(false);
    }
  };

  const canNext = () => {
    if (step === 2) return f.primary_archetype;
    return true;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] grid-bg py-8 px-4">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-lg bg-[#C6FF00] flex items-center justify-center"><Target className="h-5 w-5 text-[#0A0A0A]" /></div>
          <div>
            <h1 className="heading text-2xl text-white leading-none">Build Your Profile</h1>
            <p className="text-xs text-gray-500">Step {step + 1} of {steps.length} — {steps[step]}</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-8">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[#C6FF00]" : "bg-[#282C37]"}`} />
          ))}
        </div>

        <div className="surface p-6 fade-up" key={step}>
          {step === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <TextInput label="Age" value={f.age} onChange={(v) => set("age", v)} type="number" placeholder="16" testid="ob-age" />
              <TextInput label="Height" value={f.height} onChange={(v) => set("height", v)} placeholder={`6'2"`} testid="ob-height" />
              <Choice label="Position" options={POSITIONS} value={f.position} onChange={(v) => set("position", v)} testid="ob-position" />
              <Choice label="Dominant Hand" options={HANDS} value={f.dominant_hand} onChange={(v) => set("dominant_hand", v)} testid="ob-hand" />
            </div>
          )}
          {step === 1 && (
            <div className="space-y-5">
              <Choice label="Experience" options={EXPERIENCE} value={f.experience} onChange={(v) => set("experience", v)} testid="ob-exp" />
              <Choice label="Level" options={LEVELS} value={f.level} onChange={(v) => set("level", v)} testid="ob-level" />
              <Choice label="Court Access" options={COURTS} value={f.court_access} onChange={(v) => set("court_access", v)} testid="ob-court" />
              <div>
                <Lbl>Equipment</Lbl>
                <div className="flex flex-wrap gap-2 mt-2">
                  {EQUIPMENT.map((e) => (
                    <button key={e} data-testid={`ob-equip-${e}`} onClick={() => toggleEquip(e)}
                      className={`rounded-full px-3.5 py-1.5 text-sm border transition-colors ${
                        f.equipment.includes(e) ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00]" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <TextInput label="Minutes / session" type="number" value={f.training_time_min} onChange={(v) => set("training_time_min", v)} testid="ob-minutes" />
                <TextInput label="Days / week" type="number" value={f.training_days} onChange={(v) => set("training_days", v)} testid="ob-days" />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <ArcSelect label="Primary Archetype" options={archetypes} value={f.primary_archetype} onChange={(v) => set("primary_archetype", v)} testid="ob-primary" />
              <ArcSelect label="Secondary Archetype (optional)" options={["", ...archetypes]} value={f.secondary_archetype} onChange={(v) => set("secondary_archetype", v)} testid="ob-secondary" />
              <ArcSelect label="Target Archetype (who you want to become)" options={archetypes} value={f.target_archetype} onChange={(v) => set("target_archetype", v)} testid="ob-target" />
            </div>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <ChipInput label="Goals" items={f.goals} onChange={(v) => set("goals", v)} placeholder="e.g. Make varsity starting 5" testid="ob-goals" />
              <ChipInput label="Strengths" items={f.strengths} onChange={(v) => set("strengths", v)} placeholder="e.g. Catch & shoot" testid="ob-strengths" />
              <ChipInput label="Weaknesses" items={f.weaknesses} onChange={(v) => set("weaknesses", v)} placeholder="e.g. Left-hand finishing" testid="ob-weaknesses" />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-6">
          <button data-testid="ob-back" disabled={step === 0} onClick={() => setStep(step - 1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white disabled:opacity-30 transition-colors">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          {step < steps.length - 1 ? (
            <button data-testid="ob-next" disabled={!canNext()} onClick={() => setStep(step + 1)}
              className="inline-flex items-center gap-1.5 btn-lime rounded-lg px-6 py-2.5">
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button data-testid="ob-finish" disabled={saving} onClick={submit}
              className="inline-flex items-center gap-2 btn-lime rounded-lg px-6 py-2.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const Lbl = ({ children }) => <span className="text-xs uppercase tracking-widest text-gray-500">{children}</span>;

function TextInput({ label, value, onChange, type = "text", placeholder, testid }) {
  return (
    <label className="block">
      <Lbl>{label}</Lbl>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} data-testid={testid}
        className="mt-1.5 w-full rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors" />
    </label>
  );
}

function Choice({ label, options, value, onChange, testid }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div className="flex flex-wrap gap-2 mt-2" data-testid={testid}>
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)}
            className={`rounded-lg px-3.5 py-2 text-sm border transition-colors ${
              value === o ? "bg-[#C6FF00] text-[#0A0A0A] border-[#C6FF00] font-semibold" : "border-[#282C37] text-gray-300 hover:border-gray-500"}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ArcSelect({ label, options, value, onChange, testid }) {
  return (
    <label className="block">
      <Lbl>{label}</Lbl>
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid={testid}
        className="mt-1.5 w-full rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3.5 py-2.5 text-white focus:border-[#C6FF00] focus:outline-none transition-colors">
        {options.map((o) => <option key={o || "none"} value={o}>{o || "None"}</option>)}
      </select>
    </label>
  );
}

function ChipInput({ label, items, onChange, placeholder, testid }) {
  const [val, setVal] = useState("");
  const add = () => { const v = val.trim(); if (v && !items.includes(v)) { onChange([...items, v]); setVal(""); } };
  return (
    <div>
      <Lbl>{label}</Lbl>
      <div className="flex gap-2 mt-2">
        <input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} data-testid={testid}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="flex-1 rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors" />
        <button onClick={add} data-testid={`${testid}-add`} className="btn-lime rounded-lg px-4">Add</button>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1.5 rounded-full bg-[#1A1C23] border border-[#282C37] px-3 py-1 text-sm text-gray-200">
            {it}
            <button onClick={() => onChange(items.filter((x) => x !== it))}><X className="h-3.5 w-3.5 text-gray-500 hover:text-[#FF3B30]" /></button>
          </span>
        ))}
      </div>
    </div>
  );
}
