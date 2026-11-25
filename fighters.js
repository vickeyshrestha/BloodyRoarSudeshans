// Fighter Roster, Stats, and Flash-style Vector Drawing Routines

const FIGHTERS = [
  {
    id: 'munna',
    name: 'Munna Thapa',
    beastName: 'Goat',
    desc: 'Agile high jumper with powerful horn & kick knockback.',
    stats: { speed: 7, power: 7, range: 6, health: 105, jumpForce: -14.8, scale: 1.0 },
    palette: {
      skin: '#e0a97d',
      hair: '#1e1b24',
      top: '#d63447',
      pants: '#283149',
      accent: '#ffd369',
      beastMain: '#d9d4c7',
      beastDark: '#8f887b',
      beastHorn: '#3e322b',
      eye: '#ffcf33'
    }
  },
  {
    id: 'nirbhaya',
    name: 'Nirbhaya Risal',
    beastName: 'Ant',
    desc: 'Rapid-fire striker with segmented carapace & high speed.',
    stats: { speed: 9, power: 6, range: 5, health: 98, jumpForce: -13.6, scale: 0.97 },
    palette: {
      skin: '#d99e73',
      hair: '#141923',
      top: '#2b59c3',
      pants: '#1c2230',
      accent: '#38e4ae',
      beastMain: '#9e1c28',
      beastDark: '#520d16',
      beastHorn: '#1c1218',
      eye: '#42ff9e'
    }
  },
  {
    id: 'dinesh',
    name: 'Dinesh Sapkota',
    beastName: 'Ganesha',
    desc: 'Balanced powerhouse with golden aura & heavy palm strikes.',
    stats: { speed: 6, power: 8, range: 7, health: 115, jumpForce: -13.0, scale: 1.06 },
    palette: {
      skin: '#d79667',
      hair: '#1b181f',
      top: '#ff9233',
      pants: '#70163c',
      accent: '#ffd700',
      beastMain: '#e88b5a',
      beastDark: '#b3552d',
      beastHorn: '#fff3d1',
      eye: '#ffe45e'
    }
  },
  {
    id: 'sumit',
    name: 'Sumit J Thapa',
    beastName: 'Mouse',
    desc: 'Smallest hitbox, fastest movement speed, and rapid pokes.',
    stats: { speed: 10, power: 5, range: 4, health: 90, jumpForce: -14.2, scale: 0.86 },
    palette: {
      skin: '#e8b892',
      hair: '#3a2c26',
      top: '#38b6ff',
      pants: '#222b3d',
      accent: '#ff70a6',
      beastMain: '#9ca8b8',
      beastDark: '#5e6878',
      beastHorn: '#ff9eb5',
      eye: '#ff477e'
    }
  },
  {
    id: 'vickey',
    name: 'Vickey Shrestha',
    beastName: 'Cat',
    desc: 'Sleek posture, slashing claws, balanced speed & combo reach.',
    stats: { speed: 8, power: 7, range: 8, health: 102, jumpForce: -14.0, scale: 1.0 },
    palette: {
      skin: '#dfb086',
      hair: '#221c29',
      top: '#7b2cbf',
      pants: '#1a1a28',
      accent: '#ff9e00',
      beastMain: '#f29f3d',
      beastDark: '#b55d19',
      beastHorn: '#fff4e0',
      eye: '#66ff66'
    }
  },
  {
    id: 'adheesh',
    name: 'Adheesh Bhandari',
    beastName: 'Elephant',
    desc: 'Massive frame, highest health, and devastating heavy hits.',
    stats: { speed: 4, power: 10, range: 9, health: 132, jumpForce: -11.8, scale: 1.18 },
    palette: {
      skin: '#cd8c60',
      hair: '#17171f',
      top: '#2e6f40',
      pants: '#2b2420',
      accent: '#f4a261',
      beastMain: '#768291',
      beastDark: '#4a535e',
      beastHorn: '#f7f2df',
      eye: '#ff5252'
    }
  }
];

function getFighterById(id) {
  return FIGHTERS.find((f) => f.id === id) || FIGHTERS[0];
}

// Helper for drawing rounded limbs with thick Flash-style ink outlines
function drawLimb(ctx, x1, y1, x2, y2, width, fillColor, outlineColor = '#0c0e14') {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineWidth = width + 5;
  ctx.strokeStyle = outlineColor;
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = fillColor;
  ctx.stroke();
  ctx.restore();
}

function computePose(state, timer, isBeast) {
  const t = timer * 0.14;
  const pose = {
    bodyY: 0,
    torsoLean: isBeast ? 0.12 : 0.04,
    headTilt: 0,
    frontArmAngle: -0.35,
    frontForearmAngle: -0.9,
    backArmAngle: 0.45,
    backForearmAngle: -0.7,
    frontLegAngle: 0.25,
    frontShinAngle: 0.1,
    backLegAngle: -0.28,
    backShinAngle: 0.18,
    scaleY: 1
  };

  switch (state) {
    case 'idle':
      pose.bodyY = Math.sin(t) * 2.5;
      pose.frontArmAngle = -0.3 + Math.sin(t) * 0.08;
      pose.backArmAngle = 0.35 - Math.sin(t) * 0.08;
      break;
    case 'walk':
      pose.bodyY = Math.abs(Math.sin(t * 2.2)) * -4;
      pose.torsoLean += 0.1;
      pose.frontLegAngle = Math.sin(t * 2.2) * 0.65;
      pose.backLegAngle = -Math.sin(t * 2.2) * 0.65;
      pose.frontArmAngle = -Math.sin(t * 2.2) * 0.5;
      pose.backArmAngle = Math.sin(t * 2.2) * 0.5;
      break;
    case 'crouch':
      pose.bodyY = 24;
      pose.torsoLean = 0.28;
      pose.frontLegAngle = 0.85;
      pose.frontShinAngle = -0.95;
      pose.backLegAngle = -0.5;
      pose.backShinAngle = 0.7;
      pose.frontArmAngle = -0.55;
      break;
    case 'jump':
      pose.bodyY = -4;
      pose.torsoLean = 0.1;
      pose.frontLegAngle = 0.75;
      pose.frontShinAngle = -0.85;
      pose.backLegAngle = -0.35;
      pose.backShinAngle = 0.65;
      pose.frontArmAngle = -0.9;
      pose.backArmAngle = 0.7;
      break;
    case 'block':
      pose.bodyY = 6;
      pose.torsoLean = -0.08;
      pose.frontArmAngle = -1.25;
      pose.frontForearmAngle = -1.25;
      pose.backArmAngle = -0.95;
      pose.backForearmAngle = -1.1;
      pose.frontLegAngle = 0.35;
      pose.backLegAngle = -0.45;
      break;
    case 'punch':
      pose.torsoLean = 0.26;
      pose.frontArmAngle = -0.05;
      pose.frontForearmAngle = 0.0;
      pose.backArmAngle = 0.65;
      pose.frontLegAngle = 0.35;
      pose.backLegAngle = -0.4;
      break;
    case 'kick':
      pose.torsoLean = -0.32;
      pose.bodyY = -4;
      pose.frontLegAngle = -1.35;
      pose.frontShinAngle = 0.05;
      pose.backLegAngle = 0.25;
      pose.frontArmAngle = 0.55;
      pose.backArmAngle = -0.75;
      break;
    case 'hitstun':
      pose.torsoLean = -0.35;
      pose.headTilt = -0.28;
      pose.frontArmAngle = 0.6;
      pose.backArmAngle = 0.9;
      pose.frontLegAngle = 0.2;
      pose.backLegAngle = -0.2;
      break;
    case 'transform':
      pose.bodyY = -6 + Math.sin(t * 4) * 2;
      pose.torsoLean = -0.18;
      pose.headTilt = -0.22;
      pose.frontArmAngle = -1.15;
      pose.frontForearmAngle = -0.4;
      pose.backArmAngle = 1.15;
      pose.backForearmAngle = 0.4;
      break;
    case 'ko':
      pose.bodyY = 48;
      pose.torsoLean = -1.45;
      pose.headTilt = -0.3;
      pose.frontArmAngle = 0.4;
      pose.backArmAngle = -0.5;
      pose.frontLegAngle = 0.2;
      pose.backLegAngle = -0.15;
      break;
    case 'victory':
      pose.bodyY = Math.sin(t * 1.5) * 3 - 3;
      pose.frontArmAngle = -2.25;
      pose.frontForearmAngle = -0.2;
      pose.backArmAngle = 0.55;
      break;
  }
  return pose;
}

function drawFighter(ctx, f, globalTime) {
  const data = f.data;
  const pal = data.palette;
  const isBeast = f.isBeast;
  const scale = data.stats.scale * (isBeast ? 1.07 : 1.0);
  const pose = computePose(f.state, globalTime + f.animOffset, isBeast);

  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.scale(f.facing * scale, scale);

  // Hit flash tint
  const isFlashing = f.hitFlash > 0;

  // Ground shadow
  ctx.save();
  ctx.scale(1 / scale, 1 / scale);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
  ctx.beginPath();
  const shadowWidth = f.state === 'ko' ? 58 : 34 * scale;
  ctx.ellipse(0, 0, shadowWidth, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ganesha spiritual aura in Beast form
  if (isBeast && data.id === 'dinesh') {
    ctx.save();
    const auraR = 54 + Math.sin(globalTime * 0.15) * 5;
    const grad = ctx.createRadialGradient(0, -68, 10, 0, -68, auraR);
    grad.addColorStop(0, 'rgba(255, 215, 0, 0.35)');
    grad.addColorStop(1, 'rgba(255, 140, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, -68, auraR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Transform energy ring
  if (f.state === 'transform') {
    ctx.save();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, -56, 48 + Math.sin(globalTime * 0.6) * 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Root hip position
  const hipX = 0;
  const hipY = -46 + pose.bodyY;

  const legUpper = 23;
  const legLower = 23;
  const torsoLen = data.id === 'adheesh' ? 42 : 38;
  const shoulderW = data.id === 'adheesh' ? 22 : data.id === 'sumit' ? 13 : 16;

  const legColor = isBeast ? pal.beastDark : pal.pants;
  const torsoColor = isBeast ? pal.beastMain : pal.top;
  const armColor = isBeast ? pal.beastMain : pal.skin;

  // --- Back Leg ---
  const bKneeX = hipX + Math.sin(pose.backLegAngle) * legUpper;
  const bKneeY = hipY + Math.cos(pose.backLegAngle) * legUpper;
  const bFootX = bKneeX + Math.sin(pose.backLegAngle + pose.backShinAngle) * legLower;
  const bFootY = bKneeY + Math.cos(pose.backLegAngle + pose.backShinAngle) * legLower;
  drawLimb(ctx, hipX - 3, hipY, bKneeX, bKneeY, 12, legColor);
  drawLimb(ctx, bKneeX, bKneeY, bFootX, bFootY, 10, legColor);

  // --- Beast Tails (behind torso) ---
  if (isBeast && (data.id === 'sumit' || data.id === 'vickey')) {
    ctx.save();
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = data.id === 'vickey' ? 11 : 7;
    ctx.lineCap = 'round';
    const tailWag = Math.sin(globalTime * 0.2) * 10;
    ctx.beginPath();
    ctx.moveTo(hipX - 6, hipY);
    ctx.quadraticCurveTo(hipX - 34, hipY - 12 + tailWag, hipX - 48, hipY - 34 + tailWag);
    ctx.stroke();
    ctx.strokeStyle = data.id === 'vickey' ? pal.beastMain : pal.beastHorn;
    ctx.lineWidth = data.id === 'vickey' ? 6 : 3.5;
    ctx.stroke();
    ctx.restore();
  }

  // --- Torso ---
  const shoulderX = hipX + Math.sin(pose.torsoLean) * torsoLen;
  const shoulderY = hipY - Math.cos(pose.torsoLean) * torsoLen;

  // --- Back Arm ---
  const bElbowX = shoulderX - 4 + Math.sin(pose.backArmAngle) * 18;
  const bElbowY = shoulderY + Math.cos(pose.backArmAngle) * 18;
  const bHandX = bElbowX + Math.sin(pose.backArmAngle + pose.backForearmAngle) * 17;
  const bHandY = bElbowY + Math.cos(pose.backArmAngle + pose.backForearmAngle) * 17;
  drawLimb(ctx, shoulderX - 4, shoulderY + 4, bElbowX, bElbowY, 10, armColor);
  drawLimb(ctx, bElbowX, bElbowY, bHandX, bHandY, 9, armColor);

  // Torso polygon
  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(pose.torsoLean);
  ctx.fillStyle = isFlashing ? '#ffffff' : torsoColor;
  ctx.strokeStyle = '#0c0e14';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-11, 4);
  ctx.lineTo(-shoulderW, -torsoLen);
  ctx.lineTo(shoulderW, -torsoLen);
  ctx.lineTo(11, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Ant segmented carapace / Cat stripes / Accent vest
  if (isBeast && data.id === 'nirbhaya') {
    ctx.strokeStyle = pal.beastDark;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.lineTo(12, -12);
    ctx.moveTo(-14, -24);
    ctx.lineTo(14, -24);
    ctx.stroke();
  } else if (!isBeast) {
    ctx.fillStyle = pal.accent;
    ctx.fillRect(-5, -torsoLen + 4, 10, torsoLen - 10);
  }
  ctx.restore();

  // --- Front Leg ---
  const fKneeX = hipX + Math.sin(pose.frontLegAngle) * legUpper;
  const fKneeY = hipY + Math.cos(pose.frontLegAngle) * legUpper;
  const fFootX = fKneeX + Math.sin(pose.frontLegAngle + pose.frontShinAngle) * legLower;
  const fFootY = fKneeY + Math.cos(pose.frontLegAngle + pose.frontShinAngle) * legLower;
  drawLimb(ctx, hipX + 3, hipY, fKneeX, fKneeY, 13, legColor);
  drawLimb(ctx, fKneeX, fKneeY, fFootX, fFootY, 11, legColor);

  // Kick motion arc
  if (f.state === 'kick' && f.stateFrame >= 4 && f.stateFrame <= 12) {
    ctx.save();
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(hipX + 10, hipY - 12, 42, -0.8, 0.3);
    ctx.stroke();
    ctx.restore();
  }

  // --- Head ---
  const headX = shoulderX + Math.sin(pose.torsoLean + pose.headTilt) * 18;
  const headY = shoulderY - Math.cos(pose.torsoLean + pose.headTilt) * 18;

  ctx.save();
  ctx.translate(headX, headY);
  ctx.rotate(pose.torsoLean * 0.5 + pose.headTilt);

  if (!isBeast) {
    // Human Head
    ctx.fillStyle = isFlashing ? '#ffffff' : pal.skin;
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair silhouette per character
    ctx.fillStyle = pal.hair;
    ctx.beginPath();
    if (data.id === 'munna') {
      // Spiky headband hair
      ctx.arc(0, -3, 14, Math.PI, 0);
      ctx.lineTo(15, -8);
      ctx.lineTo(6, -18);
      ctx.lineTo(-4, -15);
      ctx.lineTo(-14, -10);
    } else if (data.id === 'adheesh') {
      // Short flat-top
      ctx.rect(-13, -17, 26, 10);
    } else {
      ctx.arc(-1, -3, 14.5, Math.PI * 0.9, Math.PI * 0.1, false);
    }
    ctx.fill();
    ctx.stroke();

    // Determined eye
    ctx.fillStyle = '#0c0e14';
    ctx.fillRect(5, -3, 5, 3);
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, -3, 2, 2);
  } else {
    // Beast Heads!
    drawBeastHead(ctx, data, pal, isFlashing);
  }
  ctx.restore();

  // --- Front Arm ---
  const fShoulderX = shoulderX + 4;
  const fShoulderY = shoulderY + 4;
  const fElbowX = fShoulderX + Math.sin(pose.frontArmAngle + 1.1) * 18;
  const fElbowY = fShoulderY + Math.cos(pose.frontArmAngle + 1.1) * 18;
  const fHandX =
    f.state === 'punch'
      ? fShoulderX + 42
      : fElbowX + Math.sin(pose.frontArmAngle + pose.frontForearmAngle + 1.2) * 17;
  const fHandY =
    f.state === 'punch'
      ? fShoulderY + 2
      : fElbowY + Math.cos(pose.frontArmAngle + pose.frontForearmAngle + 1.2) * 17;

  drawLimb(ctx, fShoulderX, fShoulderY, fElbowX, fElbowY, 11, armColor);
  drawLimb(ctx, fElbowX, fElbowY, fHandX, fHandY, 10, armColor);

  // Fist / Beast Claws
  ctx.fillStyle = isBeast ? pal.beastHorn : pal.accent;
  ctx.strokeStyle = '#0c0e14';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(fHandX, fHandY, isBeast ? 7 : 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (isBeast && (data.id === 'vickey' || data.id === 'nirbhaya')) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(fHandX + 4, fHandY - 3);
    ctx.lineTo(fHandX + 12, fHandY - 5);
    ctx.moveTo(fHandX + 5, fHandY);
    ctx.lineTo(fHandX + 13, fHandY);
    ctx.moveTo(fHandX + 4, fHandY + 3);
    ctx.lineTo(fHandX + 12, fHandY + 5);
    ctx.stroke();
  }

  // Block Shield Visual
  if (f.state === 'block') {
    ctx.save();
    ctx.strokeStyle = '#24e5ff';
    ctx.fillStyle = 'rgba(36, 229, 255, 0.18)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(18, -56, 36, -Math.PI * 0.45, Math.PI * 0.45);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

function drawBeastHead(ctx, data, pal, isFlashing) {
  const fill = isFlashing ? '#ffffff' : pal.beastMain;
  ctx.strokeStyle = '#0c0e14';
  ctx.lineWidth = 3;

  if (data.id === 'munna') {
    // Goat: angular snout, curved horns, beard
    ctx.fillStyle = pal.beastHorn;
    ctx.beginPath();
    ctx.moveTo(-4, -10);
    ctx.quadraticCurveTo(-22, -28, -28, -10);
    ctx.lineTo(-22, -8);
    ctx.quadraticCurveTo(-17, -20, -2, -8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(3, 0, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Goatee beard
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(13, 22);
    ctx.lineTo(1, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'nirbhaya') {
    // Ant: insectoid head, antennae, mandibles
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(2, -12);
    ctx.quadraticCurveTo(10, -28, 20, -24);
    ctx.moveTo(-4, -12);
    ctx.quadraticCurveTo(-8, -28, 4, -28);
    ctx.stroke();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(2, 0, 14, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mandibles
    ctx.fillStyle = pal.beastHorn;
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(22, 9);
    ctx.lineTo(10, 11);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'dinesh') {
    // Ganesha: elephant head, trunk, golden crown
    // Ear
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.ellipse(-10, 0, 10, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(2, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Trunk
    ctx.beginPath();
    ctx.moveTo(12, -2);
    ctx.quadraticCurveTo(26, 4, 18, 18);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#0c0e14';
    ctx.stroke();
    ctx.lineWidth = 5;
    ctx.strokeStyle = fill;
    ctx.stroke();

    // Golden Crown
    ctx.fillStyle = '#ffd700';
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(-6, -24);
    ctx.lineTo(0, -17);
    ctx.lineTo(6, -26);
    ctx.lineTo(12, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'sumit') {
    // Mouse: large round ears, pointed snout, whiskers
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(-8, -14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = pal.beastHorn;
    ctx.beginPath();
    ctx.arc(-8, -14, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(2, 1, 14, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.beastHorn;
    ctx.beginPath();
    ctx.arc(16, 2, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (data.id === 'vickey') {
    // Cat: pointed ears, sleek muzzle
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(-10, -8);
    ctx.lineTo(-14, -24);
    ctx.lineTo(-1, -13);
    ctx.moveTo(2, -13);
    ctx.lineTo(8, -24);
    ctx.lineTo(11, -8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(1, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (data.id === 'adheesh') {
    // Elephant: giant ear, long trunk, curved tusks
    ctx.fillStyle = pal.beastDark;
    ctx.beginPath();
    ctx.ellipse(-12, 0, 13, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(2, -1, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Long trunk
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13, 0);
    ctx.quadraticCurveTo(30, 8, 22, 26);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#0c0e14';
    ctx.stroke();
    ctx.lineWidth = 6;
    ctx.strokeStyle = fill;
    ctx.stroke();

    // Ivory Tusk
    ctx.fillStyle = pal.beastHorn;
    ctx.strokeStyle = '#0c0e14';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.quadraticCurveTo(22, 14, 27, 4);
    ctx.quadraticCurveTo(18, 9, 8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Glowing Beast Eye
  ctx.fillStyle = pal.eye;
  ctx.beginPath();
  ctx.ellipse(7, -3, 4, 2.5, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPortrait(canvas, fighter, isBeast = false) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Subtle radial backdrop
  const grad = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    8,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width * 0.65
  );
  grad.addColorStop(0, fighter.palette.accent + '44');
  grad.addColorStop(1, '#0b0f1b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const mock = {
    data: fighter,
    x: canvas.width * 0.5,
    y: canvas.height * 0.94,
    facing: 1,
    isBeast,
    state: isBeast ? 'victory' : 'idle',
    stateFrame: 0,
    hitFlash: 0,
    animOffset: 0
  };

  ctx.save();
  const s = canvas.width / 120;
  ctx.translate(mock.x, mock.y);
  ctx.scale(s, s);
  mock.x = 0;
  mock.y = 0;
  drawFighter(ctx, mock, 12);
  ctx.restore();
}
