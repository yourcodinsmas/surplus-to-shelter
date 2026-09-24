'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/authContext';
import { 
  LogIn, UserPlus, Sparkles, AlertCircle, 
  UtensilsCrossed, Truck, Home, CheckCircle2 
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, quickLogin, logout } = useAuth();
  
  const [tab, setTab] = useState('login');
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('driver'); // Default to driver for instant driver onboarding!
  const [regOrg, setRegOrg] = useState('');
  const [regPhone, setRegPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(loginEmail, loginPassword);
      setSuccess(`Welcome, ${data.user.name}! Redirecting…`);
      setTimeout(() => {
        if (data.user.role === 'driver') router.push('/driver');
        else if (data.user.role === 'donor') router.push('/donate');
        else router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole,
        organization: regOrg || undefined,
        phone: regPhone || undefined,
      });
      setSuccess(`Account registered as ${regRole}! Redirecting…`);
      setTimeout(() => {
        if (data.user.role === 'driver') router.push('/driver');
        else if (data.user.role === 'donor') router.push('/donate');
        else router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role) => {
    setLoading(true);
    setError(null);
    try {
      const data = await quickLogin(role);
      setSuccess(`Signed in as demo ${role} (${data.user.name})!`);
      setTimeout(() => {
        if (role === 'driver') router.push('/driver');
        else if (role === 'donor') router.push('/donate');
        else router.push('/dashboard');
      }, 500);
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-10 sm:my-16 px-4">
      {/* Index Tag */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <span className="font-mono text-[11px] font-bold tracking-widest text-biteback-600 uppercase bg-biteback-50 border border-biteback-200/80 px-2.5 py-0.5 rounded-full">
          00 // IDENTITY & ACCESS
        </span>
      </div>

      {/* If user is already logged in, show active session banner without blocking login/register! */}
      {user && (
        <div className="mb-6 p-4 rounded-2xl bg-canvas-card border-2 border-biteback-200 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-biteback-50 text-biteback-600 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div>
                <div className="font-mono text-[10px] text-biteback-600 font-bold uppercase tracking-wider">
                  Active Session
                </div>
                <div className="font-display font-extrabold text-sm text-canvas-text">
                  {user.name} <span className="font-mono text-xs font-normal text-canvas-muted">({user.role})</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
              title="Log out and sign in with a different account"
            >
              Switch Account
            </button>
          </div>
          <button
            onClick={() => router.push(user.role === 'driver' ? '/driver' : user.role === 'donor' ? '/donate' : '/dashboard')}
            className="w-full py-2.5 rounded-xl bg-biteback-600 hover:bg-biteback-700 text-white font-display font-bold text-xs shadow-md transition"
          >
            Continue to {user.role === 'driver' ? 'Driver Portal' : user.role === 'donor' ? 'Donor Hub' : 'Live Dashboard'} →
          </button>
        </div>
      )}

      <div className="bg-canvas-card border border-canvas-border rounded-3xl p-6 sm:p-8 shadow-xl">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-biteback-50 text-biteback-600 mb-3 border border-biteback-200/80 shadow-sm">
            {tab === 'login' ? <LogIn className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-canvas-text tracking-tight">
            {tab === 'login' ? 'Driver & User Login' : 'Register New Account'}
          </h1>
          <p className="text-xs text-canvas-muted mt-1 font-medium">
            Open for volunteer drivers, food donors, and shelters
          </p>
        </div>

        {/* 1-Click Demo Logins */}
        <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-3.5 mb-6 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono font-bold text-canvas-muted uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-biteback-600" />
              1-Click Demo Login
            </span>
            <span className="text-[10px] text-canvas-muted font-normal">Zero friction</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('donor')}
              disabled={loading}
              className="px-2 py-2 rounded-xl bg-white hover:bg-biteback-50 border border-canvas-border hover:border-biteback-300 text-canvas-text text-xs font-display font-bold transition flex flex-col items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
            >
              <UtensilsCrossed className="w-4 h-4 text-biteback-600" />
              <span className="text-[11px]">Donor</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('driver')}
              disabled={loading}
              className="px-2 py-2 rounded-xl bg-white hover:bg-amber-50 border border-canvas-border hover:border-amber-300 text-canvas-text text-xs font-display font-bold transition flex flex-col items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
            >
              <Truck className="w-4 h-4 text-amber-600" />
              <span className="text-[11px]">Driver</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('shelter')}
              disabled={loading}
              className="px-2 py-2 rounded-xl bg-white hover:bg-indigo-50 border border-canvas-border hover:border-indigo-300 text-canvas-text text-xs font-display font-bold transition flex flex-col items-center gap-1 shadow-xs active:scale-95 disabled:opacity-50"
            >
              <Home className="w-4 h-4 text-indigo-600" />
              <span className="text-[11px]">Shelter</span>
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-canvas-border mb-5">
          <button
            onClick={() => { setTab('login'); setError(null); }}
            className={`flex-1 py-2 font-mono text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              tab === 'login'
                ? 'border-biteback-600 text-biteback-600'
                : 'border-transparent text-canvas-muted hover:text-canvas-text'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('register'); setError(null); }}
            className={`flex-1 py-2 font-mono text-xs font-bold uppercase tracking-wider transition border-b-2 ${
              tab === 'register'
                ? 'border-biteback-600 text-biteback-600'
                : 'border-transparent text-canvas-muted hover:text-canvas-text'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback notices */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                placeholder="donor@restaurant.com"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-sm text-canvas-text bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-sm text-canvas-text bg-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-biteback-600 hover:bg-biteback-700 active:scale-[0.99] text-white font-display font-extrabold text-sm shadow-lg shadow-biteback-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing In…</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <div>
              <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                placeholder="Chef Marco"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Email</label>
              <input
                type="email"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                placeholder="marco@bistro.com"
                required
                className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Password</label>
              <input
                type="password"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                placeholder="At least 4 characters"
                required
                minLength={4}
                className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Role</label>
                <select
                  value={regRole}
                  onChange={e => setRegRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text transition bg-white"
                >
                  <option value="donor">Food Donor</option>
                  <option value="driver">Volunteer Driver</option>
                  <option value="shelter">Shelter Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">Organization</label>
                <input
                  type="text"
                  value={regOrg}
                  onChange={e => setRegOrg(e.target.value)}
                  placeholder="Green Leaf Bistro"
                  className="w-full px-3 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 mt-2 rounded-xl bg-biteback-600 hover:bg-biteback-700 active:scale-[0.99] text-white font-display font-extrabold text-sm shadow-lg shadow-biteback-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating Account…</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
