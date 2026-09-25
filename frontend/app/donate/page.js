'use client';

import { useState, useRef, useEffect } from 'react';
import {
  UtensilsCrossed, Clock, MapPin, Scale, CheckCircle2,
  AlertTriangle, Send, Sparkles, Camera, Image as ImageIcon,
  Zap, AlertCircle, RefreshCw, X, Flame, LogIn, UserPlus, Lock,
  Building2, Phone, User, Check
} from 'lucide-react';
import { 
  submitDonation, 
  fetchNearbyMatches, 
  analyzeFoodPhoto, 
  parseFoodText, 
  calculateSafetyScore, 
  geocodeAddress,
  API_BASE_URL 
} from '../lib/api';
import { useAuth } from '../lib/authContext';
import dynamic from 'next/dynamic';

const RescueMap = dynamic(() => import('../components/RescueMap'), { ssr: false });

const JAIPUR_AREAS = [
  { name: 'MI Road', address: 'MI Road, Jaipur, Rajasthan', lat: 26.9189, lng: 75.8080 },
  { name: 'C-Scheme', address: 'C-Scheme, Ashok Nagar, Jaipur, Rajasthan', lat: 26.9124, lng: 75.8010 },
  { name: 'Malviya Nagar', address: 'Malviya Nagar, Jaipur, Rajasthan', lat: 26.8571, lng: 75.8127 },
  { name: 'Vaishali Nagar', address: 'Vaishali Nagar, Jaipur, Rajasthan', lat: 26.9068, lng: 75.7420 },
  { name: 'Mansarovar', address: 'Mansarovar, Jaipur, Rajasthan', lat: 26.8688, lng: 75.7645 },
  { name: 'Raja Park', address: 'Raja Park, Jaipur, Rajasthan', lat: 26.8976, lng: 75.8270 },
];

export default function DonatePage() {
  const { user, login, register, quickLogin, logout, loading: authLoading } = useAuth();

  // In-page Donor Authentication Form States
  const [authTab, setAuthTab]             = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail]         = useState('');
  const [authPassword, setAuthPassword]   = useState('');
  const [regName, setRegName]             = useState('');
  const [regOrg, setRegOrg]               = useState('');
  const [regPhone, setRegPhone]           = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [authError, setAuthError]         = useState(null);

  // Donation Form States
  const [foodName, setFoodName]           = useState('');
  const [quantity, setQuantity]           = useState('15');
  const [hours, setHours]                 = useState(6);
  const [address, setAddress]             = useState('MI Road, Jaipur, Rajasthan');
  const [pickupCoords, setPickupCoords]   = useState({ lat: 26.9189, lng: 75.8080 });
  const [donorName, setDonorName]         = useState('Jaipur Spice Bistro');
  const [donorPhone, setDonorPhone]       = useState('+91 98290 55188');
  
  // AI Safety Score states
  const [hoursSincePosted, setHoursSince] = useState(1);
  const [isCooked, setIsCooked]           = useState(true);
  const [safetyScore, setSafetyScore]     = useState(0.21); // computed: (1 / 6) * 1.25 = ~0.21
  
  // AI Photo Intake states
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [aiPhotoResult, setAiPhotoResult] = useState(null);
  const fileInputRef = useRef(null);

  // AI Text Parsing state
  const [parsingText, setParsingText]     = useState(false);
  const [aiTextResult, setAiTextResult]   = useState(null);

  // Submission states
  const [loading, setLoading]             = useState(false);
  const [result, setResult]               = useState(null);
  const [aiNotice, setAiNotice]           = useState(null);

  // Automatically update donor details if user is logged in
  useEffect(() => {
    if (user) {
      if (user.organization || user.name) {
        setDonorName(user.organization || user.name);
      }
      if (user.phone) {
        setDonorPhone(user.phone);
      }
    }
  }, [user]);

  // Dynamic geocoding when address changes
  const handleAddressChange = async (newAddress) => {
    setAddress(newAddress);
    try {
      const coords = await geocodeAddress(newAddress);
      setPickupCoords(coords);
    } catch {}
  };

  const handleSelectArea = (area) => {
    setAddress(area.address);
    setPickupCoords({ lat: area.lat, lng: area.lng });
  };

  // Recalculate dynamic safety score whenever hours or safe window change
  const updateSafety = (elapsedHours, safeWinHours, cookedFlag) => {
    setHoursSince(elapsedHours);
    const riskFactor = cookedFlag ? 1.25 : 1.0;
    const computed = Math.min(1.0, Math.max(0.0, (elapsedHours / Math.max(safeWinHours, 1.0)) * riskFactor));
    setSafetyScore(Math.round(computed * 100) / 100);
  };

  // 1. AI PHOTO INTAKE
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => setPhotoPreview(event.target.result);
    reader.readAsDataURL(file);

    setAnalyzingPhoto(true);
    setAiNotice(null);

    try {
      const data = await analyzeFoodPhoto(file);
      setAiPhotoResult(data);

      if (data.item_name) {
        setFoodName(data.item_name);
      }
      if (data.estimated_quantity) {
        setQuantity(String(data.estimated_quantity));
      }
      if (data.safe_window_hours) {
        const safeHours = Math.round(data.safe_window_hours);
        setHours(Math.max(1, Math.min(12, safeHours)));
        updateSafety(hoursSincePosted, safeHours, isCooked);
      }
      setAiNotice({
        type: 'success',
        text: `✨ Smart Vision identified: "${data.item_name}" (~${data.estimated_quantity} ${data.unit || 'kg'}, ${data.safe_window_hours}h safe window). Form auto-filled!`
      });
    } catch (err) {
      console.warn("AI photo analysis error:", err);
      setAiNotice({
        type: 'warning',
        text: 'Smart Vision unavailable. You can continue typing food details manually.'
      });
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // 2. AI TEXT PARSING
  const handleParseText = async (customText) => {
    const textToParse = customText || foodName;
    if (!textToParse.trim()) return;

    setParsingText(true);
    setAiNotice(null);

    try {
      const data = await parseFoodText(textToParse);
      setAiTextResult(data);

      if (data.item_name) {
        setFoodName(data.item_name);
      }
      if (data.estimated_quantity) {
        setQuantity(String(data.estimated_quantity));
      }
      if (data.hours_until_expiry) {
        const parsedHours = Math.round(data.hours_until_expiry);
        setHours(Math.max(1, Math.min(12, parsedHours)));
        updateSafety(hoursSincePosted, parsedHours, data.is_cooked ?? true);
      }
      if (data.is_cooked !== undefined) {
        setIsCooked(data.is_cooked);
      }

      setAiNotice({
        type: 'success',
        text: `✨ Smart Parser extracted: "${data.item_name}", ${data.estimated_quantity} kg, good for ${data.hours_until_expiry} hrs.`
      });
    } catch (err) {
      console.warn("AI text parsing error:", err);
      setAiNotice({
        type: 'warning',
        text: 'Smart text parser unavailable. Form still works manually!'
      });
    } finally {
      setParsingText(false);
    }
  };

  // 3. SUBMIT DONATION
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setAuthError('You must be logged in to post surplus food.');
      return;
    }

    setLoading(true);
    setResult(null);

    // Geocode to guarantee exact coordinates
    const coords = await geocodeAddress(address);
    setPickupCoords(coords);

    const payload = {
      food_name: foodName.trim() || 'Assorted Fresh Surplus Food',
      quantity: parseFloat(quantity) || 10.0,
      hours_until_expiry: parseFloat(hours),
      safety_score: parseFloat(safetyScore),
      latitude: coords.lat,
      longitude: coords.lng,
      pickup_address: address,
      donor_name: donorName || user.organization || user.name,
      donor_phone: donorPhone || user.phone || '+91 98290 55188',
    };

    try {
      const donation = await submitDonation(payload);
      let nearby = { nearby_shelters: [] };
      if (donation.status === 'matched') {
        try {
          nearby = await fetchNearbyMatches(donation.id);
        } catch {}
      }
      setResult({ donation, nearby });
    } catch (err) {
      setResult({ error: err.message || 'Submission failed' });
    } finally {
      setLoading(false);
    }
  };

  // 4. DONOR AUTH HANDLERS
  const handleDonorLogin = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await login(authEmail, authPassword);
    } catch (err) {
      setAuthError(err.message || 'Invalid email or password.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleDonorRegister = async (e) => {
    e.preventDefault();
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await register({
        name: regName,
        email: authEmail,
        password: authPassword,
        role: 'donor',
        organization: regOrg || undefined,
        phone: regPhone || undefined,
      });
    } catch (err) {
      setAuthError(err.message || 'Registration failed.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      await quickLogin('donor');
    } catch (err) {
      setAuthError(err.message || 'Demo login failed');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // ── RENDER 1: AUTHENTICATION GATE (When user is NOT logged in) ─────────────
  if (!user && !authLoading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 sm:py-16">
        {/* Compliance Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-biteback-50 border border-biteback-200/80 mb-3 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-biteback-600 animate-pulse"></span>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-biteback-800">
              01 // DONOR ACCESS CONTROL • SPEC.MD
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Surplus Food Rescue Intake
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            To ensure food safety compliance, accountability, and traceability (per <strong>SPEC.md</strong>), only authenticated food donors and restaurants can post surplus food.
          </p>
        </div>

        {/* Auth Box */}
        <div className="bg-white border border-canvas-border rounded-3xl p-6 sm:p-8 shadow-card">
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
            <button
              onClick={() => { setAuthTab('login'); setAuthError(null); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                authTab === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5 text-biteback-600" />
              <span>Donor Log In</span>
            </button>
            <button
              onClick={() => { setAuthTab('register'); setAuthError(null); }}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                authTab === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 text-biteback-600" />
              <span>Create Donor Account</span>
            </button>
          </div>

          {/* Error Notice */}
          {authError && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Tab 1: Login */}
          {authTab === 'login' ? (
            <form onSubmit={handleDonorLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Donor Email Address
                </label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  placeholder="donor@restaurant.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 rounded-xl bg-biteback-600 hover:bg-biteback-700 text-white font-extrabold text-sm shadow-biteback transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Log In & Post Food</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Tab 2: Register */
            <form onSubmit={handleDonorRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Manager / Donor Name *
                </label>
                <input
                  type="text"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                  placeholder="Chef Marco"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 outline-none text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Restaurant / Establishment Name *
                </label>
                <input
                  type="text"
                  value={regOrg}
                  onChange={e => setRegOrg(e.target.value)}
                  placeholder="Jaipur Spice Bistro"
                  required
                  className="w-full px-4 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 outline-none text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={authEmail}
                    onChange={e => setAuthEmail(e.target.value)}
                    placeholder="marco@bistro.com"
                    required
                    className="w-full px-4 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 outline-none text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={regPhone}
                    onChange={e => setRegPhone(e.target.value)}
                    placeholder="+91 98290 55188"
                    className="w-full px-4 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 outline-none text-sm text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password *
                </label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full px-4 py-2 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 outline-none text-sm text-slate-900"
                />
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3.5 mt-2 rounded-xl bg-biteback-600 hover:bg-biteback-700 text-white font-extrabold text-sm shadow-biteback transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {authSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register Donor Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Quick Demo 1-Click Login for Evaluators */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-mono text-slate-400 text-center uppercase tracking-wider mb-2.5">
              Hackathon Demo / Instant Access
            </div>
            <button
              onClick={handleQuickDemo}
              disabled={authSubmitting}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign In as Demo Donor (Chef Marco • Jaipur Spice Bistro)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER 2: AUTHENTICATED INTAKE FORM ─────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Index Tag & Verified User Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] font-bold tracking-widest text-biteback-600 uppercase bg-biteback-50 border border-biteback-200/80 px-2.5 py-0.5 rounded-full">
            01 // FOOD INTAKE
          </span>
          <span className="text-[11px] font-mono text-slate-400">JAIPUR RESCUE GRID</span>
        </div>

        {/* User Identity Pill */}
        {user && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-xl text-xs font-semibold text-emerald-900 self-start sm:self-auto">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Donor: <strong>{user.organization || user.name}</strong></span>
            <button
              onClick={logout}
              className="ml-1 text-[11px] font-mono text-rose-600 hover:underline"
              title="Sign out of donor account"
            >
              (Sign out)
            </button>
          </div>
        )}
      </div>

      <div className="bg-canvas-card border border-canvas-border rounded-3xl p-6 sm:p-8 shadow-card">
        
        {/* Title */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-biteback-50 border border-biteback-100 flex items-center justify-center text-biteback-600 shrink-0 shadow-xs">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-black text-2xl text-canvas-text tracking-tight">
              Post Surplus Food
            </h1>
            <p className="text-xs sm:text-sm text-canvas-muted mt-0.5 leading-relaxed">
              Automated Food Vision extracts safe consumption windows & automates 15 km shelter matching across Jaipur.
            </p>
          </div>
        </div>

        {/* AI Notice Feedback */}
        {aiNotice && (
          <div className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            aiNotice.type === 'success' 
              ? 'bg-biteback-50 text-biteback-900 border-biteback-200' 
              : 'bg-amber-50 text-amber-900 border-amber-200'
          }`}>
            <span>{aiNotice.text}</span>
            <button onClick={() => setAiNotice(null)} className="p-1 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── SECTION 1: AI PHOTO INTAKE ── */}
        <div className="mb-6 p-4 rounded-2xl bg-canvas-subtle border border-canvas-border">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Camera className="w-4 h-4 text-biteback-600" />
              <span>Smart Intake: Snap Photo of Surplus Food</span>
            </span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-biteback-600 bg-biteback-50 px-2 py-0.5 rounded-full border border-biteback-200/60">
              Computer Vision
            </span>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            className="hidden"
          />

          {photoPreview ? (
            <div className="relative rounded-xl overflow-hidden border border-canvas-border max-h-48 group">
              <img src={photoPreview} alt="Food Intake" className="w-full h-48 object-cover" />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white text-xs font-bold text-slate-900 hover:bg-slate-100 shadow-md"
                >
                  Change Photo
                </button>
                <button
                  type="button"
                  onClick={() => { setPhotoPreview(null); setAiPhotoResult(null); }}
                  className="p-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingPhoto}
              className="w-full py-6 px-4 rounded-xl border-2 border-dashed border-canvas-border hover:border-biteback-500 bg-white hover:bg-biteback-50/30 transition flex flex-col items-center justify-center gap-2 group cursor-pointer"
            >
              {analyzingPhoto ? (
                <>
                  <RefreshCw className="w-6 h-6 text-biteback-600 animate-spin" />
                  <span className="text-xs font-bold text-biteback-700">Automated Vision is analyzing food & portions…</span>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-biteback-50 text-biteback-600 flex items-center justify-center group-hover:scale-110 transition">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div className="text-center">
                    <span className="text-xs font-extrabold text-slate-800">Upload or snap a food photo</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Automated detection identifies food, estimates kg, and sets safety window</p>
                  </div>
                </>
              )}
            </button>
          )}
        </div>

        {/* ── SECTION 2: DONATION INPUT FORM ── */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Food Description with Natural AI Parse */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-slate-800">
                Food Name & Description *
              </label>
              <button
                type="button"
                onClick={() => handleParseText()}
                disabled={parsingText || !foodName.trim()}
                className="text-[11px] font-bold text-biteback-600 hover:text-biteback-700 disabled:opacity-40 flex items-center gap-1 font-mono"
              >
                <Sparkles className="w-3 h-3" />
                <span>{parsingText ? 'Parsing…' : 'AI Parse Text'}</span>
              </button>
            </div>
            <input
              type="text"
              value={foodName}
              onChange={e => setFoodName(e.target.value)}
              placeholder="e.g. 25 kg Dal Makhani, Fresh Chapati & Pulao"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-800 transition"
            />
          </div>

          {/* Quantity & Hours Expiry Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1.5">
                <Scale className="w-4 h-4 text-biteback-600" />
                <span>Quantity (kg or portions) *</span>
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-800 transition"
              />
            </div>

            <div>
              <label className="flex items-center justify-between text-sm font-bold text-slate-800 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-biteback-600" />
                  <span>Hours Until Expiry *</span>
                </span>
                <span className="font-mono text-xs font-black text-biteback-600">{hours} hrs</span>
              </label>
              <input
                type="range"
                min="1"
                max="12"
                step="0.5"
                value={hours}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  setHours(val);
                  updateSafety(hoursSincePosted, val, isCooked);
                }}
                className="w-full accent-biteback-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                <span>1h (Urgent)</span>
                <span>6h (Normal)</span>
                <span>12h (Extended)</span>
              </div>
            </div>
          </div>

          {/* Safety Gate Calculator per SPEC.md */}
          <div className="p-4 rounded-2xl bg-canvas-subtle border border-canvas-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-biteback-600" />
                <span>Food Safety Score (SPEC.md Hard Rule)</span>
              </span>
              <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md ${
                safetyScore > 0.7 
                  ? 'bg-rose-100 text-rose-700 border border-rose-300' 
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              }`}>
                Score: {safetyScore} {safetyScore > 0.7 ? '(REJECTED)' : '(SAFE)'}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCooked}
                  onChange={e => {
                    setIsCooked(e.target.checked);
                    updateSafety(hoursSincePosted, hours, e.target.checked);
                  }}
                  className="rounded text-biteback-600 focus:ring-biteback-500"
                />
                <span className="text-slate-700 font-medium">Cooked/Prepared Meal</span>
              </label>

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-slate-500 text-[11px]">Elapsed:</span>
                <select
                  value={hoursSincePosted}
                  onChange={e => {
                    const val = parseFloat(e.target.value);
                    updateSafety(val, hours, isCooked);
                  }}
                  className="px-2 py-1 rounded-lg border border-canvas-border text-xs bg-white text-slate-800 outline-none"
                >
                  <option value="0.5">30 mins</option>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="6">6+ hours</option>
                </select>
              </div>
            </div>

            {safetyScore > 0.7 && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Safety score {safetyScore} exceeds 0.7 limit. Matching will be blocked per SPEC.md.</span>
              </div>
            )}
          </div>

          {/* ── SECTION 3: PICKUP ADDRESS & LIVE JAIPUR MAP ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <MapPin className="w-4 h-4 text-biteback-600" />
                <span>Pickup Address (Jaipur, Rajasthan) *</span>
              </label>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Exact Map Coordinates: {pickupCoords.lat.toFixed(4)}, {pickupCoords.lng.toFixed(4)}
              </span>
            </div>

            <input
              type="text"
              value={address}
              onChange={e => handleAddressChange(e.target.value)}
              placeholder="e.g. MI Road, Jaipur, Rajasthan"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-800 transition"
            />

            {/* Quick Jaipur Area Chips */}
            <div>
              <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Select Jaipur Location:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {JAIPUR_AREAS.map((area) => (
                  <button
                    key={area.name}
                    type="button"
                    onClick={() => handleSelectArea(area)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                      address.includes(area.name)
                        ? 'bg-biteback-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    📍 {area.name}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE PICKUP MAP PREVIEW */}
            <div className="rounded-2xl overflow-hidden border border-canvas-border shadow-xs">
              <div className="bg-slate-50 px-3 py-2 border-b border-canvas-border flex items-center justify-between text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  Live Pickup Camera View (Shifts dynamically with address)
                </span>
                <span className="font-mono text-[10px] text-slate-500">15 km Coverage Zone</span>
              </div>
              <RescueMap
                key={`pickup-preview-${pickupCoords.lat}-${pickupCoords.lng}`}
                donorPoint={{
                  lat: pickupCoords.lat,
                  lng: pickupCoords.lng,
                  name: donorName || 'Donor Pickup Point',
                  address: address,
                  foodName: foodName || 'Surplus Food',
                  quantity: quantity,
                }}
                show15kmRadius={true}
                height="200px"
                zoom={14}
                center={[pickupCoords.lat, pickupCoords.lng]}
                theme="light"
              />
            </div>
          </div>

          {/* BIG BITEBACK BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-biteback-600 hover:bg-biteback-700 active:scale-[0.99] text-white font-extrabold text-base shadow-biteback transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Matcher in Jaipur (max 2s)…</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>Post Surplus Food</span>
              </>
            )}
          </button>
        </form>

        {/* ── Submission Results ── */}
        {result && (
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-4">
            {result.error ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-sm">
                <div className="font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Could not reach backend
                </div>
                <p className="text-xs mt-1 font-mono">{result.error}</p>
              </div>
            ) : result.donation.status === 'rejected' ? (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                  Safety Gate — Food Rejected
                </div>
                <p className="text-xs mt-1.5 leading-relaxed">
                  Safety score was <strong>{result.donation.safety_score}</strong> (exceeds 0.7 threshold).
                  Per safety rules in SPEC.md, this food is never matched.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-biteback-50 border border-biteback-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-black text-base text-biteback-900">
                    <CheckCircle2 className="w-6 h-6 text-biteback-600" />
                    Donation #{result.donation.id} Posted & Matched in Jaipur!
                  </div>
                  <p className="text-xs text-biteback-800 mt-2 leading-relaxed">
                    <strong>{result.donation.food_name}</strong> ({result.donation.quantity} kg) — Status:{' '}
                    <strong className="capitalize">{result.donation.status}</strong>.
                    Twilio SMS dispatched to volunteer driver!
                  </p>
                </div>

                {result.nearby?.nearby_shelters?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Ranked Nearby Shelters in Jaipur (Within 15 km)
                    </h3>
                    <div className="space-y-2">
                      {result.nearby.nearby_shelters.slice(0, 3).map((s, i) => (
                        <div
                          key={s.shelter_id}
                          className={`flex items-center justify-between p-3.5 rounded-xl text-sm border ${
                            i === 0
                              ? 'bg-biteback-50/60 border-biteback-200 font-semibold'
                              : 'bg-canvas-subtle border-canvas-border'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-black ${
                              i === 0 ? 'bg-biteback-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>{i + 1}</span>
                            <div>
                              <div className="text-slate-900 font-bold">{s.shelter_name}</div>
                              <div className="text-xs font-mono text-slate-500">{s.distance_km} km · {s.available_space} kg space</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`font-mono font-black text-sm ${i === 0 ? 'text-biteback-600' : 'text-slate-600'}`}>
                              {Math.round(s.match_score * 100)}%
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">match score</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 15 km Radius Coverage Map with Matched Route */}
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-biteback-600" />
                          15 km Jaipur Rescue Zone & Matched Shelter Route
                        </span>
                        <span className="text-[11px] font-mono text-biteback-700 font-semibold">
                          Max Radius: 15 km
                        </span>
                      </div>
                      <RescueMap
                        key={`donate-map-${result.donation.id}`}
                        donorPoint={{
                          lat: result.donation.latitude || pickupCoords.lat,
                          lng: result.donation.longitude || pickupCoords.lng,
                          name: donorName || 'Food Donor Pickup',
                          address: address,
                          foodName: result.donation.food_name,
                          quantity: result.donation.quantity,
                        }}
                        recipientPoint={{
                          lat: result.nearby?.nearby_shelters?.[0]?.latitude || 26.9124,
                          lng: result.nearby?.nearby_shelters?.[0]?.longitude || 75.8010,
                          name: result.nearby?.nearby_shelters?.[0]?.shelter_name || 'C-Scheme Care Shelter',
                          address: result.nearby?.nearby_shelters?.[0]?.address || 'C-Scheme, Ashok Nagar, Jaipur',
                        }}
                        showRoute={true}
                        show15kmRadius={true}
                        height="240px"
                        theme="light"
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
