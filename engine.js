// Core 60 FPS Game Loop, Physics, Combat State Machine, Beast Gauge, and CPU AI

(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const STAGE = {
    width: 960,
    height: 540,
    groundY: 448,
    leftBound: 56,
    rightBound: 904,
    gravity: 0.72
  };

  // DOM References
  const hudEl = document.getElementById('hud');
  const titleScreen = document.getElementById('title-screen');
  const selectScreen = document.getElementById('select-screen');
  const vsScreen = document.getElementById('vs-screen');
  const victoryScreen = document.getElementById('victory-screen');

  const rosterGrid = document.getElementById('roster-grid');
  const selName = document.getElementById('sel-name');
  const selBeast = document.getElementById('sel-beast');
  const selDesc = document.getElementById('sel-desc');

  const fightBanner = document.getElementById('fight-banner');
  const fightBannerText = document.getElementById('fight-banner-text');
  const fightBannerSub = document.getElementById('fight-banner-sub');

  const btnStart = document.getElementById('btn-start');
  const btnConfirmFighter = document.getElementById('btn-confirm-fighter');
  const btnRematch = document.getElementById('btn-rematch');
  const btnChangeFighter = document.getElementById('btn-change-fighter');
  const btnMute = document.getElementById('btn-mute');

  // Game State
  let gameMode = 'TITLE'; // TITLE | SELECT | VS | FIGHT | ROUND_END | MATCH_END
  let selectedIndex = 0;
  let globalTime = 0;
  let hitstopFrames = 0;
  let shakeFrames = 0;
  let shakeIntensity = 0;
  let roundNumber = 1;
  let roundTimer = 99;
  let timerTicks = 0;
  let bannerTimer = 0;
  let vsTimer = 0;

  let p1 = null;
  let p2 = null;
  let particles = [];
  let floatingTexts = [];
  let shockwaves = [];

  // Input Tracking (Strict Mapping)
  const keysHeld = new Set();
  const keysJustPressed = new Set();

  function normalizeCode(e) {
    if (e.code) return e.code;
    return e.key;
  }

  window.addEventListener('keydown', (e) => {
    const code = normalizeCode(e);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (!keysHeld.has(code)) {
      keysJustPressed.add(code);
    }
    keysHeld.add(code);

    // Menu keyboard shortcuts
    if (gameMode === 'TITLE' && (code === 'Enter' || code === 'Space')) {
      goToSelect();
    } else if (gameMode === 'SELECT') {
      handleSelectKey(code);
    } else if (gameMode === 'VS' && (code === 'Enter' || code === 'Space')) {
      vsTimer = 1;
    }
  });

  window.addEventListener('keyup', (e) => {
    keysHeld.delete(normalizeCode(e));
  });

  // Button Events
  btnStart.addEventListener('click', goToSelect);
  btnConfirmFighter.addEventListener('click', startMatchFromSelect);
  btnRematch.addEventListener('click', () => {
    SoundFX.playMenuConfirm();
    startMatch(p1.data, p2.data);
  });
  btnChangeFighter.addEventListener('click', () => {
    SoundFX.playMenuSelect();
    goToSelect();
  });
  btnMute.addEventListener('click', () => {
    const muted = SoundFX.toggleMute();
    btnMute.textContent = muted ? 'SFX: OFF' : 'SFX: ON';
  });

  // Build Character Select Cards
  function buildRoster() {
    rosterGrid.innerHTML = '';
    FIGHTERS.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'fighter-card' + (idx === selectedIndex ? ' selected' : '');
      card.dataset.index = idx;

      const c = document.createElement('canvas');
      c.className = 'card-portrait';
      c.width = 96;
      c.height = 96;
      drawPortrait(c, f, false);

      const info = document.createElement('div');
      info.className = 'card-info';
      info.innerHTML = `
        <div class="card-name">${f.name}</div>
        <div class="card-beast">Beast: ${f.beastName}</div>
        <div class="stat-row"><span>SPD</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${f.stats.speed * 10}%"></div></div></div>
        <div class="stat-row"><span>PWR</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${f.stats.power * 10}%"></div></div></div>
        <div class="stat-row"><span>RNG</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${f.stats.range * 10}%"></div></div></div>
      `;

      card.appendChild(c);
      card.appendChild(info);

      card.addEventListener('click', () => {
        selectedIndex = idx;
        SoundFX.playMenuSelect();
        updateSelectUI();
      });
      card.addEventListener('dblclick', startMatchFromSelect);

      rosterGrid.appendChild(card);
    });
    updateSelectUI();
  }

  function updateSelectUI() {
    const cards = rosterGrid.querySelectorAll('.fighter-card');
    cards.forEach((card, i) => {
      card.classList.toggle('selected', i === selectedIndex);
    });
    const f = FIGHTERS[selectedIndex];
    selName.textContent = f.name;
    selBeast.textContent = `Beast: ${f.beastName}`;
    selDesc.textContent = f.desc;
  }

  function handleSelectKey(code) {
    let next = selectedIndex;
    if (code === 'ArrowRight') next = (selectedIndex + 1) % FIGHTERS.length;
    else if (code === 'ArrowLeft') next = (selectedIndex - 1 + FIGHTERS.length) % FIGHTERS.length;
    else if (code === 'ArrowDown') next = (selectedIndex + 3) % FIGHTERS.length;
    else if (code === 'ArrowUp') next = (selectedIndex - 3 + FIGHTERS.length) % FIGHTERS.length;
    else if (code === 'Enter' || code === 'Space') {
      startMatchFromSelect();
      return;
    }
    if (next !== selectedIndex) {
      selectedIndex = next;
      SoundFX.playMenuSelect();
      updateSelectUI();
    }
  }

  function showOnlyScreen(screen) {
    [titleScreen, selectScreen, vsScreen, victoryScreen].forEach((el) => el.classList.add('hidden'));
    if (screen) screen.classList.remove('hidden');
  }

  function goToSelect() {
    SoundFX.playMenuConfirm();
    gameMode = 'SELECT';
    hudEl.classList.add('hidden');
    showOnlyScreen(selectScreen);
  }

  function startMatchFromSelect() {
    SoundFX.playMenuConfirm();
    const playerFighter = FIGHTERS[selectedIndex];
    const pool = FIGHTERS.filter((f) => f.id !== playerFighter.id);
    const cpuFighter = pool[Math.floor(Math.random() * pool.length)];
    startMatch(playerFighter, cpuFighter);
  }

  function createFighterState(data, x, facing, isCPU) {
    return {
      data,
      isCPU,
      x,
      y: STAGE.groundY,
      vx: 0,
      vy: 0,
      facing,
      maxHealth: data.stats.health,
      health: data.stats.health,
      trailHealth: data.stats.health,
      beastGauge: 0,
      isBeast: false,
      roundsWon: 0,
      state: 'idle',
      stateFrame: 0,
      hasHitThisAttack: false,
      comboQueued: false,
      comboCount: 0,
      comboDisplayTimer: 0,
      hitstunFrames: 0,
      hitFlash: 0,
      animOffset: isCPU ? 20 : 0,
      aiCooldown: 12,
      aiAction: 'approach'
    };
  }

  function startMatch(f1Data, f2Data) {
    p1 = createFighterState(f1Data, 260, 1, false);
    p2 = createFighterState(f2Data, 700, -1, true);
    roundNumber = 1;

    // Populate VS Screen
    document.getElementById('vs-p1-name').textContent = f1Data.name.toUpperCase();
    document.getElementById('vs-p1-beast').textContent = `BEAST: ${f1Data.beastName.toUpperCase()}`;
    document.getElementById('vs-p2-name').textContent = f2Data.name.toUpperCase();
    document.getElementById('vs-p2-beast').textContent = `BEAST: ${f2Data.beastName.toUpperCase()}`;
    drawPortrait(document.getElementById('vs-p1-canvas'), f1Data, false);
    drawPortrait(document.getElementById('vs-p2-canvas'), f2Data, true);

    gameMode = 'VS';
    vsTimer = 110;
    hudEl.classList.add('hidden');
    showOnlyScreen(vsScreen);
  }

  function startRound() {
    [p1, p2].forEach((f, idx) => {
      f.x = idx === 0 ? 260 : 700;
      f.y = STAGE.groundY;
      f.vx = 0;
      f.vy = 0;
      f.facing = idx === 0 ? 1 : -1;
      f.health = f.maxHealth;
      f.trailHealth = f.maxHealth;
      f.isBeast = false;
      f.state = 'idle';
      f.stateFrame = 0;
      f.hasHitThisAttack = false;
      f.comboQueued = false;
      f.comboCount = 0;
      f.comboDisplayTimer = 0;
      f.hitstunFrames = 0;
      f.hitFlash = 0;
    });

    particles = [];
    floatingTexts = [];
    shockwaves = [];
    roundTimer = 99;
    timerTicks = 0;
    gameMode = 'FIGHT';

    showOnlyScreen(null);
    hudEl.classList.remove('hidden');
    updateHUD();
    showBanner(`ROUND ${roundNumber}`, 'FIGHT!', 70);
    SoundFX.playRoundStart();
  }

  function showBanner(main, sub = '', duration = 75) {
    fightBannerText.textContent = main;
    fightBannerSub.textContent = sub;
    fightBanner.classList.remove('hidden');
    bannerTimer = duration;
  }

  // Attack Frame Data
  function getAttackSpec(fighter, type) {
    const pwr = fighter.data.stats.power;
    const rng = fighter.data.stats.range;
    const beastMult = fighter.isBeast ? 1.32 : 1.0;

    if (type === 'punch') {
      return {
        startup: fighter.data.id === 'nirbhaya' ? 4 : 5,
        active: 5,
        recovery: 7,
        damage: Math.round((5 + pwr * 0.55) * beastMult),
        range: 54 + rng * 3.5,
        height: 46,
        knockback: 4.5,
        hitstun: 13,
        heavy: false
      };
    }
    return {
      startup: 9,
      active: 6,
      recovery: 12,
      damage: Math.round((9 + pwr * 0.95) * beastMult),
      range: 68 + rng * 4.5,
      height: 52,
      knockback: fighter.data.id === 'munna' ? 11.5 : 8.5,
      hitstun: 20,
      heavy: true
    };
  }

  function triggerTransform(fighter, opponent) {
    if (fighter.isBeast || fighter.beastGauge < 50) return;
    fighter.isBeast = true;
    fighter.state = 'transform';
    fighter.stateFrame = 0;
    fighter.vx = 0;
    SoundFX.playTransform();
    shakeFrames = 14;
    shakeIntensity = 7;

    shockwaves.push({
      x: fighter.x,
      y: fighter.y - 54,
      r: 16,
      maxR: 135,
      color: fighter.data.palette.accent,
      alpha: 1
    });

    spawnFloatingText(fighter.x, fighter.y - 115, `${fighter.data.beastName.toUpperCase()}!`, fighter.data.palette.accent);

    // Short-range shockwave hit
    const dist = Math.abs(fighter.x - opponent.x);
    if (dist < 120 && Math.abs(fighter.y - opponent.y) < 90 && opponent.state !== 'ko') {
      const dir = opponent.x >= fighter.x ? 1 : -1;
      opponent.health = Math.max(0, opponent.health - 6);
      opponent.vx = dir * 10;
      opponent.vy = -4;
      opponent.state = 'hitstun';
      opponent.hitstunFrames = 18;
      opponent.hitFlash = 6;
      spawnHitSparks(opponent.x, opponent.y - 55, '#ffc83d', 12);
    }
  }

  function updateFighterInput(f, opponent) {
    if (f.state === 'ko' || f.state === 'victory') return;

    // Hitstun / Transform lock
    if (f.state === 'hitstun') {
      f.hitstunFrames--;
      if (f.hitstunFrames <= 0) f.state = 'idle';
      return;
    }
    if (f.state === 'transform') {
      f.stateFrame++;
      if (f.stateFrame >= 20) f.state = 'idle';
      return;
    }

    // Attacking state machine (with Punch -> Kick combo!)
    if (f.state === 'punch' || f.state === 'kick') {
      const spec = getAttackSpec(f, f.state);
      f.stateFrame++;

      // Check hit on active frames
      if (
        !f.hasHitThisAttack &&
        f.stateFrame >= spec.startup &&
        f.stateFrame < spec.startup + spec.active
      ) {
        checkAttackHit(f, opponent, spec);
      }

      // Queue Kick during Punch if player presses S
      if (!f.isCPU && f.state === 'punch' && keysJustPressed.has('KeyS')) {
        f.comboQueued = true;
      }

      const total = spec.startup + spec.active + spec.recovery;
      if (f.stateFrame >= total) {
        if (f.comboQueued) {
          f.comboQueued = false;
          f.state = 'kick';
          f.stateFrame = 0;
          f.hasHitThisAttack = false;
          SoundFX.playKick();
        } else {
          f.state = 'idle';
          f.stateFrame = 0;
        }
      }
      return;
    }

    // Auto-face opponent when idle/walking/blocking
    f.facing = opponent.x >= f.x ? 1 : -1;

    const grounded = f.y >= STAGE.groundY;
    const moveSpeed = (2.7 + f.data.stats.speed * 0.36) * (f.isBeast ? 1.2 : 1.0);

    let left = false;
    let right = false;
    let up = false;
    let down = false;
    let punch = false;
    let kick = false;
    let block = false;
    let transform = false;

    if (!f.isCPU) {
      left = keysHeld.has('ArrowLeft');
      right = keysHeld.has('ArrowRight');
      up = keysHeld.has('ArrowUp');
      down = keysHeld.has('ArrowDown');
      block = keysHeld.has('KeyZ');
      punch = keysJustPressed.has('KeyA');
      kick = keysJustPressed.has('KeyS');
      transform = keysJustPressed.has('KeyX');
    } else {
      const ai = computeCPUInput(f, opponent);
      left = ai.left;
      right = ai.right;
      up = ai.up;
      down = ai.down;
      block = ai.block;
      punch = ai.punch;
      kick = ai.kick;
      transform = ai.transform;
    }

    if (transform && f.beastGauge >= 50 && !f.isBeast && grounded) {
      triggerTransform(f, opponent);
      return;
    }

    if (block && grounded) {
      f.state = 'block';
      f.vx = 0;
      return;
    }

    if (punch) {
      f.state = 'punch';
      f.stateFrame = 0;
      f.hasHitThisAttack = false;
      f.comboQueued = false;
      if (grounded) f.vx *= 0.25;
      SoundFX.playPunch();
      return;
    }

    if (kick) {
      f.state = 'kick';
      f.stateFrame = 0;
      f.hasHitThisAttack = false;
      if (grounded) f.vx *= 0.25;
      SoundFX.playKick();
      return;
    }

    if (down && grounded) {
      f.state = 'crouch';
      f.vx = 0;
      return;
    }

    if (up && grounded) {
      f.vy = f.data.stats.jumpForce;
      f.state = 'jump';
      SoundFX.playJump();
      spawnDust(f.x, STAGE.groundY);
    }

    if (left && !right) {
      f.vx = -moveSpeed;
      if (grounded) f.state = 'walk';
    } else if (right && !left) {
      f.vx = moveSpeed;
      if (grounded) f.state = 'walk';
    } else {
      f.vx = 0;
      if (grounded) f.state = 'idle';
    }

    if (!grounded) {
      f.state = 'jump';
    }
  }

  function computeCPUInput(cpu, player) {
    const out = {
      left: false,
      right: false,
      up: false,
      down: false,
      block: false,
      punch: false,
      kick: false,
      transform: false
    };

    const dx = player.x - cpu.x;
    const dist = Math.abs(dx);
    const dirToPlayer = dx >= 0 ? 1 : -1;

    // Transform when gauge is ready and in mid/close range
    if (!cpu.isBeast && cpu.beastGauge >= 50 && dist < 240 && Math.random() < 0.04) {
      out.transform = true;
      return out;
    }

    // Reactive block if player is attacking nearby
    if ((player.state === 'punch' || player.state === 'kick') && dist < 115 && Math.random() < 0.45) {
      out.block = true;
      return out;
    }

    if (cpu.aiCooldown > 0) {
      cpu.aiCooldown--;
      if (cpu.aiAction === 'approach' && dist > 72) {
        out.left = dirToPlayer < 0;
        out.right = dirToPlayer > 0;
      } else if (cpu.aiAction === 'retreat' && dist < 160) {
        out.left = dirToPlayer > 0;
        out.right = dirToPlayer < 0;
      }
      return out;
    }

    // Choose next tactical decision
    cpu.aiCooldown = 10 + Math.floor(Math.random() * 14);
    const r = Math.random();

    if (dist < 82) {
      if (r < 0.42) out.punch = true;
      else if (r < 0.72) out.kick = true;
      else if (r < 0.86) out.block = true;
      else cpu.aiAction = 'retreat';
    } else if (dist < 130) {
      if (r < 0.35) out.kick = true;
      else if (r < 0.85) cpu.aiAction = 'approach';
      else out.up = true;
    } else {
      cpu.aiAction = 'approach';
      if (r < 0.12) out.up = true;
    }

    return out;
  }

  function checkAttackHit(attacker, defender, spec) {
    if (defender.state === 'ko') return;

    const hitX = attacker.facing === 1 ? attacker.x + 12 : attacker.x - 12 - spec.range;
    const hitY = attacker.y - (attacker.state === 'kick' ? 76 : 86);
    const hitW = spec.range;
    const hitH = spec.height;

    const defH = defender.state === 'crouch' ? 62 : 98 * defender.data.stats.scale;
    const defW = 46 * defender.data.stats.scale;
    const defX = defender.x - defW / 2;
    const defY = defender.y - defH;

    const overlap =
      hitX < defX + defW &&
      hitX + hitW > defX &&
      hitY < defY + defH &&
      hitY + hitH > defY;

    if (!overlap) return;

    attacker.hasHitThisAttack = true;
    const impactX = (attacker.x + defender.x) / 2;
    const impactY = defender.y - 62;

    if (defender.state === 'block') {
      // 75% damage reduction, no knockback
      const chipDmg = Math.max(1, Math.round(spec.damage * 0.25));
      defender.health = Math.max(0, defender.health - chipDmg);
      defender.beastGauge = Math.min(100, defender.beastGauge + 9);
      attacker.beastGauge = Math.min(100, attacker.beastGauge + 4);
      SoundFX.playBlock();
      spawnHitSparks(impactX, impactY, '#24e5ff', 8);
      spawnFloatingText(defender.x, defender.y - 110, 'BLOCK!', '#24e5ff');
      hitstopFrames = 3;
    } else {
      defender.health = Math.max(0, defender.health - spec.damage);
      defender.state = 'hitstun';
      defender.hitstunFrames = spec.hitstun;
      defender.hitFlash = 6;
      defender.vx = attacker.facing * spec.knockback;
      if (spec.heavy) defender.vy = -3.2;

      attacker.comboCount++;
      attacker.comboDisplayTimer = 70;
      if (!attacker.isBeast) attacker.beastGauge = Math.min(100, attacker.beastGauge + 12);
      if (!defender.isBeast) defender.beastGauge = Math.min(100, defender.beastGauge + 10);

      SoundFX.playHit(spec.heavy);
      spawnHitSparks(impactX, impactY, spec.heavy ? '#ff2e4c' : '#ffd369', spec.heavy ? 15 : 9);
      spawnFloatingText(defender.x, defender.y - 108, `-${spec.damage}`, spec.heavy ? '#ff4d6d' : '#ffffff');

      hitstopFrames = spec.heavy ? 5 : 2;
      if (spec.heavy) {
        shakeFrames = 7;
        shakeIntensity = 4;
      }
    }

    if (defender.health <= 0) {
      handleKO(attacker, defender);
    }
  }

  function handleKO(winner, loser) {
    loser.state = 'ko';
    loser.vx = winner.facing * 7;
    loser.vy = -6;
    winner.state = 'victory';
    winner.roundsWon++;

    SoundFX.playKO();
    hitstopFrames = 10;
    shakeFrames = 18;
    shakeIntensity = 9;

    gameMode = 'ROUND_END';
    showBanner('K.O.!', `${winner.data.name.toUpperCase()} TAKES THE ROUND`, 110);
    updateHUD();
  }

  function handleTimeOver() {
    gameMode = 'ROUND_END';
    let winner = null;
    if (p1.health > p2.health) {
      p1.roundsWon++;
      p1.state = 'victory';
      winner = p1;
    } else if (p2.health > p1.health) {
      p2.roundsWon++;
      p2.state = 'victory';
      winner = p2;
    }
    SoundFX.playKO();
    showBanner('TIME OVER!', winner ? `${winner.data.name.toUpperCase()} WINS ROUND` : 'DRAW ROUND', 110);
    updateHUD();
  }

  function finishRoundTransition() {
    if (p1.roundsWon >= 2 || p2.roundsWon >= 2) {
      gameMode = 'MATCH_END';
      const p1Won = p1.roundsWon >= 2;
      const champ = p1Won ? p1 : p2;
      document.getElementById('victory-title').textContent = p1Won ? 'PLAYER 1 WINS!' : 'CPU WINS!';
      document.getElementById('victory-subtitle').textContent =
        `${champ.data.name} (${champ.data.beastName}) claims victory ${p1.roundsWon} - ${p2.roundsWon}!`;
      fightBanner.classList.add('hidden');
      showOnlyScreen(victoryScreen);
    } else {
      roundNumber++;
      startRound();
    }
  }

  function applyPhysics(f) {
    f.x += f.vx;
    f.y += f.vy;

    if (f.y < STAGE.groundY) {
      f.vy += STAGE.gravity;
    } else {
      if (f.vy > 3) spawnDust(f.x, STAGE.groundY);
      f.y = STAGE.groundY;
      f.vy = 0;
    }

    // Friction in hitstun/ko
    if (f.state === 'hitstun' || f.state === 'ko') {
      f.vx *= 0.86;
    }

    // Clamp to arena
    f.x = Math.max(STAGE.leftBound, Math.min(STAGE.rightBound, f.x));

    // Smooth health trail
    if (f.trailHealth > f.health) {
      f.trailHealth = Math.max(f.health, f.trailHealth - 0.6);
    }

    // Beast Gauge drain
    if (f.isBeast && gameMode === 'FIGHT') {
      f.beastGauge = Math.max(0, f.beastGauge - 0.14);
      if (f.beastGauge <= 0) {
        f.isBeast = false;
        spawnFloatingText(f.x, f.y - 108, 'REVERT', '#a5b4fc');
      }
    }

    if (f.hitFlash > 0) f.hitFlash--;
    if (f.comboDisplayTimer > 0) {
      f.comboDisplayTimer--;
      if (f.comboDisplayTimer <= 0) f.comboCount = 0;
    }
  }

  function resolvePushbox() {
    if (p1.state === 'ko' || p2.state === 'ko') return;
    const minDist = 46;
    const dx = p2.x - p1.x;
    const verticalClose = Math.abs(p1.y - p2.y) < 70;
    if (verticalClose && Math.abs(dx) < minDist) {
      const push = (minDist - Math.abs(dx)) / 2;
      const dir = dx >= 0 ? 1 : -1;
      p1.x = Math.max(STAGE.leftBound, p1.x - dir * push);
      p2.x = Math.min(STAGE.rightBound, p2.x + dir * push);
    }
  }

  // Particles & FX
  function spawnHitSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.5 + Math.random() * 6.5;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 14 + Math.random() * 10,
        maxLife: 24,
        color,
        size: 3 + Math.random() * 4
      });
    }
  }

  function spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y - 3,
        vx: (Math.random() - 0.5) * 2.5,
        vy: -Math.random() * 1.6,
        life: 16,
        maxLife: 16,
        color: '#b8c4e0',
        size: 4 + Math.random() * 3
      });
    }
  }

  function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 36 });
  }

  function updateHUD() {
    if (!p1 || !p2) return;

    document.getElementById('p1-name').textContent = p1.data.name.toUpperCase();
    document.getElementById('p2-name').textContent = p2.data.name.toUpperCase();
    document.getElementById('round-label').textContent = `ROUND ${roundNumber}`;

    const timerBox = document.getElementById('timer-box');
    timerBox.textContent = String(roundTimer).padStart(2, '0');
    timerBox.classList.toggle('urgent', roundTimer <= 15);

    updateFighterHUD('p1', p1);
    updateFighterHUD('p2', p2);
  }

  function updateFighterHUD(prefix, f) {
    const hpPct = Math.max(0, (f.health / f.maxHealth) * 100);
    const trailPct = Math.max(0, (f.trailHealth / f.maxHealth) * 100);

    const fill = document.getElementById(`${prefix}-health-fill`);
    const trail = document.getElementById(`${prefix}-health-trail`);
    fill.style.width = `${hpPct}%`;
    trail.style.width = `${trailPct}%`;
    fill.classList.toggle('low', hpPct < 28);

    const beastFill = document.getElementById(`${prefix}-beast-fill`);
    beastFill.style.width = `${f.beastGauge}%`;
    beastFill.classList.toggle('ready', !f.isBeast && f.beastGauge >= 50);
    beastFill.classList.toggle('active', f.isBeast);

    const badge = document.getElementById(`${prefix}-form-badge`);
    badge.textContent = f.isBeast ? f.data.beastName.toUpperCase() : 'HUMAN';
    badge.className = `form-badge ${f.isBeast ? 'beast' : 'human'}`;

    const readyTag = document.getElementById(`${prefix}-beast-ready`);
    readyTag.classList.toggle('hidden', f.isBeast || f.beastGauge < 50);

    const comboEl = document.getElementById(`${prefix}-combo`);
    if (f.comboCount >= 2 && f.comboDisplayTimer > 0) {
      comboEl.textContent = `${f.comboCount} HIT COMBO!`;
      comboEl.classList.remove('hidden');
    } else {
      comboEl.classList.add('hidden');
    }

    const pips = document.getElementById(`${prefix}-rounds`).children;
    for (let i = 0; i < pips.length; i++) {
      pips[i].classList.toggle('won', i < f.roundsWon);
    }
  }

  // Stage Rendering (Atmospheric Flash-style Dojo / Rooftop Skyline)
  function drawStage() {
    // Twilight sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, STAGE.groundY);
    sky.addColorStop(0, '#0b1024');
    sky.addColorStop(0.55, '#1d1e42');
    sky.addColorStop(1, '#3b1f3b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, STAGE.width, STAGE.groundY);

    // Moon / Spotlight Orb
    ctx.fillStyle = 'rgba(255, 224, 166, 0.16)';
    ctx.beginPath();
    ctx.arc(480, 155, 86, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9b8';
    ctx.beginPath();
    ctx.arc(480, 155, 52, 0, Math.PI * 2);
    ctx.fill();

    // Parallax City Skyline
    const camOffset = p1 && p2 ? ((p1.x + p2.x) / 2 - 480) * 0.08 : 0;
    ctx.fillStyle = '#13162b';
    const buildings = [
      [20, 190, 90], [120, 150, 75], [210, 210, 110], [340, 175, 80],
      [530, 165, 95], [640, 200, 85], [740, 145, 90], [845, 185, 105]
    ];
    buildings.forEach(([bx, by, bw]) => {
      ctx.fillRect(bx - camOffset, by, bw, STAGE.groundY - by);
    });

    // Arena Floor
    const floorGrad = ctx.createLinearGradient(0, STAGE.groundY, 0, STAGE.height);
    floorGrad.addColorStop(0, '#272f4d');
    floorGrad.addColorStop(1, '#101424');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, STAGE.groundY, STAGE.width, STAGE.height - STAGE.groundY);

    // Perspective Floor Grid
    ctx.strokeStyle = 'rgba(112, 144, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, STAGE.groundY);
    ctx.lineTo(STAGE.width, STAGE.groundY);
    for (let i = -5; i <= 5; i++) {
      ctx.moveTo(480 + i * 78 - camOffset * 1.5, STAGE.groundY);
      ctx.lineTo(480 + i * 135 - camOffset * 1.5, STAGE.height);
    }
    ctx.stroke();

    // Glowing arena trim
    ctx.strokeStyle = '#ff2e4c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, STAGE.groundY);
    ctx.lineTo(STAGE.width, STAGE.groundY);
    ctx.stroke();
  }

  function renderEffects() {
    // Shockwaves
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.r += 9;
      s.alpha -= 0.06;
      if (s.alpha <= 0) {
        shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Sparks & Dust
    for (let i = particles.length - 1; i >= 0; i--) {
      const pt = particles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.life--;
      if (pt.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = pt.life / pt.maxLife;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Floating Combat Text
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 1.1;
      ft.life--;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life / 14);
      ctx.font = '900 18px "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000';
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }
  }

  // Main 60 FPS Loop
  function loop() {
    globalTime++;

    if (gameMode === 'VS') {
      vsTimer--;
      if (vsTimer <= 0) startRound();
    }

    if (bannerTimer > 0) {
      bannerTimer--;
      if (bannerTimer <= 0) {
        fightBanner.classList.add('hidden');
        if (gameMode === 'ROUND_END') {
          finishRoundTransition();
        }
      }
    }

    if (gameMode === 'FIGHT' || gameMode === 'ROUND_END') {
      if (hitstopFrames > 0) {
        hitstopFrames--;
      } else {
        if (gameMode === 'FIGHT') {
          timerTicks++;
          if (timerTicks >= 60) {
            timerTicks = 0;
            roundTimer = Math.max(0, roundTimer - 1);
            if (roundTimer === 0) handleTimeOver();
          }
          updateFighterInput(p1, p2);
          updateFighterInput(p2, p1);
        }
        applyPhysics(p1);
        applyPhysics(p2);
        resolvePushbox();
      }
      updateHUD();
    }

    // Render
    ctx.save();
    if (shakeFrames > 0) {
      shakeFrames--;
      const sx = (Math.random() - 0.5) * shakeIntensity * 2;
      const sy = (Math.random() - 0.5) * shakeIntensity * 2;
      ctx.translate(sx, sy);
    }

    drawStage();
    if ((gameMode === 'FIGHT' || gameMode === 'ROUND_END' || gameMode === 'MATCH_END') && p1 && p2) {
      drawFighter(ctx, p1, globalTime);
      drawFighter(ctx, p2, globalTime);
      renderEffects();
    }
    ctx.restore();

    keysJustPressed.clear();
    requestAnimationFrame(loop);
  }

  buildRoster();
  requestAnimationFrame(loop);
})();
