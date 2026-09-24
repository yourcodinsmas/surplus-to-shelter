'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  HeartHandshake, LayoutDashboard, Truck, UtensilsCrossed, 
  LogIn, LogOut, ChevronDown, Sparkles, Building2, Flame
} from 'lucide-react';
import { useAuth } from '../lib/authContext';
import LoginModal from './LoginModal';

export default function Navbar() {
  const { user, logout, openLoginModal } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'donor':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">Donor</span>;
      case 'driver':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">Driver</span>;
      case 'shelter':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-indigo-50 text-indigo-800 border border-indigo-200">Shelter</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider bg-slate-100 text-slate-700 capitalize">{role}</span>;
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-canvas-border shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo — Biteback-inspired bold identity */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-2xl bg-biteback-600 flex items-center justify-center text-white shadow-biteback group-hover:scale-105 transition-transform duration-200">
                <Flame className="w-5 h-5 fill-white/20 text-white" />
              </div>
              <div>
                <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight flex items-center gap-1">
                  Surplus<span className="text-biteback-600">2</span>Shelter
                </span>
                <span className="hidden sm:block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-semibold">
                  BiteBack Network • v2.0
                </span>
              </div>
            </Link>

            {/* Navigation & Auth */}
            <div className="flex items-center gap-2 sm:gap-4">
              <nav className="flex items-center gap-1 sm:gap-1.5">
                <Link
                  href="/donate"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-biteback-600 hover:bg-biteback-50 transition"
                >
                  <UtensilsCrossed className="w-4 h-4 text-biteback-600" />
                  <span>Donate</span>
                </Link>

                <Link
                  href="/dashboard"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-biteback-600 hover:bg-biteback-50 transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/driver"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-biteback-600 hover:bg-biteback-50 transition"
                >
                  <Truck className="w-4 h-4 text-slate-500" />
                  <span>Driver</span>
                </Link>
              </nav>

              <div className="h-5 w-px bg-canvas-border hidden sm:block" />

              {/* User Authentication Panel */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-canvas-border hover:border-slate-300 bg-white text-xs font-semibold text-slate-800 transition shadow-xs"
                  >
                    <div className="w-6 h-6 rounded-lg bg-biteback-600 text-white flex items-center justify-center font-bold text-[11px]">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] sm:max-w-[130px] truncate text-slate-900 font-bold">{user.name}</span>
                    {getRoleBadge(user.role)}
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-60 bg-white border border-canvas-border rounded-2xl shadow-xl py-2 z-50 animate-fadeIn"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <div className="font-extrabold text-xs text-slate-900">{user.name}</div>
                        <div className="text-[11px] font-mono text-slate-500 truncate">{user.email}</div>
                        {user.organization && (
                          <div className="text-[11px] text-biteback-700 flex items-center gap-1 mt-1 font-medium">
                            <Building2 className="w-3 h-3" />
                            <span className="truncate">{user.organization}</span>
                          </div>
                        )}
                      </div>

                      <div className="py-1">
                        {user.role === 'donor' && (
                          <Link href="/donate" className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-biteback-50 hover:text-biteback-700 transition">
                            Post Surplus Food
                          </Link>
                        )}
                        {user.role === 'driver' && (
                          <Link href="/driver" className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-biteback-50 hover:text-biteback-700 transition">
                            Active Driver Runs
                          </Link>
                        )}
                        <Link href="/dashboard" className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-biteback-50 hover:text-biteback-700 transition">
                          Network Telemetry
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 pt-1">
                        <button
                          onClick={logout}
                          className="w-full text-left px-4 py-2 text-xs text-biteback-700 hover:bg-biteback-50 flex items-center gap-2 font-bold transition"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={openLoginModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition active:scale-95"
                >
                  <LogIn className="w-3.5 h-3.5 text-biteback-400" />
                  <span>Log In</span>
                </button>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Global Login & Registration Modal */}
      <LoginModal />
    </>
  );
}
