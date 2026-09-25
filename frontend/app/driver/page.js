'use client';

import { useState, useEffect } from 'react';
import {
  Truck, MapPin, CheckCircle2, PackageCheck,
  Navigation, RefreshCw, AlertCircle, Wifi, WifiOff, LogIn, LogOut
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useAuth } from '../lib/authContext';
import { fetchMatches, acceptMatch, updateMatchStatus, fetchDrivers, SAMPLE_MATCHES } from '../lib/api';

const RescueMap = dynamic(() => import('../components/RescueMap'), { ssr: false });

export default function DriverPage() {
  const { user, login, register, logout, quickLogin } = useAuth();
  const [jobs, setJobs]                   = useState([]);
  const [selectedId, setSelectedId]       = useState(null);
  const [loadingAction, setLoadingAction] = useState(null);
  const [message, setMessage]             = useState(null);
  const [fetching, setFetching]           = useState(true);
  const [isLive, setIsLive]               = useState(false);

  // In-page Driver Login/Register states
  const [authMode, setAuthMode]           = useState('login'); // 'login' or 'register'
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [name, setName]                   = useState('');
  const [phone, setPhone]                 = useState('');
  const [vehicle, setVehicle]             = useState('');
  const [authLoading, setAuthLoading]     = useState(false);
  const [authError, setAuthError]         = useState(null);
  const [authSuccess, setAuthSuccess]     = useState(null);

  // ── Load active jobs from backend ──────────────────────────────────────────
  const loadJobs = async () => {
    setFetching(true);
    try {
      const all = await fetchMatches();
      const active = all.filter(m => m.status !== 'cancelled');
      if (active.length > 0) {
        setJobs(active);
        if (!selectedId) setSelectedId(active[0].id);
        setIsLive(true);
      } else {
        throw new Error('no jobs');
      }
    } catch {
      const samples = SAMPLE_MATCHES.filter(m => m.status !== 'cancelled');
      setJobs(samples);
      if (!selectedId) setSelectedId(samples[0].id);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { loadJobs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentJob = jobs.find(j => j.id === selectedId) || jobs[0];

  // ── Driver Login Handlers ──────────────────────────────────────────────────
  const handleDriverLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await login(email, password);
      setAuthSuccess(`Welcome, ${data.user.name}! Accessing active dispatch runs…`);
    } catch (err) {
      setAuthError(err.message || 'Login failed. Please check your email and password.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDriverRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await register({
        name: name.trim(),
        email: email.trim(),
        password,
        role: 'driver',
        phone: phone.trim() || undefined,
        organization: vehicle.trim() || undefined,
      });
      setAuthSuccess(`Driver account created for ${data.user.name}! Loading dispatch…`);
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickDemoDriver = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const data = await quickLogin('driver');
      setAuthSuccess(`Signed in as demo driver (${data.user.name})!`);
    } catch (err) {
      setAuthError(err.message || 'Demo login failed');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Perform action on backend, then reload jobs ─────────────────────────────
  const handleAction = async (actionType) => {
    if (!currentJob) return;
    setLoadingAction(actionType);
    setMessage(null);

    // Resolve driver ID: Check if active user corresponds to an existing Driver record
    let driverId = user?.id || 1;
    try {
      const allDrivers = await fetchDrivers();
      if (allDrivers && allDrivers.length > 0) {
        const matched = allDrivers.find(
          d => (user?.name && d.name?.trim().toLowerCase() === user.name?.trim().toLowerCase()) ||
               (user?.phone && d.phone?.trim() === user.phone?.trim())
        );
        if (matched) {
          driverId = matched.id;
        } else if (!user?.id) {
          const available = allDrivers.find(d => d.is_available);
          driverId = available ? available.id : allDrivers[0].id;
        }
      }
    } catch {
      // Fallback to initial driverId
    }

    try {
      if (actionType === 'accept') {
        await acceptMatch(currentJob.id, driverId);
        setMessage({ type: 'success', text: `Job accepted by ${user?.name || 'Driver'}! Head to pickup address.` });
      } else if (actionType === 'picked_up') {
        await updateMatchStatus(currentJob.id, 'picked_up');
        setMessage({ type: 'success', text: 'Cargo picked up! Safe travels to the shelter.' });
      } else if (actionType === 'delivered') {
        await updateMatchStatus(currentJob.id, 'delivered');
        setMessage({ type: 'success', text: '🎉 Delivery complete! Shelter inventory updated.' });
      }
      await loadJobs();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Action failed — is the backend running?' });
    } finally {
      setLoadingAction(null);
    }
  };

  // ── IF DRIVER IS NOT LOGGED IN: SHOW NORMAL DRIVER LOGIN / REGISTER PAGE ────
  if (!user) {
    return (
      <div className="max-w-md mx-auto my-10 sm:my-16 px-4">
        {/* Index Tag */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="font-mono text-[11px] font-bold tracking-widest text-biteback-600 uppercase bg-biteback-50 border border-biteback-200/80 px-2.5 py-0.5 rounded-full">
            02 // VOLUNTEER DISPATCH ACCESS
          </span>
        </div>

        <div className="bg-canvas-card border border-canvas-border rounded-3xl p-6 sm:p-8 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-biteback-50 text-biteback-600 mb-3 border border-biteback-200/80 shadow-sm">
              <Truck className="w-7 h-7" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-canvas-text tracking-tight">
              {authMode === 'login' ? 'Driver Login' : 'Driver Registration'}
            </h1>
            <p className="text-xs text-canvas-muted mt-1.5 font-medium">
              {authMode === 'login' 
                ? 'Sign in to access real-time pickup routes & deliveries'
                : 'Join as a volunteer rescue driver to deliver food before expiry'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-canvas-border mb-5">
            <button
              onClick={() => { setAuthMode('login'); setAuthError(null); }}
              className={`flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                authMode === 'login'
                  ? 'border-biteback-600 text-biteback-600'
                  : 'border-transparent text-canvas-muted hover:text-canvas-text'
              }`}
            >
              Driver Sign In
            </button>
            <button
              onClick={() => { setAuthMode('register'); setAuthError(null); }}
              className={`flex-1 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition border-b-2 ${
                authMode === 'register'
                  ? 'border-biteback-600 text-biteback-600'
                  : 'border-transparent text-canvas-muted hover:text-canvas-text'
              }`}
            >
              New Driver Register
            </button>
          </div>

          {/* Feedback */}
          {authError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{authSuccess}</span>
            </div>
          )}

          {/* ── TAB 1: DRIVER SIGN IN FORM ── */}
          {authMode === 'login' ? (
            <form onSubmit={handleDriverLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Driver Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. driver@rescue.org"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-sm text-canvas-text bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-sm text-canvas-text bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-biteback-600 hover:bg-biteback-700 active:scale-[0.99] text-white font-display font-extrabold text-sm shadow-lg shadow-biteback-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing In…</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In as Driver</span>
                  </>
                )}
              </button>

              {/* Optional 1-Click Demo Driver Pill */}
              <div className="pt-2 border-t border-canvas-border">
                <button
                  type="button"
                  onClick={handleQuickDemoDriver}
                  disabled={authLoading}
                  className="w-full py-2.5 px-3 rounded-xl bg-canvas-subtle hover:bg-biteback-50 border border-canvas-border hover:border-biteback-300 text-canvas-muted hover:text-biteback-700 font-mono text-xs font-bold transition flex items-center justify-center gap-2"
                >
                  <Truck className="w-3.5 h-3.5 text-biteback-600" />
                  <span>Or test with 1-Click Demo Driver</span>
                </button>
              </div>
            </form>
          ) : (
            /* ── TAB 2: REGISTER AS NEW DRIVER FORM ── */
            <form onSubmit={handleDriverRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Full Driver Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@rescue.org"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Phone (For SMS Dispatch Alerts)
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 9897313403"
                  required
                  className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Vehicle Type / Organization
                </label>
                <input
                  type="text"
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  placeholder="e.g. Van, Hybrid Car, SF Volunteers"
                  className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-canvas-muted uppercase tracking-wider mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 4 characters"
                  required
                  minLength={4}
                  className="w-full px-3.5 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500/20 focus:border-biteback-500 outline-none text-xs text-canvas-text bg-white transition"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 px-4 mt-2 rounded-xl bg-biteback-600 hover:bg-biteback-700 active:scale-[0.99] text-white font-display font-extrabold text-sm shadow-lg shadow-biteback-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Registering Driver…</span>
                  </>
                ) : (
                  <>
                    <Truck className="w-4 h-4" />
                    <span>Create Driver Account</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  // ── DRIVER IS LOGGED IN: DISPLAY LIVE DRIVER DISPATCH CONSOLE ──────────────
  if (fetching && jobs.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-biteback-50 text-biteback-600 mb-4 border border-biteback-100">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="font-mono text-xs uppercase tracking-widest text-biteback-600 font-bold mb-1">02 // TELEMETRY SYNC</div>
        <p className="text-sm font-medium text-canvas-muted">Loading dispatch runs from live backend…</p>
      </div>
    );
  }

  const status = currentJob?.status;
  const ORDER  = ['matched', 'accepted', 'picked_up', 'delivered'];
  const step   = ORDER.indexOf(status ?? 'matched');

  // Dynamic Pickup and Dropoff Coordinates for Map (Jaipur, Rajasthan)
  const pickupLat = currentJob?.pickup_latitude || currentJob?.latitude || 26.9189;
  const pickupLng = currentJob?.pickup_longitude || currentJob?.longitude || 75.8080;
  const dropoffLat = currentJob?.recipient_latitude || 26.9124;
  const dropoffLng = currentJob?.recipient_longitude || 75.8010;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Index Tag */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-widest text-biteback-600 uppercase bg-biteback-50 border border-biteback-200/80 px-2.5 py-0.5 rounded-full">
            02 // VOLUNTEER DISPATCH
          </span>
          <span className="text-[11px] font-mono text-canvas-muted">REAL-TIME TELEMETRY</span>
        </div>
        <button
          onClick={() => logout()}
          className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-1 rounded-xl border border-rose-200 transition"
          title="Sign out to log in as another driver"
        >
          Sign Out / Switch Driver
        </button>
      </div>

      {/* Driver Profile Header */}
      <div className="bg-canvas-card border border-canvas-border rounded-3xl p-5 sm:p-6 shadow-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-biteback-600 to-biteback-800 text-white flex items-center justify-center shadow-lg shadow-biteback-600/25 shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display font-extrabold text-base sm:text-lg text-canvas-text tracking-tight">
                {user.name}
              </h1>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-biteback-50 text-biteback-700 border border-biteback-200">
                DRIVER #{user.id || 1}
              </span>
              <span className="font-mono text-[10px] text-canvas-muted">
                {user.organization || 'Volunteer Dispatch'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-canvas-muted mt-0.5">
              {isLive ? (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-emerald-600">
                  <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" /> LIVE CLOUD
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-amber-600">
                  <WifiOff className="w-3 h-3 text-amber-500" /> LOCAL SIM
                </span>
              )}
              <span>•</span>
              <span className="font-mono text-[11px] text-canvas-muted">{user.phone || '+91 9897313403'}</span>
            </div>
          </div>
        </div>

        {/* Job pills */}
        <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
          <span className="text-[10px] font-mono text-canvas-muted uppercase mr-1">RUN:</span>
          {jobs.slice(0, 5).map(j => (
            <button
              key={j.id}
              onClick={() => { setSelectedId(j.id); setMessage(null); }}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition ${
                selectedId === j.id
                  ? 'bg-biteback-600 text-white shadow-md shadow-biteback-600/30'
                  : 'bg-canvas-subtle text-canvas-muted hover:bg-canvas-border border border-canvas-border'
              }`}
            >
              #{j.id}
            </button>
          ))}
          <button
            onClick={() => loadJobs()}
            title="Refresh jobs"
            className="p-2 rounded-xl text-xs font-bold bg-biteback-50 text-biteback-700 hover:bg-biteback-100 border border-biteback-200 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Job card */}
      {currentJob ? (
        <div className="bg-canvas-card border border-canvas-border rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          {/* Progress stepper */}
          <div>
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-wider text-canvas-muted mb-2.5">
              <span>MISSION PROGRESS</span>
              <span className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-black capitalize border ${
                status === 'delivered' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                status === 'picked_up' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                status === 'accepted'  ? 'bg-indigo-50 text-indigo-800 border-indigo-200' :
                'bg-biteback-50 text-biteback-700 border-biteback-200'
              }`}>
                {status?.replace('_', ' ')}
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {ORDER.map((s, i) => (
                <div key={s} className="space-y-1.5">
                  <div className={`h-2 rounded-full transition-all duration-300 ${
                    i <= step ? 'bg-biteback-600' : 'bg-canvas-border'
                  }`} />
                  <span className={`block text-[10px] text-center font-mono uppercase tracking-wider ${
                    i <= step ? 'text-canvas-text font-bold' : 'text-canvas-muted'
                  }`}>
                    {s.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cargo */}
          <div className="bg-gradient-to-r from-biteback-50/70 to-amber-50/40 border border-biteback-100 rounded-2xl p-4 sm:p-5 flex items-center justify-between">
            <div>
              <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-biteback-700">
                ACTIVE CARGO CONSIGNMENT
              </div>
              <div className="font-display font-extrabold text-canvas-text text-base sm:text-lg mt-0.5">
                {currentJob.food_name || `Donation #${currentJob.donation_id}`}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="font-mono text-2xl font-black text-biteback-700 tracking-tight">
                {currentJob.quantity ?? '—'}
              </span>
              <span className="font-mono text-xs text-biteback-800 font-bold ml-1">KG</span>
            </div>
          </div>

          {/* Waypoints */}
          <div className="space-y-4 relative py-1">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-canvas-subtle border border-canvas-border flex items-center justify-center text-canvas-text shrink-0 font-mono font-bold text-xs shadow-xs">
                A
              </div>
              <div>
                <div className="font-mono text-[10px] font-bold text-canvas-muted uppercase tracking-wider">
                  01 // ORIGIN PICKUP (DONOR)
                </div>
                <div className="font-display font-bold text-canvas-text text-sm">
                  {currentJob.donor_name || 'Food Donor'}
                </div>
                <div className="text-xs text-canvas-muted flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-biteback-500 shrink-0" />
                  <span className="font-medium text-canvas-text">{currentJob.pickup_address || 'See backend dispatch'}</span>
                </div>
              </div>
            </div>

            <div className="ml-4 border-l-2 border-dashed border-biteback-300 h-6" />

            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-xl bg-biteback-600 text-white flex items-center justify-center shrink-0 font-mono font-bold text-xs shadow-md shadow-biteback-600/30">
                B
              </div>
              <div>
                <div className="font-mono text-[10px] font-bold text-biteback-700 uppercase tracking-wider">
                  02 // DESTINATION DROPOFF (SHELTER)
                </div>
                <div className="font-display font-bold text-canvas-text text-sm">
                  {currentJob.recipient_name || `Shelter #${currentJob.recipient_id}`}
                </div>
                <div className="text-xs text-canvas-muted flex items-center gap-1 mt-0.5">
                  <Navigation className="w-3.5 h-3.5 text-biteback-600 shrink-0" />
                  <span>{currentJob.recipient_address || 'See backend dispatch'}</span>
                  {currentJob.distance_km != null && (
                    <span className="font-mono font-bold text-biteback-700 ml-1">· {currentJob.distance_km} KM</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Live Delivery Route Map (Dynamically Updates With Pickup Location) */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-display font-bold text-canvas-text">
                <Navigation className="w-3.5 h-3.5 text-biteback-600" />
                Live Turn-by-Turn Route Map
              </span>
              <span className="font-mono text-[11px] text-biteback-700 font-bold bg-biteback-50 px-2 py-0.5 rounded-md border border-biteback-200">
                Pickup: {currentJob.pickup_address || 'GPS Synced'}
              </span>
            </div>
            <div className="rounded-2xl overflow-hidden border border-canvas-border shadow-sm">
              <RescueMap
                key={`driver-route-${currentJob.id}-${pickupLat}-${pickupLng}`}
                donorPoint={{
                  lat: pickupLat,
                  lng: pickupLng,
                  name: currentJob.donor_name || 'Food Donor Pickup',
                  address: currentJob.pickup_address,
                  foodName: currentJob.food_name,
                  quantity: currentJob.quantity,
                }}
                recipientPoint={{
                  lat: dropoffLat,
                  lng: dropoffLng,
                  name: currentJob.recipient_name || 'Shelter Dropoff',
                  address: currentJob.recipient_address,
                }}
                driverPoint={{
                  lat: 26.9124,
                  lng: 75.7873,
                  name: `${user.name} (You)`,
                }}
                showRoute={true}
                height="270px"
                theme="light"
              />
            </div>
          </div>

          {/* Feedback */}
          {message && (
            <div className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {message.type === 'success'
                ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* ── THE 3 BIG ACTION BUTTONS ─────────────────────────────── */}
          <div className="space-y-3 pt-2">
            {/* 1. Accept */}
            <button
              onClick={() => handleAction('accept')}
              disabled={loadingAction !== null || status !== 'matched'}
              className={`w-full py-4 px-6 rounded-2xl font-display font-extrabold text-base flex items-center justify-center gap-2.5 transition active:scale-[0.99] ${
                status === 'matched'
                  ? 'bg-biteback-600 hover:bg-biteback-700 text-white shadow-lg shadow-biteback-600/30 ring-2 ring-biteback-600/20'
                  : 'bg-canvas-subtle text-canvas-muted cursor-not-allowed border border-canvas-border opacity-60'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{loadingAction === 'accept' ? 'Confirming with backend…' : '1. Accept Job'}</span>
            </button>

            {/* 2. Picked Up */}
            <button
              onClick={() => handleAction('picked_up')}
              disabled={loadingAction !== null || status !== 'accepted'}
              className={`w-full py-4 px-6 rounded-2xl font-display font-extrabold text-base flex items-center justify-center gap-2.5 transition active:scale-[0.99] ${
                status === 'accepted'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-600/20'
                  : 'bg-canvas-subtle text-canvas-muted cursor-not-allowed border border-canvas-border opacity-60'
              }`}
            >
              <Truck className="w-5 h-5" />
              <span>{loadingAction === 'picked_up' ? 'Updating live status…' : '2. Picked Up'}</span>
            </button>

            {/* 3. Delivered */}
            <button
              onClick={() => handleAction('delivered')}
              disabled={loadingAction !== null || status !== 'picked_up'}
              className={`w-full py-4 px-6 rounded-2xl font-display font-extrabold text-base flex items-center justify-center gap-2.5 transition active:scale-[0.99] ${
                status === 'picked_up'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-600/20'
                  : status === 'delivered'
                  ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-300 cursor-default font-mono'
                  : 'bg-canvas-subtle text-canvas-muted cursor-not-allowed border border-canvas-border opacity-60'
              }`}
            >
              <PackageCheck className="w-5 h-5" />
              <span>
                {loadingAction === 'delivered'
                  ? 'Confirming delivery…'
                  : status === 'delivered'
                  ? 'Mission Completed Successfully! 🎉'
                  : '3. Delivered'}
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-canvas-card border border-canvas-border rounded-3xl p-12 text-center text-canvas-muted shadow-sm">
          <p className="font-medium">No active jobs right now. Post a donation first!</p>
        </div>
      )}
    </div>
  );
}
