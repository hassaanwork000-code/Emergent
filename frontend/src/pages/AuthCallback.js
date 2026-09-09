import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/common";
import { AlertCircle } from "lucide-react";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const processed = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const match = window.location.hash.match(/session_id=([^&]+)/);
    if (!match) { navigate("/login", { replace: true }); return; }
    const sid = decodeURIComponent(match[1]);
    loginWithGoogle(sid)
      .then((u) => {
        window.history.replaceState(null, "", window.location.pathname);
        navigate(u.profile ? "/" : "/onboarding", { replace: true });
      })
      .catch(() => { setError(true); setTimeout(() => navigate("/login", { replace: true }), 1600); });
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0C] grid-bg flex items-center justify-center">
      {error ? (
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-[#FF3B30] mx-auto mb-3" />
          <p className="text-[#FF3B30]">Google sign-in failed. Redirecting…</p>
        </div>
      ) : (
        <Loading label="Signing you in" />
      )}
    </div>
  );
}
