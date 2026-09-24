'use client';

import { useState, useRef } from 'react';
import {
  UtensilsCrossed, Clock, MapPin, Scale, CheckCircle2,
  AlertTriangle, Send, Sparkles, Camera, Image as ImageIcon,
  Zap, AlertCircle, RefreshCw, X, Flame
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
import dynamic from 'next/dynamic';

const RescueMap = dynamic(() => import('../components/RescueMap'), { ssr: false });

export default function DonatePage() {
  const [foodName, setFoodName]           = useState('');
  const [quantity, setQuantity]           = useState('15');
  const [hours, setHours]                 = useState(6);
  const [address, setAddress]             = useState('750 Howard St, San Francisco, CA');
  const [donorName, setDonorName]         = useState('Mission Bakery & Deli');
  const [donorPhone, setDonorPhone]       = useState('+1-415-555-0188');
  
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
        text: `✨ Gemini Vision identified: "${data.item_name}" (~${data.estimated_quantity} ${data.unit || 'kg'}, ${data.safe_window_hours}h safe window). Form auto-filled!`
      });
    } catch (err) {
      console.warn("AI photo analysis error:", err);
      setAiNotice({
        type: 'warning',
        text: 'AI Vision unavailable. You can continue typing food details manually.'
      });
    } finally {
      setAnalyzingPhoto(false);
    }
  };

  // 3. AI TEXT PARSING
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
        text: `✨ Gemini extracted: "${data.item_name}", ${data.estimated_quantity} kg, good for ${data.hours_until_expiry} hrs.`
      });
    } catch (err) {
      console.warn("AI text parsing error:", err);
      setAiNotice({
        type: 'warning',
        text: 'AI Text parser unavailable. Form still works manually!'
      });
    } finally {
      setParsingText(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    // Dynamically geocode pickup location
    const coords = await geocodeAddress(address);

    const payload = {
      food_name: foodName.trim() || 'Assorted Fresh Surplus Food',
      quantity: parseFloat(quantity) || 10.0,
      hours_until_expiry: parseFloat(hours),
      safety_score: parseFloat(safetyScore),
      latitude: coords.lat,
      longitude: coords.lng,
      pickup_address: address,
      donor_name: donorName || undefined,
      donor_phone: donorPhone || undefined,
    };

    try {
      const donation = await submitDonation(payload);
      let nearby = null;
      if (donation.status !== 'rejected') {
        try {
          nearby = await fetchNearbyMatches(donation.id);
        } catch {}
      }
      setResult({ donation, nearby });
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const isBlockedBySafetyGate = safetyScore > 0.7;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* ── HEADER (Biteback Style) ── */}
      <div className="text-center mb-8 space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-biteback-50 border border-biteback-200">
          <span className="w-1.5 h-1.5 rounded-full bg-biteback-600 animate-pulse"></span>
          <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-biteback-800">
            01 // SURPLUS INTAKE & DISPATCH
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Post Surplus Food
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
          Under 60 seconds. Multimodal AI verifies safety and alerts volunteer drivers within 15 km.
        </p>
      </div>

      <div className="bg-white border border-canvas-border rounded-3xl p-6 sm:p-8 shadow-card space-y-6">

        {/* ── 1. AI PHOTO INTAKE BUTTON & PREVIEW ── */}
        <div className="bg-gradient-to-br from-biteback-50/70 via-white to-orange-50/30 border border-biteback-200/90 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-biteback-600 text-white flex items-center justify-center shadow-biteback">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">AI Photo Intake (Gemini Vision)</h2>
                <p className="text-[11px] text-slate-500">Upload a kitchen photo to auto-fill items, weight & safe window</p>
              </div>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingPhoto}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-biteback-600 hover:bg-biteback-700 text-white text-xs font-bold shadow-biteback transition active:scale-95 disabled:opacity-50"
            >
              {analyzingPhoto ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Upload Photo</span>
                </>
              )}
            </button>
          </div>

          {/* Photo preview thumbnail */}
          {photoPreview && (
            <div className="mt-3 relative rounded-xl overflow-hidden border border-biteback-300 max-h-48 bg-slate-900 flex items-center justify-center group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Food Preview"
                className="w-full h-40 object-cover"
              />
              <button
                type="button"
                onClick={() => { setPhotoPreview(null); setAiPhotoResult(null); }}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-900 transition"
                title="Remove photo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              {analyzingPhoto && (
                <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white text-xs font-bold gap-2">
                  <div className="w-6 h-6 border-2 border-biteback-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Google Gemini Vision analyzing food photo…</span>
                </div>
              )}
            </div>
          )}

          {aiPhotoResult && !analyzingPhoto && (
            <div className="mt-3 bg-white border border-biteback-200 rounded-xl p-3 text-xs text-slate-800 space-y-1">
              <div className="font-extrabold text-biteback-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-biteback-600" />
                <span>Gemini Vision Detected:</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600 pt-1 font-mono">
                <div>Item: <strong className="text-slate-900 font-sans">{aiPhotoResult.item_name}</strong></div>
                <div>Category: <strong className="text-slate-900 font-sans">{aiPhotoResult.category}</strong></div>
                <div>Qty: <strong className="text-slate-900 font-sans">{aiPhotoResult.estimated_quantity} {aiPhotoResult.unit}</strong></div>
                <div>Safe Window: <strong className="text-slate-900 font-sans">{aiPhotoResult.safe_window_hours}h</strong></div>
              </div>
            </div>
          )}
        </div>

        {/* AI Notice Banner */}
        {aiNotice && (
          <div className={`p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
            aiNotice.type === 'success'
              ? 'bg-biteback-50 text-biteback-900 border border-biteback-200'
              : 'bg-amber-50 text-amber-900 border border-amber-200'
          }`}>
            <Sparkles className="w-4 h-4 text-biteback-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{aiNotice.text}</div>
            <button type="button" onClick={() => setAiNotice(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── 3. AI TEXT PARSING & FOOD DESCRIPTION ── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <span>Food Description</span>
                <span className="text-[11px] font-normal text-slate-400">(or speak kitchen shorthand)</span>
              </label>

              <button
                type="button"
                onClick={() => handleParseText()}
                disabled={parsingText || !foodName.trim()}
                className="inline-flex items-center gap-1 text-xs font-mono font-bold text-biteback-700 bg-biteback-50 hover:bg-biteback-100 border border-biteback-200 px-2.5 py-1 rounded-lg transition disabled:opacity-40"
              >
                <Sparkles className={`w-3 h-3 ${parsingText ? 'animate-spin' : ''}`} />
                <span>{parsingText ? 'Extracting…' : 'AI Parse Text'}</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={foodName}
              onChange={e => setFoodName(e.target.value)}
              placeholder="e.g. 30 samosas from party, good for 4 hrs"
              required
              className="w-full px-4 py-3 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-800 placeholder-slate-400 transition resize-none"
            />

            {/* Quick-test Prompt Pill */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Quick Test:</span>
              <button
                type="button"
                onClick={() => {
                  const sample = "30 samosas from party, good for 4 hrs";
                  setFoodName(sample);
                  handleParseText(sample);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition flex items-center gap-1"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>"30 samosas from party, good for 4 hrs"</span>
              </button>
            </div>
          </div>

          {/* Quantity & Donor Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1.5">
                <Scale className="w-4 h-4 text-biteback-600" />
                <span>Quantity (kg / meals)</span>
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm font-mono text-slate-800 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 mb-1.5">
                Donor / Restaurant
              </label>
              <input
                type="text"
                value={donorName}
                onChange={e => setDonorName(e.target.value)}
                placeholder="Restaurant name"
                className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-800 transition"
              />
            </div>
          </div>

          {/* "Use Within" Slider */}
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <Clock className="w-4 h-4 text-biteback-600" />
                <span>Safe Window</span>
              </label>
              <span className="text-xs font-mono font-extrabold text-biteback-800 bg-biteback-50 border border-biteback-200 px-3 py-1 rounded-full">
                {hours} {hours === 1 ? 'hour' : 'hours'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="12"
              step="1"
              value={hours}
              onChange={e => {
                const val = parseInt(e.target.value);
                setHours(val);
                updateSafety(hoursSincePosted, val, isCooked);
              }}
              className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-biteback-600"
            />
            <div className="flex justify-between text-[11px] font-mono text-slate-500 mt-1.5">
              <span>1 hr (Urgent)</span>
              <span>6 hrs (Typical)</span>
              <span>12 hrs (Fresh)</span>
            </div>
          </div>

          {/* ── 2. AI SAFETY SCORE FORMULA & GAUGE ── */}
          <div className="bg-canvas-subtle border border-canvas-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700">
                  AI Safety Risk Score
                </span>
                <p className="text-[11px] font-mono text-slate-400">
                  Score = (hours_since_posted / safe_window) × {isCooked ? '1.25 (Cooked)' : '1.0 (Raw)'}
                </p>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${
                isBlockedBySafetyGate
                  ? 'bg-rose-100 text-rose-700 border-rose-300'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-300'
              }`}>
                {isBlockedBySafetyGate
                  ? `🛑 BLOCKED (${safetyScore})`
                  : `✅ SAFE (${safetyScore})`}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                <span>Simulate Hours Since Cooked:</span>
                <strong className="text-slate-900 font-mono">{hoursSincePosted} hr{hoursSincePosted === 1 ? '' : 's'}</strong>
              </div>
              <input
                type="range"
                min="0"
                max={hours + 2}
                step="0.5"
                value={hoursSincePosted}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  updateSafety(val, hours, isCooked);
                }}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
              />
            </div>

            {isBlockedBySafetyGate && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Safety score {safetyScore} exceeds 0.7 limit. Matching will be blocked per SPEC.md.</span>
              </div>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-bold text-slate-800 mb-1.5">
              <MapPin className="w-4 h-4 text-biteback-600" />
              <span>Pickup Address</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="e.g. 750 Howard St, San Francisco, CA"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-canvas-border focus:ring-2 focus:ring-biteback-500 focus:border-biteback-500 outline-none text-sm text-slate-800 transition"
            />
          </div>

          {/* BIG BITEBACK BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-biteback-600 hover:bg-biteback-700 active:scale-[0.99] text-white font-extrabold text-base shadow-biteback transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running Matcher (max 2s)…</span>
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
                  Per safety rules, this food is never matched.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-biteback-50 border border-biteback-200 rounded-2xl p-5">
                  <div className="flex items-center gap-2 font-black text-base text-biteback-900">
                    <CheckCircle2 className="w-6 h-6 text-biteback-600" />
                    Donation #{result.donation.id} Posted & Matched!
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
                      Ranked Nearby Shelters (Within 15 km)
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

                    {/* 15 km Radius Coverage Map */}
                    <div className="mt-4 pt-3 border-t border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-biteback-600" />
                          15 km Rescue Zone & Top Matched Shelter
                        </span>
                        <span className="text-[11px] font-mono text-biteback-700 font-semibold">
                          Max Radius: 15 km
                        </span>
                      </div>
                      <RescueMap
                        key={`donate-map-${result.donation.id}`}
                        donorPoint={{
                          lat: result.donation.latitude || 37.7850,
                          lng: result.donation.longitude || -122.4005,
                          name: donorName || 'Food Donor Pickup',
                          address: address,
                          foodName: result.donation.food_name,
                          quantity: result.donation.quantity,
                        }}
                        recipientPoint={{
                          lat: result.nearby?.nearby_shelters?.[0]?.latitude || 37.7899,
                          lng: result.nearby?.nearby_shelters?.[0]?.longitude || -122.4000,
                          name: result.nearby?.nearby_shelters?.[0]?.shelter_name || 'Matched Shelter',
                          address: result.nearby?.nearby_shelters?.[0]?.address || '500 Market St, San Francisco',
                        }}
                        showRoute={true}
                        show15kmRadius={true}
                        height="220px"
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
