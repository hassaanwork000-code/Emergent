import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MessageSquare, Dumbbell, Target, ScanLine, Clapperboard,
  Timer, CalendarDays, BookOpen, Users, Trophy, Menu, LogOut, X, Radio, GitCompare, Flag,
  Brain, Dna, FlaskConical,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/coach", label: "AI Coach", icon: MessageSquare, testid: "nav-coach" },
  { to: "/iq", label: "IQ Lab", icon: Brain, testid: "nav-iq" },
  { to: "/dna", label: "DNA Evolution", icon: Dna, testid: "nav-dna" },
  { to: "/archetype", label: "Archetype Lab", icon: FlaskConical, testid: "nav-archetype" },
  { to: "/training", label: "Training Plan", icon: Dumbbell, testid: "nav-training" },
  { to: "/session", label: "Live Session", icon: Radio, testid: "nav-session" },
  { to: "/shots", label: "Shot Tracker", icon: Target, testid: "nav-shots" },
  { to: "/analyze", label: "Analyze", icon: ScanLine, testid: "nav-analyze" },
  { to: "/clips", label: "Clip History", icon: Clapperboard, testid: "nav-clips" },
  { to: "/compare", label: "Session Compare", icon: GitCompare, testid: "nav-compare" },
  { to: "/pressure", label: "Pressure Mode", icon: Timer, testid: "nav-pressure" },
  { to: "/goals", label: "Goals", icon: Flag, testid: "nav-goals" },
  { to: "/report", label: "Weekly Report", icon: CalendarDays, testid: "nav-report" },
  { to: "/skills", label: "Skill Library", icon: BookOpen, testid: "nav-skills" },
  { to: "/players", label: "Player Lab", icon: Users, testid: "nav-players" },
  { to: "/achievements", label: "Achievements", icon: Trophy, testid: "nav-achievements" },
];

const MOBILE_NAV = [NAV[0], NAV[1], NAV[2], NAV[3], NAV[4]];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 rounded-lg bg-[#C6FF00] flex items-center justify-center glow-lime">
        <Target className="h-5 w-5 text-[#0A0A0A]" strokeWidth={2.5} />
      </div>
      <div className="leading-none">
        <div className="heading text-lg text-white">Elite</div>
        <div className="text-[9px] uppercase tracking-[0.25em] text-[#C6FF00]">AI Coach</div>
      </div>
    </div>
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          data-testid={item.testid}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-200 ${
              isActive
                ? "bg-[#C6FF00]/10 text-[#C6FF00] border border-[#C6FF00]/30"
                : "text-gray-400 hover:text-white hover:bg-[#1A1C23] border border-transparent"
            }`
          }
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const doLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="min-h-screen bg-[#0A0A0C] grid-bg">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-[#282C37] bg-[#0A0A0C]/95 backdrop-blur-xl z-30">
        <div className="px-5 py-5 border-b border-[#282C37]"><Logo /></div>
        <div className="flex-1 overflow-y-auto px-3 py-4"><NavItems /></div>
        <div className="border-t border-[#282C37] p-3">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{user?.name}</div>
              <div className="text-xs text-gray-500 truncate">{user?.profile?.primary_archetype || "Player"}</div>
            </div>
            <button data-testid="logout-btn" onClick={doLogout} className="text-gray-500 hover:text-[#FF3B30] transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 border-b border-[#282C37] bg-[#0A0A0C]/90 backdrop-blur-xl">
        <Logo />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button data-testid="mobile-menu-btn" className="p-2 text-gray-300"><Menu className="h-6 w-6" /></button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-[#0A0A0C] border-[#282C37] p-0">
            <div className="px-5 py-5 border-b border-[#282C37] flex items-center justify-between">
              <Logo />
              <button onClick={() => setOpen(false)} className="text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            <div className="px-3 py-4 overflow-y-auto"><NavItems onNavigate={() => setOpen(false)} /></div>
            <div className="border-t border-[#282C37] p-3">
              <button data-testid="logout-btn-mobile" onClick={doLogout} className="flex items-center gap-2 text-sm text-gray-400 px-3 py-2">
                <LogOut className="h-4 w-4" /> Log out
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Main content */}
      <main className="lg:pl-64 pb-24 lg:pb-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 py-6 lg:py-10">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[#282C37] bg-[#0A0A0C]/95 backdrop-blur-xl">
        <div className="flex items-stretch justify-around">
          {MOBILE_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              data-testid={`bottomnav-${item.testid}`}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  isActive ? "text-[#C6FF00]" : "text-gray-500"
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label.split(" ")[0]}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
