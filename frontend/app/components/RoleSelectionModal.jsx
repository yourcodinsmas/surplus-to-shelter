'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UtensilsCrossed, Truck, Building2, LayoutDashboard, 
  ArrowRight, X, Sparkles, Flame, CheckCircle2, ShieldCheck, Zap
} from 'lucide-react';
import { useAuth } from '../lib/authContext';

export default function RoleSelectionModal() {
  const router = useRouter();
  const { user, quickLogin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingRole, setLoadingRole] = useState(null);

  useEffect(() => {
    // Only prompt if user hasn't explicitly chosen or dismissed in this browser session
    const hasChosen = sessionStorage.getItem('sts_role_chosen') || localStorage.getItem('sts_role_dismissed');
    
    // If not logged in and hasn't chosen role yet, display pop-up smoothly
    if (!hasChosen && !user) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Listen to custom event to reopen anytime from Navbar or buttons
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-role-selector', handleOpen);
    return () => window.removeEventListener('open-role-selector', handleOpen);
  }, []);

  const handleSelectRole = async (role, destination, autoDemoLogin = false) => {
    setLoadingRole(role);
    sessionStorage.setItem('sts_role_chosen', role);
    localStorage.setItem('sts_selected_role', role);

    try {
      if (autoDemoLogin && quickLogin) {
        await quickLogin(role === 'shelter' ? 'shelter' : role);
      }
    } catch (e) {
      console.warn('Demo login notice:', e);
    }

    setIsOpen(false);
    setLoadingRole(null);
    router.push(destination);
  };

  const handleDismiss = (dontShowAgain = false) => {
    if (dontShowAgain) {
      localStorage.setItem('sts_role_dismissed', 'true');
    }
    sessionStorage.setItem('sts_role_chosen', 'general');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-white border border-canvas-border rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Background Glow Accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-biteback-500/10 rounded-full blur-3xl pointer-events-none -z-0" />

        {/* Close Button */}
        <button
          onClick={() => handleDismiss(false)}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition z-10"
          title="Browse freely without selecting role"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center max-w-lg mx-auto mb-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biteback-50 border border-biteback-200/80 mb-3 shadow-xs">
            <Flame className="w-3.5 h-3.5 text-biteback-600" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-biteback-800">
              JAIPUR FOOD RESCUE NETWORK
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
            How would you like to participate today?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
            Select your role below. We will customize your interface and navigation for your workflow.
          </p>
        </div>

        {/* Role Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 relative z-10 mb-6">
          
          {/* OPTION 1: FOOD DONOR */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-biteback-500 bg-white hover:bg-biteback-50/20 transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-md">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-biteback-50 border border-biteback-100 text-biteback-600 flex items-center justify-center group-hover:scale-105 transition">
                  <UtensilsCrossed className="w-5 h-5" />
                </div>
                <span className="font-mono text-[10px] font-bold text-biteback-700 bg-biteback-50 border border-biteback-200/60 px-2 py-0.5 rounded-full">
                  01 // RESTAURANT
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1 group-hover:text-biteback-700 transition">
                I am a Food Donor
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Restaurants, caterers, bakeries, or banquets with surplus edible meals to donate.
              </p>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => handleSelectRole('donor', '/donate', false)}
                disabled={loadingRole !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-biteback-600 hover:bg-biteback-700 text-white font-bold text-xs shadow-biteback transition flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>Open Donor Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleSelectRole('donor', '/donate', true)}
                disabled={loadingRole !== null}
                className="w-full py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold text-biteback-700 hover:bg-biteback-100/60 transition flex items-center justify-center gap-1"
                title="Signs in as Chef Marco (Jaipur Spice Bistro)"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Instant Demo Login (Chef Marco)</span>
              </button>
            </div>
          </div>

          {/* OPTION 2: VOLUNTEER DRIVER */}
          <div className="p-4 sm:p-5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 bg-white hover:bg-amber-50/20 transition-all duration-200 flex flex-col justify-between group shadow-xs hover:shadow-md">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center group-hover:scale-105 transition">
                  <Truck className="w-5 h-5" />
                </div>
                <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  02 // VOLUNTEER
                </span>
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1 group-hover:text-amber-800 transition">
                I am a Volunteer Driver
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                Drivers ready to pick up surplus food and deliver to local shelters with real-time routing.
              </p>
            </div>

            <div className="space-y-1.5">
              <button
                onClick={() => handleSelectRole('driver', '/driver', false)}
                disabled={loadingRole !== null}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 active:scale-98"
              >
                <span>Open Driver Dispatch</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleSelectRole('driver', '/driver', true)}
                disabled={loadingRole !== null}
                className="w-full py-1.5 px-2 rounded-lg text-[11px] font-mono font-semibold text-amber-800 hover:bg-amber-100/60 transition flex items-center justify-center gap-1"
                title="Signs in as Jordan Lee (Volunteer Dispatch)"
              >
                <Zap className="w-3 h-3 text-amber-600" />
                <span>Instant Demo Login (Jordan Lee)</span>
              </button>
            </div>
          </div>

          {/* OPTION 3: SHELTER PARTNER */}
          <div className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 bg-white hover:bg-indigo-50/20 transition flex items-center justify-between group shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900 group-hover:text-indigo-700 transition">
                  Shelter / Food Bank Partner
                </div>
                <div className="text-[11px] text-slate-500">Monitor incoming deliveries & capacity</div>
              </div>
            </div>
            <button
              onClick={() => handleSelectRole('shelter', '/dashboard', false)}
              className="py-1.5 px-3 rounded-lg bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 font-bold text-[11px] transition shrink-0"
            >
              Enter →
            </button>
          </div>

          {/* OPTION 4: COMMUNITY & OBSERVER */}
          <div className="p-4 rounded-2xl border border-slate-200 hover:border-slate-800 bg-white hover:bg-slate-50 transition flex items-center justify-between group shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-900">
                  Community & Hackathon Evaluator
                </div>
                <div className="text-[11px] text-slate-500">View live city telemetry & network metrics</div>
              </div>
            </div>
            <button
              onClick={() => handleSelectRole('observer', '/dashboard', false)}
              className="py-1.5 px-3 rounded-lg bg-slate-900 text-white font-bold text-[11px] hover:bg-slate-800 transition shrink-0"
            >
              Explore →
            </button>
          </div>

        </div>

        {/* Footer Dismiss Options */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <button
            onClick={() => handleDismiss(false)}
            className="hover:text-slate-900 underline font-medium text-[11px]"
          >
            Just exploring? Continue without choosing a role
          </button>
          <button
            onClick={() => handleDismiss(true)}
            className="text-[11px] text-slate-400 hover:text-slate-600 transition"
          >
            Don't show this welcome prompt again
          </button>
        </div>

      </div>
    </div>
  );
}
