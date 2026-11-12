'use client';

import { useEffect, useRef } from 'react';
import styles from './ota-home-motion.module.css';

const TAU = Math.PI * 2;
const HOLD_MS = 480;
const ACTS = [
  { name: 'Vịnh Hạ Long', shallow: '#a6ddd3', deep: '#2c7a7b', light: 0.44 },
  { name: 'Hồ Đà Lạt', shallow: '#81b6ae', deep: '#1e4d57', light: 0.26 },
  { name: 'Sông Hoài, Hội An', shallow: '#c98a3d', deep: '#3b6e6a', light: 0.4 },
  { name: 'Bờ biển Nha Trang', shallow: '#dcebcf', deep: '#46b6b0', light: 0.9 },
  { name: 'Vịnh đêm', shallow: '#3d747c', deep: '#244d58', light: 0.12 },
];
const BOUNDARIES = [0.18, 0.38, 0.58, 0.78];
const VARIETIES = [
  { name: 'Kohaku', skin: '#fff2dc', patches: ['#ed632b'] },
  { name: 'Showa', skin: '#273639', patches: ['#f3e7cc', '#ec592d'] },
  { name: 'Ogon', skin: '#f3bc4f', patches: [] },
  { name: 'Tancho', skin: '#fff2dc', patches: ['#d33c2d'] },
];
const WATER_TARGETS = 'a, button, input, label, select, textarea, form, nav, article, summary, p, h1, h2, h3, .ota-home, [contenteditable], [role="button"], [role="alert"], [data-water-card], [data-home-banner]';

type Point = { x: number; y: number };
type Ripple = Point & { age: number; size: number };
type Pellet = Point & { age: number };
type Fish = Point & { heading: number; speed: number; seed: number; phase: number };
type Brush = CanvasRenderingContext2D;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function ease(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function mixColor(from: string, to: string, fraction: number) {
  const a = Number.parseInt(from.slice(1), 16);
  const b = Number.parseInt(to.slice(1), 16);
  const channels = [16, 8, 0].map((shift) => {
    const left = (a >> shift) & 255;
    return Math.round(left + (((b >> shift) & 255) - left) * fraction);
  });
  return `rgb(${channels.join(' ')})`;
}

function ellipse(ctx: Brush, x: number, y: number, rx: number, ry: number, color: string, angle = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, angle, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
}

function glow(ctx: Brush, x: number, y: number, radius: number, color: string) {
  const light = ctx.createRadialGradient(x, y, 0, x, y, radius);
  light.addColorStop(0, color);
  light.addColorStop(1, 'transparent');
  ctx.fillStyle = light;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function ring(ctx: Brush, x: number, y: number, radius: number, opacity: number) {
  for (const offset of [1, 0]) {
    ctx.beginPath();
    ctx.ellipse(x, y + offset * 1.8, radius, radius * 0.72, 0, 0, TAU);
    ctx.strokeStyle = offset ? `rgb(10 53 56 / ${opacity * 0.55})` : `rgb(238 255 244 / ${opacity})`;
    ctx.lineWidth = 0.9;
    ctx.stroke();
  }
}

function karst(ctx: Brush, x: number, y: number, size: number, seed: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size, size);
  ctx.rotate(noise(seed) - 0.5);
  ellipse(ctx, 0.08, 0.21, 0.92, 0.57, '#164e5440', -0.2);
  ellipse(ctx, 0, 0.12, 0.99, 0.62, '#a6e4d455', -0.2);
  const cliff = ctx.createLinearGradient(-0.75, -0.6, 0.54, 0.58);
  cliff.addColorStop(0, '#a8c3a0');
  cliff.addColorStop(0.47, '#507866');
  cliff.addColorStop(1, '#214f50');
  ctx.beginPath();
  ctx.moveTo(-0.94, 0.13);
  ctx.bezierCurveTo(-1.04, -0.23, -0.69, -0.32, -0.51, -0.45);
  ctx.bezierCurveTo(-0.33, -0.81, 0.09, -0.68, 0.23, -0.53);
  ctx.bezierCurveTo(0.57, -0.66, 0.85, -0.34, 0.81, -0.07);
  ctx.bezierCurveTo(1.1, 0.24, 0.39, 0.57, 0.16, 0.49);
  ctx.bezierCurveTo(-0.2, 0.63, -0.82, 0.46, -0.94, 0.13);
  ctx.fillStyle = cliff;
  ctx.fill();
  ctx.clip();
  ctx.strokeStyle = '#d2dfb34d';
  ctx.lineWidth = 0.016;
  for (let i = 0; i < 18; i++) {
    const ridge = i * 0.1 - 0.91;
    ctx.beginPath();
    ctx.moveTo(ridge - 0.22, -0.56 + noise(i + seed) * 0.37);
    ctx.lineTo(ridge, -0.14);
    ctx.lineTo(ridge + 0.09, 0.16);
    ctx.lineTo(ridge + 0.23, 0.56);
    ctx.stroke();
  }
  for (let i = 0; i < 44; i++) {
    const px = noise(i + seed * 9) * 2 - 1;
    const py = noise(i + seed * 15 + 60) - 0.62;
    const radius = 0.07 + noise(i + 120) * 0.21;
    ellipse(ctx, px, py, radius, radius * 0.62, i % 3 ? '#27604766' : '#c6d69a44', -0.4);
  }
  ctx.restore();
}

function makeIsland(seed: number) {
  const sprite = document.createElement('canvas');
  sprite.width = 144;
  sprite.height = 108;
  const brush = sprite.getContext('2d');
  if (brush) karst(brush, 72, 54, 56, seed);
  return sprite;
}

function pine(ctx: Brush, x: number, y: number, size: number, seed: number) {
  ellipse(ctx, x + 3, y + 4, size, size * 0.76, '#123e3e62');
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const angle = i * TAU / 16;
    const radius = size * (i % 2 ? 0.48 : 0.77 + noise(seed + i) * 0.23);
    ctx.lineTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fillStyle = seed % 3 ? '#386b55' : '#4d8061';
  ctx.fill();
  ellipse(ctx, x - size * 0.18, y - size * 0.18, size * 0.38, size * 0.26, '#b6c79545', 0.8);
}

function wings(ctx: Brush, x: number, y: number, size: number, flap: number) {
  ctx.beginPath();
  ctx.moveTo(x - size, y + flap);
  ctx.quadraticCurveTo(x - size * 0.45, y - 5, x, y + 2);
  ctx.quadraticCurveTo(x + size * 0.45, y - 5, x + size, y + flap);
  ctx.strokeStyle = '#133a4655';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function lily(ctx: Brush, x: number, y: number, radius: number, angle: number, lotus: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ellipse(ctx, 2, 3, radius, radius * 0.82, '#123b413a');
  ctx.beginPath();
  ctx.ellipse(0, 0, radius, radius * 0.8, 0, 0.28, TAU - 0.22);
  ctx.lineTo(radius * 0.22, 0);
  ctx.closePath();
  ctx.fillStyle = '#3e8e5a';
  ctx.fill();
  ctx.strokeStyle = '#a4d39473';
  ctx.stroke();
  for (let j = 1; j < 7; j++) {
    const a = j * 0.83;
    ctx.beginPath();
    ctx.moveTo(radius * 0.18, 0);
    ctx.quadraticCurveTo(Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.33, Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.66);
    ctx.strokeStyle = '#9acb8170';
    ctx.stroke();
  }
  if (lotus) {
    for (let j = 0; j < 8; j++) {
      const a = j * TAU / 8;
      ellipse(ctx, Math.cos(a) * radius * 0.32, Math.sin(a) * radius * 0.32, radius * 0.38, radius * 0.16, j % 2 ? '#f7c6d0' : '#ffe3df', a);
    }
    ellipse(ctx, 0, 0, radius * 0.14, radius * 0.13, '#f2b33d');
  }
  ctx.restore();
}

function lantern(ctx: Brush, x: number, y: number, size: number, angle: number, night: boolean) {
  glow(ctx, x, y + 4, size * (night ? 5 : 3.5), night ? '#ffba5f66' : '#ffcb6648');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = night ? '#ffb566' : '#f5944d';
  ctx.beginPath();
  ctx.roundRect(-size * 0.66, -size * 0.74, size * 1.32, size * 1.48, size * 0.33);
  ctx.fill();
  ellipse(ctx, 0, 0, size * 0.42, size * 0.68, '#ffd391');
  ellipse(ctx, 0, 0, size * 0.2, size * 0.33, '#fff2bc');
  ctx.fillStyle = '#815048';
  ctx.fillRect(-size * 0.38, size * 0.68, size * 0.76, size * 0.14);
  ctx.restore();
}

function drawFish(ctx: Brush, fish: Fish, tropical: boolean, scale: number, accent: string) {
  const { x, y, heading, phase, seed } = fish;
  const variety = VARIETIES[seed % VARIETIES.length]!;
  const length = (tropical ? 17 : 38 + noise(seed + 21) * 18) * scale;
  const width = length * (tropical ? 0.18 : 0.145);
  const spine = Array.from({ length: 9 }, (_, i) => {
    const t = i / 8;
    return {
      x: length * (0.5 - t),
      y: Math.sin(phase - t * 4.8) * length * 0.14 * t * t,
      width: width * (0.13 + 0.87 * Math.sin(Math.PI * t ** 0.58) ** 0.82),
    };
  });
  const head = spine[0]!;
  const tail = spine[8]!;
  const fin = 0.24 + Math.sin(phase) * 0.07;
  ellipse(ctx, x + 6, y + 7, length * 0.55, width * 1.1, '#092b3b32', heading);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(heading);
  const skin = tropical ? ['#f3cb71', '#3b858b', '#e1ece0'][seed % 3]! : variety.skin;
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(tail.x + 3, tail.y);
  ctx.quadraticCurveTo(tail.x - length * 0.14, tail.y - width * 0.43, tail.x - length * 0.23, tail.y - width * 0.8);
  ctx.quadraticCurveTo(tail.x - length * 0.16, tail.y, tail.x - length * 0.23, tail.y + width * 0.8);
  ctx.quadraticCurveTo(tail.x - length * 0.07, tail.y + width * 0.55, tail.x + 3, tail.y);
  ctx.fill();
  for (const side of [-1, 1]) {
    ellipse(ctx, length * 0.12, side * width * 1.05, length * fin * 0.68, width * 0.33, skin, -side * (0.62 + fin));
  }
  const outline = new Path2D();
  outline.moveTo(head.x, head.y);
  for (const segment of spine) outline.lineTo(segment.x, segment.y - segment.width);
  for (let i = spine.length - 1; i >= 0; i--) {
    const segment = spine[i]!;
    outline.lineTo(segment.x, segment.y + segment.width);
  }
  outline.closePath();
  ctx.fill(outline);
  ctx.clip(outline);
  const patches = tropical ? ['#203e50'] : variety.patches;
  for (let i = 0; i < (tropical ? 2 : seed % 4 === 3 ? 1 : 6); i++) {
    if (!patches.length) break;
    const n = noise(seed * 71 + i * 19);
    const segment = spine[seed % 4 === 3 && !tropical ? 1 : 1 + Math.floor(n * 7)]!;
    const patch = patches[i % patches.length]!;
    const px = segment.x + length * 0.035 * (n - 0.5);
    const py = segment.y + (noise(seed * 8 + i) - 0.5) * width * 0.85;
    ellipse(ctx, px, py, length * (0.045 + n * 0.08), width * 0.53, patch, n);
    if (!tropical && seed % 4 !== 3) ellipse(ctx, px - 2, py + width * 0.23, length * 0.063, width * 0.38, patch, -n);
  }
  ctx.fillStyle = tropical ? '#d6fff29e' : '#fff5db70';
  ctx.fillRect(-length, -width, length * 2, width * 0.31);
  ellipse(ctx, length * 0.37, -width * 0.49, length * 0.024, length * 0.024, '#15272c');
  ellipse(ctx, length * 0.37, width * 0.49, length * 0.024, length * 0.024, '#15272c');
  ctx.restore();
  if (tropical) ellipse(ctx, x, y, 1.2 * scale, 0.8 * scale, accent, heading);
}

function drawBoat(
  ctx: Brush,
  x: number,
  y: number,
  tilt: number,
  speed: number,
  time: number,
  size: number,
  rower: HTMLImageElement,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.save();
  ctx.rotate(0.65);
  const wake = ctx.createLinearGradient(0, 10, 0, 138);
  wake.addColorStop(0, `rgb(238 255 246 / ${0.34 + speed * 0.32})`);
  wake.addColorStop(1, 'transparent');
  ctx.strokeStyle = wake;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(side * (13 + i * 2), 8 + i * 10);
      ctx.quadraticCurveTo(side * (20 + i * 5), 52 + Math.sin(time * 3 + i) * 4, side * (51 + speed * 22 + i * 10), 132);
      ctx.lineWidth = 1.35 - i * 0.23;
      ctx.stroke();
    }
  }
  ctx.restore();
  ellipse(ctx, 5, 8, size * 0.42, size * 0.21, '#082c3750');
  if (rower.complete && rower.naturalWidth) {
    const height = size * rower.naturalHeight / rower.naturalWidth;
    ctx.drawImage(rower, -size * 0.54, size * 0.22 - height, size, height);
    const stroke = time ? (time * 0.66) % 1 : 0.4;
    ring(ctx, -size * 0.4, size * 0.23, 3 + stroke * 16, (1 - stroke) * 0.55);
  } else {
    ellipse(ctx, 0, 0, size * 0.28, size * 0.2, '#e4b675');
    ellipse(ctx, 0, -2, size * 0.23, size * 0.16, '#926447');
  }
  ctx.restore();
}

function mountWater(canvas: HTMLCanvasElement, controls: HTMLButtonElement, hover: HTMLSpanElement) {
  const home = canvas.closest<HTMLElement>('main');
  const ctx = canvas.getContext('2d');
  if (!ctx || !home) return;

  const search = home.querySelector('#ota-search');
  const rower = home.querySelector<HTMLImageElement>('[data-hero-layer="rower"] img') ?? new Image();
  const caustics = document.createElement('canvas');
  const floor = caustics.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listeners = new AbortController();
  const passive = { passive: true, signal: listeners.signal };
  const brand = getComputedStyle(home);
  const accent = brand.getPropertyValue('--color-coral').trim() || '#f26b21';
  const teal = brand.getPropertyValue('--color-teal').trim() || '#2c7a7b';
  const ripples: Ripple[] = [];
  const pellets: Pellet[] = [];
  const fish: Fish[] = Array.from({ length: 12 }, (_, seed) => ({
    x: 0, y: 0, heading: seed % 2 ? Math.PI : 0, speed: 25, seed, phase: seed,
  }));
  const padPositions: Point[] = [];
  const islands: HTMLCanvasElement[] = [];
  let width = 0;
  let height = 0;
  let small = false;
  let dpr = 1;
  let maxScroll = 1;
  let introEnd = 0;
  let active = false;
  let camera = window.scrollY;
  let scrollTarget = camera;
  let wake = 0;
  let previous = 0;
  let time = 0;
  let entrance = 0;
  let frame = 0;
  let floorTick = -1;
  let floorPixels: ImageData | undefined;
  let pointer: (Point & { speed: number; at: number }) | undefined;
  let cursorTarget: Element | undefined;
  let curious: Fish | undefined;
  let boatSteer = 0;
  let press: (Point & { id: number; start: number; scroll: number; fed: boolean }) | undefined;
  let holdTimer: number | undefined;
  let lastTap: (Point & { at: number }) | undefined;
  let disturbance: (Point & { age: number }) | undefined;
  let act = -1;

  function updateWaterVisibility() {
    const visible = scrollTarget + height / 2 >= introEnd;
    if (active === visible) return;
    active = visible;
    home!.toggleAttribute('data-water-visible', visible);
    if (visible) {
      camera = scrollTarget;
      if (!rower.src) rower.src = '/brand/hero-layered-v1/tripi-rowing.webp';
    } else {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      clearPress();
      clearPointer();
      canvas.width = 1;
      canvas.height = 1;
      ripples.length = 0;
      pellets.length = 0;
      lastTap = undefined;
      disturbance = undefined;
      act = -1;
      delete home!.dataset.waterAct;
    }
  }

  function measureScroll() {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    scrollTarget = window.scrollY;
    introEnd = search ? search.getBoundingClientRect().bottom + scrollTarget : 0;
    updateWaterVisibility();
    requestFrame();
  }

  function resize() {
    const oldWidth = width;
    const oldHeight = height;
    width = window.innerWidth;
    height = window.innerHeight;
    small = width < 700;
    const pixelBudget = small ? 230_000 : 650_000;
    dpr = Math.min(window.devicePixelRatio || 1, small ? 1 : 1.25, Math.sqrt(pixelBudget / (width * height)));
    caustics.width = small ? 56 : 96;
    caustics.height = Math.max(28, Math.round(caustics.width * height / width));
    floorPixels = floor?.createImageData(caustics.width, caustics.height);
    floorTick = -1;
    for (const member of fish) {
      member.x = oldWidth ? member.x * width / oldWidth : member.seed % 2 ? width + 20 : -20;
      member.y = oldHeight ? member.y * height / oldHeight : height * (0.13 + noise(member.seed + 13) * 0.74);
    }
    measureScroll();
  }

  function waterPosition(seed: number, rate: number) {
    const span = height + 240;
    const y = noise(seed) * span - (reducedMotion.matches ? 0 : camera * rate);
    return ((y % span) + span) % span - 120;
  }

  function drawFloor(light: number) {
    if (!floor || !floorPixels) return;
    const rate = small ? 6 : 8;
    const tick = reducedMotion.matches ? 0 : Math.floor(time * rate);
    if (floorTick !== tick) {
      floorTick = tick;
      const clock = tick / rate;
      const { width: w, height: h, data } = floorPixels;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const u = x * 0.18;
          const v = y * 0.2;
          const a = Math.sin(u + Math.cos(v * 0.83 + clock * 0.62) * 1.4 + clock * 0.6);
          const b = Math.sin(v - Math.sin(u * 0.85 - clock * 0.41) * 1.6 - clock * 0.41);
          const ridge = Math.max(0, 1 - Math.abs(a + b) * 3);
          const index = (y * w + x) * 4;
          data[index] = 239;
          data[index + 1] = 255;
          data[index + 2] = 221;
          const shimmer = 0.7 + 0.3 * Math.sin(u * 0.62 - v * 0.81 + clock);
          data[index + 3] = ridge ** 2 * (26 + 36 * shimmer);
        }
      }
      floor.putImageData(floorPixels, 0, 0);
    }
    ctx!.globalAlpha = light;
    ctx!.drawImage(caustics, 0, 0, width, height);
    ctx!.globalAlpha = 1;
  }

  function drawAct(index: number, opacity: number, motion: number, topLayer: boolean) {
    if (opacity < 0.005) return;
    const brush = ctx!;
    const span = Math.min(width, height);
    brush.globalAlpha = opacity;
    if (index === 0 && !topLayer) {
      glow(brush, width * 0.59, height * 0.15, width * 0.63, '#f6f9ce68');
      for (let i = 0; i < (small ? 5 : 8); i++) {
        const edge = (i % 2 ? 1 : 0);
        const x = edge * width + (edge ? -1 : 1) * noise(i + 20) * width * 0.19;
        const y = waterPosition(i + 12, 0.64) + Math.sin(i + motion * 0.13) * 4;
        const size = span * (0.062 + noise(i + 40) * 0.12);
        if (y < -size || y > height + size) continue;
        const sprite = islands[i] ?? (islands[i] = makeIsland(i));
        const w = sprite.width * size / 56;
        const h = sprite.height * size / 56;
        brush.drawImage(sprite, x - w / 2, y - h / 2, w, h);
      }
      for (let i = 0; i < 3; i++) {
        const x = ((width * (0.32 + i * 0.17) + motion * 12) % (width + 70)) - 35;
        wings(brush, x, waterPosition(i + 50, 0.38), 9 + i * 3, Math.sin(motion * 3 + i) * 3);
      }
    }
    if (index === 1 && !topLayer) {
      for (const side of [0, 1]) {
        brush.save();
        brush.translate(side * width, 0);
        brush.scale(side ? -1 : 1, 1);
        brush.beginPath();
        brush.moveTo(0, 0);
        for (let y = 0; y <= height + 20; y += 20) {
          const depth = reducedMotion.matches ? y : y + camera * 0.77;
          const shore = span * (0.036 + Math.sin(depth * 0.009 + side) * 0.029 + Math.sin(depth * 0.023) * 0.012);
          brush.lineTo(shore, y);
        }
        brush.lineTo(0, height);
        brush.closePath();
        brush.strokeStyle = '#9abdaa53';
        brush.lineWidth = 4;
        brush.stroke();
        brush.fillStyle = '#31594b';
        brush.fill();
        brush.restore();
      }
      for (let i = 0; i < 24; i++) {
        const x = i % 2 ? width - noise(i + 14) * span * 0.05 : noise(i + 14) * span * 0.05;
        const y = waterPosition(i + 27, 0.77);
        const size = 6 + noise(i + 23) * span * 0.024;
        for (let j = 0; j < 3; j++) {
          const px = x + (noise(i * 8 + j) - 0.5) * size * 1.7;
          const py = y + noise(j + i) * size * 1.5;
          pine(brush, px, py, size * (0.6 + noise(i + j + 444) * 0.4), i * 4 + j);
        }
      }
      for (let i = 0; i < 4; i++) {
        brush.save();
        brush.translate(width * noise(i + 8) + Math.sin(motion * 0.13 + i) * width * 0.15, waterPosition(i + 220, 0.2));
        brush.scale(1, 0.19);
        glow(brush, 0, 0, width * 0.68, '#e6f0ee59');
        brush.restore();
      }
    }
    if (index === 1 && topLayer) {
      for (let i = 0; i < 16; i++) {
        const drift = (motion * (0.09 + noise(i + 91) * 0.1) + noise(i + 89)) % 1;
        const x = width * noise(i + 78) + Math.sin(motion * 0.6 + i) * 14;
        const y = waterPosition(i + 45, 0.66) + drift * 50;
        if (drift > 0.78) ring(brush, x, y, 2 + (drift - 0.78) * 37, (1 - drift) * 1.3);
        ellipse(brush, x, y, 3.6, 1.6, '#f7c6d0', motion * 0.75 + i);
      }
    }
    if (index === 2 && !topLayer) {
      glow(brush, width * 0.15, height * 0.5, width * 0.57, '#ffe3a356');
      for (let i = 0; i < (small ? 5 : 9); i++) {
        padPositions.push({
          x: width * (i % 2 ? 0.83 : 0.16) + Math.sin(motion * 0.5 + i) * 7,
          y: waterPosition(i + 66, 0.75) + Math.cos(motion * 0.45 + i) * 4,
        });
      }
    }
    if (index === 2 && topLayer) {
      for (const [i, pad] of padPositions.entries()) {
        lily(brush, pad.x, pad.y, 10 + noise(i + 80) * 15, i + Math.sin(motion * 0.4 + i) * 0.28, i % 5 === 1);
      }
    }
    if ((index === 2 || index === 4) && topLayer) {
      for (let i = 0; i < (small ? 6 : 11); i++) {
        const x = width * (0.06 + noise(i + 155) * 0.88) + Math.sin(motion * 0.7 + i) * 6;
        const y = waterPosition(i + 148, 0.47) + Math.sin(motion + i) * 3;
        const bob = ripples.reduce((total, wave) => {
          const distance = Math.hypot(wave.x - x, wave.y - y);
          return total + ease(1 - Math.abs(distance - wave.age * wave.size) / 16) * Math.max(0, 1 - wave.age) * 5;
        }, 0);
        lantern(brush, x, y + bob, 4 + noise(i + 67) * 4, Math.sin(motion * 0.7 + i) * 0.2, index === 4);
      }
    }
    if (index === 3 && !topLayer) {
      for (const side of [0, 1]) {
        brush.save();
        brush.translate(width * side, 0);
        brush.scale(side ? -1 : 1, 1);
        const edge = brush.createLinearGradient(0, 0, span * 0.26, 0);
        edge.addColorStop(0, '#f8eac8c7');
        edge.addColorStop(1, '#f8eac800');
        brush.fillStyle = edge;
        brush.fillRect(0, 0, span * 0.26, height);
        for (let wave = 0; wave < 3; wave++) {
          brush.beginPath();
          for (let y = -16; y < height + 17; y += 16) {
            const x = span * (0.048 + wave * 0.026) + Math.sin(y * 0.012 + motion * 0.66 + side) * 12 +
              Math.sin(y * 0.033 - motion * 0.85 + wave) * 3;
            if (y === -16) brush.moveTo(x, y);
            else brush.lineTo(x, y);
          }
          brush.strokeStyle = ['#fff9e7ae', '#fafff67d', '#edffef51'][wave]!;
          brush.lineWidth = 2.6 - wave * 0.6;
          brush.stroke();
        }
        brush.restore();
      }
    }
    if (index === 4 && !topLayer) {
      glow(brush, width * 0.76, height * 0.3, span * 0.44, '#90b9ce2c');
      for (let i = 0; i < 31; i++) {
        const y = waterPosition(i + 199, 0.2);
        const x = width * 0.76 + Math.sin(i * 2.4 + motion * 0.5) * (10 + noise(i + 166) * 34);
        ellipse(brush, x, y, 1.8 + noise(i + 66) * 6, 0.65, '#c0e0df40');
      }
      for (let i = 0; i < 52; i++) {
        const x = width * noise(i + 71) + Math.sin(motion * 0.72 + i) * 8;
        const y = waterPosition(i + 111, 0.38);
        const shine = 0.16 + (1 + Math.sin(motion * 1.1 + i)) * 0.18;
        if (i % 8 === 0) glow(brush, x, y, 13, '#f9dd7460');
        ellipse(brush, x, y, i % 8 === 0 ? 1.8 : 1.1, 0.85, `rgb(239 233 184 / ${shine})`);
      }
    }
    brush.globalAlpha = 1;
  }

  function updateFish(dt: number, koi: number, tropical: number) {
    const members = fish.slice(0, small ? 6 : 12);
    const active = members.filter((member) => Math.max(tropical, member.seed === 11 ? 0 : koi) > 0.02);
    if (!active.length) return;
    const brush = ctx!;
    if (pointer && pointer.speed < 135 && performance.now() - pointer.at < 2800) {
      const position = pointer;
      curious = active.reduce((nearest, member) => (
        Math.hypot(member.x - position.x, member.y - position.y) < Math.hypot(nearest.x - position.x, nearest.y - position.y)
          ? member : nearest
      ));
    } else {
      curious = undefined;
    }
    const varietyBlend = tropical / (tropical + koi);
    for (const member of active) {
      const threshold = 0.28 + noise(member.seed + 493) * 0.44;
      const isTropical = varietyBlend > threshold || member.seed === 11;
      const morph = member.seed === 11 ? 1 : ease(Math.abs(varietyBlend - threshold) / 0.12);
      const presence = member.seed === 11 ? tropical : clamp(koi + tropical) * morph;
      let dx = Math.cos(member.heading + Math.sin(time * 0.47 + member.seed * 4) * 0.65);
      let dy = Math.sin(member.heading + Math.sin(time * 0.47 + member.seed * 4) * 0.65);
      let targetSpeed = (isTropical ? 47 : 30) + Math.max(0, Math.sin(time * 1.35 + member.seed)) ** 8 * 24;
      dx += 2 * (ease(1 - member.x / 95) - ease(1 - (width - member.x) / 95));
      dy += 2 * (ease(1 - member.y / 95) - ease(1 - (height - member.y) / 95));
      for (const other of active) {
        const x = other.x - member.x;
        const y = other.y - member.y;
        const distance = Math.hypot(x, y);
        if (distance < 1 || distance > 170) continue;
        if (distance < (isTropical ? 17 : 37)) {
          dx -= x / distance * 0.8;
          dy -= y / distance * 0.8;
        } else if (isTropical) {
          dx += x / distance * 0.08 + Math.cos(other.heading) * 0.17;
          dy += y / distance * 0.08 + Math.sin(other.heading) * 0.17;
        }
      }
      for (const pad of padPositions) {
        const distance = Math.hypot(member.x - pad.x, member.y - pad.y);
        if (distance < 57 && distance > 1) {
          dx += (member.x - pad.x) / distance * 1.65;
          dy += (member.y - pad.y) / distance * 1.65;
        }
      }
      let meal: Pellet | undefined;
      let closest = Math.min(width * 0.8, 620);
      for (const pellet of pellets) {
        const distance = Math.hypot(member.x - pellet.x, member.y - pellet.y);
        if (distance < closest && pellet.age < 9) {
          meal = pellet;
          closest = distance;
        }
      }
      if (meal) {
        const bearing = Math.atan2(meal.y - member.y, meal.x - member.x) + ease(1 - closest / 70) * 0.77;
        dx += Math.cos(bearing) * 4.4;
        dy += Math.sin(bearing) * 4.4;
        targetSpeed = 89;
        if (closest < 15 && dt > 0) {
          meal.age = 9;
          addRipple(meal, 43);
        }
      } else if (member === curious && pointer) {
        const distance = Math.hypot(pointer.x - member.x, pointer.y - member.y);
        if (distance > 30 && distance < 190) {
          dx += (pointer.x - member.x) / distance * 2.1;
          dy += (pointer.y - member.y) / distance * 2.1;
        }
      }
      if (disturbance) {
        const x = member.x - disturbance.x;
        const y = member.y - disturbance.y;
        const distance = Math.hypot(x, y);
        if (distance < 170 && distance > 1) {
          const fright = ease(1 - distance / 180) * ease(1 - disturbance.age / 1.4);
          dx += x / distance * fright * 9;
          dy += y / distance * fright * 9;
          targetSpeed += fright * 145;
        }
      }
      const target = Math.atan2(dy, dx);
      const turn = Math.atan2(Math.sin(target - member.heading), Math.cos(target - member.heading));
      member.heading += clamp(turn, -3.2 * dt, 3.2 * dt);
      member.speed += (targetSpeed - member.speed) * Math.min(1, dt * 3);
      member.x += Math.cos(member.heading) * member.speed * dt;
      member.y += Math.sin(member.heading) * member.speed * dt;
      member.x = clamp(member.x, -50, width + 50);
      member.y = clamp(member.y, -50, height + 50);
      member.phase += (3 + member.speed * 0.065) * dt;
      brush.globalAlpha = presence * 0.8;
      drawFish(brush, member, isTropical, small ? 0.74 : 1, accent);
    }
    brush.globalAlpha = 1;
  }

  function addRipple(point: Point, size = 116) {
    if (ripples.length >= 18) ripples.shift();
    ripples.push({ x: point.x, y: point.y, age: 0, size });
    requestFrame();
  }

  function splash(point: Point) {
    addRipple(point);
    disturbance = { x: point.x, y: point.y, age: 0 };
    controls.setAttribute('data-ripple-used', '');
  }

  function feed(point: Point) {
    if (pellets.length > 12) pellets.splice(0, 7);
    for (let i = 0; i < 7; i++) {
      const angle = i * TAU / 7;
      const radius = 8 + noise(i + 51) * 28;
      pellets.push({
        x: clamp(point.x + Math.cos(angle) * radius, 5, width - 5),
        y: clamp(point.y + Math.sin(angle) * radius, 5, height - 5),
        age: 0,
      });
    }
    addRipple(point, 72);
    controls.setAttribute('data-food-used', '');
  }

  function draw(now: number) {
    frame = 0;
    if (!active || document.hidden) return;
    if (previous && now - previous < 1000 / (small ? 24 : 30) - 1) {
      requestFrame();
      return;
    }
    const reduced = reducedMotion.matches;
    const dt = previous ? Math.min((now - previous) / 1000, 0.064) : 1 / 60;
    previous = now;
    entrance += dt;
    time += dt * (reduced ? 1 / 3 : 1);
    const motion = reduced ? 0 : time;
    const difference = scrollTarget - camera;
    camera += difference * (reduced ? 1 : 1 - 0.92 ** (dt * 60));
    wake += (clamp(Math.abs(difference) / 180) - wake) * 0.11;
    const progress = clamp(camera / maxScroll);
    const current = BOUNDARIES.filter((boundary) => progress >= boundary).length;
    const transition = BOUNDARIES.findIndex((boundary) => Math.abs(boundary - progress) < 0.075);
    const from = transition < 0 ? current : transition;
    const to = transition < 0 ? current : transition + 1;
    const blend = transition < 0 ? 0 : ease((progress - BOUNDARIES[transition]! + 0.075) / 0.15);
    const weight = (index: number) => index === from ? 1 - blend : index === to ? blend : 0;
    if (act !== current) {
      act = current;
      home!.dataset.waterAct = String(act);
    }

    const brush = ctx!;
    const first = ACTS[from]!;
    const second = ACTS[to]!;
    const pixelWidth = Math.max(1, Math.floor(width * dpr));
    const pixelHeight = Math.max(1, Math.floor(height * dpr));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    brush.setTransform(dpr, 0, 0, dpr, 0, 0);
    const water = brush.createLinearGradient(0, 0, width * 0.8, height * 0.88);
    water.addColorStop(0, mixColor(first.shallow, second.shallow, blend));
    water.addColorStop(1, mixColor(first.deep, second.deep, blend));
    brush.fillStyle = water;
    brush.fillRect(0, 0, width, height);
    if (from === 0) {
      brush.globalAlpha = (1 - blend) * 0.14;
      glow(brush, width * 0.88, height * 0.68, width * 0.48, teal);
      brush.globalAlpha = 1;
    }
    for (let i = 0; i < (small ? 28 : 66); i++) {
      const size = 0.8 + noise(i + 270) * 3.3;
      ellipse(brush, width * noise(i + 290), waterPosition(i + 320, 1), size, size * 0.54, i % 3 ? '#103e431a' : '#fbf1c633', -0.55);
    }
    drawFloor(first.light + (second.light - first.light) * blend);
    padPositions.length = 0;
    drawAct(from, 1 - blend, motion, false);
    if (to !== from) drawAct(to, blend, motion, false);
    updateFish(dt * (reduced ? 1 / 3 : 1), weight(2), weight(3));
    drawAct(from, 1 - blend, motion, true);
    if (to !== from) drawAct(to, blend, motion, true);

    if (from < 4) {
      const x = ((width * 0.24 + motion * 26) % (width + 50)) - 25;
      const y = waterPosition(583, 0.58) + Math.sin(motion * 2.8) * 8;
      wings(brush, x, y, 7, Math.sin(motion * 10) * 3);
      const dart = motion * 0.62;
      const skateX = width * 0.28 + (Math.floor(dart) % 7 + ease((dart % 1) * 3)) * 10;
      const skateY = waterPosition(642, 0.78);
      ellipse(brush, skateX, skateY, 2.7, 0.75, '#214c4a88', -0.28);
      ring(brush, skateX - 3, skateY + 1, 1.7 + dart % 1 * 5, (1 - dart % 1) * 0.45);
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const ripple = ripples[i]!;
      ripple.age += dt;
      if (ripple.age > 1.25) {
        ripples.splice(i, 1);
        continue;
      }
      for (let j = 0; j < (reduced ? 2 : 3); j++) {
        const age = ripple.age - j * 0.12;
        if (age > 0) ring(brush, ripple.x, ripple.y, 2 + age * ripple.size, (1 - ease(age / 1.25)) * 0.67);
      }
    }
    for (let i = pellets.length - 1; i >= 0; i--) {
      const pellet = pellets[i]!;
      pellet.age += dt;
      if (pellet.age >= 9) {
        pellets.splice(i, 1);
        continue;
      }
      brush.globalAlpha = clamp(9 - pellet.age);
      ellipse(brush, pellet.x, pellet.y, 2.1, 1.4, '#724d35');
      ellipse(brush, pellet.x - 0.5, pellet.y - 0.5, 1.5, 0.75, '#f5c47a');
    }
    brush.globalAlpha = 1;
    if (disturbance) disturbance.age += dt;

    boatSteer += ((pointer ? clamp((pointer.x / width - 0.64) * 40, -22, 22) : 0) - boatSteer) * 0.035;
    const boatX = reduced ? width * 0.64 : -40 + (width * 0.64 + 40) * ease(entrance / 2.4) + Math.sin(motion * 0.48) * 14 + boatSteer;
    const boatY = (small ? Math.min(400, height * 0.62) : height * 0.48) + Math.cos(motion * 0.71) * 9;
    drawBoat(brush, boatX, boatY, reduced ? 0 : Math.sin(motion * 1.2) * 0.1 + boatSteer * 0.006, reduced ? 0 : wake, motion, small ? 60 : 78, rower);
    drawPointer(brush, now, current, boatX, boatY);
    if (!reduced || press || ripples.length || pellets.length || weight(2) > 0.02 || weight(3) > 0.02) {
      requestFrame();
    } else {
      previous = 0;
    }
  }

  function drawPointer(brush: Brush, now: number, current: number, boatX: number, boatY: number) {
    if (!pointer) {
      hover.hidden = true;
      return;
    }
    brush.beginPath();
    brush.arc(pointer.x, pointer.y, 8, 0, TAU);
    brush.strokeStyle = '#fff3d7';
    brush.lineWidth = 2.6;
    brush.stroke();
    brush.strokeStyle = accent;
    brush.lineWidth = 1.4;
    brush.stroke();
    if (press) {
      brush.beginPath();
      brush.moveTo(pointer.x, pointer.y);
      brush.arc(pointer.x, pointer.y, 6, -Math.PI / 2, -Math.PI / 2 + TAU * clamp((now - press.start) / HOLD_MS));
      brush.fillStyle = accent;
      brush.fill();
    }
    const nearest = fish.slice(0, small ? 6 : current === 2 ? 11 : 12).find(
      (member) => Math.hypot(member.x - pointer!.x, member.y - pointer!.y) < 27,
    );
    let name = ACTS[current]!.name;
    if (Math.hypot(boatX - pointer.x, boatY - 12 - pointer.y) < 38) name = 'Tripi trên thuyền thúng';
    else if (nearest && current === 2) name = `Cá koi ${VARIETIES[nearest.seed % 4]!.name}, khoảng ${9 + nearest.seed % 5} tuổi`;
    else if (nearest && current === 3) name = 'Cá rạn san hô';
    if (hover.textContent !== name) hover.textContent = name;
    hover.hidden = false;
    const x = pointer.x > width - 235 ? `max(4px, ${pointer.x - 14}px - 100%)` : `${pointer.x + 14}px`;
    const y = pointer.y > height - 42 ? pointer.y - 34 : pointer.y + 16;
    hover.style.transform = `translate(${x}, ${y}px)`;
  }

  function requestFrame() {
    if (active && !frame && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function isWater(target: EventTarget | null) {
    return active && target instanceof Element && !target.closest(WATER_TARGETS) &&
      (home!.contains(target) || target.closest('[data-water-footer]') !== null);
  }

  function clearPress() {
    window.clearTimeout(holdTimer);
    press = undefined;
  }

  function clearPointer() {
    pointer = undefined;
    cursorTarget?.removeAttribute('data-water-cursor');
    cursorTarget = undefined;
    requestFrame();
  }

  function move(event: PointerEvent) {
    const { clientX: x, clientY: y, pointerId, pointerType } = event;
    if (press?.id === pointerId && Math.hypot(x - press.x, y - press.y) > 12) clearPress();
    if (pointerType !== 'mouse') return;
    if (!(event.target instanceof Element) || !isWater(event.target)) {
      clearPointer();
      return;
    }
    const now = performance.now();
    const speed = pointer ? Math.hypot(pointer.x - x, pointer.y - y) * 1000 / Math.max(16, now - pointer.at) : 0;
    pointer = { x, y, speed, at: now };
    if (cursorTarget !== event.target) {
      cursorTarget?.removeAttribute('data-water-cursor');
      cursorTarget = event.target;
      cursorTarget.setAttribute('data-water-cursor', '');
    }
    requestFrame();
  }

  function down(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || !isWater(event.target)) return;
    clearPress();
    const gesture = { x: event.clientX, y: event.clientY, id: event.pointerId, start: performance.now(), scroll: window.scrollY, fed: false };
    press = gesture;
    holdTimer = window.setTimeout(() => {
      if (press !== gesture || Math.abs(window.scrollY - gesture.scroll) > 8) return;
      gesture.fed = true;
      feed(gesture);
    }, HOLD_MS);
    requestFrame();
  }

  function up(event: PointerEvent) {
    if (press?.id !== event.pointerId) return;
    const gesture = press;
    clearPress();
    if (gesture.fed || Math.abs(window.scrollY - gesture.scroll) > 8 ||
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12 || !isWater(event.target)) return;
    const point = { x: event.clientX, y: event.clientY, at: performance.now() };
    const doubleTap = lastTap && point.at - lastTap.at < 330 && Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < 30;
    if (point.at - gesture.start >= HOLD_MS || doubleTap) {
      feed(point);
      lastTap = undefined;
    } else {
      splash(point);
      lastTap = point;
    }
  }

  function keyboard(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.repeat) return;
    const point = { x: width * 0.62, y: height * 0.58 };
    if (event.key === 'Enter') splash(point);
    else feed(point);
  }

  function visibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      previous = 0;
      clearPress();
      clearPointer();
    } else {
      measureScroll();
    }
  }

  window.addEventListener('resize', resize, passive);
  window.addEventListener('scroll', () => {
    scrollTarget = window.scrollY;
    updateWaterVisibility();
    if (press && Math.abs(scrollTarget - press.scroll) > 8) clearPress();
    if (pointer) clearPointer();
    requestFrame();
  }, passive);
  window.addEventListener('pointerdown', down, passive);
  window.addEventListener('pointermove', move, passive);
  window.addEventListener('pointerup', up, passive);
  window.addEventListener('pointercancel', clearPress, passive);
  window.addEventListener('pointerout', (event) => {
    if (!event.relatedTarget) {
      clearPointer();
      clearPress();
    }
  }, passive);
  window.addEventListener('blur', () => {
    clearPointer();
    clearPress();
  }, passive);
  document.addEventListener('visibilitychange', visibility, passive);
  reducedMotion.addEventListener('change', requestFrame, passive);
  rower.addEventListener('load', requestFrame, passive);
  controls.addEventListener('keydown', keyboard, { signal: listeners.signal });
  controls.addEventListener('click', () => splash({ x: width * 0.62, y: height * 0.58 }), passive);
  const observer = new ResizeObserver(measureScroll);
  observer.observe(document.body);
  resize();

  return () => {
    listeners.abort();
    observer.disconnect();
    cancelAnimationFrame(frame);
    clearPress();
    delete home.dataset.waterAct;
    delete home.dataset.waterVisible;
    cursorTarget?.removeAttribute('data-water-cursor');
  };
}

export function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<HTMLButtonElement>(null);
  const hoverRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const controls = controlsRef.current;
    const hover = hoverRef.current;
    if (canvas && controls && hover) return mountWater(canvas, controls, hover);
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className={styles.water} width={1} height={1} aria-hidden="true" />
      <span className={styles.caption} aria-hidden="true">Việt Nam, một ngày dạo chơi.</span>
      <button
        ref={controlsRef}
        type="button"
        className={styles.waterControls}
        aria-label="Tương tác với mặt nước"
        aria-keyshortcuts="Enter Space"
        aria-describedby="water-keys"
      >
        <span className={styles.rippleHint} aria-hidden="true">chạm vào nước</span>
        <span className={styles.foodHint} aria-hidden="true">giữ để thả mồi</span>
        <span id="water-keys" className="sr-only">Enter để tạo gợn sóng. Phím cách để thả mồi.</span>
      </button>
      <span ref={hoverRef} className={styles.waterReadout} aria-hidden="true" hidden />
    </>
  );
}
