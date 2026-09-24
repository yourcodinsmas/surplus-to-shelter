'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Utensils, Scale, Leaf, Activity, Clock, MapPin,
  CheckCircle2, Truck, RefreshCw, ArrowUpRight, Wifi, WifiOff,
  Flame, ShieldCheck
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { fetchMatches, fetchStats, fetchShelters, SAMPLE_STATS, SAMPLE_MATCHES } from '../lib/api';

const RescueMap = dynamic(() => import('../components/RescueMap'), { ssr: false });

function getStatusBadge(status) {
  switch (status) {
    case 'matched':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />Matched
        </span>
      );
    case 'accepted':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />Driver Assigned
        </span>
      );
    case 'picked_up':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Truck className="w-3 h-3 text-amber-400" />In Transit
        </span>
      );
    case 'delivered':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Delivered
        </span>
      );
    default:
      return (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-slate-800 text-slate-300 capitalize">
          {status}
        </span>
      );
  }
}

export default function DashboardPage() {
  const [matches, setMatches]           = useState(SAMPLE_MATCHES);
  const [stats, setStats]               = useState(SAMPLE_STATS);
  const [shelters, setShelters]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [lastRefresh, setLastRefresh]   = useState(null);
  const [isLive, setIsLive]             = useState(false);
  const [countdown, setCountdown]       = useState(10);

  const loadData = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const [liveMatches, liveStats, liveShelters] = await Promise.all([
        fetchMatches(),
        fetchStats(),
        fetchShelters(),
      ]);
      setMatches(liveMatches);
      setStats(liveStats);
      setShelters(liveShelters);
      setIsLive(true);
      setLastRefresh(new Date());
      setCountdown(10);
    } catch {
      // stay on sample data
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const tick = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          loadData(false);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [loadData]);

  return (
    <div className="bg-canvas-dark text-slate-100 min-h-[calc(100vh-4rem)] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* ── Header (Biteback Style) ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-canvas-darkBorder pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biteback-950/60 text-biteback-400 text-xs font-mono font-medium border border-biteback-800/60 mb-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-biteback-500 animate-pulse"></span>
              {isLive ? '03 // LIVE SUPABASE TELEMETRY' : '03 // SAMPLE TELEMETRY MODE'}
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2.5">
              <span>Rescue Impact Telemetry</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-mono">
              Auto-refreshes every 10 seconds.
              {lastRefresh && (
                <span className="ml-2 text-slate-500">
                  Last sync: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Animated countdown ring */}
            <div className="w-10 h-10 relative flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#202227" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#DC2626" strokeWidth="3"
                  strokeDasharray={`${countdown * 10} 100`}
                  strokeLinecap="round" className="transition-all duration-1000"
                />
              </svg>
              <span className="text-[10px] font-mono font-bold text-biteback-400 relative z-10">{countdown}s</span>
            </div>

            <button onClick={() => loadData(true)} disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-canvas-darkCard hover:bg-canvas-darkSubtle border border-canvas-darkBorder text-xs font-bold text-slate-200 transition active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* ── 4 Stat Cards (Biteback High-Impact Metric Blocks) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {[
            {
              label: 'Meals Rescued', value: stats.mealsRescued.toLocaleString(),
              unit: 'portions',
              sub: 'Direct to local pantries', icon: <Utensils className="w-4 h-4" />,
              borderAccent: 'border-biteback-900/60',
              colorAccent: 'text-biteback-400',
              bgAccent: 'bg-biteback-950/40',
            },
            {
              label: 'Weight Rescued', value: `${stats.kgSaved.toLocaleString()}`,
              unit: 'kg food',
              sub: 'Diverted from municipal landfill', icon: <Scale className="w-4 h-4" />,
              borderAccent: 'border-indigo-900/60',
              colorAccent: 'text-indigo-400',
              bgAccent: 'bg-indigo-950/40',
            },
            {
              label: 'CO₂e Avoided', value: `${stats.co2AvoidedKg.toLocaleString()}`,
              unit: 'kg emissions',
              sub: 'Methane generation prevented', icon: <Leaf className="w-4 h-4" />,
              borderAccent: 'border-emerald-900/60',
              colorAccent: 'text-emerald-400',
              bgAccent: 'bg-emerald-950/40',
            },
            {
              label: 'Active Dispatches', value: stats.activeMatches,
              unit: 'in-flight',
              sub: 'Drivers currently on route',
              icon: <Activity className="w-4 h-4" />,
              borderAccent: 'border-amber-900/60',
              colorAccent: 'text-amber-400',
              bgAccent: 'bg-amber-950/40',
              pulse: true,
            },
          ].map(({ label, value, unit, sub, icon, borderAccent, colorAccent, bgAccent, pulse }) => (
            <div key={label}
              className={`bg-canvas-darkCard border ${borderAccent} rounded-2xl p-5 shadow-card hover:border-slate-600 transition relative overflow-hidden flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400">{label}</span>
                  <div className={`w-8 h-8 rounded-xl ${bgAccent} flex items-center justify-center ${colorAccent} border border-white/10`}>
                    {icon}
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white">{value}</div>
                  <span className="text-xs font-mono text-slate-500">{unit}</span>
                </div>
              </div>
              <p className={`text-xs ${colorAccent} mt-4 flex items-center gap-1.5 font-medium`}>
                {pulse
                  ? <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  : <ArrowUpRight className="w-3.5 h-3.5" />}
                <span className="font-mono text-[11px]">{sub}</span>
              </p>
            </div>
          ))}
        </div>

        {/* ── City-Wide Rescue Network Live Map ── */}
        <div className="bg-canvas-darkCard border border-canvas-darkBorder rounded-2xl p-5 sm:p-6 shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-canvas-darkBorder pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-biteback-950/60 border border-biteback-800/60 text-biteback-400 flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">City-Wide Shelter Network & Live Dispatches</h2>
                <p className="text-xs font-mono text-slate-400">Live pantry capacity monitoring across San Francisco</p>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-biteback-950/80 text-biteback-300 border border-biteback-800/80 font-mono font-medium self-start sm:self-auto">
              ● {shelters.length} Pantries Online
            </span>
          </div>

          <RescueMap
            shelters={shelters}
            theme="dark"
            height="340px"
            zoom={12}
            center={[37.7749, -122.4194]}
          />
        </div>

        {/* ── Recent Matches List ── */}
        <div className="bg-canvas-darkCard border border-canvas-darkBorder rounded-2xl overflow-hidden shadow-card">
          <div className="px-6 py-4 border-b border-canvas-darkBorder flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2 font-mono uppercase tracking-wider">
              <Clock className="w-4 h-4 text-biteback-400" />
              Recent Food Matches
            </h2>
            <span className="text-xs font-mono text-slate-400">
              {matches.length} entries
            </span>
          </div>

          <div className="divide-y divide-canvas-darkBorder">
            {matches.map(item => (
              <div key={item.id}
                className="p-5 sm:px-6 hover:bg-canvas-darkSubtle/60 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm sm:text-base">
                      {item.food_name || `Donation #${item.donation_id}`}
                    </span>
                    {item.quantity != null && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800 text-slate-300">
                        {item.quantity} kg
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      {item.recipient_name || `Shelter #${item.recipient_id}`}
                      {item.distance_km != null && ` · ${item.distance_km} km`}
                    </span>
                    {item.match_score != null && (
                      <span className="font-mono">Score: <strong className="text-biteback-400">{Math.round(item.match_score * 100)}%</strong></span>
                    )}
                    {item.donor_name && (
                      <span className="text-slate-500">From: {item.donor_name}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-right text-xs">
                    <div className="text-slate-400 font-mono text-[11px]">Volunteer Driver</div>
                    <div className="font-bold text-slate-200">
                      {item.driver_name || 'Unassigned'}
                    </div>
                  </div>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
