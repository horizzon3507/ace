import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import data from '../public/data.json';

const FPS = 30;
const ACE_BLUE = '#648DE5';
const ACE_DEEP = '#2D4780';
const INK = '#171717';
const EYES = '#F1F1F1';

const beats: number[] = data.beats;
const env: number[] = data.env;

// deterministic pseudo-random for shake
const rand = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export const AceFunk: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;

  // beat pulse: time since last beat
  const beatIdx = beats.findIndex((b, i) => {
    const next = beats[i + 1];
    return t >= b && (next === undefined || t < next);
  });
  const phase = beatIdx >= 0 ? t - beats[beatIdx] : 9;
  const pump = Math.exp(-phase * 5.5); // 1 at beat, decays
  const side = beatIdx % 2 === 0 ? 1 : -1;

  // audio envelope sampled per frame (already 30fps)
  const e = env[Math.min(frame, env.length - 1)] ?? 0;

  // headbop: alternating tilt + nod down + forward scale
  const tilt = side * 15 * Math.exp(-phase * 4);
  const nod = -38 * pump; // px, dips on beat
  const scale = 1 + 0.055 * e + 0.11 * pump;
  const squish = 1 - 0.08 * pump;

  // camera shake on beat
  const shake = pump * 7;
  const shakeX = (rand(beatIdx + 1) - 0.5) * shake;
  const shakeY = (rand(beatIdx + 11) - 0.5) * shake;

  // beat flash
  const flash = Math.exp(-phase * 7);

  // background gradient drift
  const drift = Math.sin(t * 0.8) * 120;

  // RGB split intensity on peaks
  const split = Math.min(1, e * 1.6) * (0.4 + 0.6 * pump);

  // intro / outro fades
  const fade = interpolate(frame, [0, 8, 432, 449], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const caption = 'FUNK DE BELEZA';

  return (
    <AbsoluteFill style={{ background: INK, opacity: fade, fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <Audio src={staticFile('funk15.mp3')} />

      {/* drifting gradient blobs */}
      <AbsoluteFill>
        <div
          style={{
            position: 'absolute',
            width: 1600,
            height: 1600,
            left: -400 + drift,
            top: -500,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${ACE_DEEP}cc 0%, transparent 65%)`,
            filter: 'blur(40px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 1400,
            height: 1400,
            right: -450 - drift,
            bottom: -600,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${ACE_BLUE}55 0%, transparent 65%)`,
            filter: 'blur(50px)',
          }}
        />
      </AbsoluteFill>

      {/* scanlines + grain feel */}
      <AbsoluteFill
        style={{
          background:
            'repeating-linear-gradient(0deg, rgba(255,255,255,0.022) 0px, rgba(255,255,255,0.022) 1px, transparent 1px, transparent 4px)',
        }}
      />

      {/* beat flash */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% 45%, ${ACE_BLUE} 0%, transparent 70%)`,
          opacity: flash * 0.28,
        }}
      />

      {/* Ace with RGB split + headbop */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translate(${shakeX}px, ${shakeY}px)`,
        }}
      >
        <div style={{ position: 'relative', width: 620, height: 620 }}>
          {/* ghost trails for chromatic split */}
          <Img
            src={staticFile('ace.png')}
            style={{
              position: 'absolute',
              width: 620,
              height: 620,
              transform: `translate(${-10 * split}px, ${nod}px) scale(${scale}, ${squish * scale}) rotate(${tilt}deg)`,
              filter: 'hue-rotate(-40deg) saturate(3) opacity(0.55)',
              mixBlendMode: 'screen',
            }}
          />
          <Img
            src={staticFile('ace.png')}
            style={{
              position: 'absolute',
              width: 620,
              height: 620,
              transform: `translate(${10 * split}px, ${nod}px) scale(${scale}, ${squish * scale}) rotate(${tilt}deg)`,
              filter: 'hue-rotate(60deg) saturate(3) opacity(0.55)',
              mixBlendMode: 'screen',
            }}
          />
          <Img
            src={staticFile('ace.png')}
            style={{
              position: 'absolute',
              width: 620,
              height: 620,
              transform: `translateY(${nod}px) scale(${scale}, ${squish * scale}) rotate(${tilt}deg)`,
              filter: `drop-shadow(0 30px 60px rgba(0,0,0,0.6)) drop-shadow(0 0 ${40 + 60 * pump}px ${ACE_BLUE}88)`,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* title */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          width: '100%',
          textAlign: 'center',
          transform: `translateY(${-8 * pump}px)`,
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            letterSpacing: 24,
            color: EYES,
            textShadow: `0 0 ${30 + 40 * pump}px ${ACE_BLUE}, 0 4px 0 ${ACE_DEEP}`,
            paddingLeft: 24,
          }}
        >
          ACE
        </div>
      </div>

      {/* caption pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 210,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: 10,
            color: EYES,
            background: `${ACE_BLUE}26`,
            border: `2px solid ${ACE_BLUE}66`,
            borderRadius: 999,
            padding: '16px 42px',
            transform: `scale(${1 + 0.04 * pump})`,
          }}
        >
          {caption}
        </div>
      </div>

      {/* bottom progress bar synced to beats */}
      <div
        style={{
          position: 'absolute',
          bottom: 120,
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {beats.map((b, i) => {
          const active = t >= b;
          const hot = active && i === beatIdx;
          return (
            <div
              key={i}
              style={{
                width: 14,
                height: hot ? 34 : 14,
                borderRadius: 999,
                background: active ? ACE_BLUE : `${EYES}33`,
                transition: 'height 0.1s linear',
              }}
            />
          );
        })}
      </div>

      {/* vignette */}
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};
