import React, { useState } from "react";
import { useAuth } from "../providers/AuthProvider";
import { useData } from "../providers/DataProvider";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Sun, 
  Moon, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  LogOut, 
  Download, 
  RotateCcw,
  Heart,
  Check,
  Building,
  Terminal,
  X
} from "lucide-react";
import { Modal } from "../components/Modal";

// Constants requested by instructions
const SUPPORT_URL = "https://ko-fi.com/3gaspo";
const APP_VERSION = "0.0.1";

export const SettingsPage: React.FC = () => {
  const { user, isDevMode, error: authError, signIn, signUp, signOut } = useAuth();
  const { 
    addresses, 
    competitors, 
    amenities, 
    settings, 
    updateTheme, 
    addAmenity, 
    updateAmenity, 
    deleteAmenity,
    clearHistory,
    resetAll
  } = useData();

  // Theme details
  const isDark = settings.theme === "dark";

  // Account Form States
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  // Amenity Form States
  const [newAmenityLabel, setNewAmenityLabel] = useState("");
  const [amenityToEdit, setAmenityToEdit] = useState<{ id: string; label: string } | null>(null);
  const [editAmenityLabel, setEditAmenityLabel] = useState("");
  const [amenityError, setAmenityError] = useState<string | null>(null);

  // Reset Modal States
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetStep, setResetStep] = useState<"choose" | "confirm_clear" | "confirm_all" | "success">("choose");
  const [resetSuccessMessage, setResetSuccessMessage] = useState<string>("");

  // More confirm modal states
  const [amenityToDelete, setAmenityToDelete] = useState<{ id: string; label: string } | null>(null);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);

  // Handle Authentication
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setAuthLoading(true);
    try {
      if (isSignUpMode) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
    } finally {
      setAuthLoading(false);
    }
  };

  // Add Amenity Submit
  const handleAddAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmenityError(null);
    if (!newAmenityLabel.trim()) return;

    try {
      await addAmenity(newAmenityLabel);
      setNewAmenityLabel("");
    } catch (err) {
      setAmenityError(err instanceof Error ? err.message : "Error adding amenity");
    }
  };

  // Edit Amenity Submit
  const handleEditAmenity = async (e: React.FormEvent) => {
    e.preventDefault();
    setAmenityError(null);
    if (!amenityToEdit || !editAmenityLabel.trim()) return;

    try {
      await updateAmenity(amenityToEdit.id, editAmenityLabel);
      setAmenityToEdit(null);
      setEditAmenityLabel("");
    } catch (err) {
      setAmenityError(err instanceof Error ? err.message : "Error editing amenity");
    }
  };

  // CSV Export Logic
  const handleDownloadCSV = () => {
    const headers = [
      "address_id",
      "address_label",
      "address_full_address",
      "address_radius_km",
      "competitor_id",
      "competitor_name",
      "price_per_night",
      "bed_count",
      "price_per_bed",
      "surface_m2",
      "price_per_m2",
      "distance_km",
      "amenities",
      "competitor_comment",
      "competitor_created_at",
      "competitor_updated_at"
    ];

    const rows: string[][] = [];

    addresses.forEach((addr) => {
      const addrComps = competitors.filter((c) => c.addressId === addr.id);
      
      const escapeCSV = (str: string) => {
        if (str === null || str === undefined) return "";
        const val = String(str).replace(/"/g, '""');
        if (val.includes(",") || val.includes('"') || val.includes("\n") || val.includes("\r")) {
          return `"${val}"`;
        }
        return val;
      };

      if (addrComps.length === 0) {
        // Empty competitor fields, only address info
        rows.push([
          addr.id,
          escapeCSV(addr.label),
          escapeCSV(addr.fullAddress),
          addr.radiusKm.toString(),
          "", "", "", "", "", "", "", "", "", "", "", ""
        ]);
      } else {
        addrComps.forEach((comp) => {
          const bedCountSafe = comp.bedCount > 0 ? comp.bedCount : 1;
          const pricePerBed = comp.pricePerNight / bedCountSafe;
          
          const hasSurface = comp.surfaceM2 !== undefined && comp.surfaceM2 !== null && comp.surfaceM2 > 0;
          const pricePerM2 = hasSurface ? comp.pricePerNight / (comp.surfaceM2 as number) : null;

          const hasDistance = comp.distanceKm !== undefined && comp.distanceKm !== null;

          const amLabels = comp.amenities
            .map((id) => amenities.find((am) => am.id === id)?.label || id)
            .join("|");

          rows.push([
            addr.id,
            escapeCSV(addr.label),
            escapeCSV(addr.fullAddress),
            addr.radiusKm.toString(),
            comp.id,
            escapeCSV(comp.name),
            comp.pricePerNight.toString(),
            comp.bedCount.toString(),
            pricePerBed.toFixed(1),
            hasSurface ? comp.surfaceM2!.toString() : "",
            pricePerM2 !== null ? pricePerM2.toFixed(1) : "",
            hasDistance ? comp.distanceKm!.toString() : "",
            escapeCSV(amLabels),
            escapeCSV(comp.comment || ""),
            comp.createdAt,
            comp.updatedAt
          ]);
        });
      }
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateStr = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `airpricer_export_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-12 pb-32">
      {/* Page Header */}
      <div className="flex items-center gap-3 justify-between">
        <h1 className="text-4xl font-extrabold tracking-tight text-neutral-950 dark:text-white">
          Settings
        </h1>
        {isDevMode && (
          <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-full">
            <Terminal size={11} />
            <span>Dev mode</span>
          </span>
        )}
      </div>

      {/* Strict Section Order */}
      
      {/* 1. APP-SPECIFIC SETTINGS */}
      <section className="bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] space-y-6 transition-theme">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-neutral-500 dark:text-neutral-400 block">
            Amenities Configuration
          </span>
        </div>

        {/* Amenities Editor Inner List */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Current List */}
            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-neutral-100 dark:border-zinc-800">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-3 text-neutral-400">
                Current Amenities ({amenities.length})
              </span>
              
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {amenities.map((am) => (
                  <div 
                    key={am.id} 
                    className="flex items-center justify-between p-2.5 bg-neutral-50 dark:bg-zinc-800/30 rounded-xl hover:bg-neutral-100 dark:hover:bg-zinc-800/60 transition-all text-xs"
                  >
                    {amenityToEdit?.id === am.id ? (
                      <form 
                        onSubmit={handleEditAmenity}
                        className="flex items-center gap-1.5 w-full"
                      >
                        <input
                          type="text"
                          required
                          value={editAmenityLabel}
                          onChange={(e) => setEditAmenityLabel(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 rounded-lg text-xs"
                        />
                        <button 
                          type="submit"
                          className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg cursor-pointer"
                        >
                          <Check size={14} />
                        </button>
                        <button 
                          type="button"
                          onClick={() => setAmenityToEdit(null)}
                          className="p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                        >
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                          {am.label}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setAmenityToEdit({ id: am.id, label: am.label });
                              setEditAmenityLabel(am.label);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              setAmenityToDelete({ id: am.id, label: am.label });
                            }}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Add New Amenity */}
            <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-neutral-100 dark:border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-3 text-neutral-400">
                  Add custom amenity
                </span>
                
                <form onSubmit={handleAddAmenity} className="space-y-3">
                  <input
                    type="text"
                    required
                    value={newAmenityLabel}
                    onChange={(e) => setNewAmenityLabel(e.target.value)}
                    placeholder="e.g., Hot Tub, Gym..."
                    className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-zinc-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-xs"
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Create Amenity</span>
                  </button>
                </form>
              </div>

              {amenityError && (
                <p className="text-rose-600 dark:text-rose-400 text-xs font-medium mt-3 bg-rose-50 dark:bg-rose-900/10 p-2 rounded-lg border border-rose-100 dark:border-rose-900/30">
                  {amenityError}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. APPEARANCE */}
      <section className="bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] space-y-6 transition-theme">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-neutral-500 dark:text-neutral-400 block">
            Appearance
          </span>
        </div>

        {/* Theme Toggle Button Card */}
        <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-neutral-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-300 rounded-xl">
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </div>
            <div>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">Dark Theme Mode</h4>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Eye-safe display interface</p>
            </div>
          </div>

          {/* Toggle pill switch */}
          <button
            onClick={() => updateTheme(isDark ? "light" : "dark")}
            className={`w-14 h-8 rounded-full p-1 transition-all duration-300 focus:outline-none cursor-pointer ${
              isDark ? "bg-sky-500" : "bg-neutral-200"
            }`}
          >
            <div
              className={`bg-white w-6 h-6 rounded-full shadow-md transform transition-all duration-300 ${
                isDark ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* 3. ACCOUNT */}
      <section className="bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] space-y-6 transition-theme">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-neutral-500 dark:text-neutral-400 block">
            Account Security
          </span>
        </div>

        {!user ? (
          /* SIGNED OUT AUTH CARD */
          <div className="bg-white dark:bg-zinc-900/40 p-6 rounded-3xl border border-neutral-100 dark:border-zinc-800 space-y-5">
            <div>
              <h4 className="text-lg font-bold text-neutral-900 dark:text-white">
                {isSignUpMode ? "Create a cloud account" : "Sign in to synchronize"}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Secure your pricing details across all active devices
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-xs"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter secure password"
                  className="w-full pl-10 pr-10 py-3 bg-neutral-50 dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 text-neutral-900 dark:text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-500 transition-theme text-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs rounded-2xl shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
              >
                {authLoading ? "Processing..." : isSignUpMode ? "Create Account" : "Sign In"}
              </button>
            </form>

            <div className="text-center">
              <button
                onClick={() => {
                  setIsSignUpMode(!isSignUpMode);
                  setNewAmenityLabel("");
                }}
                className="text-xs text-sky-500 hover:text-sky-600 font-medium underline cursor-pointer"
              >
                {isSignUpMode ? "Already have an account? Sign in" : "Don't have an account yet? Create one"}
              </button>
            </div>

            {authError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 font-medium text-center bg-rose-50 dark:bg-rose-950/15 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/30">
                {authError}
              </p>
            )}
          </div>
        ) : (
          /* SIGNED IN ACCOUNT INFO */
          <div className="bg-white dark:bg-zinc-900/40 p-5 rounded-2xl border border-neutral-100 dark:border-zinc-800 flex items-center gap-4">
            <div className="h-12 w-12 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 rounded-full flex items-center justify-center shrink-0">
              <User size={20} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-400">
                Account Email
              </span>
              <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                {user.email || "Offline Local Profile"}
              </h4>
            </div>
          </div>
        )}
      </section>

      {/* 4. ACTIONS */}
      <section className="bg-neutral-100/70 dark:bg-zinc-900/50 p-6 sm:p-8 rounded-[32px] space-y-6 transition-theme">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 text-neutral-500 dark:text-neutral-400 block">
            Actions
          </span>
        </div>

        {/* Action Rows - Strict Order */}
        <div className="space-y-3">
          
          {/* Action 1: Disconnect / Sign out (rendered only when user exists) */}
          {user && (
            <button
              onClick={() => setIsSignOutConfirmOpen(true)}
              className="w-full p-4 sm:p-5 bg-white dark:bg-zinc-900/40 border border-neutral-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-zinc-800/40 active:scale-[0.99] transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 rounded-xl">
                  <LogOut size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-950 dark:text-white">Sign Out / Disconnect</h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Exit your cloud synchronized profile session safely</p>
                </div>
              </div>
            </button>
          )}

          {/* Action 2: Download data as CSV */}
          <button
            onClick={handleDownloadCSV}
            className="w-full p-4 sm:p-5 bg-white dark:bg-zinc-900/40 border border-neutral-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between text-left hover:bg-neutral-50 dark:hover:bg-zinc-800/40 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-neutral-100 dark:bg-zinc-800 text-neutral-500 dark:text-neutral-400 rounded-xl">
                <Download size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-neutral-950 dark:text-white">Export listings data (CSV)</h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">Download a spreadsheet compatible report of all properties</p>
              </div>
            </div>
          </button>

          {/* Action 3: Reset data */}
          <button
            onClick={() => {
              setResetStep("choose");
              setResetSuccessMessage("");
              setIsResetModalOpen(true);
            }}
            className="w-full p-4 sm:p-5 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/10 dark:hover:bg-rose-950/20 border border-rose-100 dark:border-rose-900/20 rounded-2xl flex items-center justify-between text-left active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl">
                <RotateCcw size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-700 dark:text-rose-400">Reset Application Data</h4>
                <p className="text-[10px] text-rose-500/80 dark:text-rose-400/80">Wipe competitor listings or perform a total software factory reset</p>
              </div>
            </div>
          </button>

        </div>
      </section>

      {/* 5. FOOTER CREDITS */}
      <footer className="flex flex-col items-center justify-center gap-6 pt-10 text-center border-t border-neutral-200/40 dark:border-zinc-800/40">
        
        {/* GASPO credits brand logo image */}
        <div className="opacity-90 transition-all duration-300 dark:invert">
          <img 
            src="/gaspo_logo.svg" 
            alt="Gaspard Berthelier Logo" 
            className="w-32 h-32 object-contain"
            onError={(e) => {
              // Graceful error fallback
              (e.target as HTMLElement).style.display = "none";
            }}
          />
        </div>

        {/* Credit Lines */}
        <div className="space-y-1 text-xs text-neutral-650 dark:text-neutral-300">
          <p className="font-semibold text-neutral-800 dark:text-neutral-200">
            AirPricer — version {APP_VERSION}
          </p>
          <p className="tracking-widest uppercase font-bold text-[10px] text-neutral-700 dark:text-neutral-300">
            GASPARD BERTHELIER
          </p>
          <p>
            <a 
              href="mailto:gberthelier.projet@gmail.com" 
              className="underline text-sky-500 dark:text-sky-400 font-semibold"
            >
              gberthelier.projet@gmail.com
            </a>
          </p>
        </div>

        {/* Support the project button */}
        <div className="pt-2">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs font-bold bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 active:scale-95 transition-all shadow hover:shadow-md cursor-pointer"
          >
            <Heart size={14} className="text-rose-500 fill-rose-500" />
            <span>Support the project</span>
          </a>
        </div>

      </footer>

      {/* Structured Reset Data Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Application Data"
      >
        {resetStep === "choose" && (
          <div className="space-y-5">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Choose the type of reset operation you wish to perform on your account data.
            </p>

            <div className="space-y-3.5">
              {/* Action 1: Clear History */}
              <button
                onClick={() => setResetStep("confirm_clear")}
                className="w-full p-4 border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-100 dark:hover:bg-zinc-800 rounded-2xl text-left transition-all cursor-pointer"
              >
                <h5 className="text-xs font-bold text-neutral-900 dark:text-white">1. Clear History</h5>
                <p className="text-[10px] text-neutral-500">Deletes all competitor listings across all your active addresses. Preserves addresses and configs.</p>
              </button>

              {/* Action 2: Reset All */}
              <button
                onClick={() => setResetStep("confirm_all")}
                className="w-full p-4 border border-rose-200 dark:border-rose-900 bg-rose-50/50 hover:bg-rose-100/60 dark:bg-rose-950/10 dark:hover:bg-rose-950/25 rounded-2xl text-left transition-all cursor-pointer"
              >
                <h5 className="text-xs font-bold text-rose-700 dark:text-rose-400">2. Reset All (Destructive)</h5>
                <p className="text-[10px] text-rose-600 dark:text-rose-400">Permanently clears everything including competitors, addresses, custom amenities list, settings and preferences.</p>
              </button>
            </div>

            <div className="flex gap-2 pt-3 border-t border-neutral-100 dark:border-zinc-800">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="w-full py-3 bg-neutral-100 dark:bg-zinc-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-200 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Cancel / Go Back
              </button>
            </div>
          </div>
        )}

        {resetStep === "confirm_clear" && (
          <div className="space-y-5">
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Confirm Deletion of Competitors</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Are you sure you want to clear your competitor listings history? Your saved locations, settings, and custom amenities will be preserved. This action is permanent and cannot be undone.
            </p>
            <div className="flex gap-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800">
              <button
                onClick={() => setResetStep("choose")}
                className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Cancel / Go Back
              </button>
              <button
                onClick={async () => {
                  await clearHistory();
                  setResetSuccessMessage("Competitor listings history has been cleared successfully.");
                  setResetStep("success");
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Confirm & Wipe
              </button>
            </div>
          </div>
        )}

        {resetStep === "confirm_all" && (
          <div className="space-y-5">
            <h4 className="text-base font-bold text-rose-700 dark:text-rose-400">🚨 WARNING: Total Factory Reset</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
              This will perform a total factory reset! All competitor listings, saved addresses/locations, custom amenities, and theme preferences will be permanently wiped out from this device and account.
            </p>
            <div className="flex gap-2.5 pt-3 border-t border-neutral-100 dark:border-zinc-800">
              <button
                onClick={() => setResetStep("choose")}
                className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Cancel / Go Back
              </button>
              <button
                onClick={async () => {
                  await resetAll();
                  setResetSuccessMessage("All application data has been completely reset.");
                  setResetStep("success");
                }}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Yes, Wipe Everything
              </button>
            </div>
          </div>
        )}

        {resetStep === "success" && (
          <div className="space-y-5 text-center py-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h4 className="text-base font-bold text-neutral-900 dark:text-white">Operation Completed</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
              {resetSuccessMessage}
            </p>
            <div className="pt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="w-full py-3 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Disconnect / Sign Out Confirmation Modal */}
      <Modal
        isOpen={isSignOutConfirmOpen}
        onClose={() => setIsSignOutConfirmOpen(false)}
        title="Confirm Sign Out"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Are you sure you want to sign out from your cloud profile? You can always sign in again later to synchronize your listings.
          </p>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setIsSignOutConfirmOpen(false)}
              className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                await signOut();
                setIsSignOutConfirmOpen(false);
              }}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Amenity Confirmation Modal */}
      <Modal
        isOpen={amenityToDelete !== null}
        onClose={() => setAmenityToDelete(null)}
        title="Confirm Amenity Deletion"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Are you sure you want to delete the amenity <strong className="text-neutral-900 dark:text-white">"{amenityToDelete?.label}"</strong>? It will be permanently removed from all existing competitor listings.
          </p>
          <div className="flex gap-2.5 pt-2">
            <button
              onClick={() => setAmenityToDelete(null)}
              className="flex-1 py-3 bg-neutral-100 dark:bg-zinc-800 text-neutral-700 dark:text-neutral-200 font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (amenityToDelete) {
                  deleteAmenity(amenityToDelete.id);
                  setAmenityToDelete(null);
                }
              }}
              className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl transition-all cursor-pointer text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
