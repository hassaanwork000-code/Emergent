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

  const googleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
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

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-[#282C37]" />
            <span className="text-xs uppercase tracking-widest text-gray-600">or</span>
            <div className="h-px flex-1 bg-[#282C37]" />
          </div>

          <button type="button" onClick={googleLogin} data-testid="google-login"
            className="w-full rounded-lg border border-[#282C37] bg-[#0A0A0C] py-3 flex items-center justify-center gap-3 text-sm font-semibold text-white hover:border-gray-500 transition-colors">
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-gray-600">Sign in with email or Google — your training carries over either way.</p>
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
