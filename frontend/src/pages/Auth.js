import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatApiErrorDetail } from "@/lib/api";
import { Target, Loader2 } from "lucide-react";

export default function Auth() {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "signup") await signup(form.email, form.password, form.name);
      else await login(form.email, form.password);
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0C] grid-bg flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md fade-up">
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-[#C6FF00] flex items-center justify-center glow-lime mb-4">
            <Target className="h-8 w-8 text-[#0A0A0A]" strokeWidth={2.5} />
          </div>
          <h1 className="heading text-4xl text-white text-center leading-none">Elite AI<br />Basketball Coach</h1>
          <p className="mt-3 text-sm text-gray-400 text-center">Your personal trainer, shooting coach & film analyst.</p>
        </div>

        <div className="surface p-6 sm:p-8">
          <div className="flex gap-2 mb-6 rounded-lg bg-[#0A0A0C] p-1 border border-[#282C37]">
            {["login", "signup"].map((m) => (
              <button
                key={m}
                data-testid={`tab-${m}`}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 rounded-md py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                  mode === m ? "bg-[#C6FF00] text-[#0A0A0A]" : "text-gray-400 hover:text-white"
                }`}
              >
                {m === "login" ? "Log In" : "Sign Up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Name" value={form.name} testid="input-name"
                onChange={(v) => setForm({ ...form, name: v })} placeholder="Your name" required />
            )}
            <Field label="Email" type="email" value={form.email} testid="input-email"
              onChange={(v) => setForm({ ...form, email: v })} placeholder="you@email.com" required />
            <Field label="Password" type="password" value={form.password} testid="input-password"
              onChange={(v) => setForm({ ...form, password: v })} placeholder="••••••••" required />

            {error && <div data-testid="auth-error" className="text-sm text-[#FF3B30] bg-[#FF3B30]/10 rounded-lg px-3 py-2">{error}</div>}

            <button type="submit" data-testid="auth-submit" disabled={loading}
              className="w-full btn-lime rounded-lg py-3 flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Enter The Gym" : "Start Training"}
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-gray-600">Google login coming soon. Email & password for now.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required, testid }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-gray-500">{label}</span>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        data-testid={testid}
        className="mt-1.5 w-full rounded-lg bg-[#0A0A0C] border border-[#282C37] px-3.5 py-2.5 text-white placeholder:text-gray-600 focus:border-[#C6FF00] focus:outline-none transition-colors"
      />
    </label>
  );
}
