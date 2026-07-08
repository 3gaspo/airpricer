import React, { useState } from "react";
import { AuthProvider, useAuth } from "./providers/AuthProvider";
import { DataProvider, useData } from "./providers/DataProvider";
import { Home } from "./pages/Home";
import { Statistics } from "./pages/Statistics";
import { Recommendation } from "./pages/Recommendation";
import { SettingsPage } from "./pages/SettingsPage";
import { 
  Home as HomeIcon, 
  BarChart3, 
  Sparkles, 
  Settings as SettingsIcon,
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff
} from "lucide-react";

// The Inner Layout component that consumes useAuth and useData context safely
const AppLayout: React.FC = () => {
  const { user, loading: authLoading, isDevMode, error: authError, signIn, signUp } = useAuth();
  const { loading: dataLoading } = useData();
  const [activeTab, setActiveTab] = useState<"home" | "stats" | "recommend" | "settings">("home");

  // Auth Form State for signed-out users
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authFormLoading, setAuthFormLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setAuthFormLoading(true);
    try {
      if (isSignUpMode) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAuthFormLoading(false);
    }
  };

  // 1. Loading States (Fades or Spinners)
  if (authLoading || (user && dataLoading)) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6 transition-colors duration-300">
        <div className="flex flex-col items-center gap-4 text-center animate-pulse">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg border border-neutral-200/40 dark:border-zinc-800 bg-black">
            <img src="/airpricer.svg" alt="AirPricer Icon" className="h-full w-full object-cover" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white">
              AirPricer
            </h1>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 font-medium mt-1">
              Evaluating market prices...
            </p>
          </div>
          <Loader2 className="animate-spin text-sky-500 mt-2" size={20} />
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Layout / Portal
  if (!user) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-4 transition-theme">
        <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 p-8 rounded-[32px] shadow-xl space-y-6">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center overflow-hidden shadow-md border border-neutral-200/40 dark:border-zinc-800 bg-black">
              <img src="/airpricer.svg" alt="AirPricer Icon" className="h-full w-full object-cover" />
            </div>
            <div>
              <h2 className="text-3xl font-black tracking-tight text-neutral-950 dark:text-white">
                AirPricer
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs font-medium">
                Helper for pricing your Airbnb
              </p>
            </div>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-11 pr-4 py-3 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs transition-theme font-medium"
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-neutral-400">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full pl-11 pr-11 py-3 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs transition-theme font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={authFormLoading}
              className="w-full py-3.5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-2xl shadow hover:shadow-lg active:scale-95 transition-all cursor-pointer"
            >
              {authFormLoading ? "Authenticating..." : isSignUpMode ? "Create Cloud Account" : "Sign In"}
            </button>
          </form>

          {/* Toggle auth mode */}
          <div className="text-center">
            <button
              onClick={() => setIsSignUpMode(!isSignUpMode)}
              className="text-xs text-sky-500 hover:text-sky-600 font-medium underline cursor-pointer"
            >
              {isSignUpMode ? "Already have an account? Sign in" : "Don't have an account yet? Create one"}
            </button>
          </div>

          {authError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium text-center bg-rose-50 dark:bg-rose-950/15 p-2.5 rounded-2xl border border-rose-100 dark:border-rose-900/30">
              {authError}
            </p>
          )}
        </div>
      </div>
    );
  }

  // 3. Authenticated Screen Navigation & View Port Router
  const renderActiveContent = () => {
    switch (activeTab) {
      case "home":
        return <Home />;
      case "stats":
        return <Statistics />;
      case "recommend":
        return <Recommendation />;
      case "settings":
        return <SettingsPage />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-zinc-950 text-neutral-900 dark:text-neutral-50 transition-theme flex flex-col">
      {/* Main Container - Desktop Constrained, Fluid Fluid */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {renderActiveContent()}
      </main>

      {/* FIXED BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/85 dark:bg-zinc-900/85 backdrop-blur-lg border-t border-neutral-200/50 dark:border-zinc-800/80 h-20 flex items-center justify-around px-4 z-40 shadow-2xl transition-theme">
        <div className="max-w-md w-full mx-auto flex items-center justify-around h-full">
          {/* Tab 1: Home */}
          <button
            onClick={() => setActiveTab("home")}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all cursor-pointer ${
              activeTab === "home"
                ? "text-sky-500 dark:text-sky-400 font-bold scale-105"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            }`}
          >
            <HomeIcon size={20} />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          {/* Tab 2: Competitor Statistics */}
          <button
            onClick={() => setActiveTab("stats")}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all cursor-pointer ${
              activeTab === "stats"
                ? "text-sky-500 dark:text-sky-400 font-bold scale-105"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            }`}
          >
            <BarChart3 size={20} />
            <span className="text-[10px] tracking-tight whitespace-nowrap">Stats</span>
          </button>

          {/* Tab 3: Recommendation */}
          <button
            onClick={() => setActiveTab("recommend")}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all cursor-pointer ${
              activeTab === "recommend"
                ? "text-sky-500 dark:text-sky-400 font-bold scale-105"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            }`}
          >
            <Sparkles size={20} />
            <span className="text-[10px] tracking-tight">Price</span>
          </button>

          {/* Tab 4: Settings */}
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all cursor-pointer ${
              activeTab === "settings"
                ? "text-sky-500 dark:text-sky-400 font-bold scale-105"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
            }`}
          >
            <SettingsIcon size={20} />
            <span className="text-[10px] tracking-tight">Settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

// Main Export wrapping Providers
export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppLayout />
      </DataProvider>
    </AuthProvider>
  );
}
