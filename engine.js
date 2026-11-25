// Core 60 FPS Game Loop, Weighty Physics, Combat State Machine, Beast Gauge, and Approachable CPU AI

(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const STAGE = {
    width: 960,
    height: 540,
    groundY: 448,
    leftBound: 56,
    rightBound: 904,
    gravity: 0.42 // Reduced gravity paired with ~30% slower jump velocity for grounded weight
  };

  const stageBgImg = new Image();
  stageBgImg.src = 'assets/background1.jpg';

  // DOM References
  const hudEl = document.getElementById('hud');
  const titleScreen = document.getElementById('title-screen');
  const storyScreen = document.getElementById('story-screen');
  const selectScreen = document.getElementById('select-screen');
  const vsScreen = document.getElementById('vs-screen');
  const victoryScreen = document.getElementById('victory-screen');
  const creditsCutscene = document.getElementById('credits-cutscene');

  const rosterGrid = document.getElementById('roster-grid');
  const selName = document.getElementById('sel-name');
  const selBeast = document.getElementById('sel-beast');
  const selDesc = document.getElementById('sel-desc');

  const fightBanner = document.getElementById('fight-banner');
  const fightBannerText = document.getElementById('fight-banner-text');
  const fightBannerSub = document.getElementById('fight-banner-sub');
  const beastActivateBanner = document.getElementById('beast-activate-banner');
  const beastActivateName = document.getElementById('beast-activate-name');

  const btnStart = document.getElementById('btn-start');
  const btnStoryContinue = document.getElementById('btn-story-continue');
  const btnConfirmFighter = document.getElementById('btn-confirm-fighter');
  const btnRematch = document.getElementById('btn-rematch');
  const btnChangeFighter = document.getElementById('btn-change-fighter');
  const btnCreditsRematch = document.getElementById('btn-credits-rematch');
  const btnCreditsChange = document.getElementById('btn-credits-change');
  const btnFullscreen = document.getElementById('btn-fullscreen');
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
  let beastBannerTimer = 0;
  let vsTimer = 0;
  let debugBoxes = false; // Toggle with 'H' key: Blue=Pushbox, Green=Hurtbox, Red=Hitbox

  let p1 = null;
  let p2 = null;
  let particles = [];
  let floatingTexts = [];
  let shockwaves = [];
  let starbursts = [];

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
      if (code === 'KeyH') debugBoxes = !debugBoxes;
    }
    keysHeld.add(code);

    if (gameMode === 'TITLE' && (code === 'Enter' || code === 'Space')) {
      goToStory();
    } else if (gameMode === 'STORY' && (code === 'Enter' || code === 'Space')) {
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
  btnStart.addEventListener('click', goToStory);
  btnStoryContinue.addEventListener('click', goToSelect);
  btnConfirmFighter.addEventListener('click', startMatchFromSelect);
  btnRematch.addEventListener('click', () => {
    SoundFX.playMenuConfirm();
    startMatch(p1.data, p2.data);
  });
  btnChangeFighter.addEventListener('click', () => {
    SoundFX.playMenuSelect();
    goToSelect();
  });
  btnCreditsRematch.addEventListener('click', () => {
    SoundFX.playMenuConfirm();
    startMatch(p1.data, p2.data);
  });
  btnCreditsChange.addEventListener('click', () => {
    SoundFX.playMenuSelect();
    goToSelect();
  });
  btnMute.addEventListener('click', () => {
    const muted = SoundFX.toggleMute();
    btnMute.textContent = muted ? 'SFX: OFF' : 'SFX: ON';
  });

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', () => {
      const target = document.documentElement;
      if (!document.fullscreenElement) {
        if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
        else if (target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    });
  }

  // Mobile Touch Controls Binding
  document.querySelectorAll('.touch-btn[data-key]').forEach((btn) => {
    const code = btn.dataset.key;
    const press = (e) => {
      e.preventDefault();
      if (!keysHeld.has(code)) keysJustPressed.add(code);
      keysHeld.add(code);
      btn.classList.add('pressed');
    };
    const release = (e) => {
      e.preventDefault();
      keysHeld.delete(code);
      btn.classList.remove('pressed');
    };
    btn.addEventListener('pointerdown', press);
    btn.addEventListener('pointerup', release);
    btn.addEventListener('pointercancel', release);
    btn.addEventListener('pointerleave', release);
  });

  // Build Character Select Cards
  function buildRoster() {
    rosterGrid.innerHTML = '';
    FIGHTERS.forEach((f, idx) => {
      const card = document.createElement('div');
      card.className = 'fighter-card' + (idx === selectedIndex ? ' selected' : '');
      card.dataset.index = idx;

      const wrap = document.createElement('div');
      wrap.className = 'card-portrait-wrap';

      const c = document.createElement('canvas');
      c.className = 'card-portrait';
      c.width = 96;
      c.height = 96;
      drawPortrait(c, f, false);

      const beastMini = document.createElement('canvas');
      beastMini.className = 'card-beast-mini';
      beastMini.width = 40;
      beastMini.height = 40;
      beastMini.title = `Beast: ${f.beastName}`;
      drawPortrait(beastMini, f, true);

      // Redraw portraits automatically if PNG sprites finish loading after initial render
      ['human', 'beast'].forEach((form) => {
        const entry = SPRITE_CACHE[`${f.id}_${form}`];
        if (entry && !entry.loaded && !entry.error) {
          entry.img.addEventListener('load', () => {
            drawPortrait(form === 'human' ? c : beastMini, f, form === 'beast');
          });
        }
      });

      wrap.appendChild(c);
      wrap.appendChild(beastMini);

      const info = document.createElement('div');
      info.className = 'card-info';
      info.innerHTML = `
        <div class="card-name">${f.name}</div>
        <div class="card-beast">Beast: ${f.beastName}</div>
        <div class="stat-row"><span>SPD</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${f.stats.speed * 10}%"></div></div></div>
        <div class="stat-row"><span>PWR</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${f.stats.power * 10}%"></div></div></div>
        <div class="stat-row"><span>RNG</span><div class="stat-bar"><div class="stat-bar-fill" style="width:${f.stats.range * 10}%"></div></div></div>
      `;

      card.appendChild(wrap);
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
    [titleScreen, storyScreen, selectScreen, vsScreen, victoryScreen, creditsCutscene].forEach((el) => el.classList.add('hidden'));
    if (screen) screen.classList.remove('hidden');
  }

  function goToStory() {
    SoundFX.playMenuConfirm();
    gameMode = 'STORY';
    hudEl.classList.add('hidden');
    showOnlyScreen(storyScreen);
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
      blockRecoil: 0,
      animOffset: isCPU ? 20 : 0,
      aiCooldown: 28,
      aiAction: 'pause',
      aiReactionTimer: 0
    };
  }

  function startMatch(f1Data, f2Data) {
    p1 = createFighterState(f1Data, 260, 1, false);
    p2 = createFighterState(f2Data, 700, -1, true);
    roundNumber = 1;

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
      f.aiCooldown = 30;
      f.aiReactionTimer = 0;
    });

    particles = [];
    floatingTexts = [];
    shockwaves = [];
    starbursts = [];
    roundTimer = 99;
    timerTicks = 0;
    gameMode = 'FIGHT';

    showOnlyScreen(null);
    hudEl.classList.remove('hidden');
    updateHUD();
    showBanner(`ROUND ${roundNumber}`, 'FIGHT!', 75);
    SoundFX.playRoundStart();
  }

  function showBanner(main, sub = '', duration = 75) {
    fightBannerText.textContent = main;
    fightBannerSub.textContent = sub;
    fightBanner.classList.remove('hidden');
    bannerTimer = duration;
  }

  function showBeastActivateBanner(beastName) {
    beastActivateName.textContent = `- ${beastName.toUpperCase()}`;
    beastActivateBanner.classList.remove('hidden', 'slam');
    void beastActivateBanner.offsetWidth;
    beastActivateBanner.classList.add('slam');
    beastBannerTimer = 78;
  }

  // 3-Phase Street Fighter Attack Frame Data
  // Punch: Startup 6 -> Active 6 -> Recovery 10
  // Kick:  Startup 10 -> Active 8 -> Recovery 14
  function getAttackSpec(fighter, type) {
    const pwr = fighter.data.stats.power;
    const rng = fighter.data.stats.range;
    const beastMult = fighter.isBeast ? 1.32 : 1.0;

    if (type === 'punch') {
      return {
        startup: 6,
        active: 6,
        recovery: 10,
        damage: Math.round((5 + pwr * 0.55) * beastMult),
        range: 64 + rng * 4.5,
        height: 54,
        knockback: 4.5,
        hitstun: 16,
        heavy: false
      };
    }
    return {
      startup: 10,
      active: 8,
      recovery: 14,
      damage: Math.round((9 + pwr * 0.95) * beastMult),
      range: 82 + rng * 5.2,
      height: 64,
      knockback: fighter.data.id === 'munna' ? 10.5 : 8.0,
      hitstun: 24,
      heavy: true
    };
  }

  function triggerTransform(fighter, opponent) {
    if (fighter.isBeast || fighter.beastGauge < 50) return;
    fighter.isBeast = true;
    fighter.state = 'transform';
    fighter.stateFrame = 0;
    fighter.vx = 0;
    SoundFX.playTransform(fighter.data.id);
    showBeastActivateBanner(fighter.data.beastName);
    shakeFrames = 15;
    shakeIntensity = 7;

    shockwaves.push({
      x: fighter.x,
      y: fighter.y - 64,
      r: 18,
      maxR: 135,
      color: fighter.data.palette.accent,
      alpha: 1
    });

    spawnFloatingText(
      fighter.x,
      fighter.y - 125,
      `BEAST: ${fighter.data.beastName.toUpperCase()}!`,
      fighter.data.palette.accent
    );

    // Short-range shockwave hit
    const dist = Math.abs(fighter.x - opponent.x);
    if (dist < 120 && Math.abs(fighter.y - opponent.y) < 90 && opponent.state !== 'ko') {
      const dir = opponent.x >= fighter.x ? 1 : -1;
      opponent.health = Math.max(0, opponent.health - 6);
      opponent.vx = dir * 8.5;
      opponent.vy = -3.2;
      opponent.state = 'hitstun';
      opponent.hitstunFrames = 20;
      opponent.hitFlash = 6;
      spawnHitSparks(opponent.x, opponent.y - 64, '#c99a3b', 12);
    }
  }

  function updateFighterInput(f, opponent) {
    if (f.state === 'ko' || f.state === 'victory') return;

    if (f.state === 'hitstun') {
      f.hitstunFrames--;
      if (f.hitstunFrames <= 0) f.state = 'idle';
      return;
    }
    if (f.state === 'transform') {
      f.stateFrame++;
      if (f.stateFrame >= 24) f.state = 'idle';
      return;
    }

    if (f.state === 'punch' || f.state === 'kick') {
      const spec = getAttackSpec(f, f.state);
      f.stateFrame++;

      if (
        !f.hasHitThisAttack &&
        f.stateFrame >= spec.startup &&
        f.stateFrame < spec.startup + spec.active
      ) {
        checkAttackHit(f, opponent, spec);
      }

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

    f.facing = opponent.x >= f.x ? 1 : -1;

    const grounded = f.y >= STAGE.groundY;
    // ~33% slower, deliberate movement speed
    const moveSpeed = (1.8 + f.data.stats.speed * 0.24) * (f.isBeast ? 1.15 : 1.0);

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
      if (grounded) f.vx *= 0.2;
      SoundFX.playPunch();
      SoundFX.playAttackVoice(f.data.id, f.isBeast, false);
      return;
    }

    if (kick) {
      f.state = 'kick';
      f.stateFrame = 0;
      f.hasHitThisAttack = false;
      if (grounded) f.vx *= 0.2;
      SoundFX.playKick();
      SoundFX.playAttackVoice(f.data.id, f.isBeast, true);
      return;
    }

    if (down && grounded) {
      f.state = 'crouch';
      f.vx = 0;
      return;
    }

    if (up && grounded) {
      // ~30% reduced jump velocity paired with lower gravity for weighty jump arcs
      f.vy = f.data.stats.jumpForce * 0.72;
      f.state = 'jump';
      SoundFX.playJump(f.isBeast, f.data.id);
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

  // Approachable Easy/Normal CPU AI with 400ms-700ms decision cooldown & reaction delay
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

    // Reaction delay before attempting a ~25% probability block
    const playerAttacking = player.state === 'punch' || player.state === 'kick';
    if (playerAttacking && dist < 110) {
      cpu.aiReactionTimer++;
      if (cpu.aiReactionTimer >= 12 && cpu.aiAction === 'block_ready') {
        out.block = true;
        return out;
      }
      if (cpu.aiReactionTimer === 12) {
        cpu.aiAction = Math.random() < 0.25 ? 'block_ready' : 'pause';
      }
    } else {
      cpu.aiReactionTimer = 0;
      if (cpu.aiAction === 'block_ready') cpu.aiAction = 'pause';
    }

    // Hold current movement/pause during decision cooldown (24-42 frames = 400ms-700ms)
    if (cpu.aiCooldown > 0) {
      cpu.aiCooldown--;
      if (cpu.aiAction === 'approach' && dist > 74) {
        out.left = dirToPlayer < 0;
        out.right = dirToPlayer > 0;
      } else if (cpu.aiAction === 'retreat' && dist < 175) {
        out.left = dirToPlayer > 0;
        out.right = dirToPlayer < 0;
      }
      return out;
    }

    // New decision every 400ms - 700ms
    cpu.aiCooldown = 24 + Math.floor(Math.random() * 19);
    const r = Math.random();

    // Beast transform only occasionally when gauge is ready
    if (!cpu.isBeast && cpu.beastGauge >= 50 && dist < 210 && r < 0.22) {
      out.transform = true;
      return out;
    }

    if (dist < 85) {
      if (r < 0.30) out.punch = true;
      else if (r < 0.52) out.kick = true;
      else if (r < 0.72) cpu.aiAction = 'pause';
      else cpu.aiAction = 'retreat';
    } else if (dist < 140) {
      if (r < 0.16) out.punch = true; // Occasional whiffed poke
      else if (r < 0.28) out.kick = true;
      else if (r < 0.65) cpu.aiAction = 'approach';
      else if (r < 0.85) cpu.aiAction = 'pause';
      else cpu.aiAction = 'retreat';
    } else {
      if (r < 0.65) cpu.aiAction = 'approach';
      else if (r < 0.90) cpu.aiAction = 'pause';
      else out.up = true;
    }

    return out;
  }

  // Street Fighter Pushbox, Hurtbox, and Active Attack Hitbox
  function getFighterScale(f) {
    let s = f.data.stats.scale * (f.isBeast ? 1.06 : 1.0);
    if (f.data.id === 'adheesh' && f.isBeast) s = 1.2;
    else if (f.data.id === 'sumit' && f.isBeast) s = 0.85;
    return s;
  }

  function getPushbox(f) {
    const s = getFighterScale(f);
    const w = 48 * s;
    const h = 155 * s;
    return { x: f.x - w / 2, y: f.y - h, w, h };
  }

  function getHurtbox(f) {
    const s = getFighterScale(f);
    const w = 68 * s;
    const h = (f.state === 'crouch' ? 120 : 192) * s;
    return { x: f.x - w / 2, y: f.y - h, w, h };
  }

  function getActiveHitbox(f) {
    if (f.state !== 'punch' && f.state !== 'kick') return null;
    const spec = getAttackSpec(f, f.state);
    if (f.stateFrame < spec.startup || f.stateFrame >= spec.startup + spec.active) {
      return null;
    }
    const s = getFighterScale(f);
    const w = spec.range;
    const h = spec.height;
    const x = f.facing === 1 ? f.x + 20 * s : f.x - 20 * s - w;
    const y = f.state === 'kick' ? f.y - 142 * s : f.y - 166 * s;
    return { x, y, w, h };
  }

  function boxesIntersect(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function checkAttackHit(attacker, defender, spec) {
    if (defender.state === 'ko') return;

    const hitbox = getActiveHitbox(attacker);
    const hurtbox = getHurtbox(defender);
    if (!boxesIntersect(hitbox, hurtbox)) return;

    attacker.hasHitThisAttack = true;
    const impactX = Math.max(hurtbox.x, Math.min(hurtbox.x + hurtbox.w, hitbox.x + (attacker.facing === 1 ? hitbox.w * 0.75 : hitbox.w * 0.25)));
    const impactY = hitbox.y + hitbox.h * 0.5;

    if (defender.state === 'block') {
      const chipDmg = Math.max(1, Math.round(spec.damage * 0.25));
      defender.health = Math.max(0, defender.health - chipDmg);
      defender.beastGauge = Math.min(100, defender.beastGauge + 9);
      defender.blockRecoil = 8;
      attacker.beastGauge = Math.min(100, attacker.beastGauge + 4);
      SoundFX.playBlock();
      spawnHitSparks(impactX, impactY, '#5ea8c9', 10);
      shockwaves.push({
        x: impactX,
        y: impactY,
        r: 12,
        maxR: 64,
        color: '#bfefff',
        alpha: 0.95
      });
      spawnFloatingText(defender.x, defender.y - 150, 'BLOCK!', '#5ea8c9');
      hitstopFrames = 4;
    } else {
      defender.health = Math.max(0, defender.health - spec.damage);
      defender.state = 'hitstun';
      defender.hitstunFrames = spec.hitstun;
      defender.hitFlash = 6;
      defender.vx = attacker.facing * spec.knockback;
      if (spec.heavy) defender.vy = -2.4;

      attacker.comboCount++;
      attacker.comboDisplayTimer = 75;
      if (!attacker.isBeast) attacker.beastGauge = Math.min(100, attacker.beastGauge + 12);
      if (!defender.isBeast) defender.beastGauge = Math.min(100, defender.beastGauge + 10);

      SoundFX.playHit(spec.heavy);
      SoundFX.playHitVoice(defender.data.id, defender.isBeast);
      spawnHitSparks(impactX, impactY, spec.heavy ? '#ff4d6d' : '#ffd369', spec.heavy ? 18 : 11);
      starbursts.push({
        x: impactX,
        y: impactY,
        radius: spec.heavy ? 52 : 34,
        color: spec.heavy ? '#ff3b5c' : '#ffe169',
        life: spec.heavy ? 10 : 7,
        maxLife: spec.heavy ? 10 : 7,
        angle: Math.random() * Math.PI
      });
      spawnFloatingText(defender.x, defender.y - 148, `-${spec.damage}`, spec.heavy ? '#e04f5f' : '#e6e8ee');

      // 4-6 frames hitstop on hit
      hitstopFrames = spec.heavy ? 6 : 4;
      if (spec.heavy) {
        shakeFrames = 8;
        shakeIntensity = 5;
      }
    }

    if (defender.health <= 0) {
      handleKO(attacker, defender);
    }
  }

  function handleKO(winner, loser) {
    loser.state = 'ko';
    loser.vx = winner.facing * 6;
    loser.vy = -4.5;
    winner.state = 'victory';
    winner.roundsWon++;

    SoundFX.playKO();
    spawnDust(loser.x, STAGE.groundY);
    spawnDust(loser.x - 18, STAGE.groundY);
    spawnDust(loser.x + 18, STAGE.groundY);
    hitstopFrames = 12;
    shakeFrames = 18;
    shakeIntensity = 9;

    gameMode = 'ROUND_END';
    showBanner('K.O.!', `${winner.data.name.toUpperCase()} TAKES THE ROUND`, 115);
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
    showBanner('TIME OVER!', winner ? `${winner.data.name.toUpperCase()} WINS ROUND` : 'DRAW ROUND', 115);
    updateHUD();
  }

  function finishRoundTransition() {
    if (p1.roundsWon >= 2 || p2.roundsWon >= 2) {
      const p1Won = p1.roundsWon >= 2;
      fightBanner.classList.add('hidden');
      hudEl.classList.add('hidden');

      if (p1Won) {
        gameMode = 'VICTORY_CUTSCENE';
        p1.x = 265;
        p1.y = STAGE.groundY;
        p1.facing = 1;
        p1.state = 'victory';
        document.getElementById('credits-winner-title').textContent =
          `${p1.data.name.toUpperCase()} WINS!`;
        // Restart CSS scroll animation cleanly
        const roll = document.getElementById('credits-roll');
        roll.style.animation = 'none';
        void roll.offsetWidth;
        roll.style.animation = '';
        showOnlyScreen(creditsCutscene);
      } else {
        gameMode = 'MATCH_END';
        document.getElementById('victory-title').textContent = 'CPU WINS!';
        document.getElementById('victory-subtitle').textContent =
          `${p2.data.name} (Beast: ${p2.data.beastName}) claims victory ${p2.roundsWon} - ${p1.roundsWon}!`;
        showOnlyScreen(victoryScreen);
      }
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
      if (f.vy > 2.5) spawnDust(f.x, STAGE.groundY);
      f.y = STAGE.groundY;
      f.vy = 0;
    }

    if (f.state === 'hitstun' || f.state === 'ko') {
      f.vx *= 0.86;
    }

    f.x = Math.max(STAGE.leftBound, Math.min(STAGE.rightBound, f.x));

    if (f.trailHealth > f.health) {
      f.trailHealth = Math.max(f.health, f.trailHealth - 0.55);
    }

    if (f.isBeast && gameMode === 'FIGHT') {
      f.beastGauge = Math.max(0, f.beastGauge - 0.13);
      if (f.beastGauge <= 0) {
        f.isBeast = false;
        spawnFloatingText(f.x, f.y - 118, 'REVERT', '#8a92a6');
      }
    }

    if (f.hitFlash > 0) f.hitFlash--;
    if (f.blockRecoil > 0) f.blockRecoil--;
    if (f.comboDisplayTimer > 0) {
      f.comboDisplayTimer--;
      if (f.comboDisplayTimer <= 0) f.comboCount = 0;
    }
  }

  function resolvePushbox() {
    if (p1.state === 'ko' || p2.state === 'ko') return;
    const b1 = getPushbox(p1);
    const b2 = getPushbox(p2);
    if (!boxesIntersect(b1, b2)) return;

    const minDist = (b1.w + b2.w) / 2;
    const dx = p2.x - p1.x;
    const push = (minDist - Math.abs(dx)) / 2;
    const dir = dx >= 0 ? 1 : -1;
    p1.x = Math.max(STAGE.leftBound, p1.x - dir * push);
    p2.x = Math.min(STAGE.rightBound, p2.x + dir * push);
  }

  function drawDebugBoxes() {
    if (!debugBoxes || !p1 || !p2) return;
    [p1, p2].forEach((f) => {
      const push = getPushbox(f);
      const hurt = getHurtbox(f);
      const hit = getActiveHitbox(f);

      ctx.save();
      ctx.lineWidth = 2;

      // Green = Hurtbox
      ctx.strokeStyle = 'rgba(50, 230, 110, 0.9)';
      ctx.fillStyle = 'rgba(50, 230, 110, 0.14)';
      ctx.fillRect(hurt.x, hurt.y, hurt.w, hurt.h);
      ctx.strokeRect(hurt.x, hurt.y, hurt.w, hurt.h);

      // Blue = Pushbox
      ctx.strokeStyle = 'rgba(40, 150, 255, 0.95)';
      ctx.fillStyle = 'rgba(40, 150, 255, 0.16)';
      ctx.fillRect(push.x, push.y, push.w, push.h);
      ctx.strokeRect(push.x, push.y, push.w, push.h);

      // Red = Active Hitbox
      if (hit) {
        ctx.strokeStyle = 'rgba(255, 45, 70, 0.95)';
        ctx.fillStyle = 'rgba(255, 45, 70, 0.28)';
        ctx.fillRect(hit.x, hit.y, hit.w, hit.h);
        ctx.strokeRect(hit.x, hit.y, hit.w, hit.h);
      }
      ctx.restore();
    });
  }

  function spawnHitSparks(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 2.2 + Math.random() * 5.8;
      particles.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 14 + Math.random() * 10,
        maxLife: 24,
        color,
        size: 2.5 + Math.random() * 3.5
      });
    }
  }

  function spawnDust(x, y) {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: x + (Math.random() - 0.5) * 24,
        y: y - 3,
        vx: (Math.random() - 0.5) * 2.0,
        vy: -Math.random() * 1.4,
        life: 16,
        maxLife: 16,
        color: '#6b7280',
        size: 3.5 + Math.random() * 3
      });
    }
  }

  function spawnFloatingText(x, y, text, color) {
    floatingTexts.push({ x, y, text, color, life: 38 });
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

    const keyMap = { KeyA: 'hud-key-A', KeyS: 'hud-key-S', KeyZ: 'hud-key-Z', KeyX: 'hud-key-X' };
    Object.entries(keyMap).forEach(([code, elId]) => {
      const el = document.getElementById(elId);
      if (el) el.classList.toggle('active', keysHeld.has(code));
    });
  }

  function updateFighterHUD(prefix, f) {
    const hpPct = Math.max(0, (f.health / f.maxHealth) * 100);
    const trailPct = Math.max(0, (f.trailHealth / f.maxHealth) * 100);

    const fill = document.getElementById(`${prefix}-health-fill`);
    const trail = document.getElementById(`${prefix}-health-trail`);
    fill.style.width = `${hpPct}%`;
    trail.style.width = `${trailPct}%`;
    fill.classList.toggle('low', hpPct < 28);

    const beastLabel = document.getElementById(`${prefix}-beast-label`);
    if (beastLabel) {
      beastLabel.textContent = `BEAST: ${f.data.beastName.toUpperCase()}`;
    }

    const beastFill = document.getElementById(`${prefix}-beast-fill`);
    beastFill.style.width = `${f.beastGauge}%`;
    beastFill.classList.toggle('ready', !f.isBeast && f.beastGauge >= 50);
    beastFill.classList.toggle('active', f.isBeast);

    const badge = document.getElementById(`${prefix}-form-badge`);
    badge.textContent = f.isBeast ? `BEAST: ${f.data.beastName.toUpperCase()}` : 'HUMAN';
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

  // Stage Background (uses assets/background1.jpg with atmospheric contrast overlay)
  function drawStage() {
    if (stageBgImg.complete && stageBgImg.naturalWidth > 0) {
      const iw = stageBgImg.naturalWidth;
      const ih = stageBgImg.naturalHeight;
      const scale = Math.max(STAGE.width / iw, STAGE.height / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (STAGE.width - dw) / 2;
      const dy = (STAGE.height - dh) / 2;
      ctx.drawImage(stageBgImg, dx, dy, dw, dh);

      // Subtle dark contrast overlay so fighters & HUD stay crisp
      ctx.fillStyle = 'rgba(7, 8, 14, 0.38)';
      ctx.fillRect(0, 0, STAGE.width, STAGE.groundY);

      // Grounded floor shadow band below STAGE.groundY
      const floorGrad = ctx.createLinearGradient(0, STAGE.groundY, 0, STAGE.height);
      floorGrad.addColorStop(0, 'rgba(14, 16, 24, 0.68)');
      floorGrad.addColorStop(1, 'rgba(7, 8, 12, 0.92)');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, STAGE.groundY, STAGE.width, STAGE.height - STAGE.groundY);
    } else {
      const sky = ctx.createLinearGradient(0, 0, 0, STAGE.groundY);
      sky.addColorStop(0, '#07080d');
      sky.addColorStop(0.55, '#151824');
      sky.addColorStop(1, '#261822');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, STAGE.width, STAGE.groundY);

      const floorGrad = ctx.createLinearGradient(0, STAGE.groundY, 0, STAGE.height);
      floorGrad.addColorStop(0, '#222633');
      floorGrad.addColorStop(1, '#0b0d12');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, STAGE.groundY, STAGE.width, STAGE.height - STAGE.groundY);
    }

    // Arena Boundary Trim
    ctx.strokeStyle = '#9e1c28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, STAGE.groundY);
    ctx.lineTo(STAGE.width, STAGE.groundY);
    ctx.stroke();
  }

  function renderEffects() {
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      const s = shockwaves[i];
      s.r += 7;
      s.alpha -= 0.065;
      if (s.alpha <= 0 || (s.maxR && s.r > s.maxR)) {
        shockwaves.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = s.alpha;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Explosive Hit Starbursts
    for (let i = starbursts.length - 1; i >= 0; i--) {
      const sb = starbursts[i];
      sb.life--;
      if (sb.life <= 0) {
        starbursts.splice(i, 1);
        continue;
      }
      const ratio = sb.life / sb.maxLife;
      const spikes = 10;
      const outerR = sb.radius * (1.25 - ratio * 0.25);
      const innerR = outerR * 0.32;
      ctx.save();
      ctx.translate(sb.x, sb.y);
      ctx.rotate(sb.angle);
      ctx.globalAlpha = ratio;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = sb.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let k = 0; k < spikes * 2; k++) {
        const r = k % 2 === 0 ? outerR : innerR;
        const a = (k * Math.PI) / spikes;
        if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

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

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 0.9;
      ft.life--;
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(1, ft.life / 14);
      ctx.font = '900 17px "Trebuchet MS", sans-serif';
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

    if (beastBannerTimer > 0) {
      beastBannerTimer--;
      if (beastBannerTimer <= 0) {
        beastActivateBanner.classList.add('hidden');
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
      drawDebugBoxes();
      renderEffects();
    } else if (gameMode === 'VICTORY_CUTSCENE' && p1) {
      drawTrophyCutscene(ctx, p1, globalTime);
      renderEffects();
    }
    ctx.restore();

    keysJustPressed.clear();
    requestAnimationFrame(loop);
  }

  function drawTrophyCutscene(ctx, winner, time) {
    // Spotlight beam on the champion
    ctx.save();
    const beam = ctx.createLinearGradient(265, 0, 265, STAGE.groundY);
    beam.addColorStop(0, 'rgba(255, 215, 90, 0.35)');
    beam.addColorStop(1, 'rgba(255, 215, 90, 0.04)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(195, 0);
    ctx.lineTo(335, 0);
    ctx.lineTo(410, STAGE.groundY + 15);
    ctx.lineTo(120, STAGE.groundY + 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Confetti shower
    if (time % 4 === 0) {
      const colors = ['#ffd700', '#ff2e4c', '#24e5ff', '#52ff88', '#ffffff'];
      particles.push({
        x: 60 + Math.random() * 440,
        y: -10,
        vx: (Math.random() - 0.5) * 2.2,
        vy: 1.8 + Math.random() * 2.4,
        life: 160,
        maxLife: 160,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 3
      });
    }

    // Champion bouncing in celebration
    const bounce = Math.abs(Math.sin(time * 0.1)) * -10;
    const savedY = winner.y;
    winner.y = STAGE.groundY + bounce;
    drawFighter(ctx, winner, time);
    winner.y = savedY;

    // Gleaming Golden Championship Trophy held up!
    const tx = winner.x + 48;
    const ty = STAGE.groundY - 98 + bounce;
    ctx.save();
    ctx.translate(tx, ty);
    ctx.rotate(Math.sin(time * 0.08) * 0.08);

    // Trophy base
    ctx.fillStyle = '#3b2412';
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2.5;
    ctx.fillRect(-14, 18, 28, 10);
    ctx.strokeRect(-14, 18, 28, 10);

    // Stem
    ctx.fillStyle = '#e5b83b';
    ctx.fillRect(-5, 6, 10, 12);
    ctx.strokeRect(-5, 6, 10, 12);

    // Cup & Handles
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-15, -10, 8, Math.PI * 0.5, Math.PI * 1.5);
    ctx.arc(15, -10, 8, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    const cupGrad = ctx.createLinearGradient(-16, -24, 16, 8);
    cupGrad.addColorStop(0, '#fff2a6');
    cupGrad.addColorStop(0.5, '#ffd700');
    cupGrad.addColorStop(1, '#b88214');
    ctx.fillStyle = cupGrad;
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -22);
    ctx.lineTo(16, -22);
    ctx.quadraticCurveTo(14, 6, 0, 8);
    ctx.quadraticCurveTo(-14, 6, -16, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // "#1" on trophy
    ctx.fillStyle = '#090a0f';
    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('#1', 0, -5);
    ctx.restore();

    // Funny Speech Bubble above winner
    const quotes = [
      'MOM, GET THE CAMERA!!',
      'EZ CLAP! NEXT CHALLENGER?',
      'WHO ORDERED THE TROPHY?!',
      '100% SKILL. ZERO BUTTON MASHING.'
    ];
    const quote = quotes[Math.floor(time / 150) % quotes.length];
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#090a0f';
    ctx.lineWidth = 3;
    const bx = winner.x + 10;
    const by = STAGE.groundY - 190 + bounce * 0.5;
    ctx.beginPath();
    ctx.roundRect(bx - 135, by - 22, 270, 38, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#090a0f';
    ctx.font = '900 13px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(quote, bx, by + 2);
    ctx.restore();
  }

  buildRoster();
  requestAnimationFrame(loop);
})();
