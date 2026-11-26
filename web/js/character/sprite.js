// Draws any character from its traits, in a 120 x 125 box like the pet's SVG, feet at (60, 121).
import { LEAF, MOSS } from '../config.js';
import { circ, ell, rad, rgba, rr, shade } from '../util.js';

export const BODY_PATHS = {
  owl: new Path2D('M24 50 L28 22 L44 36 Q60 30 76 36 L92 22 L96 50 Q104 78 90 104 Q76 118 60 118 Q44 118 30 104 Q16 78 24 50 Z'),
  round: new Path2D('M26 54 Q26 30 60 30 Q94 30 94 54 Q104 80 90 104 Q76 118 60 118 Q44 118 30 104 Q16 80 26 54 Z'),
  square: new Path2D('M30 30 H90 Q98 30 98 38 V108 Q98 116 90 116 H30 Q22 116 22 108 V38 Q22 30 30 30 Z'),
  slime: new Path2D('M12 117 Q10 46 60 34 Q110 46 108 117 Q60 122 12 117 Z'),
  ghost: new Path2D('M24 60 Q24 26 60 26 Q96 26 96 60 V114 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 l-9 8 l-9 -8 l-9 8 Z'),
};
export function wingStr(side) {
  const sx = 60 + side * 33, sy = 70, o = side;
  return `M${sx} ${sy} q${o * 14} 8 ${o * 13} 30 l${-o * 3} 9 l${-o * 2} -6 l${-o * 3} 8 l${-o * 2} -7 l${-o * 3} 6 l${-o * 2} -6 q${-o * 2} -20 ${o * 2} -40 z`;
}
export const WING = { '-1': new Path2D(wingStr(-1)), '1': new Path2D(wingStr(1)) };
export const ACORN_P = new Path2D('M42 36 Q60 14 78 36 Z');
export const SCARF_P = new Path2D('M32 80 Q60 90 88 80 L88 87 Q60 97 32 87 Z');
export const SCARF_TAIL = new Path2D('M74 86 l4 18 l7 -2 l-4 -17 z');

export function eyePos(T) {
  if (T.cyclops) return [[60, 62]];
  switch (T.shape === 'square' ? 'square' : T.creature) {
    case 'frog': return [[42, 40], [78, 40]];
    case 'slime': return [[47, 68], [73, 68]];
    case 'ghost': return [[48, 58], [72, 58]];
    default: return [[46, 62], [74, 62]];
  }
}

// P: { t, wing, eyes:'open'|'blink'|'x', mood:'idle'|'cheer'|'worried', run (phase or null), air, glide, look }
export function drawCritter(c, T, P) {
  const t = P.t || 0;
  c.save();
  c.translate(0, 0);
  c.scale(T.size * T.wide, T.size * T.tall);
  c.translate(-60, -121);
  if (T.alpha) c.globalAlpha *= T.alpha;
  const dark = T.darkCol, body = T.base;
  const bodyFill = () => {
    if (!T.rainbow) return body;
    const g = c.createLinearGradient(20, 30, 100, 118);
    ['#e85a5a', '#f2a53c', '#f2d64c', '#6fc46a', '#4fa3e0', '#9a6ad6'].forEach((col, i, a) => g.addColorStop(i / (a.length - 1), col));
    return g;
  };
  const running = P.run != null && !P.air;
  const ph = P.run || 0;

  // glow aura
  if (T.glow) {
    const pulse = 0.85 + 0.15 * Math.sin(t * 4);
    const g = c.createRadialGradient(60, 76, 14, 60, 76, 78 * pulse);
    g.addColorStop(0, rgba(T.glow, 0.5)); g.addColorStop(1, rgba(T.glow, 0));
    c.fillStyle = g; c.fillRect(-30, -20, 180, 180);
  }

  // cape (behind)
  if (T.neck === 'cape') {
    const wave = Math.sin(t * 14) * (running || P.air ? 6 : 2);
    const trail = running || P.air ? 1 : 0.35;
    c.fillStyle = T.neckCol;
    c.beginPath(); c.moveTo(36, 76);
    c.quadraticCurveTo(20 - 14 * trail, 96, 8 - 18 * trail, 112 + wave);
    c.lineTo(18 - 10 * trail, 118 - wave * 0.5); c.lineTo(88, 118); c.lineTo(86, 76); c.closePath(); c.fill();
    c.fillStyle = shade(T.neckCol, -0.25);
    c.beginPath(); c.moveTo(36, 78); c.quadraticCurveTo(24 - 10 * trail, 98, 14 - 14 * trail, 110 + wave); c.lineTo(30, 100); c.closePath(); c.fill();
  }

  // tail (behind, to the left = trailing)
  if (T.tail) {
    const sw = Math.sin(t * (running ? 14 : 3)) * (running ? 8 : 4);
    c.lineCap = 'round';
    if (T.tail === 'cat') {
      c.strokeStyle = dark; c.lineWidth = 7;
      c.beginPath(); c.moveTo(34, 106); c.quadraticCurveTo(6, 104, 10, 78 + sw); c.stroke();
    } else if (T.tail === 'fox') {
      c.save(); c.translate(32, 104); c.rotate(rad(-35 + sw));
      c.fillStyle = body; ell(c, -18, -10, 22, 11, -0.3); c.fill();
      c.fillStyle = '#f7efe2'; ell(c, -34, -16, 8, 6, -0.3); c.fill(); c.restore();
    } else if (T.tail === 'dragon') {
      c.fillStyle = dark; c.beginPath(); c.moveTo(36, 100); c.quadraticCurveTo(10, 114, -2, 96 + sw); c.lineTo(36, 112); c.closePath(); c.fill();
      c.fillStyle = shade(dark, -0.2);
      for (let i = 0; i < 3; i++) { const x = 28 - i * 10, y = 106 - i * 3 + sw * i / 3; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y - 8); c.lineTo(x - 7, y + 1); c.fill(); }
    } else if (T.tail === 'puff') {
      c.fillStyle = '#ffffff'; circ(c, 30, 108, 8); c.fill();
    }
  }

  // feet
  const liftL = running ? Math.max(0, Math.sin(ph)) * 7 : P.air ? 3 : 0;
  const liftR = running ? Math.max(0, Math.sin(ph + Math.PI)) * 7 : P.air ? 3 : 0;
  if (T.feet === 'talon') {
    c.strokeStyle = T.feetCol; c.lineWidth = 3; c.lineCap = 'round';
    const foot = (x, l) => { c.beginPath(); c.moveTo(x, 114 - l); c.lineTo(x - 3, 121 - l); c.moveTo(x, 114 - l); c.lineTo(x + 2, 121 - l); c.stroke(); };
    foot(50, liftL); foot(70, liftR);
  } else if (T.feet === 'paw') {
    c.fillStyle = T.panda ? '#2c2c34' : dark; ell(c, 47, 117 - liftL, 9, 5); c.fill(); ell(c, 73, 117 - liftR, 9, 5); c.fill();
  } else if (T.feet === 'block') {
    c.fillStyle = shade(body, -0.35); rr(c, 38, 112 - liftL, 16, 9, 2); c.fill(); rr(c, 66, 112 - liftR, 16, 9, 2); c.fill();
  }

  // ears behind body
  const inner = '#f2a7b5';
  const earCol = T.panda ? '#2c2c34' : body;
  if (T.ears === 'cat') {
    c.fillStyle = earCol; c.beginPath(); c.moveTo(28, 48); c.lineTo(32, 12); c.lineTo(54, 32); c.moveTo(92, 48); c.lineTo(88, 12); c.lineTo(66, 32); c.fill();
    c.fillStyle = inner; c.beginPath(); c.moveTo(33, 38); c.lineTo(35, 20); c.lineTo(47, 32); c.moveTo(87, 38); c.lineTo(85, 20); c.lineTo(73, 32); c.fill();
  } else if (T.ears === 'fox') {
    c.fillStyle = earCol; c.beginPath(); c.moveTo(24, 52); c.lineTo(26, 4); c.lineTo(56, 32); c.moveTo(96, 52); c.lineTo(94, 4); c.lineTo(64, 32); c.fill();
    c.fillStyle = '#3a2a22'; c.beginPath(); c.moveTo(26, 4); c.lineTo(25, 16); c.lineTo(35, 14); c.moveTo(94, 4); c.lineTo(95, 16); c.lineTo(85, 14); c.fill();
    c.fillStyle = '#f7efe2'; c.beginPath(); c.moveTo(31, 40); c.lineTo(31, 18); c.lineTo(48, 33); c.moveTo(89, 40); c.lineTo(89, 18); c.lineTo(72, 33); c.fill();
  } else if (T.ears === 'bunny') {
    const flop = running ? Math.sin(ph) * 0.1 : 0;
    c.fillStyle = earCol; ell(c, 44, 12, 8, 24, -0.2 + flop); c.fill(); ell(c, 76, 12, 8, 24, 0.2 - flop); c.fill();
    c.fillStyle = inner; ell(c, 44, 14, 4, 17, -0.2 + flop); c.fill(); ell(c, 76, 14, 4, 17, 0.2 - flop); c.fill();
  } else if (T.ears === 'bear') {
    c.fillStyle = earCol; circ(c, 35, 35, 12); c.fill(); circ(c, 85, 35, 12); c.fill();
    c.fillStyle = T.panda ? '#45454f' : shade(body, 0.35); circ(c, 35, 35, 6); c.fill(); circ(c, 85, 35, 6); c.fill();
  } else if (T.ears === 'mouse') {
    c.fillStyle = earCol; circ(c, 30, 34, 17); c.fill(); circ(c, 90, 34, 17); c.fill();
    c.fillStyle = inner; circ(c, 30, 34, 10); c.fill(); circ(c, 90, 34, 10); c.fill();
  } else if (T.ears === 'frog') {
    c.fillStyle = body; circ(c, 42, 40, 16); c.fill(); circ(c, 78, 40, 16); c.fill();
  }

  // wings (behind body, like mossSvg)
  if (T.wings) {
    for (const side of [-1, 1]) {
      const sx = 60 + side * 33, sy = 70;
      c.save(); c.translate(sx, sy); c.rotate(-side * rad(P.wing)); c.translate(-sx, -sy);
      if (T.extraWings) { c.globalAlpha *= 0.92; }
      c.fillStyle = T.wingCol; c.fill(WING[side]);
      c.strokeStyle = T.extraWings ? shade(T.wingCol, -0.15) : body; c.lineWidth = 2; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sx + side * 3, sy + 6); c.quadraticCurveTo(sx + side * 10, sy + 14, sx + side * 9, sy + 30); c.stroke();
      c.restore();
    }
  }

  // body
  const bodyPath = BODY_PATHS[T.shape] || BODY_PATHS.round;
  c.fillStyle = bodyFill(); c.fill(bodyPath);
  if (T.shiny) { c.fillStyle = 'rgba(255,255,255,0.35)'; ell(c, 40, 56, 8, 14, 0.5); c.fill(); }

  // patterns (clipped to body)
  if (T.pattern && T.pattern !== 'speckle') {
    c.save(); c.clip(bodyPath);
    c.fillStyle = c.strokeStyle = dark;
    if (T.pattern === 'spots') {
      [[34, 56, 5], [84, 50, 4], [30, 88, 6], [90, 86, 5], [44, 40, 3.5], [78, 106, 4], [62, 38, 3]].forEach(([x, y, r]) => { circ(c, x, y, r); c.fill(); });
    } else if (T.pattern === 'stripes') {
      c.lineWidth = 4; c.lineCap = 'round';
      for (let y = 42; y < 116; y += 14) { c.beginPath(); c.moveTo(14, y); c.quadraticCurveTo(26, y + 4, 34, y); c.moveTo(106, y); c.quadraticCurveTo(94, y + 4, 86, y); c.stroke(); }
    } else if (T.pattern === 'chevron') {
      c.lineWidth = 2; c.strokeStyle = shade(T.bellyCol || body, -0.35);
      for (let y = 90; y < 114; y += 8) { c.beginPath(); c.moveTo(52, y); c.lineTo(56, y + 3); c.lineTo(60, y); c.moveTo(60, y); c.lineTo(64, y + 3); c.lineTo(68, y); c.stroke(); }
    }
    c.restore();
  }
  // belly
  if (T.panel) {
    c.fillStyle = shade(body, -0.2); rr(c, 42, 86, 36, 22, 4); c.fill();
    ['#ff6b6b', '#ffd54f', '#7ee08a'].forEach((col, i) => { c.fillStyle = (Math.floor(t * 3) + i) % 3 === 0 ? col : shade(col, -0.5); circ(c, 50 + i * 10, 97, 3); c.fill(); });
  } else if (T.bellyCol && T.shape !== 'ghost' && T.shape !== 'slime') {
    c.fillStyle = T.bellyCol; ell(c, 60, 96, 24, 19); c.fill();
    if (T.pattern === 'speckle') {
      c.fillStyle = body;
      [[52, 92], [60, 88], [68, 92], [56, 100], [64, 100], [60, 108]].forEach(([x, y]) => { circ(c, x, y, 1.8); c.fill(); });
    }
    if (T.pattern === 'chevron') {
      c.strokeStyle = shade(T.bellyCol, -0.3); c.lineWidth = 2;
      for (let y = 88; y < 112; y += 8) { c.beginPath(); c.moveTo(51, y); c.lineTo(55.5, y + 3); c.lineTo(60, y); c.lineTo(64.5, y + 3); c.lineTo(69, y); c.stroke(); }
    }
  }
  if (T.panda) { c.fillStyle = '#2c2c34'; ell(c, 44, 64, 10, 13, 0.5); c.fill(); ell(c, 76, 64, 10, 13, -0.5); c.fill(); }

  // mask band goes under the eyes
  if (T.face === 'mask') { const ey = eyePos(T)[0][1]; c.fillStyle = T.faceCol; rr(c, 20, ey - 13, 80, 26, 11); c.fill(); }

  drawEyes(c, T, P);
  drawMouth(c, T, P);

  if (T.ears === 'horns') {
    c.fillStyle = '#efe3c2';
    c.beginPath(); c.moveTo(38, 38); c.quadraticCurveTo(26, 22, 30, 8); c.quadraticCurveTo(38, 22, 50, 32); c.fill();
    c.beginPath(); c.moveTo(82, 38); c.quadraticCurveTo(94, 22, 90, 8); c.quadraticCurveTo(82, 22, 70, 32); c.fill();
  } else if (T.ears === 'antenna') {
    c.strokeStyle = shade(body, -0.35); c.lineWidth = 3; c.beginPath(); c.moveTo(60, 30); c.lineTo(60, 14); c.stroke();
    c.fillStyle = T.iris || '#5fe3f0'; c.globalAlpha *= 0.6 + 0.4 * Math.abs(Math.sin(t * 5)); circ(c, 60, 12, 5); c.fill(); c.globalAlpha = T.alpha || 1;
  }

  // face accessories
  const eyes = eyePos(T);
  if (T.face === 'glasses') {
    c.strokeStyle = T.faceCol; c.lineWidth = 3;
    eyes.forEach(([x, y]) => { circ(c, x, y, 13); c.stroke(); });
    if (eyes.length === 2) { c.beginPath(); c.moveTo(eyes[0][0] + 13, eyes[0][1]); c.lineTo(eyes[1][0] - 13, eyes[1][1]); c.stroke(); }
  } else if (T.face === 'sunglasses') {
    c.fillStyle = T.faceCol;
    eyes.forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 14, y - 7); c.lineTo(x + 14, y - 7); c.quadraticCurveTo(x + 13, y + 11, x, y + 9); c.quadraticCurveTo(x - 13, y + 11, x - 14, y - 7); c.fill(); });
    c.fillRect(eyes[0][0], eyes[0][1] - 7, (eyes[eyes.length - 1][0] - eyes[0][0]) || 1, 3);
    c.fillStyle = 'rgba(255,255,255,0.45)'; eyes.forEach(([x, y]) => { c.fillRect(x - 9, y - 4, 6, 2.5); });
  } else if (T.face === 'eyepatch') {
    const [x, y] = eyes[0];
    c.strokeStyle = '#1d1d24'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(24, 46); c.lineTo(96, 54); c.stroke();
    c.fillStyle = '#1d1d24'; ell(c, x, y, 13, 12); c.fill();
  }

  // neck
  if (T.neck === 'scarf') {
    c.fillStyle = T.neckCol; c.fill(SCARF_P);
    const sd = shade(T.neckCol, -0.2);
    c.save(); c.translate(76, 86);
    c.rotate(rad(running || P.air ? 55 + Math.sin(t * 16) * 12 : Math.sin(t * 2) * 4)); c.translate(-76, -86);
    c.fillStyle = sd; c.fill(SCARF_TAIL); c.restore();
    c.strokeStyle = sd; c.lineWidth = 1.5;
    c.beginPath(); for (const x of [40, 48, 56, 64, 72, 80]) { const y = x < 56 ? 83 + (x - 40) / 8 : x > 64 ? 85 - (x - 72) / 8 : 86; c.moveTo(x, y); c.lineTo(x, y + 5); } c.stroke();
    if (T.name === 'Thornhood') { c.fillStyle = MOSS.acorn; circ(c, 60, 88, 4); c.fill(); }
  } else if (T.neck === 'bowtie') {
    c.fillStyle = T.neckCol;
    c.beginPath(); c.moveTo(60, 84); c.lineTo(47, 77); c.lineTo(47, 91); c.closePath(); c.moveTo(60, 84); c.lineTo(73, 77); c.lineTo(73, 91); c.closePath(); c.fill();
    c.fillStyle = shade(T.neckCol, -0.25); circ(c, 60, 84, 3.5); c.fill();
  } else if (T.neck === 'cape') {
    c.fillStyle = T.name === 'Thornhood' ? MOSS.scarf : shade(T.neckCol, -0.2);
    c.beginPath(); c.moveTo(38, 78); c.quadraticCurveTo(60, 88, 82, 78); c.lineTo(80, 83); c.quadraticCurveTo(60, 93, 40, 83); c.fill();
    c.fillStyle = T.name === 'Thornhood' ? MOSS.acorn : '#f2c14e'; circ(c, 60, 86, 4); c.fill();
  }

  drawHat(c, T, P);

  // leaf parachute for creatures without wings
  if (P.glide && !T.wings) {
    c.strokeStyle = '#5e3b1a'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(84, 70); c.lineTo(66, -8); c.stroke();
    c.save(); c.translate(62, -12); c.rotate(Math.sin(t * 9) * 0.06);
    c.fillStyle = LEAF; c.beginPath(); c.moveTo(-58, 4); c.quadraticCurveTo(0, -30, 58, 4); c.quadraticCurveTo(0, -4, -58, 4); c.fill();
    c.strokeStyle = '#4f8a47'; c.lineWidth = 2; c.beginPath(); c.moveTo(-54, 3); c.quadraticCurveTo(0, -14, 54, 3); c.stroke();
    c.restore();
  }
  c.restore();
}

export function drawEyes(c, T, P) {
  const eyes = eyePos(T);
  const mood = P.mood || 'idle';
  const look = P.look || 0;
  const closed = P.eyes === 'blink' || mood === 'sleep';
  const big = T.cyclops ? 1.4 : 1;
  if (P.eyes === 'x') {
    c.strokeStyle = '#1b1b1b'; c.lineWidth = 3.5; c.lineCap = 'round';
    eyes.forEach(([x, y]) => { c.beginPath(); c.moveTo(x - 6, y - 6); c.lineTo(x + 6, y + 6); c.moveTo(x + 6, y - 6); c.lineTo(x - 6, y + 6); c.stroke(); });
    return;
  }
  const lid = (x, y, col, up) => { c.strokeStyle = col; c.lineWidth = 3.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 8, y + 1); c.quadraticCurveTo(x, y + (up ? -7 : 8), x + 8, y + 1); c.stroke(); };
  const style = T.eyes;
  if (style === 'robot') {
    c.fillStyle = '#1d2630'; rr(c, 30, 49, 60, 24, 9); c.fill();
    c.fillStyle = T.iris || '#5fe3f0';
    eyes.forEach(([x, y]) => { if (closed) c.fillRect(x - 7, y, 14, 2.5); else if (mood === 'cheer') { c.beginPath(); c.moveTo(x - 7, y + 3); c.lineTo(x, y - 5); c.lineTo(x + 7, y + 3); c.lineWidth = 3; c.strokeStyle = c.fillStyle; c.stroke(); } else rr(c, x - 6 + look, y - 6, 12 * big, 11, 3), c.fill(); });
  } else if (style === 'ghost') {
    eyes.forEach(([x, y]) => { if (closed) lid(x, y, '#1d1d28', mood === 'cheer'); else { c.fillStyle = '#1d1d28'; ell(c, x + look, y, 5 * big, 8 * big); c.fill(); c.fillStyle = '#fff'; circ(c, x + look + 1.5, y - 3, 1.6); c.fill(); } });
  } else if (style === 'owl') {
    eyes.forEach(([x, y]) => {
      c.fillStyle = T.ring; circ(c, x, y, 15 * big); c.fill();
      if (closed) { lid(x, y, T.iris, mood === 'cheer'); return; }
      if (T.wink && mood === 'cheer' && x > 60) { lid(x, y, T.iris, true); return; }
      c.fillStyle = T.iris; circ(c, x, y, 11 * big); c.fill();
      const pr = (mood === 'cheer' ? 6.5 : mood === 'worried' ? 3.5 : 6) * big;
      c.fillStyle = '#1b1b1b'; circ(c, x + look, y, pr); c.fill();
      c.fillStyle = '#fff'; circ(c, x + look + pr * 0.35, y - pr * 0.45, pr * 0.36); c.fill();
      if (T.sleepy) { c.fillStyle = T.ring; c.fillRect(x - 15, y - 15, 30, 11); }
    });
  } else {
    eyes.forEach(([x, y]) => {
      if (closed) { lid(x, y, '#1b1b1b', mood === 'cheer'); return; }
      const r = (T.creature === 'frog' ? 10.5 : 9) * big;
      c.fillStyle = '#ffffff'; circ(c, x, y, r); c.fill();
      if (T.iris) { c.fillStyle = T.iris; circ(c, x + look, y, r * 0.62); c.fill(); }
      const pr = (mood === 'cheer' ? 5.5 : mood === 'worried' ? 3 : (T.iris ? 3.6 : 5)) * big;
      c.fillStyle = '#1b1b1b'; circ(c, x + look, y + 0.5, pr); c.fill();
      c.fillStyle = '#fff'; circ(c, x + look + pr * 0.4, y - pr * 0.4, Math.max(1.3, pr * 0.35)); c.fill();
      if (T.sleepy) { c.fillStyle = T.base; c.fillRect(x - r, y - r, r * 2, r * 0.9); }
    });
  }
  if (T.angry || mood === 'worried') {
    c.strokeStyle = T.eyes === 'owl' ? T.darkCol : '#2a2020'; c.lineWidth = 3; c.lineCap = 'round';
    const [a, b] = [eyes[0], eyes[eyes.length - 1]];
    c.beginPath();
    if (T.angry && mood !== 'worried') { c.moveTo(a[0] - 12, a[1] - 17); c.lineTo(a[0] + 3, a[1] - 12); c.moveTo(b[0] + 12, b[1] - 17); c.lineTo(b[0] - 3, b[1] - 12); }
    else { c.moveTo(a[0] - 10, a[1] - 12); c.lineTo(a[0] + 2, a[1] - 17); c.moveTo(b[0] + 10, b[1] - 12); c.lineTo(b[0] - 2, b[1] - 17); }
    c.stroke();
  }
}

export function drawMouth(c, T, P) {
  const cheer = P.mood === 'cheer' || P.eyes === 'x';
  const dk = '#2a1f1f';
  c.lineCap = 'round';
  switch (T.mouth) {
    case 'beak':
      if (cheer) { c.fillStyle = T.beakCol; c.beginPath(); c.moveTo(56, 72); c.lineTo(64, 72); c.lineTo(60, 76); c.fill(); c.fillStyle = shade(T.beakCol, -0.15); c.beginPath(); c.moveTo(57, 76); c.lineTo(63, 76); c.lineTo(60, 81); c.fill(); }
      else { c.fillStyle = T.beakCol; c.beginPath(); c.moveTo(57, 72); c.lineTo(63, 72); c.lineTo(60, 78); c.fill(); }
      break;
    case 'cat':
      c.fillStyle = T.panda ? '#2c2c34' : '#3a2a2a'; c.beginPath(); c.moveTo(56.5, 71); c.lineTo(63.5, 71); c.lineTo(60, 75); c.fill();
      if (cheer) { c.fillStyle = '#7a2e3a'; ell(c, 60, 80, 5, 4); c.fill(); }
      else { c.strokeStyle = dk; c.lineWidth = 2; c.beginPath(); c.moveTo(53, 76); c.quadraticCurveTo(56.5, 80, 60, 76); c.quadraticCurveTo(63.5, 80, 67, 76); c.stroke(); }
      break;
    case 'frog':
      c.strokeStyle = dk; c.lineWidth = 2.5; c.beginPath(); c.moveTo(38, 70); c.quadraticCurveTo(60, cheer ? 90 : 84, 82, 70); c.stroke();
      break;
    case 'dragon':
      c.fillStyle = dk; circ(c, 55, 72, 1.8); c.fill(); circ(c, 65, 72, 1.8); c.fill();
      c.strokeStyle = dk; c.lineWidth = 2.2; c.beginPath(); c.moveTo(48, 78); c.quadraticCurveTo(60, cheer ? 90 : 85, 72, 78); c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.moveTo(66, 80); c.lineTo(69, 80); c.lineTo(67.5, 85); c.fill();
      break;
    case 'grill':
      c.fillStyle = '#1d2630'; rr(c, 48, 78, 24, 9, 3); c.fill();
      c.strokeStyle = shade(T.base, 0.2); c.lineWidth = 1.5; c.beginPath(); for (let x = 53; x < 70; x += 5) { c.moveTo(x, 79); c.lineTo(x, 86); } c.stroke();
      break;
    case 'smile':
      c.strokeStyle = dk; c.lineWidth = 2.5; c.beginPath(); c.moveTo(52, 80); c.quadraticCurveTo(60, cheer ? 92 : 87, 68, 80); c.stroke();
      break;
    case 'o':
      c.fillStyle = '#1d1d28'; ell(c, 60, 76, cheer ? 5 : 3, cheer ? 6 : 4.5); c.fill();
      break;
  }
}

export function drawHat(c, T, P) {
  if (!T.hat) return;
  const t = P.t || 0;
  const hc = T.hatCol, hd = shade(hc, -0.3);
  if (T.hat === 'halo') {
    c.strokeStyle = '#f7d65a'; c.lineWidth = 4; c.shadowColor = '#ffe58a'; c.shadowBlur = 10;
    ell(c, 60, 12 + Math.sin(t * 3) * 2, 20, 5); c.stroke(); c.shadowBlur = 0; return;
  }
  if (T.hat === 'headphones') {
    c.strokeStyle = '#2c2c34'; c.lineWidth = 5; c.beginPath(); c.moveTo(22, 62); c.bezierCurveTo(16, 10, 104, 10, 98, 62); c.stroke();
    c.fillStyle = hc; rr(c, 13, 50, 14, 26, 6); c.fill(); rr(c, 93, 50, 14, 26, 6); c.fill(); return;
  }
  if (T.hat === 'horns') {
    c.fillStyle = hc === T.accent ? '#c0392b' : hc;
    c.beginPath(); c.moveTo(36, 38); c.quadraticCurveTo(28, 20, 34, 6); c.quadraticCurveTo(40, 22, 50, 32); c.fill();
    c.beginPath(); c.moveTo(84, 38); c.quadraticCurveTo(92, 20, 86, 6); c.quadraticCurveTo(80, 22, 70, 32); c.fill(); return;
  }
  if (T.hat === 'hood') {
    // Thornhood's feather hood: part of his plumage, sweeping back to one peak
    c.fillStyle = T.darkCol;
    c.beginPath(); c.moveTo(20, 66); c.quadraticCurveTo(14, 26, 54, 18); c.quadraticCurveTo(80, 12, 104, 4);
    c.quadraticCurveTo(96, 24, 100, 66); c.quadraticCurveTo(96, 40, 60, 38); c.quadraticCurveTo(26, 40, 20, 66); c.fill();
    c.fillStyle = '#6f9a5f';
    for (let i = 0; i < 6; i++) { const x = 30 + i * 12; c.beginPath(); c.moveTo(x - 6, 40 - Math.abs(i - 2.5) * 1.2); c.quadraticCurveTo(x, 50, x + 6, 40 - Math.abs(i - 2.5) * 1.2); c.fill(); }
    return;
  }
  c.save(); c.translate(60, 32); c.rotate(rad(T.hat === 'cap' || T.hat === 'beanie' ? -6 : -12)); c.translate(-60, -32);
  if (T.hat === 'acorn') {
    c.fillStyle = hc; c.fill(ACORN_P);
    c.strokeStyle = MOSS.acornDark; c.lineWidth = 1.5; c.beginPath(); c.moveTo(47, 30); c.lineTo(73, 30); c.moveTo(44, 34); c.lineTo(76, 34); c.stroke();
    c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(60, 22); c.quadraticCurveTo(62, 16, 66, 15); c.stroke();
  } else if (T.hat === 'top') {
    c.fillStyle = hc; c.fillRect(46, 2, 28, 30); ell(c, 60, 32, 22, 4.5); c.fill();
    c.fillStyle = T.plume ? '#f2c14e' : T.accent === hc ? hd : T.accent; c.fillRect(46, 22, 28, 5);
    if (T.plume) { c.fillStyle = '#f2c14e'; c.beginPath(); c.moveTo(72, 22); c.quadraticCurveTo(92, 4, 84, -14); c.quadraticCurveTo(80, 6, 70, 18); c.fill(); }
  } else if (T.hat === 'crown') {
    c.fillStyle = hc; c.beginPath(); c.moveTo(40, 36); c.lineTo(40, 18); c.lineTo(50, 27); c.lineTo(60, 12); c.lineTo(70, 27); c.lineTo(80, 18); c.lineTo(80, 36); c.closePath(); c.fill();
    c.fillStyle = '#e0483b'; circ(c, 60, 29, 3.5); c.fill(); c.fillStyle = '#4a7fd4'; circ(c, 48, 31, 2.5); c.fill(); circ(c, 72, 31, 2.5); c.fill();
  } else if (T.hat === 'wizard') {
    c.fillStyle = hc; c.beginPath(); c.moveTo(36, 37); c.quadraticCurveTo(56, 6, 70, -18); c.quadraticCurveTo(70, 10, 84, 37); c.fill();
    ell(c, 60, 37, 30, 5.5); c.fill();
    c.fillStyle = '#f7d65a'; circ(c, 58, 22, 2.5); c.fill(); circ(c, 67, 8, 2); c.fill(); circ(c, 70, 28, 1.6); c.fill();
  } else if (T.hat === 'cap') {
    c.fillStyle = hc; c.beginPath(); c.moveTo(36, 37); c.quadraticCurveTo(38, 12, 60, 12); c.quadraticCurveTo(82, 12, 84, 37); c.fill();
    ell(c, 88, 36, 16, 4.5); c.fill(); c.fillStyle = hd; circ(c, 60, 13, 3); c.fill();
  } else if (T.hat === 'beanie') {
    c.fillStyle = hc; c.beginPath(); c.moveTo(36, 37); c.quadraticCurveTo(36, 12, 60, 12); c.quadraticCurveTo(84, 12, 84, 37); c.fill();
    c.fillStyle = hd; rr(c, 34, 31, 52, 8, 3); c.fill(); c.fillStyle = '#ffffff'; circ(c, 60, 11, 6); c.fill();
  } else if (T.hat === 'bow') {
    c.translate(18, 2); c.fillStyle = hc;
    c.beginPath(); c.moveTo(60, 30); c.lineTo(46, 20); c.lineTo(46, 40); c.closePath(); c.moveTo(60, 30); c.lineTo(74, 20); c.lineTo(74, 40); c.closePath(); c.fill();
    c.fillStyle = hd; circ(c, 60, 30, 4); c.fill();
  }
  c.restore();
}

// Dark copy for Double Team decoys / afterimages
export function drawGhostCopy(c, T, P, alpha) { c.save(); c.globalAlpha = alpha; drawCritter(c, T, P); c.restore(); }
