'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Interactive RescueMap Component
 * Built on Leaflet with Mapbox/Carto tiles.
 * Safely renders only in browser (client-side) to avoid SSR errors.
 *
 * Props:
 * - center: [lat, lng] (default: Jaipur, Rajasthan)
 * - zoom: number (default: 13)
 * - donorPoint: { lat, lng, name, address, foodName, quantity }
 * - recipientPoint: { lat, lng, name, address, capacity, currentStock }
 * - driverPoint: { lat, lng, name }
 * - shelters: Array<{ id, name, address, latitude, longitude, capacity, current_stock }>
 * - showRoute: boolean (connects donor to recipient with a dynamic line)
 * - show15kmRadius: boolean (draws the 15km coverage boundary circle)
 * - theme: 'dark' | 'light'
 * - height: string (e.g. '340px' or '450px')
 */
export default function RescueMap({
  center = [26.9124, 75.7873],
  zoom = 13,
  donorPoint,
  recipientPoint,
  driverPoint,
  shelters = [],
  showRoute = false,
  show15kmRadius = false,
  theme = 'light',
  height = '360px',
  interactive = true,
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    // Ensure Leaflet only executes in browser
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let map = null;

    // Dynamically import Leaflet
    import('leaflet').then((L) => {
      // Destroy previous instance if re-rendering
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      // Initial center fallback
      const initialCenter = donorPoint
        ? [donorPoint.lat, donorPoint.lng]
        : recipientPoint
        ? [recipientPoint.lat, recipientPoint.lng]
        : center;

      map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: zoom,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: false,
        attributionControl: false,
      });

      mapInstanceRef.current = map;

      // Select tile layer: Mapbox with seamless fallback
      const isDark = theme === 'dark';
      const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN?.trim();
      const fallbackUrl = isDark
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

      if (mapboxToken && mapboxToken.startsWith('pk.')) {
        const styleId = isDark ? 'dark-v11' : 'streets-v12';
        const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/${styleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxToken}`;
        
        let fallbackActive = false;
        const mapboxLayer = L.tileLayer(mapboxUrl, {
          maxZoom: 19,
          tileSize: 256,
          attribution: '© <a href="https://www.mapbox.com/about/maps/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        });

        // If Mapbox token fails policy / verification / quota, seamlessly fall back
        mapboxLayer.on('tileerror', () => {
          if (!fallbackActive) {
            fallbackActive = true;
            try {
              map.removeLayer(mapboxLayer);
            } catch {}
            L.tileLayer(fallbackUrl, {
              maxZoom: 19,
              subdomains: 'abcd',
            }).addTo(map);
          }
        });

        mapboxLayer.addTo(map);
      } else {
        L.tileLayer(fallbackUrl, {
          maxZoom: 19,
          subdomains: 'abcd',
        }).addTo(map);
      }

      const bounds = [];

      // Custom SVG Pin Creators
      const createCustomIcon = (bgColor, iconSvg, label) => {
        return L.divIcon({
          className: 'custom-map-marker',
          html: `
            <div style="
              display: flex;
              flex-direction: column;
              align-items: center;
              transform: translate(-50%, -100%);
              cursor: pointer;
            ">
              <div style="
                background: ${bgColor};
                color: white;
                width: 32px;
                height: 32px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                border: 2px solid white;
              ">
                ${iconSvg}
              </div>
              <div style="
                width: 0; 
                height: 0; 
                border-left: 5px solid transparent;
                border-right: 5px solid transparent;
                border-top: 6px solid ${bgColor};
              "></div>
              ${label ? `
                <div style="
                  background: rgba(15, 23, 42, 0.9);
                  color: white;
                  font-size: 10px;
                  font-weight: 700;
                  padding: 2px 6px;
                  border-radius: 6px;
                  margin-top: 2px;
                  white-space: nowrap;
                  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                ">${label}</div>
              ` : ''}
            </div>
          `,
          iconSize: [32, 42],
          iconAnchor: [16, 42],
        });
      };

      // 1. Add Donor Marker (Pickup Point)
      if (donorPoint && donorPoint.lat && donorPoint.lng) {
        const donorCoords = [donorPoint.lat, donorPoint.lng];
        bounds.push(donorCoords);

        const forkIcon = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path>
            <path d="M6 2v10a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3V2"></path>
            <path d="M12 15v7"></path>
          </svg>
        `;

        const donorMarker = L.marker(donorCoords, {
          icon: createCustomIcon('#10b981', forkIcon, 'PICKUP'),
        }).addTo(map);

        donorMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 2px; font-size: 12px; color: #1e293b;">
            <div style="font-weight: 800; font-size: 13px; color: #047857; margin-bottom: 2px;">
              📍 Pickup: ${donorPoint.name || 'Food Donor'}
            </div>
            ${donorPoint.foodName ? `<div><strong>Food:</strong> ${donorPoint.foodName} (${donorPoint.quantity || ''} kg)</div>` : ''}
            <div style="color: #64748b; font-size: 11px; margin-top: 2px;">${donorPoint.address || ''}</div>
          </div>
        `);

        // 15km Zone circle if requested
        if (show15kmRadius) {
          L.circle(donorCoords, {
            radius: 15000, // 15 km in meters
            color: '#10b981',
            fillColor: '#10b981',
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: '4, 6',
          }).addTo(map);
        }
      }

      // 2. Add Recipient Marker (Shelter Dropoff Point)
      if (recipientPoint && recipientPoint.lat && recipientPoint.lng) {
        const recCoords = [recipientPoint.lat, recipientPoint.lng];
        bounds.push(recCoords);

        const homeIcon = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
        `;

        const recMarker = L.marker(recCoords, {
          icon: createCustomIcon('#6366f1', homeIcon, 'SHELTER'),
        }).addTo(map);

        recMarker.bindPopup(`
          <div style="font-family: system-ui, sans-serif; padding: 2px; font-size: 12px; color: #1e293b;">
            <div style="font-weight: 800; font-size: 13px; color: #4338ca; margin-bottom: 2px;">
              🏠 Shelter: ${recipientPoint.name || 'Recipient Shelter'}
            </div>
            <div style="color: #64748b; font-size: 11px;">${recipientPoint.address || ''}</div>
          </div>
        `);
      }

      // 3. Draw Route Line between Donor and Recipient
      if (showRoute && donorPoint && recipientPoint && donorPoint.lat && recipientPoint.lat) {
        const routeCoords = [
          [donorPoint.lat, donorPoint.lng],
          [recipientPoint.lat, recipientPoint.lng],
        ];

        // Animated / styled dashed polyline
        L.polyline(routeCoords, {
          color: '#10b981',
          weight: 4,
          opacity: 0.85,
          dashArray: '8, 8',
        }).addTo(map);
      }

      // 4. Add Driver Position Marker if available
      if (driverPoint && driverPoint.lat && driverPoint.lng) {
        const driverCoords = [driverPoint.lat, driverPoint.lng];
        bounds.push(driverCoords);

        const truckIcon = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"></path>
            <path d="M15 18H9"></path>
            <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"></path>
            <circle cx="17" cy="18" r="2"></circle>
            <circle cx="7" cy="18" r="2"></circle>
          </svg>
        `;

        L.marker(driverCoords, {
          icon: createCustomIcon('#f59e0b', truckIcon, 'DRIVER'),
        }).addTo(map).bindPopup(`
          <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b;">
            <strong>🚚 Driver:</strong> ${driverPoint.name || 'Volunteer Driver'}
          </div>
        `);
      }

      // 5. Add All Network Shelters (For City Dashboard)
      if (shelters && shelters.length > 0) {
        shelters.forEach((shelter) => {
          if (!shelter.latitude || !shelter.longitude) return;
          const sCoords = [shelter.latitude, shelter.longitude];
          bounds.push(sCoords);

          const availSpace = Math.max(0, (shelter.capacity || 100) - (shelter.current_stock || 0));
          const isFull = availSpace <= 0;
          const pinColor = isFull ? '#ef4444' : availSpace < 40 ? '#f59e0b' : '#3b82f6';

          const shelterIconSvg = `
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          `;

          const sMarker = L.marker(sCoords, {
            icon: createCustomIcon(pinColor, shelterIconSvg, `${Math.round(availSpace)}kg space`),
          }).addTo(map);

          sMarker.bindPopup(`
            <div style="font-family: system-ui, sans-serif; font-size: 12px; color: #1e293b; min-width: 170px;">
              <div style="font-weight: 800; font-size: 13px; color: #1e40af; margin-bottom: 2px;">
                ${shelter.name}
              </div>
              <div style="color: #64748b; font-size: 11px; margin-bottom: 6px;">${shelter.address}</div>
              <div style="background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-size: 11px;">
                <div>Capacity: <strong>${shelter.capacity} kg</strong></div>
                <div>Current Stock: <strong>${shelter.current_stock} kg</strong></div>
                <div style="color: ${isFull ? '#dc2626' : '#16a34a'}; font-weight: 700; margin-top: 2px;">
                  Available: ${availSpace.toFixed(1)} kg
                </div>
              </div>
            </div>
          `);
        });
      }

      // Auto-fit bounds if we have multiple points or shift camera to exact pickup point
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      } else if (bounds.length === 1) {
        map.flyTo(bounds[0], Math.max(zoom, 14), { animate: true, duration: 1.0 });
      } else if (donorPoint && donorPoint.lat && donorPoint.lng) {
        map.flyTo([donorPoint.lat, donorPoint.lng], Math.max(zoom, 14), { animate: true, duration: 1.0 });
      }

      // Ensure Leaflet tiles calculate container dimensions properly
      setTimeout(() => {
        try {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        } catch {}
      }, 250);

      setMapLoaded(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [donorPoint, recipientPoint, driverPoint, shelters, showRoute, show15kmRadius, theme, zoom, center, interactive]);

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden border ${
        theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-slate-100'
      } shadow-sm`}
      style={{ height }}
    >
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      
      {/* Map Header / Legend Overlay */}
      <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-[11px] text-slate-300 font-medium flex items-center gap-3 pointer-events-none shadow-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Pickup
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Shelter
        </span>
        {show15kmRadius && (
          <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span>⭕</span> 15 km Radius
          </span>
        )}
        <span className="text-slate-500 text-[10px]">Mapbox & OpenStreetMap</span>
      </div>
    </div>
  );
}
