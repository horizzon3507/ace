import React from 'react';
import { loadFont } from '@remotion/google-fonts/Geist';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import data from '../public/data.json';

const { fontFamily } = loadFont();

const FPS = 30;
const ACE_BLUE = '#648DE5';
const ACE_DEEP = '#2D4780';
const INK = '#171717';
const EYES = '#F1F1F1';

const beats: number[] = data.beats;
const env: number[] = data.env;
const DROP = data.drop; // ~4.7s — "o tbt que ele quer" entra aqui

const faces = [
  staticFile('ace-normal.png'),
  staticFile('ace-feliz.png'),
  staticFile('ace-empolgado.png'),
  staticFile('ace-piscada.png'),
];

export const AceFunk: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // beat index + phase
  const beatIdx = beats.findIndex((b, i) => {
    const next = beats[i + 1];
    return t >= b && (next === undefined || t < next);
  });
  const phase = beatIdx >= 0 ? t - beats[beatIdx] : 9;
  // hop: sine across each beat — airborne mid-beat, lands on the next
  const beatLen = 0.557;
  const lift = Math.sin(Math.min(phase / beatLen, 1) * Math.PI); // 0→1→0 per beat
  const squash = phase < 0.09 ? 1 - phase * 1.2 : 1; // landing squish ~3 frames
  const stretch = 1 + lift * 0.07;

  const beforeDrop = t < DROP;
  const energy = beforeDrop ? 0.35 : 1; // calm intro, full bounce after drop
  const liftPx = 150 * energy * lift;
  const walk = interpolate(t, [0, 15], [-150, 150]); // drift across
  const sway = Math.sin(t * 2.4) * 22 * energy; // side-to-side while hopping
  const tilt = Math.sin(t * 2.4 + 0.6) * 9 * energy;

  // expression: calm normal → feliz → empolgado on drop, piscada every 8th beat
  const face = beforeDrop
    ? 0
    : beatIdx % 8 === 0 && phase < beatLen
      ? 3
      : beatIdx % 4 < 2
        ? 2
        : 1;

  const dropFlash = Math.exp(-(t - DROP) * 6) * (t >= DROP ? 1 : 0);

  const fade = interpolate(frame, [0, 10, 435, 449], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ background: INK, opacity: fade, fontFamily }}>
      <Audio src={staticFile('funk15.mp3')} />

      {/* soft light behind Ace — flat, no texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 42% at 50% 58%, ${ACE_DEEP}59 0%, transparent 70%)`,
        }}
      />

      {/* official logo, top center */}
      <div style={{ position: 'absolute', top: 150, width: '100%', display: 'flex', justifyContent: 'center' }}>
        <Img src={staticFile('ace-logo.png')} style={{ width: 300 }} />
      </div>

      {/* drop flash */}
      <AbsoluteFill style={{ background: ACE_BLUE, opacity: dropFlash * 0.18 }} />

      {/* Ace hopping across the floor */}
      <div
        style={{
          position: 'absolute',
          top: 760,
          left: '50%',
          transform: `translateX(calc(-50% + ${walk + sway}px))`,
        }}
      >
        {/* contact shadow */}
        <div
          style={{
            position: 'absolute',
            top: 596,
            left: 60,
            width: 500,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.45)',
            filter: 'blur(18px)',
            transform: `scale(${1 - lift * 0.35}, 1)`,
            opacity: 0.8 - lift * 0.35,
          }}
        />
        <Img
          src={faces[face]}
          style={{
            width: 620,
            height: 620,
            transform: `translateY(${-liftPx}px) rotate(${tilt}deg) scale(${squash * (2 - stretch)}, ${squash * stretch})`,
            transformOrigin: '50% 100%',
          }}
        />
      </div>

      {/* floor line */}
      <div
        style={{
          position: 'absolute',
          top: 760 + 648,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 760, height: 3, borderRadius: 2, background: `${EYES}1f` }} />
      </div>

      {/* caption */}
      <div
        style={{
          position: 'absolute',
          bottom: 160,
          width: '100%',
          textAlign: 'center',
          fontSize: 46,
          fontWeight: 500,
          letterSpacing: 14,
          color: EYES,
          opacity: 0.9,
          paddingLeft: 14,
        }}
      >
        funk de beleza
      </div>
    </AbsoluteFill>
  );
};
