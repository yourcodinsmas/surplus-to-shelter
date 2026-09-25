'use client';

import Link from 'next/link';
import { 
  UtensilsCrossed, LayoutDashboard, Truck, ArrowRight, 
  ShieldCheck, Clock, MapPin, Sparkles, Navigation, Flame,
  CheckCircle2, Scale, Leaf, HeartHandshake
} from 'lucide-react';
import { useAuth } from './lib/authContext';

export default function HomePage() {
  const { openLoginModal } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Subtle Warm Background Glow Blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-biteback-100/40 via-biteback-50/20 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        
        {/* ── HERO SECTION (BiteBack Editorial Vibe) ── */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white border border-biteback-200 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-biteback-600 animate-pulse"></span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-biteback-800">
              01 // SURPLUS RESCUE NETWORK
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.08]">
            A rescue network for <br className="hidden sm:inline" />
            <span className="text-biteback-600">surplus edible food.</span>
          </h1>

          <p className="text-base sm:text-xl text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
            Connecting restaurants and grocers to local shelters in minutes.
            Powered by Intelligent Food Vision, 15 km spatial scoring, and autonomous driver dispatch.
          </p>

          {/* Quick Metrics Bar */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-mono">
            <span className="px-3 py-1 rounded-lg bg-white border border-canvas-border text-slate-700 font-semibold shadow-xs">
              ⚡ &lt; 2s Match Latency
            </span>
            <span className="px-3 py-1 rounded-lg bg-white border border-canvas-border text-slate-700 font-semibold shadow-xs">
              📍 15 km Radius Enforced
            </span>
            <span className="px-3 py-1 rounded-lg bg-white border border-canvas-border text-slate-700 font-semibold shadow-xs">
              🛡️ 0.7 Hard Safety Gate
            </span>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/donate"
              className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-biteback-600 hover:bg-biteback-700 text-white font-extrabold text-sm shadow-biteback transition active:scale-95 flex items-center justify-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Post Surplus Food</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>

            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 border border-canvas-border text-slate-800 font-bold text-sm shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-500" />
              <span>Explore Live Telemetry</span>
            </Link>
          </div>
        </div>

        {/* ── 3 MAIN GATEWAYS (Biteback Card Aesthetics) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          
          {/* Card 1: Donate */}
          <div className="bg-white rounded-3xl p-7 border border-canvas-border shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-biteback-50 rounded-bl-full pointer-events-none -z-0" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-biteback-50 border border-biteback-100 flex items-center justify-center text-biteback-600 group-hover:scale-105 transition">
                  <UtensilsCrossed className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-400">01 // INTAKE</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Donor Surplus Intake</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Snap a photo or type naturally. Intelligent Food Vision extracts quantity, safe expiry window, and runs automated safety checks.
              </p>
            </div>
            <Link
              href="/donate"
              className="relative z-10 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-biteback-600 text-white font-bold text-xs shadow-xs transition"
            >
              <span>Post Surplus (Under 60s)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Driver Manifest */}
          <div className="bg-white rounded-3xl p-7 border border-canvas-border shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-50 rounded-bl-full pointer-events-none -z-0" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-105 transition">
                  <Truck className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-400">02 // DISPATCH</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mb-2">Driver Route Portal</h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Volunteer drivers receive automated Twilio SMS dispatches, view live turn-by-turn Leaflet routes, and progress deliveries with 1 click.
              </p>
            </div>
            <Link
              href="/driver"
              className="relative z-10 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
            >
              <span>Open Driver Manifest</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Dashboard */}
          <div className="bg-canvas-dark rounded-3xl p-7 border border-canvas-darkBorder shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col justify-between group relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 w-28 h-28 bg-biteback-900/20 rounded-bl-full pointer-events-none -z-0" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <span className="font-mono text-[11px] font-bold text-slate-500">03 // TELEMETRY</span>
              </div>
              <h2 className="text-xl font-black text-white mb-2">Live Impact Dashboard</h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed mb-6">
                10-second auto-refreshing telemetry tracking meals rescued, diverted CO₂ emissions, and city-wide pantry storage capacity.
              </p>
            </div>
            <Link
              href="/dashboard"
              className="relative z-10 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs shadow-xs transition"
            >
              <span>View City Network Map</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-900" />
            </Link>
          </div>

        </div>

        {/* ── DESIGN CASE STUDY HIGHLIGHTS (BiteBack Process Breakdown) ── */}
        <div className="bg-white border border-canvas-border rounded-3xl p-8 sm:p-10 shadow-card space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-canvas-border pb-6">
            <div>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-biteback-700 bg-biteback-50 border border-biteback-200 px-3 py-1 rounded-full">
                SYSTEM DESIGN & METHODOLOGY
              </span>
              <h3 className="text-2xl font-black text-slate-900 mt-2">
                Engineered for strict time decay and zero friction.
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-400 sm:text-right">
              FASTAPI • SUPABASE • COMPUTER VISION • TWILIO
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="font-mono text-xs font-black text-biteback-600">01 / SAFETY GATE</div>
              <h4 className="font-bold text-sm text-slate-900">Safety Risk Gate (&le; 0.7)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cooked food degrades rapidly. Our dynamic deterioration formula gives cooked food a higher risk score as hours pass. Any food &gt; 0.7 is rejected instantly.
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-xs font-black text-amber-600">02 / SPATIAL ROUTING</div>
              <h4 className="font-bold text-sm text-slate-900">15 km Haversine Bounding</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-criteria scoring algorithm balancing time-to-spoil ($40\%$), travel distance ($30\%$), shelter capacity ($20\%$), and urgency ($10\%$).
              </p>
            </div>

            <div className="space-y-2">
              <div className="font-mono text-xs font-black text-indigo-600">03 / ZERO-INSTALL SMS</div>
              <h4 className="font-bold text-sm text-slate-900">Autonomous Driver Alert</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Volunteer drivers don't need to install an app. Automated Twilio SMS delivers pickup and shelter coordinates directly to their phone.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
