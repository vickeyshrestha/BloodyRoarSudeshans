// Fighter Roster, Stats, and Gritty Graphic-Novel Anatomical Vector Renderer

const FIGHTERS = [
  {
    id: 'munna',
    name: 'Munna Thapa',
    beastName: 'Goat',
    portraitSrc: 'assets/Munna.jpg',
    desc: 'Agile mountain striker with heavy ridged horns & devastating kick knockback.',
    stats: { speed: 7, power: 7, range: 6, health: 105, jumpForce: -14.8, scale: 1.0 },
    palette: {
      skin: '#b88563',
      skinShadow: '#7d5238',
      hair: '#141318',
      top: '#6e2329',
      topShadow: '#3f1116',
      pants: '#1f242e',
      accent: '#b89446',
      beastMain: '#5c554c',
      beastDark: '#332e29',
      beastLight: '#8a8073',
      beastHorn: '#29211c',
      eye: '#e0a82e'
    }
  },
  {
    id: 'nirbhaya',
    name: 'Nirbhaya Risal',
    beastName: 'Ant',
    desc: 'Armored chitinous brawler with serrated mandibles & rapid strikes.',
    stats: { speed: 9, power: 6, range: 5, health: 98, jumpForce: -13.6, scale: 0.97 },
    palette: {
      skin: '#b07b5a',
      skinShadow: '#754c33',
      hair: '#11141c',
      top: '#243a5e',
      topShadow: '#142238',
      pants: '#171b24',
      accent: '#4a9e82',
      beastMain: '#59161e',
      beastDark: '#29090e',
      beastLight: '#8f2935',
      beastHorn: '#140c10',
      eye: '#45d68a'
    }
  },
  {
    id: 'dinesh',
    name: 'Dinesh Sapkota',
    beastName: 'Ganesha',
    desc: 'Sculpted elephant-headed warrior with tarnished gold armor & heavy palm strikes.',
    stats: { speed: 6, power: 8, range: 7, health: 115, jumpForce: -13.0, scale: 1.06 },
    palette: {
      skin: '#ab7452',
      skinShadow: '#70462e',
      hair: '#141217',
      top: '#8c4923',
      topShadow: '#522710',
      pants: '#3b1523',
      accent: '#c99e38',
      beastMain: '#6e7278',
      beastDark: '#42454a',
      beastLight: '#979ca3',
      beastHorn: '#dbd0b4',
      eye: '#e8b946'
    }
  },
  {
    id: 'sumit',
    name: 'Sumit J Thapa',
    beastName: 'Mouse',
    desc: 'Lean, feral rodent-humanoid with razor claws & blistering evasion.',
    stats: { speed: 10, power: 5, range: 4, health: 90, jumpForce: -14.2, scale: 0.88 },
    palette: {
      skin: '#bd8d6c',
      skinShadow: '#825a40',
      hair: '#241c18',
      top: '#264b66',
      topShadow: '#142a3b',
      pants: '#1a1f29',
      accent: '#99556e',
      beastMain: '#4d5461',
      beastDark: '#2b3038',
      beastLight: '#768091',
      beastHorn: '#855863',
      eye: '#d63e5c'
    }
  },
  {
    id: 'vickey',
    name: 'Vickey Shrestha',
    beastName: 'Cat',
    desc: 'Predatory panther-build fighter with lethal claws & long combo reach.',
    stats: { speed: 8, power: 7, range: 8, health: 102, jumpForce: -14.0, scale: 1.0 },
    palette: {
      skin: '#b58460',
      skinShadow: '#785136',
      hair: '#16131a',
      top: '#3f264f',
      topShadow: '#23132e',
      pants: '#16171f',
      accent: '#b87630',
      beastMain: '#6e492a',
      beastDark: '#3b2412',
      beastLight: '#9c6c42',
      beastHorn: '#dfd5c3',
      eye: '#8cd943'
    }
  },
  {
    id: 'adheesh',
    name: 'Adheesh Bhandari',
    beastName: 'Elephant',
    desc: 'Towering juggernaut with thick wrinkled hide, ivory tusks & crushing power.',
    stats: { speed: 4, power: 10, range: 9, health: 132, jumpForce: -11.8, scale: 1.16 },
    palette: {
      skin: '#a16b49',
      skinShadow: '#694028',
      hair: '#121217',
      top: '#264530',
      topShadow: '#14261a',
      pants: '#211c19',
      accent: '#a67444',
      beastMain: '#4d545e',
      beastDark: '#2c3138',
      beastLight: '#727b87',
      beastHorn: '#dcd4be',
      eye: '#cf3838'
    }
  }
];

function getFighterById(id) {
  return FIGHTERS.find((f) => f.id === id) || FIGHTERS[0];
}

// Tapered, anatomically shaded limb segment (muscle bulge + rim light + dark ink outline)
function drawShadedLimb(ctx, x1, y1, x2, y2, wStart, wEnd, lightCol, darkCol, outline = '#090a0f') {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const midX = (x1 + x2) * 0.5;
  const midY = (y1 + y2) * 0.5;
  const wMid = (wStart + wEnd) * 0.56;

  ctx.save();
  const grad = ctx.createLinearGradient(
    midX + nx * wMid,
    midY + ny * wMid,
    midX - nx * wMid,
    midY - ny * wMid
  );
  grad.addColorStop(0, lightCol);
  grad.addColorStop(0.55, darkCol);
  grad.addColorStop(1, '#12131a');

  ctx.beginPath();
  ctx.moveTo(x1 + nx * wStart * 0.5, y1 + ny * wStart * 0.5);
  ctx.quadraticCurveTo(midX + nx * wMid * 0.58, midY + ny * wMid * 0.58, x2 + nx * wEnd * 0.5, y2 + ny * wEnd * 0.5);
  ctx.arc(x2, y2, wEnd * 0.5, Math.atan2(ny, nx), Math.atan2(-ny, -nx), false);
  ctx.quadraticCurveTo(midX - nx * wMid * 0.54, midY - ny * wMid * 0.54, x1 - nx * wStart * 0.5, y1 - ny * wStart * 0.5);
  ctx.arc(x1, y1, wStart * 0.5, Math.atan2(-ny, -nx), Math.atan2(ny, nx), false);
  ctx.closePath();

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = outline;
  ctx.stroke();
  ctx.restore();
}

function computePose(state, timer, isBeast) {
  const t = timer * 0.095; // Deliberate, grounded breathing & stride cadence
  const pose = {
    bodyY: 0,
    torsoLean: isBeast ? 0.16 : 0.08,
    headTilt: 0,
    frontArmAngle: -0.45,
    frontForearmAngle: -1.15,
    backArmAngle: 0.35,
    backForearmAngle: -1.05,
    frontLegAngle: 0.32,
    frontShinAngle: 0.15,
    backLegAngle: -0.34,
    backShinAngle: 0.22
  };

  switch (state) {
    case 'idle':
      pose.bodyY = Math.sin(t) * 1.8;
      pose.frontArmAngle = -0.42 + Math.sin(t) * 0.05;
      pose.backArmAngle = 0.34 - Math.sin(t) * 0.05;
      break;
    case 'walk':
      pose.bodyY = Math.abs(Math.sin(t * 2.0)) * -3.0;
      pose.torsoLean += 0.08;
      pose.frontLegAngle = Math.sin(t * 2.0) * 0.52;
      pose.backLegAngle = -Math.sin(t * 2.0) * 0.52;
      pose.frontArmAngle = -0.4 - Math.sin(t * 2.0) * 0.32;
      pose.backArmAngle = 0.3 + Math.sin(t * 2.0) * 0.32;
      break;
    case 'crouch':
      pose.bodyY = 26;
      pose.torsoLean = 0.34;
      pose.frontLegAngle = 0.92;
      pose.frontShinAngle = -1.05;
      pose.backLegAngle = -0.52;
      pose.backShinAngle = 0.78;
      pose.frontArmAngle = -0.6;
      break;
    case 'jump':
      pose.bodyY = -4;
      pose.torsoLean = 0.14;
      pose.frontLegAngle = 0.82;
      pose.frontShinAngle = -0.95;
      pose.backLegAngle = -0.38;
      pose.backShinAngle = 0.72;
      pose.frontArmAngle = -0.9;
      pose.backArmAngle = 0.65;
      break;
    case 'block':
      pose.bodyY = 7;
      pose.torsoLean = -0.06;
      pose.frontArmAngle = -1.3;
      pose.frontForearmAngle = -1.35;
      pose.backArmAngle = -1.0;
      pose.backForearmAngle = -1.2;
      pose.frontLegAngle = 0.38;
      pose.backLegAngle = -0.46;
      break;
    case 'punch':
      pose.torsoLean = 0.28;
      pose.frontArmAngle = 0.0;
      pose.frontForearmAngle = 0.05;
      pose.backArmAngle = 0.62;
      pose.frontLegAngle = 0.38;
      pose.backLegAngle = -0.44;
      break;
    case 'kick':
      pose.torsoLean = -0.3;
      pose.bodyY = -3;
      pose.frontLegAngle = -1.38;
      pose.frontShinAngle = 0.05;
      pose.backLegAngle = 0.25;
      pose.frontArmAngle = 0.5;
      pose.backArmAngle = -0.75;
      break;
    case 'hitstun':
      pose.torsoLean = -0.34;
      pose.headTilt = -0.25;
      pose.frontArmAngle = 0.55;
      pose.backArmAngle = 0.85;
      pose.frontLegAngle = 0.2;
      pose.backLegAngle = -0.22;
      break;
    case 'transform':
      pose.bodyY = -5 + Math.sin(t * 3.5) * 2;
      pose.torsoLean = -0.18;
      pose.headTilt = -0.22;
      pose.frontArmAngle = -1.1;
      pose.frontForearmAngle = -0.35;
      pose.backArmAngle = 1.05;
      pose.backForearmAngle = 0.35;
      break;
    case 'ko':
      pose.bodyY = 52;
      pose.torsoLean = -1.48;
      pose.headTilt = -0.25;
      pose.frontArmAngle = 0.4;
      pose.backArmAngle = -0.5;
      pose.frontLegAngle = 0.2;
      pose.backLegAngle = -0.15;
      break;
    case 'victory':
      pose.bodyY = Math.sin(t * 1.4) * 2 - 2;
      pose.frontArmAngle = -2.1;
      pose.frontForearmAngle = -0.25;
      pose.backArmAngle = 0.52;
      break;
  }
  return pose;
}

function drawFighter(ctx, f, globalTime) {
  const data = f.data;
  const pal = data.palette;
  const isBeast = f.isBeast;
  const scale = data.stats.scale * (isBeast ? 1.08 : 1.0);
  const pose = computePose(f.state, globalTime + f.animOffset, isBeast);

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing * scale, scale);

  const isFlashing = f.hitFlash > 0;

  // Ground cast shadow
  ctx.save();
  ctx.scale(1 / scale, 1 / scale);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.beginPath();
  const shadowWidth = f.state === 'ko' ? 64 : 36 * scale;
  ctx.ellipse(0, 2, shadowWidth, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ganesha subtle warm spiritual aura in Beast form
  if (isBeast && data.id === 'dinesh') {
    ctx.save();
    const auraR = 62 + Math.sin(globalTime * 0.1) * 4;
    const grad = ctx.createRadialGradient(0, -76, 10, 0, -76, auraR);
    grad.addColorStop(0, 'rgba(201, 158, 56, 0.32)');
    grad.addColorStop(0.6, 'rgba(166, 94, 30, 0.12)');
    grad.addColorStop(1, 'rgba(166, 94, 30, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -76, auraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Transform energy ring
  if (f.state === 'transform') {
    ctx.save();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, -64, 52 + Math.sin(globalTime * 0.5) * 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Realistic adult proportions: longer legs & defined torso, smaller head
  const hipX = 0;
  const hipY = -56 + pose.bodyY;

  const legUpper = 28;
  const legLower = 28;
  const torsoLen = data.id === 'adheesh' ? 48 : 44;
  const shoulderW = data.id === 'adheesh' ? 23 : data.id === 'sumit' ? 14 : 18;
  const waistW = data.id === 'adheesh' ? 15 : 10;

  const legLight = isFlashing ? '#ffffff' : isBeast ? pal.beastMain : pal.pants;
  const legDark = isFlashing ? '#dddddd' : isBeast ? pal.beastDark : '#0e1017';
  const torsoLight = isFlashing ? '#ffffff' : isBeast ? pal.beastLight : pal.top;
  const torsoDark = isFlashing ? '#dddddd' : isBeast ? pal.beastDark : pal.topShadow;
  const armLight = isFlashing ? '#ffffff' : isBeast ? pal.beastLight : pal.skin;
  const armDark = isFlashing ? '#dddddd' : isBeast ? pal.beastDark : pal.skinShadow;

  // --- Back Leg ---
  const bKneeX = hipX + Math.sin(pose.backLegAngle) * legUpper;
  const bKneeY = hipY + Math.cos(pose.backLegAngle) * legUpper;
  const bFootX = bKneeX + Math.sin(pose.backLegAngle + pose.backShinAngle) * legLower;
  const bFootY = bKneeY + Math.cos(pose.backLegAngle + pose.backShinAngle) * legLower;
  drawShadedLimb(ctx, hipX - 3, hipY, bKneeX, bKneeY, 14, 10, legLight, legDark);
  drawShadedLimb(ctx, bKneeX, bKneeY, bFootX, bFootY, 10, 7, legLight, legDark);

  // --- Beast Tails (Mouse & Cat) ---
  if (isBeast && (data.id === 'sumit' || data.id === 'vickey')) {
    ctx.save();
    const tailWag = Math.sin(globalTime * 0.14) * 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX - 6, hipY);
    ctx.quadraticCurveTo(hipX - 34, hipY - 8 + tailWag, hipX - 54, hipY - 26 + tailWag);
    ctx.lineWidth = data.id === 'vickey' ? 8 : 5;
    ctx.strokeStyle = '#090a0f';
    ctx.stroke();
    ctx.lineWidth = data.id === 'vickey' ? 4.5 : 2.5;
    ctx.strokeStyle = data.id === 'vickey' ? pal.beastMain : pal.beastHorn;
    ctx.stroke();
    ctx.restore();
  }

  // --- Torso Coordinates ---
  const shoulderX = hipX + Math.sin(pose.torsoLean) * torsoLen;
  const shoulderY = hipY - Math.cos(pose.torsoLean) * torsoLen;

  // --- Back Arm ---
  const bElbowX = shoulderX - 5 + Math.sin(pose.backArmAngle) * 21;
  const bElbowY = shoulderY + Math.cos(pose.backArmAngle) * 21;
  const bHandX = bElbowX + Math.sin(pose.backArmAngle + pose.backForearmAngle) * 20;
  const bHandY = bElbowY + Math.cos(pose.backArmAngle + pose.backForearmAngle) * 20;
  drawShadedLimb(ctx, shoulderX - 5, shoulderY + 4, bElbowX, bElbowY, 11, 8.5, armLight, armDark);
  drawShadedLimb(ctx, bElbowX, bElbowY, bHandX, bHandY, 8.5, 6.5, armLight, armDark);

  // --- Sculpted V-Tapered Torso ---
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(pose.torsoLean);
  const torsoGrad = ctx.createLinearGradient(-shoulderW, -torsoLen, shoulderW, 4);
  torsoGrad.addColorStop(0, torsoLight);
  torsoGrad.addColorStop(0.65, torsoDark);
  torsoGrad.addColorStop(1, '#0f1117');

  ctx.fillStyle = torsoGrad;
  ctx.strokeStyle = '#090a0f';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(-waistW, 4);
  ctx.lineTo(-shoulderW, -torsoLen + 4);
  ctx.quadraticCurveTo(0, -torsoLen - 4, shoulderW, -torsoLen + 4);
  ctx.lineTo(waistW, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Anatomical / armor / chitin detail
  if (isBeast && data.id === 'nirbhaya') {
    // Segmented chitinous armor plates
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.quadraticCurveTo(0, -8, 12, -12);
    ctx.moveTo(-15, -24);
    ctx.quadraticCurveTo(0, -20, 15, -24);
    ctx.stroke();
  } else if (isBeast && data.id === 'dinesh') {
    // Ornate tarnished-gold chest sash & shoulder trim
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-shoulderW + 3, -torsoLen + 6);
    ctx.lineTo(waistW - 2, -2);
    ctx.stroke();
  } else if (!isBeast) {
    // Martial arts lapel / collar seam
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6, -torsoLen + 4);
    ctx.lineTo(2, -12);
    ctx.lineTo(7, -torsoLen + 4);
    ctx.stroke();
  }
  ctx.restore();

  // --- Front Leg ---
  const fKneeX = hipX + Math.sin(pose.frontLegAngle) * legUpper;
  const fKneeY = hipY + Math.cos(pose.frontLegAngle) * legUpper;
  const fFootX = fKneeX + Math.sin(pose.frontLegAngle + pose.frontShinAngle) * legLower;
  const fFootY = fKneeY + Math.cos(pose.frontLegAngle + pose.frontShinAngle) * legLower;
  drawShadedLimb(ctx, hipX + 3, hipY, fKneeX, fKneeY, 15, 10.5, legLight, legDark);
  drawShadedLimb(ctx, fKneeX, fKneeY, fFootX, fFootY, 10.5, 7.5, legLight, legDark);

  // Kick slash arc (subtle graphic-novel motion blur)
  if (f.state === 'kick' && f.stateFrame >= 6 && f.stateFrame <= 18) {
    ctx.save();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(hipX + 12, hipY - 14, 48, -0.75, 0.25);
    ctx.stroke();
    ctx.restore();
  }

  // --- Head (Realistic Adult Scale: ~10.5px) ---
  const headX = shoulderX + Math.sin(pose.torsoLean + pose.headTilt) * 14;
  const headY = shoulderY - Math.cos(pose.torsoLean + pose.headTilt) * 14;

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(pose.torsoLean * 0.45 + pose.headTilt);

  if (!isBeast) {
    // Sculpted human jawline & head
    const headGrad = ctx.createLinearGradient(-8, -10, 10, 10);
    headGrad.addColorStop(0, isFlashing ? '#ffffff' : pal.skin);
    headGrad.addColorStop(1, isFlashing ? '#dddddd' : pal.skinShadow);
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2.4;

    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.quadraticCurveTo(0, -13, 9, -8);
    ctx.lineTo(10, 2);
    ctx.lineTo(5, 10);
    ctx.lineTo(-4, 10);
    ctx.lineTo(-9, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Grounded hair silhouette
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    if (data.id === 'munna') {
      ctx.moveTo(-9, -4);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-2, -15);
      ctx.lineTo(7, -13);
      ctx.lineTo(10, -6);
      ctx.closePath();
    } else if (data.id === 'adheesh') {
      ctx.rect(-9, -13, 18, 7);
    } else {
      ctx.arc(0, -4, 9.8, Math.PI * 0.92, Math.PI * 0.08, false);
    }
    ctx.fill();
    ctx.stroke();

    // Sharp brow & focused eye
    ctx.fillStyle = '#090a0f';
    ctx.fillRect(3, -3, 5, 2.2);
    ctx.fillStyle = '#e6e8ee';
    ctx.fillRect(5, -2.5, 2, 1.5);
  } else {
    drawRealisticBeastHead(ctx, data, pal, isFlashing);
  }
  ctx.restore();

  // --- Front Arm ---
  const fShoulderX = shoulderX + 5;
  const fShoulderY = shoulderY + 4;
  const fElbowX = fShoulderX + Math.sin(pose.frontArmAngle + 1.15) * 21;
  const fElbowY = fShoulderY + Math.cos(pose.frontArmAngle + 1.15) * 21;
  const fHandX =
    f.state === 'punch'
      ? fShoulderX + 46
      : fElbowX + Math.sin(pose.frontArmAngle + pose.frontForearmAngle + 1.2) * 20;
  const fHandY =
    f.state === 'punch'
      ? fShoulderY + 1
      : fElbowY + Math.cos(pose.frontArmAngle + pose.frontForearmAngle + 1.2) * 20;

  drawShadedLimb(ctx, fShoulderX, fShoulderY, fElbowX, fElbowY, 12, 9, armLight, armDark);
  drawShadedLimb(ctx, fElbowX, fElbowY, fHandX, fHandY, 9, 7, armLight, armDark);

  // Taped Fist / Beast Claws
  ctx.fillStyle = isBeast ? pal.beastDark : pal.accent;
  ctx.strokeStyle = '#090a0f';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(fHandX, fHandY, isBeast ? 5.5 : 4.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isBeast && (data.id === 'vickey' || data.id === 'nirbhaya' || data.id === 'sumit')) {
    ctx.strokeStyle = '#d8dce6';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(fHandX + 3, fHandY - 2.5);
    ctx.lineTo(fHandX + 12, fHandY - 4);
    ctx.moveTo(fHandX + 4, fHandY);
    ctx.lineTo(fHandX + 13, fHandY);
    ctx.moveTo(fHandX + 3, fHandY + 2.5);
    ctx.lineTo(fHandX + 12, fHandY + 4);
    ctx.stroke();
  }

  // Gritty Block Guard Visual
  if (f.state === 'block') {
    ctx.save();
    ctx.strokeStyle = '#5ea8c9';
    ctx.fillStyle = 'rgba(94, 168, 201, 0.14)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(18, -68, 38, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawRealisticBeastHead(ctx, data, pal, isFlashing) {
  const light = isFlashing ? '#ffffff' : pal.beastLight;
  const dark = isFlashing ? '#dddddd' : pal.beastDark;
  const grad = ctx.createLinearGradient(-10, -12, 12, 12);
  grad.addColorStop(0, light);
  grad.addColorStop(1, dark);

  ctx.strokeStyle = '#090a0f';
  ctx.lineWidth = 2.4;

  if (data.id === 'munna') {
    // Goat: Heavy ridged swept-back horns, angular goat skull & beard
    ctx.fillStyle = pal.beastHorn;
    ctx.beginPath();
    ctx.moveTo(-2, -8);
    ctx.quadraticCurveTo(-18, -26, -26, -12);
    ctx.lineTo(-21, -8);
    ctx.quadraticCurveTo(-14, -18, 0, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-8, -9);
    ctx.lineTo(4, -10);
    ctx.lineTo(14, 1);
    ctx.lineTo(9, 8);
    ctx.lineTo(-6, 9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Rugged beard
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.moveTo(5, 8);
    ctx.lineTo(11, 19);
    ctx.lineTo(0, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'nirbhaya') {
    // Ant: Biomechanical chitinous skull, swept antennae, serrated mandibles
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(2, -9);
    ctx.lineTo(12, -22);
    ctx.lineTo(20, -19);
    ctx.moveTo(-3, -9);
    ctx.lineTo(-9, -23);
    ctx.stroke();

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-9, -6);
    ctx.lineTo(3, -11);
    ctx.lineTo(13, -3);
    ctx.lineTo(10, 7);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Serrated mandibles
    ctx.fillStyle = pal.beastHorn;
    ctx.beginPath();
    ctx.moveTo(9, 3);
    ctx.lineTo(20, 7);
    ctx.lineTo(14, 9);
    ctx.lineTo(8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'dinesh') {
    // Ganesha: Sculpted elephant skull, weathered ear, ivory tusk, tarnished gold crown
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.ellipse(-9, 1, 8, 12, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(2, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Trunk
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.quadraticCurveTo(22, 6, 15, 19);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#090a0f';
    ctx.stroke();
    ctx.lineWidth = 4.2;
    ctx.strokeStyle = pal.beastMain;
    ctx.stroke();

    // Ornate Gold Crown
    ctx.fillStyle = pal.accent;
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-7, -9);
    ctx.lineTo(-4, -20);
    ctx.lineTo(1, -14);
    ctx.lineTo(6, -21);
    ctx.lineTo(10, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'sumit') {
    // Mouse: Lean, feral rodent skull with swept-back ears & pointed snout
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.ellipse(-7, -10, 6, 8, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-8, -7);
    ctx.lineTo(3, -9);
    ctx.lineTo(16, 1);
    ctx.lineTo(8, 8);
    ctx.lineTo(-7, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'vickey') {
    // Cat: Predatory panther/lynx skull, sharp ears & jaw
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(-7, -6);
    ctx.lineTo(-10, -18);
    ctx.lineTo(-1, -10);
    ctx.lineTo(5, -18);
    ctx.lineTo(8, -6);
    ctx.lineTo(13, 2);
    ctx.lineTo(6, 9);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'adheesh') {
    // Elephant: Heavy juggernaut skull, thick wrinkled ear, long trunk & curved ivory tusks
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.ellipse(-10, 1, 10, 14, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(2, 0, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Heavy Trunk
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, 0);
    ctx.quadraticCurveTo(26, 8, 18, 25);
    ctx.lineWidth = 8.5;
    ctx.strokeStyle = '#090a0f';
    ctx.stroke();
    ctx.lineWidth = 5.2;
    ctx.strokeStyle = pal.beastMain;
    ctx.stroke();

    // Curved Ivory Tusk
    ctx.fillStyle = pal.beastHorn;
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(7, 7);
    ctx.quadraticCurveTo(20, 12, 24, 2);
    ctx.quadraticCurveTo(15, 7, 7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Intense narrow beast eye
  ctx.fillStyle = pal.eye;
  ctx.beginPath();
  ctx.moveTo(4, -3);
  ctx.lineTo(10, -5);
  ctx.lineTo(9, -1.5);
  ctx.closePath();
  ctx.fill();
}

const portraitImageCache = {};

function drawPortrait(canvas, fighter, isBeast = false) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!isBeast && fighter.portraitSrc) {
    let img = portraitImageCache[fighter.portraitSrc];
    if (!img) {
      img = new Image();
      img.src = fighter.portraitSrc;
      portraitImageCache[fighter.portraitSrc] = img;
    }

    const renderPhoto = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (iw && ih) {
        const scale = Math.max(canvas.width / iw, canvas.height / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (canvas.width - dw) / 2;
        const dy = Math.min(0, (canvas.height - dh) * 0.2);
        ctx.drawImage(img, dx, dy, dw, dh);

        // Subtle gritty vignette around face portrait
        const vig = ctx.createRadialGradient(
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.28,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width * 0.72
        );
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(7,8,12,0.55)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      renderPhoto();
    } else {
      img.addEventListener('load', renderPhoto);
    }
    return;
  }

  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    8,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.7
  );
  grad.addColorStop(0, fighter.palette.accent + '44');
  grad.addColorStop(1, '#080a0f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const mock = {
    data: fighter,
    x: 0,
    y: 0,
    facing: 1,
    isBeast,
    state: 'idle',
    stateFrame: 0,
    hitFlash: 0,
    animOffset: 0
  };

  // Close-up face & shoulders bust framing for character select & VS screen
  ctx.save();
  const s = (canvas.width / 48) / fighter.stats.scale;
  ctx.translate(canvas.width * 0.48, canvas.height * 2.28);
  ctx.scale(s, s);
  drawFighter(ctx, mock, 12);
  ctx.restore();
}
