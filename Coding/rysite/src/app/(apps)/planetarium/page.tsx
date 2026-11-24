'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Breadcrumb from '@/components/Breadcrumb';
import Footer from '@/components/Footer';
import {
  CONSTELLATIONS,
  getVisibleConstellations,
  getCelestialBodies,
  localSiderealTime,
  projectToSkyMap,
  raDecToAltAz,
  azimuthToCompass,
  type Constellation,
  type CelestialBody,
} from './constellations';
import {
  getNextSolarEclipse,
  getNextLunarEclipse,
  getNextSeasonalMarker,
  getNextMeteorShower,
  findSolarEclipseMoment,
  findLunarEclipseMoment,
} from './skyEvents';

// Pixels of drag per minute of time — controls scrub sensitivity
const PIXELS_PER_MINUTE = 3;

interface VisibleConstellation extends Constellation {
  altitude: number;
  azimuth: number;
  compass: string;
  directionHint: string;
}

interface Location {
  lat: number;
  lon: number;
  name: string;
}

export default function PlanetariumPage() {
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const [location, setLocation] = useState<Location>({ lat: 40.7128, lon: -74.006, name: 'New York, NY' });
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [visibleConstellations, setVisibleConstellations] = useState<VisibleConstellation[]>([]);
  const [selectedConstellation, setSelectedConstellation] = useState<VisibleConstellation | null>(null);
  const [manualLat, setManualLat] = useState('');
  const [manualLon, setManualLon] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [expandedStar, setExpandedStar] = useState<string | null>(null);
  const [celestialBodies, setCelestialBodies] = useState<CelestialBody[]>([]);
  const [selectedBody, setSelectedBody] = useState<CelestialBody | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gradientAngleRef = useRef(0);
  const wheelCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawSkyMapRef = useRef<() => void>(() => {});
  const drawWheelRef = useRef<() => void>(() => {});
  const wheelDraggingRef = useRef(false);
  const wheelLastXRef = useRef(0);
  const wheelVelocityRef = useRef(0);
  const wheelMomentumRef = useRef<number | null>(null);
  const wheelMsRef = useRef<number>(Date.now());

  // Get user's geolocation on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      setLocationStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
          });
          setLocationStatus('success');
        },
        () => {
          setLocationStatus('error');
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Calculate visible constellations whenever inputs change
  useEffect(() => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);

    const visible = getVisibleConstellations(observeDate, location.lat, location.lon) as VisibleConstellation[];
    setVisibleConstellations(visible);

    const bodies = getCelestialBodies(observeDate, location.lat, location.lon);
    setCelestialBodies(bodies);

    // If selected constellation is no longer visible, deselect
    if (selectedConstellation && !visible.find(c => c.name === selectedConstellation.name)) {
      setSelectedConstellation(null);
      setExpandedStar(null);
    }
  }, [date, time, location, selectedConstellation]);

  // Draw sky map on canvas
  const drawSkyMap = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(canvas.parentElement?.clientWidth || 600, 600);
    canvas.style.width = `${displaySize}px`;
    canvas.style.height = `${displaySize}px`;
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;
    ctx.scale(dpr, dpr);

    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const radius = displaySize / 2 - 30;

    // Clear
    ctx.clearRect(0, 0, displaySize, displaySize);

    // Sky background — white with very subtle warm gradient
    const skyGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    skyGrad.addColorStop(0, '#ffffff');
    skyGrad.addColorStop(0.75, '#f8f8fb');
    skyGrad.addColorStop(1, '#f0eff8');
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = skyGrad;
    ctx.fill();

    // Horizon border — animated flowing gradient ring (matches gradient-text)
    const horizonGrad = ctx.createConicGradient(gradientAngleRef.current, cx, cy);
    horizonGrad.addColorStop(0, '#6c5ce7');
    horizonGrad.addColorStop(0.33, '#00b894');
    horizonGrad.addColorStop(0.67, '#e84393');
    horizonGrad.addColorStop(1, '#6c5ce7');
    ctx.strokeStyle = horizonGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Altitude rings
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.07)';
    ctx.lineWidth = 1;
    for (let alt = 30; alt < 90; alt += 30) {
      const r = ((90 - alt) / 90) * radius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cardinal direction lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.stroke();

    // Direction labels
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(108, 92, 231, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, cy - radius - 15);
    ctx.fillText('S', cx, cy + radius + 15);
    ctx.fillText('E', cx + radius + 15, cy);
    ctx.fillText('W', cx - radius - 15, cy);

    // Calculate current LST
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);
    const lst = localSiderealTime(observeDate, location.lon);

    // Draw constellations
    for (const constellation of CONSTELLATIONS) {
      const projectedStars = constellation.stars.map(star =>
        projectToSkyMap(star.ra, star.dec, location.lat, lst)
      );

      const anyVisible = projectedStars.some(p => p !== null);
      if (!anyVisible) continue;

      const isSelected = selectedConstellation?.name === constellation.name;
      const isVisible = visibleConstellations.some(vc => vc.name === constellation.name);

      // Constellation lines
      ctx.strokeStyle = isSelected
        ? 'rgba(0, 133, 106, 0.75)'
        : isVisible
          ? 'rgba(108, 92, 231, 0.3)'
          : 'rgba(0, 0, 0, 0.06)';
      ctx.lineWidth = isSelected ? 2 : 1;

      for (const line of constellation.lines) {
        const from = projectedStars[line.from];
        const to = projectedStars[line.to];
        if (!from || !to) continue;

        ctx.beginPath();
        ctx.moveTo(cx + from.x * radius, cy + from.y * radius);
        ctx.lineTo(cx + to.x * radius, cy + to.y * radius);
        ctx.stroke();
      }

      // Stars
      for (let i = 0; i < projectedStars.length; i++) {
        const proj = projectedStars[i];
        if (!proj) continue;

        const star = constellation.stars[i];
        const starSize = Math.max(1.5, 4.5 - star.mag * 0.9);
        const sx = cx + proj.x * radius;
        const sy = cy + proj.y * radius;
        const isExpandedStar = isSelected && expandedStar === star.name;

        if (isExpandedStar) {
          // Bright highlight ring for the star selected in the sidebar
          ctx.strokeStyle = '#e84393';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(sx, sy, starSize + 6, 0, Math.PI * 2);
          ctx.stroke();

          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, starSize * 4);
          glow.addColorStop(0, 'rgba(232, 67, 147, 0.35)');
          glow.addColorStop(1, 'rgba(232, 67, 147, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, starSize * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#e84393';
        } else if (isSelected) {
          // Soft teal halo for other stars in the selected constellation
          const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, starSize * 3.5);
          glow.addColorStop(0, 'rgba(0, 133, 106, 0.25)');
          glow.addColorStop(1, 'rgba(0, 133, 106, 0)');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(sx, sy, starSize * 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#00856a';
        } else if (isVisible) {
          ctx.fillStyle = '#6c5ce7';
        } else {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        }

        ctx.beginPath();
        ctx.arc(sx, sy, starSize, 0, Math.PI * 2);
        ctx.fill();
      }

      // Constellation name label
      if (isSelected || isVisible) {
        const centerProj = projectToSkyMap(constellation.ra, constellation.dec, location.lat, lst);
        if (centerProj) {
          ctx.font = isSelected ? '700 12px system-ui, sans-serif' : '500 10px system-ui, sans-serif';
          ctx.fillStyle = isSelected ? '#00856a' : 'rgba(0, 0, 0, 0.35)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(
            constellation.name,
            cx + centerProj.x * radius,
            cy + centerProj.y * radius - 10
          );
        }
      }
    }

    // Planets, Moon & Sun
    for (const body of celestialBodies) {
      const proj = projectToSkyMap(body.ra, body.dec, location.lat, lst);
      if (!proj) continue;

      const bx = cx + proj.x * radius;
      const by = cy + proj.y * radius;
      const isBodySelected = selectedBody?.name === body.name;

      if (body.isSun) {
        // Sun — yellow with large halo to simulate brightness
        const sunHalo = ctx.createRadialGradient(bx, by, 0, bx, by, 65);
        sunHalo.addColorStop(0, isBodySelected ? 'rgba(253, 203, 110, 0.65)' : 'rgba(253, 203, 110, 0.45)');
        sunHalo.addColorStop(0.4, 'rgba(253, 203, 110, 0.15)');
        sunHalo.addColorStop(1, 'rgba(253, 203, 110, 0)');
        ctx.fillStyle = sunHalo;
        ctx.beginPath();
        ctx.arc(bx, by, 65, 0, Math.PI * 2);
        ctx.fill();

        if (isBodySelected) {
          ctx.strokeStyle = '#f9ca24';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bx, by, 10, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#f9ca24';
        ctx.beginPath();
        ctx.arc(bx, by, 5, 0, Math.PI * 2);
        ctx.fill();
      } else if (body.isMoon) {
        // Moon — silver with phase visualization
        const moonR = 6;
        const glowR = isBodySelected ? 20 : 13;

        // Silvery glow
        const moonGlow = ctx.createRadialGradient(bx, by, 0, bx, by, glowR);
        moonGlow.addColorStop(0, isBodySelected ? 'rgba(190, 190, 215, 0.65)' : 'rgba(190, 190, 215, 0.38)');
        moonGlow.addColorStop(1, 'rgba(190, 190, 215, 0)');
        ctx.fillStyle = moonGlow;
        ctx.beginPath();
        ctx.arc(bx, by, glowR, 0, Math.PI * 2);
        ctx.fill();

        // Phase disk — clip to the disk then draw lit + shadow
        const phi = (body.phaseAngle ?? 0) * (Math.PI / 180);
        const termX = Math.cos(phi) * moonR;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, moonR, 0, Math.PI * 2);
        ctx.clip();

        // Lit side (cream-white)
        ctx.fillStyle = '#f0f0e6';
        ctx.fillRect(bx - moonR, by - moonR, moonR * 2, moonR * 2);

        // Shadow overlay
        ctx.fillStyle = 'rgba(38, 38, 58, 0.84)';
        ctx.beginPath();
        const pa = body.phaseAngle ?? 0;
        if (pa < 180) {
          // Waxing: shadow on left
          ctx.arc(bx, by, moonR, -Math.PI / 2, Math.PI / 2, true);       // top → left → bottom
          ctx.ellipse(bx, by, Math.max(0.01, Math.abs(termX)), moonR, 0, Math.PI / 2, -Math.PI / 2, termX > 0);
        } else {
          // Waning: shadow on right
          ctx.arc(bx, by, moonR, -Math.PI / 2, Math.PI / 2, false);      // top → right → bottom
          ctx.ellipse(bx, by, Math.max(0.01, Math.abs(termX)), moonR, 0, Math.PI / 2, -Math.PI / 2, termX < 0);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Selection ring
        if (isBodySelected) {
          ctx.strokeStyle = 'rgba(160, 160, 190, 0.9)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bx, by, moonR + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else {
        // Planets — pink with subtle glow
        const glowRadius = isBodySelected ? 18 : 12;
        const planetGlow = ctx.createRadialGradient(bx, by, 0, bx, by, glowRadius);
        planetGlow.addColorStop(0, isBodySelected ? 'rgba(232, 67, 147, 0.5)' : 'rgba(232, 67, 147, 0.3)');
        planetGlow.addColorStop(1, 'rgba(232, 67, 147, 0)');
        ctx.fillStyle = planetGlow;
        ctx.beginPath();
        ctx.arc(bx, by, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        if (isBodySelected) {
          ctx.strokeStyle = '#e84393';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(bx, by, 8, 0, Math.PI * 2);
          ctx.stroke();
        }

        ctx.fillStyle = '#e84393';
        ctx.beginPath();
        ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Label for selected body
      if (isBodySelected) {
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.fillStyle = body.isSun ? '#c17d10' : body.isMoon ? '#8888aa' : '#c0287a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(body.name, bx, by - (body.isSun ? 14 : body.isMoon ? 14 : 12));
      }
    }

    // Polaris — always label the North Star prominently if above horizon
    const polarisProj = projectToSkyMap(2.53, 89.26, location.lat, lst);
    if (polarisProj) {
      const px = cx + polarisProj.x * radius;
      const py = cy + polarisProj.y * radius;
      const polarisSelected = selectedConstellation?.name === 'Ursa Minor' && expandedStar === 'Polaris';

      // Outer glow ring
      const glow = ctx.createRadialGradient(px, py, 0, px, py, 12);
      glow.addColorStop(0, polarisSelected ? 'rgba(232, 67, 147, 0.25)' : 'rgba(0, 184, 236, 0.3)');
      glow.addColorStop(1, 'rgba(0, 184, 236, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.fill();

      // Star dot
      ctx.fillStyle = polarisSelected ? '#e84393' : '#00b8ec';
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Zenith marker
    ctx.strokeStyle = 'rgba(108, 92, 231, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.stroke();
  }, [date, time, location, selectedConstellation, visibleConstellations, expandedStar, celestialBodies, selectedBody]);

  // Apply a timestamp (ms) to the date/time state
  const applyMs = useCallback((ms: number) => {
    const dt = new Date(ms);
    const newDate = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const newTime = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    setDate(newDate);
    setTime(newTime);
  }, []);

  // Spin the wheel with momentum after release
  const startMomentum = useCallback(() => {
    const frame = () => {
      wheelVelocityRef.current *= 0.92;
      if (Math.abs(wheelVelocityRef.current) < 0.3) {
        wheelMomentumRef.current = null;
        return;
      }
      wheelMsRef.current -= (wheelVelocityRef.current / PIXELS_PER_MINUTE) * 60000;
      applyMs(Math.round(wheelMsRef.current));
      wheelMomentumRef.current = requestAnimationFrame(frame);
    };
    wheelMomentumRef.current = requestAnimationFrame(frame);
  }, [applyMs]);

  // Draw the horizontal time wheel
  const drawWheel = useCallback(() => {
    const canvas = wheelCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = canvas.parentElement?.clientWidth ?? 600;
    const H = 60;
    canvas.style.width = `${W}px`;
    canvas.style.height = `${H}px`;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Light background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(1, '#f0eff8');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // Parse center time
    const [yr, mo, dy] = date.split('-').map(Number);
    const [hr, mn] = time.split(':').map(Number);
    const centerDate = new Date(yr, mo - 1, dy, hr, mn);
    const centerMs = centerDate.getTime();
    const cx = W / 2;

    // Visible range in minutes
    const halfVisMin = (W / 2) / PIXELS_PER_MINUTE + 2;
    const startMin = Math.floor(centerMs / 60000 - halfVisMin);
    const endMin = Math.ceil(centerMs / 60000 + halfVisMin);

    // Tick marks
    for (let m = startMin; m <= endMin; m++) {
      const mMs = m * 60000;
      const x = cx + ((mMs - centerMs) / 60000) * PIXELS_PER_MINUTE;

      let tickH = 6;
      let alpha = 0.18;
      let lw = 0.5;

      if (m % 60 === 0) {
        tickH = 22;
        alpha = 0.8;
        lw = 1.5;
      } else if (m % 15 === 0) {
        tickH = 14;
        alpha = 0.48;
        lw = 1;
      } else if (m % 5 === 0) {
        tickH = 9;
        alpha = 0.3;
        lw = 0.75;
      }

      ctx.strokeStyle = `rgba(108, 92, 231, ${alpha})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(x, H - tickH);
      ctx.lineTo(x, H);
      ctx.stroke();

      if (m % 60 === 0) {
        const tickDate = new Date(mMs);
        const distFromCenter = Math.abs(x - cx);

        if (distFromCenter > 44) {
          const label = tickDate.getHours() === 0
            ? tickDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : `${String(tickDate.getHours()).padStart(2, '0')}:00`;
          ctx.font = tickDate.getHours() === 0 ? '600 9px system-ui, sans-serif' : '500 9px system-ui, sans-serif';
          ctx.fillStyle = tickDate.getHours() === 0 ? 'rgba(0, 184, 148, 0.8)' : 'rgba(108, 92, 231, 0.72)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(label, x, H - tickH - 2);
        }
      }
    }

    // Center line (gradient)
    const cg = ctx.createLinearGradient(cx, 0, cx, H);
    cg.addColorStop(0, 'rgba(108, 92, 231, 0)');
    cg.addColorStop(0.25, 'rgba(108, 92, 231, 0.9)');
    cg.addColorStop(0.6, 'rgba(0, 184, 148, 0.9)');
    cg.addColorStop(1, 'rgba(232, 67, 147, 0.9)');
    ctx.strokeStyle = cg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();

    // Downward triangle pointer at top center
    ctx.fillStyle = 'rgba(108, 92, 231, 0.85)';
    ctx.beginPath();
    ctx.moveTo(cx - 4, 0);
    ctx.lineTo(cx + 4, 0);
    ctx.lineTo(cx, 6);
    ctx.closePath();
    ctx.fill();

    // Current time label — compact, just above the triangle's tip
    const timeLabel = `${String(hr).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
    ctx.font = '600 10px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(108, 92, 231, 0.85)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(timeLabel, cx, 8);

    // Edge fades + drag hint chevrons
    const fw = Math.min(80, W * 0.12);
    const lf = ctx.createLinearGradient(0, 0, fw, 0);
    lf.addColorStop(0, 'rgba(255, 255, 255, 1)');
    lf.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = lf;
    ctx.fillRect(0, 0, fw, H);
    const rf = ctx.createLinearGradient(W - fw, 0, W, 0);
    rf.addColorStop(0, 'rgba(240, 239, 248, 0)');
    rf.addColorStop(1, 'rgba(240, 239, 248, 1)');
    ctx.fillStyle = rf;
    ctx.fillRect(W - fw, 0, fw, H);

    // Drag hint chevrons (drawn after fades so they sit on top)
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(108, 92, 231, 0.3)';
    ctx.fillText('‹', fw * 0.5, H / 2 + 2);
    ctx.fillText('›', W - fw * 0.5, H / 2 + 2);
  }, [date, time]);

  // Keep refs pointed at latest draw functions so the animation loop never restarts
  useEffect(() => { drawSkyMapRef.current = drawSkyMap; }, [drawSkyMap]);
  useEffect(() => { drawWheelRef.current = drawWheel; }, [drawWheel]);

  // Single stable animation loop — never torn down/restarted on state changes
  useEffect(() => {
    let frameId: number;
    const animate = () => {
      gradientAngleRef.current = ((Date.now() % 6000) / 6000) * Math.PI * 2;
      drawSkyMapRef.current();
      drawWheelRef.current();
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      drawSkyMapRef.current();
      drawWheelRef.current();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle canvas click to select constellations
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const displaySize = rect.width;
    const cx = displaySize / 2;
    const cy = displaySize / 2;
    const radius = displaySize / 2 - 30;

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);
    const lst = localSiderealTime(observeDate, location.lon);

    // Check planets/Sun first (smaller targets, tighter hit radius)
    let closestBodyDist = Infinity;
    let closestBody: CelestialBody | null = null;

    for (const body of celestialBodies) {
      const proj = projectToSkyMap(body.ra, body.dec, location.lat, lst);
      if (!proj) continue;

      const bx = cx + proj.x * radius;
      const by = cy + proj.y * radius;
      const dist = Math.sqrt((clickX - bx) ** 2 + (clickY - by) ** 2);
      const hitRadius = body.isSun ? 25 : 18;

      if (dist < hitRadius && dist < closestBodyDist) {
        closestBodyDist = dist;
        closestBody = body;
      }
    }

    if (closestBody) {
      setSelectedBody(selectedBody?.name === closestBody.name ? null : closestBody);
      setSelectedConstellation(null);
      setExpandedStar(null);
      return;
    }

    // Find closest constellation center to click
    let closestDist = Infinity;
    let closestConstellation: VisibleConstellation | null = null;

    for (const vc of visibleConstellations) {
      const proj = projectToSkyMap(vc.ra, vc.dec, location.lat, lst);
      if (!proj) continue;

      const sx = cx + proj.x * radius;
      const sy = cy + proj.y * radius;
      const dist = Math.sqrt((clickX - sx) ** 2 + (clickY - sy) ** 2);

      if (dist < 40 && dist < closestDist) {
        closestDist = dist;
        closestConstellation = vc;
      }
    }

    setSelectedConstellation(closestConstellation);
    setSelectedBody(null);
    setExpandedStar(null);
  };

  const handleManualLocation = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      setLocation({ lat, lon, name: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°` });
      setShowManualInput(false);
      setLocationStatus('success');
    }
  };

  const handleRetryGeolocation = () => {
    if ('geolocation' in navigator) {
      setLocationStatus('loading');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            name: `${pos.coords.latitude.toFixed(2)}°, ${pos.coords.longitude.toFixed(2)}°`,
          });
          setLocationStatus('success');
          setShowManualInput(false);
        },
        () => {
          setLocationStatus('error');
        },
        { timeout: 10000 }
      );
    }
  };

  // Get selected constellation's star positions for the detail panel
  const getStarDetails = () => {
    if (!selectedConstellation) return [];

    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    const observeDate = new Date(year, month - 1, day, hours, minutes);
    const lst = localSiderealTime(observeDate, location.lon);

    return selectedConstellation.stars.map(star => {
      const { altitude, azimuth } = raDecToAltAz(star.ra, star.dec, location.lat, lst);
      return {
        ...star,
        altitude,
        azimuth,
        compass: azimuthToCompass(azimuth),
        visible: altitude > 0,
      };
    });
  };

  const currentMonth = new Date(date).getMonth() + 1;
  const inSeasonConstellations = visibleConstellations.filter(c => c.bestMonths.includes(currentMonth));

  // Upcoming sky events, relative to the currently viewed date
  const observeDateForEvents = (() => {
    const [year, month, day] = date.split('-').map(Number);
    const [hours, minutes] = time.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  })();
  const nextSolarEclipse = getNextSolarEclipse(observeDateForEvents);
  const nextLunarEclipse = getNextLunarEclipse(observeDateForEvents);
  const nextSeasonalMarker = getNextSeasonalMarker(observeDateForEvents);
  const nextMeteorShower = getNextMeteorShower(observeDateForEvents);

  // Exact Sun/Moon conjunction (solar) or opposition (lunar) moment, found by searching
  // the same orbital-mechanics positions that drive the sky map — see skyEvents.ts.
  const solarEclipsePeak = nextSolarEclipse ? findSolarEclipseMoment(nextSolarEclipse.date) : null;
  const lunarEclipsePeak = nextLunarEclipse ? findLunarEclipseMoment(nextLunarEclipse.date) : null;

  // Necessary (not sufficient) local-visibility check: is the Sun/Moon even above your
  // horizon at that moment? This can't tell you if you're inside the eclipse's shadow path.
  const solarEclipseSunAlt = solarEclipsePeak
    ? getCelestialBodies(solarEclipsePeak, location.lat, location.lon).find(b => b.isSun)?.altitude ?? null
    : null;
  const lunarEclipseMoonAlt = lunarEclipsePeak
    ? getCelestialBodies(lunarEclipsePeak, location.lat, location.lon).find(b => b.isMoon)?.altitude ?? null
    : null;

  const jumpToEventMoment = (peak: Date, bodyKind: 'sun' | 'moon') => {
    applyMs(peak.getTime());
    const bodies = getCelestialBodies(peak, location.lat, location.lon);
    const body = bodies.find(b => (bodyKind === 'sun' ? b.isSun : b.isMoon));
    if (body) setSelectedBody(body);
    setSelectedConstellation(null);
    setExpandedStar(null);
    canvasRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const parseEventDate = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const formatEventDate = (d: Date) =>
    d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const daysUntil = (d: Date) => {
    const start = new Date(observeDateForEvents.getFullYear(), observeDateForEvents.getMonth(), observeDateForEvents.getDate());
    const end = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  };

  const formatDaysUntil = (d: Date) => {
    const days = daysUntil(d);
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  return (
    <main>
      <div className="page-bg" />

      <div className="container">
        <div className="page-header">
          <Breadcrumb current="Planetarium" />
          <h1 className="section-title">
            <span className="gradient-text">Planetarium</span>
          </h1>
          <p className="section-subtitle" style={{ marginBottom: 0 }}>
            Explore what&apos;s in the sky tonight — find constellations visible from your location
          </p>
        </div>

        {/* Controls */}
        <div className="planetarium-controls">
          <div className="planetarium-control-group">
            <div className="calc-field">
              <label className="calc-label">Date</label>
              <input
                type="date"
                className="calc-input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="calc-field">
              <label className="calc-label">Time</label>
              <input
                type="time"
                className="calc-input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>

          <div className="planetarium-location">
            <label className="calc-label">Location</label>
            <div className="planetarium-location-row">
              <div className="planetarium-location-display">
                {locationStatus === 'loading' && 'Detecting location...'}
                {locationStatus === 'success' && location.name}
                {locationStatus === 'error' && `Using default: ${location.name}`}
                {locationStatus === 'idle' && location.name}
              </div>
              <button
                className="planetarium-location-btn"
                onClick={handleRetryGeolocation}
                title="Detect my location"
              >
                &#128205;
              </button>
              <button
                className="planetarium-location-btn"
                onClick={() => setShowManualInput(!showManualInput)}
                title="Enter coordinates manually"
              >
                &#9998;
              </button>
            </div>
            {showManualInput && (
              <div className="planetarium-manual-location">
                <input
                  type="number"
                  className="calc-input"
                  placeholder="Latitude (-90 to 90)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  min={-90}
                  max={90}
                  step="0.01"
                />
                <input
                  type="number"
                  className="calc-input"
                  placeholder="Longitude (-180 to 180)"
                  value={manualLon}
                  onChange={(e) => setManualLon(e.target.value)}
                  min={-180}
                  max={180}
                  step="0.01"
                />
                <button className="calc-btn" onClick={handleManualLocation} style={{ marginTop: 0 }}>
                  Set Location
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Time Wheel */}
        <div
          className="planetarium-wheel-track"
            onPointerDown={(e) => {
              if (wheelMomentumRef.current !== null) {
                cancelAnimationFrame(wheelMomentumRef.current);
                wheelMomentumRef.current = null;
              }
              (e.currentTarget as Element).setPointerCapture(e.pointerId);
              const [y, mo, d] = date.split('-').map(Number);
              const [h, mi] = time.split(':').map(Number);
              wheelMsRef.current = new Date(y, mo - 1, d, h, mi).getTime();
              wheelDraggingRef.current = true;
              wheelLastXRef.current = e.clientX;
              wheelVelocityRef.current = 0;
            }}
            onPointerMove={(e) => {
              if (!wheelDraggingRef.current) return;
              const dx = e.clientX - wheelLastXRef.current;
              wheelLastXRef.current = e.clientX;
              wheelVelocityRef.current = dx;
              wheelMsRef.current -= (dx / PIXELS_PER_MINUTE) * 60000;
              applyMs(Math.round(wheelMsRef.current));
            }}
            onPointerUp={() => {
              if (!wheelDraggingRef.current) return;
              wheelDraggingRef.current = false;
              startMomentum();
            }}
            onPointerCancel={() => {
              wheelDraggingRef.current = false;
              wheelVelocityRef.current = 0;
            }}
          >
            <canvas ref={wheelCanvasRef} />
        </div>

        {/* Main Dashboard */}
        <div className="planetarium-dashboard">
          {/* Sky Map */}
          <div className="planetarium-skymap-container">
            <div className="planetarium-canvas-wrapper">
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                style={{ cursor: 'pointer' }}
              />
            </div>
            <div className="planetarium-skymap-legend">
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--visible" />
                Visible
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--selected" />
                Selected
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--dim" />
                Below horizon
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--planet" />
                Planet
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--moon" />
                Moon
              </span>
              <span className="planetarium-legend-item">
                <span className="planetarium-legend-dot planetarium-legend-dot--sun" />
                Sun
              </span>
            </div>
          </div>

          {/* Detail Panel */}
          <div className="planetarium-detail-panel">
            {selectedBody ? (
              <div className="planetarium-detail-content">
                <div className="planetarium-body-detail-header">
                  <span className={`planetarium-body-detail-symbol ${selectedBody.isSun ? 'planetarium-body-detail-symbol--sun' : selectedBody.isMoon ? 'planetarium-body-detail-symbol--moon' : ''}`}>{selectedBody.symbol}</span>
                  <div>
                    <h2 className="planetarium-detail-name">{selectedBody.name}</h2>
                    <p className="planetarium-detail-abbr">{selectedBody.isSun ? 'Star' : selectedBody.isMoon ? "Earth's Moon" : 'Planet'}</p>
                  </div>
                </div>

                <div className="planetarium-direction-card">
                  <div className="planetarium-direction-label">Where to look</div>
                  <div className="planetarium-direction-compass">{selectedBody.compass}</div>
                  <div className="planetarium-direction-hint">{selectedBody.directionHint}</div>
                  <div className="planetarium-direction-stats">
                    <div>
                      <span className="planetarium-stat-label">Altitude</span>
                      <span className="planetarium-stat-value">{selectedBody.altitude.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="planetarium-stat-label">Azimuth</span>
                      <span className="planetarium-stat-value">{selectedBody.azimuth.toFixed(1)}°</span>
                    </div>
                  </div>
                </div>

                {selectedBody.isMoon && (
                  <div className="planetarium-direction-card planetarium-moon-phase-card">
                    <div className="planetarium-direction-label">Current Phase</div>
                    <div className="planetarium-moon-phase-name">{selectedBody.phaseName}</div>
                    <div className="planetarium-direction-hint">
                      {Math.round((selectedBody.phase ?? 0) * 100)}% illuminated
                    </div>
                  </div>
                )}

                <p className="planetarium-detail-desc">{selectedBody.description}</p>

                <div className="planetarium-detail-section">
                  <h3 className="planetarium-detail-section-title">Cool Facts</h3>
                  <ul className="planetarium-facts-list">
                    {selectedBody.facts.map((fact, i) => (
                      <li key={i} className="planetarium-fact-item">{fact}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : selectedConstellation ? (
              <div className="planetarium-detail-content">
                <h2 className="planetarium-detail-name">{selectedConstellation.name}</h2>
                <p className="planetarium-detail-abbr">{selectedConstellation.abbreviation}</p>

                {/* Where to look */}
                <div className="planetarium-direction-card">
                  <div className="planetarium-direction-label">Where to look</div>
                  <div className="planetarium-direction-compass">{selectedConstellation.compass}</div>
                  <div className="planetarium-direction-hint">{selectedConstellation.directionHint}</div>
                  <div className="planetarium-direction-stats">
                    <div>
                      <span className="planetarium-stat-label">Altitude</span>
                      <span className="planetarium-stat-value">{selectedConstellation.altitude.toFixed(1)}°</span>
                    </div>
                    <div>
                      <span className="planetarium-stat-label">Azimuth</span>
                      <span className="planetarium-stat-value">{selectedConstellation.azimuth.toFixed(1)}°</span>
                    </div>
                  </div>
                </div>

                <p className="planetarium-detail-desc">{selectedConstellation.description}</p>

                <div className="planetarium-detail-section">
                  <h3 className="planetarium-detail-section-title">Best Viewing Months</h3>
                  <div className="planetarium-months">
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                      <span
                        key={m}
                        className={`planetarium-month ${selectedConstellation.bestMonths.includes(i + 1) ? 'planetarium-month--active' : ''} ${i + 1 === currentMonth ? 'planetarium-month--current' : ''}`}
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="planetarium-detail-section">
                  <h3 className="planetarium-detail-section-title">Notable Stars</h3>
                  <div className="planetarium-stars-list">
                    {getStarDetails().map(star => (
                      <div key={star.name} className={`planetarium-star-item ${star.visible ? '' : 'planetarium-star-item--hidden'}`}>
                        <button
                          className="planetarium-star-header"
                          onClick={() => setExpandedStar(expandedStar === star.name ? null : star.name)}
                          aria-expanded={expandedStar === star.name}
                        >
                          <div className="planetarium-star-header-left">
                            <span className="planetarium-star-name">{star.name}</span>
                            <span className="planetarium-star-mag">mag {star.mag.toFixed(1)}</span>
                          </div>
                          <div className="planetarium-star-header-right">
                            <span className="planetarium-star-pos">
                              {star.visible
                                ? `${star.compass} · ${star.altitude.toFixed(0)}°`
                                : 'Below horizon'
                              }
                            </span>
                            <span className={`planetarium-star-chevron ${expandedStar === star.name ? 'planetarium-star-chevron--open' : ''}`}>
                              ›
                            </span>
                          </div>
                        </button>
                        {expandedStar === star.name && (
                          <div className="planetarium-star-desc">
                            {star.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="planetarium-detail-empty">
                <div className="planetarium-detail-empty-icon">&#127776;</div>
                <h3>Select a Constellation or Solar System Body</h3>
                <p>Click on a constellation, planet, moon, or the sun in the sky map, or choose one from the lists below to see detailed viewing information.</p>
              </div>
            )}
          </div>
        </div>

        {/* Visible Constellations List */}
        <div className="planetarium-list-section">
          <h2 className="planetarium-panel-title">
            Visible Tonight
            <span className="planetarium-count">{visibleConstellations.length}</span>
          </h2>
          {inSeasonConstellations.length > 0 && inSeasonConstellations.length < visibleConstellations.length && (
            <p className="planetarium-panel-subtitle">
              {inSeasonConstellations.length} of {visibleConstellations.length} are in their best viewing season
            </p>
          )}

          {visibleConstellations.length === 0 ? (
            <div className="planetarium-empty-sky">
              <p>No constellations visible above the horizon at this time and location. Try adjusting the time or date.</p>
            </div>
          ) : (
            <div className="planetarium-constellation-grid">
              {visibleConstellations.map(c => (
                <button
                  key={c.name}
                  className={`planetarium-constellation-card ${selectedConstellation?.name === c.name ? 'planetarium-constellation-card--selected' : ''} ${c.bestMonths.includes(currentMonth) ? 'planetarium-constellation-card--inseason' : ''}`}
                  onClick={() => {
                    setSelectedConstellation(selectedConstellation?.name === c.name ? null : c);
                    setSelectedBody(null);
                    setExpandedStar(null);
                  }}
                >
                  <div className="planetarium-constellation-card-header">
                    <span className="planetarium-constellation-name">{c.name}</span>
                    <span className="planetarium-constellation-alt">{c.altitude.toFixed(0)}°</span>
                  </div>
                  <div className="planetarium-constellation-direction">
                    {c.directionHint}
                  </div>
                  {c.bestMonths.includes(currentMonth) && (
                    <span className="planetarium-season-badge">In Season</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Planets & Sun */}
        <div className="planetarium-list-section">
          <h2 className="planetarium-panel-title">Planets, Moon &amp; Sun</h2>
          <p className="planetarium-panel-subtitle">
            Solar system bodies computed from orbital mechanics
          </p>
          <div className="planetarium-body-grid">
            {celestialBodies.map(body => (
              <button
                key={body.name}
                className={`planetarium-body-card ${body.isSun ? 'planetarium-body-card--sun' : body.isMoon ? 'planetarium-body-card--moon' : 'planetarium-body-card--planet'} ${body.altitude > 0 ? '' : 'planetarium-body-card--below'} ${selectedBody?.name === body.name ? 'planetarium-body-card--selected' : ''}`}
                onClick={() => {
                  setSelectedBody(selectedBody?.name === body.name ? null : body);
                  setSelectedConstellation(null);
                  setExpandedStar(null);
                }}
              >
                <div className="planetarium-body-card-header">
                  <span className="planetarium-body-symbol">{body.symbol}</span>
                  <span className="planetarium-body-name">{body.name}</span>
                  <span className="planetarium-body-alt">{body.altitude.toFixed(0)}°</span>
                </div>
                <div className="planetarium-body-hint">{body.directionHint}</div>
                <div className="planetarium-body-desc">{body.description}</div>
              </button>
            ))}
          </div>
        </div>
        {/* Upcoming Sky Events */}
        <div className="planetarium-list-section">
          <h2 className="planetarium-panel-title">Upcoming Sky Events</h2>
          <p className="planetarium-panel-subtitle">
            Next eclipses and other notable events, counted from the date shown above
          </p>
          <div className="planetarium-events-grid">
            {nextSolarEclipse && solarEclipsePeak && (
              <button
                className="planetarium-event-card planetarium-event-card--clickable"
                onClick={() => jumpToEventMoment(solarEclipsePeak, 'sun')}
              >
                <div className="planetarium-event-icon">&#9728;&#65039;</div>
                <div className="planetarium-event-body">
                  <div className="planetarium-event-header">
                    <span className="planetarium-event-title">{nextSolarEclipse.type} Solar Eclipse</span>
                    <span className="planetarium-event-countdown">{formatDaysUntil(parseEventDate(nextSolarEclipse.date))}</span>
                  </div>
                  <div className="planetarium-event-date">{formatEventDate(parseEventDate(nextSolarEclipse.date))}</div>
                  <div className="planetarium-event-desc">Visible from: {nextSolarEclipse.visibility}</div>
                  <div className="planetarium-event-visibility">
                    {solarEclipseSunAlt !== null && solarEclipseSunAlt > 0
                      ? `Sun is up at your location at eclipse peak — click to view`
                      : `Sun is below your horizon at eclipse peak — click to view anyway`}
                  </div>
                </div>
              </button>
            )}

            {nextLunarEclipse && lunarEclipsePeak && (
              <button
                className="planetarium-event-card planetarium-event-card--clickable"
                onClick={() => jumpToEventMoment(lunarEclipsePeak, 'moon')}
              >
                <div className="planetarium-event-icon">&#127765;&#65039;</div>
                <div className="planetarium-event-body">
                  <div className="planetarium-event-header">
                    <span className="planetarium-event-title">{nextLunarEclipse.type} Lunar Eclipse</span>
                    <span className="planetarium-event-countdown">{formatDaysUntil(parseEventDate(nextLunarEclipse.date))}</span>
                  </div>
                  <div className="planetarium-event-date">{formatEventDate(parseEventDate(nextLunarEclipse.date))}</div>
                  <div className="planetarium-event-desc">Visible from: {nextLunarEclipse.visibility}</div>
                  <div className="planetarium-event-visibility">
                    {lunarEclipseMoonAlt !== null && lunarEclipseMoonAlt > 0
                      ? `Moon is up at your location at eclipse peak — click to view`
                      : `Moon is below your horizon at eclipse peak — click to view anyway`}
                  </div>
                </div>
              </button>
            )}

            <div className="planetarium-event-card">
              <div className="planetarium-event-icon">&#127774;</div>
              <div className="planetarium-event-body">
                <div className="planetarium-event-header">
                  <span className="planetarium-event-title">{nextSeasonalMarker.name}</span>
                  <span className="planetarium-event-countdown">{formatDaysUntil(nextSeasonalMarker.date)}</span>
                </div>
                <div className="planetarium-event-date">{formatEventDate(nextSeasonalMarker.date)}</div>
                <div className="planetarium-event-desc">The Sun reaches a key point in its yearly path along the ecliptic.</div>
              </div>
            </div>

            <div className="planetarium-event-card">
              <div className="planetarium-event-icon">&#8853;</div>
              <div className="planetarium-event-body">
                <div className="planetarium-event-header">
                  <span className="planetarium-event-title">{nextMeteorShower.name} Meteor Shower</span>
                  <span className="planetarium-event-countdown">{formatDaysUntil(nextMeteorShower.date)}</span>
                </div>
                <div className="planetarium-event-date">Peaks {formatEventDate(nextMeteorShower.date)}</div>
                <div className="planetarium-event-desc">{nextMeteorShower.description}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}
