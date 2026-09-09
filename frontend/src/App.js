import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Loading } from "@/components/common";

import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Coach from "@/pages/Coach";
import TrainingPlan from "@/pages/TrainingPlan";
import ShotTracker from "@/pages/ShotTracker";
import FormAnalysis from "@/pages/FormAnalysis";
import FilmRoom from "@/pages/FilmRoom";
import ClipHistory from "@/pages/ClipHistory";
import Pressure from "@/pages/Pressure";
import WeeklyReport from "@/pages/WeeklyReport";
import SkillLibrary from "@/pages/SkillLibrary";
import SkillDetail from "@/pages/SkillDetail";
import PlayerLab from "@/pages/PlayerLab";
import PlayerDetail from "@/pages/PlayerDetail";
import Achievements from "@/pages/Achievements";

function Protected({ children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (user === null) return <div className="min-h-screen bg-[#0A0A0C]"><Loading label="Loading" /></div>;
  if (user === false) return <Navigate to="/login" replace />;
  if (!user.profile && location.pathname !== "/onboarding") return <Navigate to="/onboarding" replace />;
  if (location.pathname === "/onboarding") return children;
  return <AppLayout>{children}</AppLayout>;
}

function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen bg-[#0A0A0C]"><Loading /></div>;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicOnly><Auth /></PublicOnly>} />
            <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
            <Route path="/" element={<Protected><Dashboard /></Protected>} />
            <Route path="/coach" element={<Protected><Coach /></Protected>} />
            <Route path="/training" element={<Protected><TrainingPlan /></Protected>} />
            <Route path="/shots" element={<Protected><ShotTracker /></Protected>} />
            <Route path="/form" element={<Protected><FormAnalysis /></Protected>} />
            <Route path="/film" element={<Protected><FilmRoom /></Protected>} />
            <Route path="/clips" element={<Protected><ClipHistory /></Protected>} />
            <Route path="/pressure" element={<Protected><Pressure /></Protected>} />
            <Route path="/report" element={<Protected><WeeklyReport /></Protected>} />
            <Route path="/skills" element={<Protected><SkillLibrary /></Protected>} />
            <Route path="/skills/:slug" element={<Protected><SkillDetail /></Protected>} />
            <Route path="/players" element={<Protected><PlayerLab /></Protected>} />
            <Route path="/players/:id" element={<Protected><PlayerDetail /></Protected>} />
            <Route path="/achievements" element={<Protected><Achievements /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-center" theme="dark" />
      </AuthProvider>
    </div>
  );
}

export default App;
