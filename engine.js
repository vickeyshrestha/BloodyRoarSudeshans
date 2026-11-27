// Core 60 FPS Game Loop, Weighty Physics, Combat State Machine, Beast Gauge, and Approachable CPU AI

(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');

  const STAGE = {
    width: 960,
    height: 540,
    floorTopY: 412, // Back horizon edge of the wooden floor
    groundY: 488,   // Fighters stand in the middle of the wooden floor (Street Fighter style)
    leftBound: 56,
    rightBound: 904,
    gravity: 0.42
  };

  const STAGE_BG_PATHS = [1, 2, 4, 5, 6, 7, 8, 9, 10].map((n) => `assets/background${n}.jpg`);
  const STAGE_BG_IMAGES = STAGE_BG_PATHS.map((src) => {
    const img = new Image();
    img.src = src;
    return img;
  });
  let stageBgDeck = [];
  let lastStageBgIdx = -1;
  let currentStageBg = STAGE_BG_IMAGES[0];

  function pickRandomStageBackground() {
    if (stageBgDeck.length === 0) {
      stageBgDeck = STAGE_BG_IMAGES.map((_, idx) => idx);
      for (let i = stageBgDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [stageBgDeck[i], stageBgDeck[j]] = [stageBgDeck[j], stageBgDeck[i]];
      }
      // Never repeat the immediately previous background on reshuffle
      if (stageBgDeck.length > 1 && stageBgDeck[stageBgDeck.length - 1] === lastStageBgIdx) {
        const swapIdx = 0;
        [stageBgDeck[stageBgDeck.length - 1], stageBgDeck[swapIdx]] = [
          stageBgDeck[swapIdx],
          stageBgDeck[stageBgDeck.length - 1]
        ];
      }
    }
    const nextIdx = stageBgDeck.pop();
    lastStageBgIdx = nextIdx;
    currentStageBg = STAGE_BG_IMAGES[nextIdx];
  }

  // DOM References
  const hudEl = document.getElementById('hud');
  const titleScreen = document.getElementById('title-screen');
  const menuScreen = document.getElementById('menu-screen');
  const optionsScreen = document.getElementById('options-screen');
  const adminLoginScreen = document.getElementById('admin-login-screen');
  const adminPanelScreen = document.getElementById('admin-panel-screen');
  const onlineScreen = document.getElementById('online-screen');
  const leaderboardScreen = document.getElementById('leaderboard-screen');
  const storyScreen = document.getElementById('story-screen');
  const selectScreen = document.getElementById('select-screen');
  const vsScreen = document.getElementById('vs-screen');
  const bossChallengeScreen = document.getElementById('boss-challenge-screen');
  const victoryScreen = document.getElementById('victory-screen');
  const creditsCutscene = document.getElementById('credits-cutscene');
  const pauseScreen = document.getElementById('pause-screen');

  const globalPlayerNameInput = document.getElementById('global-player-name');
  const onlinePlayerNameInput = document.getElementById('online-player-name');
  const onlineFighterSelect = document.getElementById('online-fighter-select');
  const onlineRoomCodeInput = document.getElementById('online-room-code');
  const onlineStatusEl = document.getElementById('online-status');
  const onlineRoomsList = document.getElementById('online-rooms-list');
  const leaderboardList = document.getElementById('leaderboard-list');

  const rosterGrid = document.getElementById('roster-grid');
  const selName = document.getElementById('sel-name');
  const selBeast = document.getElementById('sel-beast');
  const selDesc = document.getElementById('sel-desc');

  const fightBanner = document.getElementById('fight-banner');
  const fightBannerText = document.getElementById('fight-banner-text');
  const fightBannerSub = document.getElementById('fight-banner-sub');
  const p1BeastBanner = document.getElementById('p1-beast-banner');
  const p1BeastBannerName = document.getElementById('p1-beast-banner-name');
  const p1BeastPortrait = document.getElementById('p1-beast-portrait');
  const p2BeastBanner = document.getElementById('p2-beast-banner');
  const p2BeastBannerName = document.getElementById('p2-beast-banner-name');
  const p2BeastPortrait = document.getElementById('p2-beast-portrait');
  const creditsEndingVideo = document.getElementById('credits-ending-video');
  const prologueVideo = document.getElementById('prologue-video');
  const hudScoreBox = document.getElementById('hud-score-box');
  const vsStageBadge = document.getElementById('vs-stage-badge');

  const btnStart = document.getElementById('btn-start');
  const btnModeArcade = document.getElementById('btn-mode-arcade');
  const btnModeOnline = document.getElementById('btn-mode-online');
  const btnModeOptions = document.getElementById('btn-mode-options');
  const btnModeCredits = document.getElementById('btn-mode-credits');
  const btnModeScores = document.getElementById('btn-mode-scores');
  const btnOptionsBack = document.getElementById('btn-options-back');
  const optDifficulty = document.getElementById('opt-difficulty');
  const optTime = document.getElementById('opt-time');
  const optGore = document.getElementById('opt-gore');
  const linkAdmin = document.getElementById('link-admin');
  const adminUsernameInput = document.getElementById('admin-username');
  const adminPasswordInput = document.getElementById('admin-password');
  const adminLoginError = document.getElementById('admin-login-error');
  const btnAdminLoginSubmit = document.getElementById('btn-admin-login-submit');
  const btnAdminLoginBack = document.getElementById('btn-admin-login-back');
  const adminScoresList = document.getElementById('admin-scores-list');
  const btnAdminClearAll = document.getElementById('btn-admin-clear-all');
  const btnAdminLogout = document.getElementById('btn-admin-logout');
  const btnAdminLogout2 = document.getElementById('btn-admin-logout-2');
  const btnAdminTabScores = document.getElementById('btn-admin-tab-scores');
  const btnAdminTabTraffic = document.getElementById('btn-admin-tab-traffic');
  const adminScoresPane = document.getElementById('admin-scores-pane');
  const adminTrafficPane = document.getElementById('admin-traffic-pane');
  const adminTrafficSummary = document.getElementById('admin-traffic-summary');
  const adminTrafficList = document.getElementById('admin-traffic-list');
  const btnAdminRefreshTraffic = document.getElementById('btn-admin-refresh-traffic');
  const btnOnlineHost = document.getElementById('btn-online-host');
  const btnOnlineJoin = document.getElementById('btn-online-join');
  const btnRefreshRooms = document.getElementById('btn-refresh-rooms');
  const btnOnlineBack = document.getElementById('btn-online-back');
  const btnScoresRefresh = document.getElementById('btn-scores-refresh');
  const btnScoresBack = document.getElementById('btn-scores-back');
  const btnStoryContinue = document.getElementById('btn-story-continue');
  const btnStoryMenu = document.getElementById('btn-story-menu');
  const btnConfirmFighter = document.getElementById('btn-confirm-fighter');
  const btnSelectMenu = document.getElementById('btn-select-menu');
  const btnAcceptChallenge = document.getElementById('btn-accept-challenge');
  const btnBossMenu = document.getElementById('btn-boss-menu');
  const btnPause = document.getElementById('btn-pause');
  const btnPauseResume = document.getElementById('btn-pause-resume');
  const btnPauseRestart = document.getElementById('btn-pause-restart');
  const btnPauseMenu = document.getElementById('btn-pause-menu');
  const btnRematch = document.getElementById('btn-rematch');
  const btnChangeFighter = document.getElementById('btn-change-fighter');
  const onlineRematchPrompt = document.getElementById('online-rematch-prompt');
  const rematchPromptText = document.getElementById('rematch-prompt-text');
  const victoryActionsDefault = document.getElementById('victory-actions-default');
  const btnRematchAccept = document.getElementById('btn-rematch-accept');
  const btnRematchDecline = document.getElementById('btn-rematch-decline');
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
  let arcadeStage = 1;
  let arcadeOpponents = [];
  let arcadeScore = 0;
  let arcadeStartTime = 0;
  let liveMatchScore = 0;
  let playerName = localStorage.getItem('br_player_name') || 'Sudeshan';
  let onlineRole = null; // null | 'host' | 'guest'
  let onlineHostName = 'Host';
  let onlineGuestName = 'Guest';
  let onlineSyncTick = 0;
  let standaloneCredits = false;
  let isPaused = false;
  let adminSession = null; // { username, password } kept only in memory while logged in
  let pendingNextMode = 'arcade'; // 'arcade' | 'online'
  let remoteInput = {
    left: false,
    right: false,
    up: false,
    down: false,
    block: false,
    punch: false,
    kick: false,
    transform: false
  };
  let roundTimer = 99;
  let timerTicks = 0;
  let bannerTimer = 0;
  let introPhase = 0; // 0: none, 1: ROUND X flash, 2: FIGHT! flash
  let introTimer = 0;
  let postMatchCallback = null;
  let p1BeastBannerTimer = 0;
  let p2BeastBannerTimer = 0;
  let vsTimer = 0;
  let debugBoxes = false; // Toggle with 'H' key: Blue=Pushbox, Green=Hurtbox, Red=Hitbox

  let p1 = null;
  let p2 = null;
  let particles = [];
  let bloodDrops = [];
  let bloodStains = [];
  let floatingTexts = [];
  let shockwaves = [];
  let starbursts = [];

  // Saved Options (Difficulty: easy|medium|hard|brutal, Match Time, Blood & Gore)
  const savedOpts = (() => {
    try {
      return JSON.parse(localStorage.getItem('br_options') || '{}');
    } catch {
      return {};
    }
  })();
  const gameOptions = {
    difficulty: savedOpts.difficulty || 'easy',
    matchTime: Number(savedOpts.matchTime) || 99,
    bloodGore: savedOpts.bloodGore !== undefined ? !!savedOpts.bloodGore : true
  };

  // Input Tracking (Strict Mapping)
  const keysHeld = new Set();
  const keysJustPressed = new Set();

  function normalizeCode(e) {
    if (e.code) return e.code;
    return e.key;
  }

  window.addEventListener('keydown', (e) => {
    // Allow typing in name/room inputs without game key interception
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) {
      return;
    }
    const code = normalizeCode(e);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(code)) {
      e.preventDefault();
    }
    if (!keysHeld.has(code)) {
      keysJustPressed.add(code);
      if (code === 'KeyH') debugBoxes = !debugBoxes;
      if (
        (code === 'Escape' || code === 'KeyP') &&
        !onlineRole &&
        (gameMode === 'FIGHT' || gameMode === 'ROUND_INTRO' || gameMode === 'ROUND_END')
      ) {
        togglePause();
      }
    }
    keysHeld.add(code);

    if (gameMode === 'TITLE' && (code === 'Enter' || code === 'Space')) {
      goToMenu();
    } else if (gameMode === 'STORY' && (code === 'Enter' || code === 'Space')) {
      continueFromStory();
    } else if (gameMode === 'SELECT') {
      handleSelectKey(code);
    } else if (gameMode === 'VS' && (code === 'Enter' || code === 'Space')) {
      if (!onlineRole) vsTimer = 1;
    } else if (gameMode === 'BOSS_INTRO' && (code === 'Enter' || code === 'Space')) {
      acceptBossChallenge();
    }
  });

  window.addEventListener('keyup', (e) => {
    keysHeld.delete(normalizeCode(e));
  });

  const IS_MOBILE_DEVICE =
    window.matchMedia('(hover: none) and (pointer: coarse)').matches || window.innerWidth <= 900;

  function isMobileDevice() {
    return IS_MOBILE_DEVICE;
  }

  function enterMobileFullscreenLandscape() {
    if (!isMobileDevice()) return;
    const target = document.documentElement;
    const req =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.msRequestFullscreen;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (req && !fsEl) {
      Promise.resolve(req.call(target))
        .then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        })
        .catch(() => {});
    } else if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }

  document.addEventListener(
    'click',
    (e) => {
      if (!isMobileDevice()) return;
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        enterMobileFullscreenLandscape();
      }
    },
    true
  );

  // Button Events
  btnStart.addEventListener('click', () => {
    enterMobileFullscreenLandscape();
    goToMenu();
  });
  btnModeArcade.addEventListener('click', () => {
    syncPlayerNameFromInput(globalPlayerNameInput.value);
    onlineRole = null;
    OnlineManager.closeHostedRoom();
    OnlineManager.disconnectChannel();
    pendingNextMode = 'arcade';
    goToStory();
  });
  btnModeOnline.addEventListener('click', () => {
    syncPlayerNameFromInput(globalPlayerNameInput.value);
    pendingNextMode = 'online';
    goToStory();
  });
  btnModeOptions.addEventListener('click', openOptions);
  btnOptionsBack.addEventListener('click', saveAndCloseOptions);
  btnModeCredits.addEventListener('click', openStandaloneCredits);
  btnModeScores.addEventListener('click', openLeaderboard);
  linkAdmin.addEventListener('click', (e) => {
    e.preventDefault();
    openAdminLogin();
  });
  btnAdminLoginBack.addEventListener('click', goToMenu);
  btnAdminLoginSubmit.addEventListener('click', handleAdminLogin);
  btnAdminClearAll.addEventListener('click', handleAdminClearAll);
  btnAdminLogout.addEventListener('click', () => {
    adminSession = null;
    goToMenu();
  });
  btnAdminLogout2.addEventListener('click', () => {
    adminSession = null;
    goToMenu();
  });
  btnAdminTabScores.addEventListener('click', () => switchAdminTab('scores'));
  btnAdminTabTraffic.addEventListener('click', () => switchAdminTab('traffic'));
  btnAdminRefreshTraffic.addEventListener('click', loadAdminTraffic);
  btnOnlineHost.addEventListener('click', handleHostRoom);
  btnOnlineJoin.addEventListener('click', () => handleJoinRoom(onlineRoomCodeInput.value));
  btnRefreshRooms.addEventListener('click', refreshOpenRooms);
  btnOnlineBack.addEventListener('click', () => {
    OnlineManager.closeHostedRoom();
    OnlineManager.disconnectChannel();
    onlineRole = null;
    goToMenu();
  });
  btnScoresRefresh.addEventListener('click', loadLeaderboard);
  btnScoresBack.addEventListener('click', goToMenu);

  btnStoryContinue.addEventListener('click', continueFromStory);
  btnStoryMenu.addEventListener('click', goToMenu);
  btnConfirmFighter.addEventListener('click', startMatchFromSelect);
  btnSelectMenu.addEventListener('click', goToMenu);
  btnAcceptChallenge.addEventListener('click', acceptBossChallenge);
  btnBossMenu.addEventListener('click', () => {
    SoundFX.playTransform(p2.data.id);
    btnBossMenu.disabled = true;
    btnBossMenu.textContent = 'NO ESCAPE!';
    const quoteEl = document.getElementById('boss-challenge-quote');
    if (quoteEl) {
      quoteEl.textContent = '"TOO LATE!! You signed the 2060 BS canteen pact—you face the Boss anyway!"';
      quoteEl.style.color = '#ffd700';
    }
    setTimeout(() => {
      acceptBossChallenge();
    }, 1400);
  });
  btnPause.addEventListener('click', togglePause);
  btnPauseResume.addEventListener('click', togglePause);
  btnPauseRestart.addEventListener('click', () => {
    isPaused = false;
    pauseScreen.classList.add('hidden');
    startMatch(p1.data, p2.data);
  });
  btnPauseMenu.addEventListener('click', goToMenu);
  btnRematch.addEventListener('click', () => {
    SoundFX.playMenuConfirm();
    if (onlineRole) {
      btnRematch.disabled = true;
      document.getElementById('victory-subtitle').textContent = 'Rematch requested! Waiting for opponent...';
      OnlineManager.sendBroadcast('rematch_request', { from: playerName });
    } else {
      startMatch(p1.data, p2.data);
    }
  });
  btnChangeFighter.addEventListener('click', () => {
    SoundFX.playMenuSelect();
    if (onlineRole) {
      OnlineManager.sendBroadcast('rematch_decline', {});
    }
    goToMenu();
  });
  btnRematchAccept.addEventListener('click', () => {
    SoundFX.playMenuConfirm();
    OnlineManager.sendBroadcast('rematch_accept', {});
    startMatch(p1.data, p2.data);
  });
  btnRematchDecline.addEventListener('click', () => {
    SoundFX.playMenuSelect();
    OnlineManager.sendBroadcast('rematch_decline', {});
    goToMenu();
  });
  btnCreditsRematch.addEventListener('click', () => {
    SoundFX.playMenuConfirm();
    if (standaloneCredits) goToMenu();
    else if (onlineRole) goToOnline();
    else startArcadeLadder(p1.data);
  });
  btnCreditsChange.addEventListener('click', () => {
    SoundFX.playMenuSelect();
    if (standaloneCredits || onlineRole) goToMenu();
    else goToSelect();
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

  // Mobile Touch Controls Binding (8-way Sega Genesis D-Pad + TouchList sync)
  const touchControlsEl = document.getElementById('touch-controls');
  const genesisDpadEl = document.getElementById('genesis-dpad');
  const dpadIndicators = genesisDpadEl ? Array.from(genesisDpadEl.querySelectorAll('.dpad-ind')) : [];
  const touchBtnMap = new Map();
  document.querySelectorAll('.touch-btn[data-key]').forEach((btn) => {
    touchBtnMap.set(btn.dataset.key, btn);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
    btn.addEventListener('selectstart', (e) => e.preventDefault());
  });
  if (genesisDpadEl) {
    genesisDpadEl.addEventListener('contextmenu', (e) => e.preventDefault());
    genesisDpadEl.addEventListener('selectstart', (e) => e.preventDefault());
  }

  let activeTouchKeys = new Set();

  function getDpadKeysFromPoint(clientX, clientY) {
    if (!genesisDpadEl) return [];
    const rect = genesisDpadEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < 10 || dist > rect.width * 0.72) return [];
    const deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const sector = Math.round(deg / 45);
    switch (sector) {
      case 0:
        return ['ArrowRight'];
      case 1:
        return ['ArrowRight', 'ArrowDown'];
      case 2:
        return ['ArrowDown'];
      case 3:
        return ['ArrowLeft', 'ArrowDown'];
      case 4:
      case -4:
        return ['ArrowLeft'];
      case -3:
        return ['ArrowLeft', 'ArrowUp'];
      case -2:
        return ['ArrowUp'];
      case -1:
        return ['ArrowRight', 'ArrowUp'];
      default:
        return [];
    }
  }

  function updateDpadVisuals(keys) {
    if (!dpadIndicators.length) return;
    const up = keys.has('ArrowUp');
    const down = keys.has('ArrowDown');
    const left = keys.has('ArrowLeft');
    const right = keys.has('ArrowRight');
    const activeDirs = new Set();
    if (up && right) activeDirs.add('ur');
    else if (down && right) activeDirs.add('dr');
    else if (down && left) activeDirs.add('dl');
    else if (up && left) activeDirs.add('ul');
    if (up) activeDirs.add('up');
    if (down) activeDirs.add('down');
    if (left) activeDirs.add('left');
    if (right) activeDirs.add('right');
    dpadIndicators.forEach((el) => {
      el.classList.toggle('active', activeDirs.has(el.dataset.dir));
    });
  }

  function applyTouchKeys(nextKeys) {
    for (const code of activeTouchKeys) {
      if (!nextKeys.has(code)) {
        keysHeld.delete(code);
        const btn = touchBtnMap.get(code);
        if (btn) btn.classList.remove('pressed');
      }
    }
    for (const code of nextKeys) {
      if (!activeTouchKeys.has(code)) {
        if (!keysHeld.has(code)) keysJustPressed.add(code);
        keysHeld.add(code);
        const btn = touchBtnMap.get(code);
        if (btn) btn.classList.add('pressed');
      }
    }
    activeTouchKeys = nextKeys;
    updateDpadVisuals(nextKeys);
  }

  function clearAllTouchPointers() {
    applyTouchKeys(new Set());
  }

  if (touchControlsEl && 'ontouchstart' in window) {
    const syncTouches = (e) => {
      e.preventDefault();
      const next = new Set();
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        if (el && el.closest && el.closest('#genesis-dpad')) {
          getDpadKeysFromPoint(t.clientX, t.clientY).forEach((k) => next.add(k));
        } else {
          const btn = el && el.closest ? el.closest('.touch-btn[data-key]') : null;
          if (btn && btn.dataset.key) {
            next.add(btn.dataset.key);
          }
        }
      }
      applyTouchKeys(next);
    };
    touchControlsEl.addEventListener('touchstart', syncTouches, { passive: false });
    touchControlsEl.addEventListener('touchmove', syncTouches, { passive: false });
    touchControlsEl.addEventListener('touchend', syncTouches, { passive: false });
    touchControlsEl.addEventListener('touchcancel', clearAllTouchPointers, { passive: false });
  } else {
    // Desktop / non-touch pointer fallback
    const activeTouchPointers = new Map();
    const syncPointers = () => {
      const next = new Set();
      for (const entry of activeTouchPointers.values()) {
        if (entry.dpad) {
          getDpadKeysFromPoint(entry.x, entry.y).forEach((k) => next.add(k));
        } else if (entry.code) {
          next.add(entry.code);
        }
      }
      applyTouchKeys(next);
    };
    if (genesisDpadEl) {
      genesisDpadEl.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        activeTouchPointers.set(e.pointerId, { dpad: true, x: e.clientX, y: e.clientY });
        syncPointers();
      });
      genesisDpadEl.addEventListener('pointermove', (e) => {
        if (activeTouchPointers.has(e.pointerId)) {
          activeTouchPointers.set(e.pointerId, { dpad: true, x: e.clientX, y: e.clientY });
          syncPointers();
        }
      });
    }
    touchBtnMap.forEach((btn, code) => {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        activeTouchPointers.set(e.pointerId, { code });
        syncPointers();
      });
    });
    const releasePointer = (e) => {
      if (activeTouchPointers.delete(e.pointerId)) syncPointers();
    };
    window.addEventListener('pointerup', releasePointer);
    window.addEventListener('pointercancel', releasePointer);
  }

  window.addEventListener('blur', () => {
    keysHeld.clear();
    clearAllTouchPointers();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      keysHeld.clear();
      clearAllTouchPointers();
    }
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

      // Redraw portraits automatically if PNG sprites finish loading (skip human if photo exists)
      ['human', 'beast'].forEach((form) => {
        if (form === 'human' && f.portraitSrc) return;
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
    [
      titleScreen,
      menuScreen,
      optionsScreen,
      adminLoginScreen,
      adminPanelScreen,
      onlineScreen,
      leaderboardScreen,
      storyScreen,
      selectScreen,
      vsScreen,
      bossChallengeScreen,
      victoryScreen,
      creditsCutscene,
      pauseScreen
    ].forEach((el) => el.classList.add('hidden'));
    if (screen) screen.classList.remove('hidden');
    if (creditsEndingVideo) {
      if (screen === creditsCutscene) {
        creditsEndingVideo.currentTime = 0;
        creditsEndingVideo.play().catch(() => {
          creditsEndingVideo.muted = true;
          creditsEndingVideo.play().catch(() => {});
        });
      } else {
        creditsEndingVideo.pause();
      }
    }
    if (prologueVideo) {
      if (screen === storyScreen) {
        prologueVideo.currentTime = 0;
        prologueVideo.play().catch(() => {});
        const crawl = document.getElementById('story-crawl-content');
        if (crawl) {
          crawl.style.animation = 'none';
          void crawl.offsetWidth;
          crawl.style.animation = '';
        }
      } else {
        prologueVideo.pause();
      }
    }
    updatePauseButtonVisibility();
  }

  function updatePauseButtonVisibility() {
    const canPause =
      !onlineRole &&
      (gameMode === 'FIGHT' || gameMode === 'ROUND_INTRO' || gameMode === 'ROUND_END');
    if (btnPause) btnPause.classList.toggle('hidden', !canPause);
  }

  function togglePause() {
    if (onlineRole) return; // Never pause online multiplayer
    if (gameMode !== 'FIGHT' && gameMode !== 'ROUND_INTRO' && gameMode !== 'ROUND_END') return;
    isPaused = !isPaused;
    pauseScreen.classList.toggle('hidden', !isPaused);
    SoundFX.playMenuSelect();
  }

  function syncPlayerNameFromInput(val) {
    const clean = (val || '').trim();
    if (clean) {
      playerName = clean.slice(0, 20);
      localStorage.setItem('br_player_name', playerName);
    }
    if (globalPlayerNameInput) globalPlayerNameInput.value = playerName;
    if (onlinePlayerNameInput) onlinePlayerNameInput.value = playerName;
  }

  function goToMenu() {
    SoundFX.stopBossBGM();
    SoundFX.startBGM();
    SoundFX.playMenuConfirm();
    isPaused = false;
    standaloneCredits = false;
    onlineRole = null;
    OnlineManager.closeHostedRoom();
    OnlineManager.disconnectChannel();
    gameMode = 'MENU';
    syncPlayerNameFromInput(playerName);
    hudEl.classList.add('hidden');
    showOnlyScreen(menuScreen);
  }

  function continueFromStory() {
    if (pendingNextMode === 'online') goToOnline();
    else goToSelect();
  }

  window.addEventListener('beforeunload', () => {
    OnlineManager.closeHostedRoom();
  });

  function openAdminLogin() {
    SoundFX.playMenuConfirm();
    gameMode = 'ADMIN_LOGIN';
    adminUsernameInput.value = '';
    adminPasswordInput.value = '';
    adminLoginError.textContent = '';
    hudEl.classList.add('hidden');
    showOnlyScreen(adminLoginScreen);
  }

  async function handleAdminLogin() {
    const user = (adminUsernameInput.value || '').trim();
    const pass = adminPasswordInput.value || '';
    adminLoginError.textContent = 'Verifying...';
    const ok = await OnlineManager.verifyAdminLogin(user, pass);
    if (!ok) {
      adminLoginError.textContent = 'Invalid username or password.';
      return;
    }
    adminSession = { username: user, password: pass };
    adminLoginError.textContent = '';
    gameMode = 'ADMIN_PANEL';
    showOnlyScreen(adminPanelScreen);
    switchAdminTab('scores');
  }

  function switchAdminTab(tab) {
    const isScores = tab === 'scores';
    adminScoresPane.classList.toggle('hidden', !isScores);
    adminTrafficPane.classList.toggle('hidden', isScores);
    btnAdminTabScores.className = `arcade-btn ${isScores ? 'primary' : 'secondary'}`;
    btnAdminTabTraffic.className = `arcade-btn ${!isScores ? 'primary' : 'secondary'}`;
    if (isScores) loadAdminScores();
    else loadAdminTraffic();
  }

  async function loadAdminTraffic() {
    if (!adminSession) return;
    adminTrafficList.innerHTML = '<div class="empty-msg">Loading player traffic...</div>';
    const logs = await OnlineManager.fetchTrafficLogsAsAdmin(adminSession.username, adminSession.password, 60);
    if (!logs.length) {
      adminTrafficSummary.textContent = '0 recorded visits yet.';
      adminTrafficList.innerHTML = '<div class="empty-msg">No traffic logs yet.</div>';
      return;
    }
    const uniqueCountries = new Set(logs.map((l) => l.location || 'Unknown'));
    adminTrafficSummary.textContent = `Recent Visits: ${logs.length} | Distinct Locations: ${uniqueCountries.size}`;
    adminTrafficList.innerHTML = logs
      .map((l) => {
        const dt = l.created_at ? new Date(l.created_at).toLocaleString() : '';
        const fighterName = l.fighter_id ? getFighterById(l.fighter_id).name : '-';
        return `
        <div class="score-row">
          <span><span class="score-player-name">${escapeHtml(l.player_name)}</span> (<span class="score-char-name">${escapeHtml(fighterName)}</span>) &bull; ${escapeHtml(l.mode.toUpperCase())}</span>
          <span class="score-loc"><strong>${escapeHtml(l.location || 'Unknown')}</strong> &bull; ${escapeHtml(dt)}</span>
        </div>`;
      })
      .join('');
  }

  async function loadAdminScores() {
    adminScoresList.innerHTML = '<div class="empty-msg">Loading high scores...</div>';
    const rows = await OnlineManager.fetchHighScores(30);
    if (!rows.length) {
      adminScoresList.innerHTML = '<div class="empty-msg">No high scores in database.</div>';
      return;
    }
    adminScoresList.innerHTML = '';
    rows.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'score-row';
      row.innerHTML = `
        <span><strong>${escapeHtml(r.player_name)}</strong> (${escapeHtml(getFighterById(r.fighter_id).name)}) &bull; ${r.score} PTS (${r.mode.toUpperCase()})</span>
        <button class="mini-btn" style="background:#7a1622; border-color:#ff4d6d;">DELETE</button>
      `;
      row.querySelector('button').addEventListener('click', async () => {
        if (!adminSession) return;
        const deleted = await OnlineManager.deleteHighScoreAsAdmin(adminSession.username, adminSession.password, r.id);
        if (deleted) await loadAdminScores();
      });
      adminScoresList.appendChild(row);
    });
  }

  async function handleAdminClearAll() {
    if (!adminSession) return;
    await OnlineManager.clearAllHighScoresAsAdmin(adminSession.username, adminSession.password);
    await loadAdminScores();
  }

  function openOptions() {
    SoundFX.playMenuConfirm();
    gameMode = 'OPTIONS';
    if (optDifficulty) optDifficulty.value = gameOptions.difficulty;
    if (optTime) optTime.value = String(gameOptions.matchTime);
    if (optGore) optGore.value = gameOptions.bloodGore ? 'on' : 'off';
    hudEl.classList.add('hidden');
    showOnlyScreen(optionsScreen);
  }

  function saveAndCloseOptions() {
    if (optDifficulty) gameOptions.difficulty = optDifficulty.value;
    if (optTime) gameOptions.matchTime = Number(optTime.value) || 99;
    if (optGore) gameOptions.bloodGore = optGore.value === 'on';
    localStorage.setItem('br_options', JSON.stringify(gameOptions));
    goToMenu();
  }

  function openStandaloneCredits() {
    SoundFX.playMenuConfirm();
    standaloneCredits = true;
    gameMode = 'CREDITS';
    document.getElementById('credits-winner-title').textContent = 'CREDITS';
    btnCreditsRematch.textContent = 'MAIN MENU';
    btnCreditsChange.textContent = 'BACK';
    const roll = document.getElementById('credits-roll');
    roll.style.animation = 'none';
    void roll.offsetWidth;
    roll.style.animation = '';
    hudEl.classList.add('hidden');
    showOnlyScreen(creditsCutscene);
  }

  async function openLeaderboard() {
    SoundFX.playMenuConfirm();
    gameMode = 'SCORES';
    hudEl.classList.add('hidden');
    showOnlyScreen(leaderboardScreen);
    await loadLeaderboard();
  }

  async function loadLeaderboard() {
    leaderboardList.innerHTML = '<div class="empty-msg">Loading high scores...</div>';
    const rows = await OnlineManager.fetchHighScores(15);
    if (!rows.length) {
      leaderboardList.innerHTML = '<div class="empty-msg">No high scores yet. Play Arcade or Online to set one!</div>';
      return;
    }
    leaderboardList.innerHTML = rows
      .map(
        (r, i) => `
        <div class="score-row">
          <span><strong>#${i + 1}</strong> <span class="score-player-name">${escapeHtml(r.player_name)}</span> (<span class="score-char-name">${escapeHtml(getFighterById(r.fighter_id).name)}</span>) <span class="score-loc">&bull; ${escapeHtml(r.location || 'Unknown')}${r.clear_time ? ` &bull; ${escapeHtml(r.clear_time)}` : ''}</span></span>
          <span><strong>${r.score} PTS</strong> &bull; ${r.mode.toUpperCase()}</span>
        </div>`
      )
      .join('');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function populateOnlineFighters() {
    if (!onlineFighterSelect || onlineFighterSelect.options.length > 0) return;
    FIGHTERS.forEach((f) => {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = `${f.name} (Beast: ${f.beastName})`;
      onlineFighterSelect.appendChild(opt);
    });
  }

  async function goToOnline() {
    SoundFX.playMenuConfirm();
    populateOnlineFighters();
    syncPlayerNameFromInput(playerName);
    onlineStatusEl.textContent = 'Ready to host or join a match.';
    gameMode = 'ONLINE';
    hudEl.classList.add('hidden');
    showOnlyScreen(onlineScreen);
    await refreshOpenRooms();
  }

  async function refreshOpenRooms() {
    onlineRoomsList.innerHTML = '<div class="empty-msg">Loading open rooms...</div>';
    const rooms = await OnlineManager.listWaitingRooms();
    if (!rooms.length) {
      onlineRoomsList.innerHTML = '<div class="empty-msg">No open rooms. Click HOST GAME to create one!</div>';
      return;
    }
    onlineRoomsList.innerHTML = '';
    rooms.forEach((r) => {
      const row = document.createElement('div');
      row.className = 'room-row';
      row.innerHTML = `
        <span><strong>${escapeHtml(r.code)}</strong> &bull; ${escapeHtml(r.host_name)} (${escapeHtml(getFighterById(r.host_fighter).name)})</span>
        <button class="mini-btn">JOIN</button>
      `;
      row.querySelector('button').addEventListener('click', () => handleJoinRoom(r.code));
      onlineRoomsList.appendChild(row);
    });
  }

  async function handleHostRoom() {
    syncPlayerNameFromInput(onlinePlayerNameInput.value);
    const fighterId = onlineFighterSelect.value || FIGHTERS[0].id;
    OnlineManager.logPlayerVisit({ playerName, mode: 'online', fighterId });
    onlineStatusEl.textContent = 'Creating room in Supabase...';
    try {
      const code = await OnlineManager.hostRoom(playerName, fighterId);
      onlineRole = 'host';
      onlineHostName = playerName;
      onlineStatusEl.textContent = `Room ${code} created! Share code & waiting for opponent...`;

      const onlineCallbacks = {
        onGuestJoin: (payload) => {
          OnlineManager.stopHeartbeat();
          onlineGuestName = payload.guestName || 'Guest';
          const f1 = getFighterById(fighterId);
          const f2 = getFighterById(payload.guestFighter || FIGHTERS[1].id);
          startMatch(f1, f2);
        },
        onRemoteInput: (inp) => {
          if (inp) {
            remoteInput.left = !!inp.left;
            remoteInput.right = !!inp.right;
            remoteInput.up = !!inp.up;
            remoteInput.down = !!inp.down;
            remoteInput.block = !!inp.block;
            if (inp.punch) remoteInput.punch = true;
            if (inp.kick) remoteInput.kick = true;
            if (inp.transform) remoteInput.transform = true;
          }
        },
        onRematchRequest: (payload) => handleIncomingRematchRequest(payload),
        onRematchAccept: () => {
          SoundFX.playMenuConfirm();
          startMatch(p1.data, p2.data);
        },
        onRematchDecline: () => {
          OnlineManager.disconnectChannel();
          onlineRole = null;
          goToMenu();
        },
        onPeerLeave: () => {
          if (gameMode === 'FIGHT' || gameMode === 'ROUND_INTRO') {
            showBanner('OPPONENT LEFT', 'Returning to menu...', 90);
          }
        }
      };
      OnlineManager.connectChannel(code, onlineCallbacks);
    } catch (err) {
      onlineStatusEl.textContent = `Host error: ${err.message || err}`;
    }
  }

  async function handleJoinRoom(rawCode) {
    syncPlayerNameFromInput(onlinePlayerNameInput.value);
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      onlineStatusEl.textContent = 'Enter a 6-character room code first.';
      return;
    }
    const fighterId = onlineFighterSelect.value || FIGHTERS[1].id;
    OnlineManager.logPlayerVisit({ playerName, mode: 'online', fighterId });
    onlineStatusEl.textContent = `Joining room ${code}...`;
    try {
      const room = await OnlineManager.joinRoom(code, playerName, fighterId);
      onlineRole = 'guest';
      onlineHostName = room.host_name;
      onlineGuestName = playerName;
      const f1 = getFighterById(room.host_fighter);
      const f2 = getFighterById(fighterId);

      OnlineManager.connectChannel(code, {
        onRemoteState: (st) => applyRemoteState(st),
        onMatchEnd: (payload) => handleOnlineMatchEnd(payload),
        onRematchRequest: (payload) => handleIncomingRematchRequest(payload),
        onRematchAccept: () => {
          SoundFX.playMenuConfirm();
          startMatch(p1.data, p2.data);
        },
        onRematchDecline: () => {
          OnlineManager.disconnectChannel();
          onlineRole = null;
          goToMenu();
        },
        onPeerLeave: () => {
          if (gameMode === 'FIGHT' || gameMode === 'ROUND_INTRO') {
            showBanner('HOST DISCONNECTED', 'Returning to menu...', 90);
          }
        }
      });

      // Notify Host that Guest is connected
      setTimeout(() => {
        OnlineManager.sendBroadcast('guest_join', {
          guestName: playerName,
          guestFighter: fighterId
        });
      }, 350);

      startMatch(f1, f2);
    } catch (err) {
      onlineStatusEl.textContent = `Join error: ${err.message || err}`;
    }
  }

  function showBossChallenge() {
    gameMode = 'BOSS_INTRO';
    btnBossMenu.disabled = false;
    btnBossMenu.textContent = 'RUN AWAY';
    const quoteEl = document.getElementById('boss-challenge-quote');
    quoteEl.style.color = '';
    const bossQuotes = [
      '"I coded this game, so I definitely rigged my own hitboxes!"',
      '"Still undefeated since 2004 canteen lunch. Prepare to get clawed!"',
      '"You beat the others... now face the Creator, Director & Stunt Double!"'
    ];
    quoteEl.textContent = bossQuotes[Math.floor(Math.random() * bossQuotes.length)];
    const bossCanvas = document.getElementById('boss-challenge-canvas');
    drawPortrait(bossCanvas, p2.data, false);
    hudEl.classList.add('hidden');
    showOnlyScreen(bossChallengeScreen);
    SoundFX.playTransform(p2.data.id);
  }

  function acceptBossChallenge() {
    SoundFX.playMenuConfirm();
    startRound();
  }

  function goToStory() {
    SoundFX.startBGM();
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

  function handleIncomingRematchRequest(payload) {
    if (gameMode !== 'MATCH_END') return;
    const fromName = (payload && payload.from) || 'Opponent';
    rematchPromptText.textContent = `${fromName} wants a REMATCH!`;
    onlineRematchPrompt.classList.remove('hidden');
    victoryActionsDefault.classList.add('hidden');
  }

  function showMatchEndScreen(title, subtitle) {
    gameMode = 'MATCH_END';
    btnRematch.disabled = false;
    onlineRematchPrompt.classList.add('hidden');
    victoryActionsDefault.classList.remove('hidden');
    document.getElementById('victory-title').textContent = title;
    document.getElementById('victory-subtitle').textContent = subtitle;
    showOnlyScreen(victoryScreen);
  }

  function startMatchFromSelect() {
    SoundFX.playMenuConfirm();
    const playerFighter = FIGHTERS[selectedIndex];
    startArcadeLadder(playerFighter);
  }

  function startArcadeLadder(playerFighter) {
    onlineRole = null;
    arcadeScore = 0;
    liveMatchScore = 0;
    arcadeStartTime = Date.now();
    OnlineManager.logPlayerVisit({ playerName, mode: 'arcade', fighterId: playerFighter.id });
    const nonBossPool = FIGHTERS.filter((f) => f.id !== playerFighter.id && f.id !== 'vickey');
    // Shuffle non-boss pool for Stages 1-4
    for (let i = nonBossPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nonBossPool[i], nonBossPool[j]] = [nonBossPool[j], nonBossPool[i]];
    }
    const boss = getFighterById('vickey');
    arcadeOpponents = [nonBossPool[0], nonBossPool[1], nonBossPool[2], nonBossPool[3], boss];
    arcadeStage = 1;
    startMatch(playerFighter, arcadeOpponents[0]);
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
      maxHealth: data.stats.health * 2,
      health: data.stats.health * 2,
      trailHealth: data.stats.health * 2,
      beastGauge: 0,
      beastDrainRate: 0.1,
      isBeast: false,
      roundsWon: 0,
      state: 'idle',
      stateFrame: 0,
      walkFrame: 0,
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
    pickRandomStageBackground();
    p1 = createFighterState(f1Data, 260, 1, false);
    p2 = createFighterState(f2Data, 700, -1, !onlineRole);
    if (!onlineRole && arcadeStage === 5) {
      p2.maxHealth *= 3;
      p2.health = p2.maxHealth;
      p2.trailHealth = p2.maxHealth;
      SoundFX.startBossBGM();
    } else {
      SoundFX.stopBossBGM();
    }
    roundNumber = 1;
    if (onlineRole) liveMatchScore = 0;

    if (vsStageBadge) {
      if (onlineRole) {
        vsStageBadge.textContent = 'ONLINE VERSUS MATCH';
      } else {
        vsStageBadge.textContent =
          arcadeStage === 5 ? 'FINAL STAGE • CLASS BOSS' : `STAGE ${arcadeStage} OF 5`;
      }
    }
    document.getElementById('vs-p1-name').textContent = onlineRole
      ? `${onlineHostName.toUpperCase()} (${f1Data.name.toUpperCase()})`
      : f1Data.name.toUpperCase();
    document.getElementById('vs-p1-beast').textContent = `BEAST: ${f1Data.beastName.toUpperCase()}`;
    document.getElementById('vs-p2-name').textContent = onlineRole
      ? `${onlineGuestName.toUpperCase()} (${f2Data.name.toUpperCase()})`
      : arcadeStage === 5
        ? `BOSS: ${f2Data.name.toUpperCase()}`
        : f2Data.name.toUpperCase();
    document.getElementById('vs-p2-beast').textContent = `BEAST: ${f2Data.beastName.toUpperCase()}`;
    const vsP1Canvas = document.getElementById('vs-p1-canvas');
    const vsP2Canvas = document.getElementById('vs-p2-canvas');
    drawPortrait(vsP1Canvas, f1Data, false);
    drawPortrait(vsP2Canvas, f2Data, false);

    gameMode = 'VS';
    vsTimer = 240; // ~4 seconds at 60 FPS
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
      f.beastGauge = 0;
      f.isBeast = false;
      f.state = 'idle';
      f.stateFrame = 0;
      f.walkFrame = 0;
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
    bloodDrops = [];
    bloodStains = [];
    floatingTexts = [];
    shockwaves = [];
    starbursts = [];
    roundTimer = onlineRole ? 99 : gameOptions.matchTime;
    timerTicks = 0;
    gameMode = 'ROUND_INTRO';
    introPhase = 1;
    introTimer = 360; // 6 seconds hold for Round 1 / Round 2 / Final Round

    showOnlyScreen(null);
    hudEl.classList.remove('hidden');
    updateHUD();

    const roundTitle =
      roundNumber === 1 ? 'ROUND 1' : roundNumber === 2 ? 'ROUND 2' : 'FINAL ROUND';
    const subTitle = onlineRole
      ? 'ONLINE MATCH'
      : arcadeStage === 5
        ? 'FINAL STAGE'
        : `STAGE ${arcadeStage}`;
    showBanner(roundTitle, subTitle, 360);
    SoundFX.playRoundAnnounce(roundNumber);
  }

  function showBanner(main, sub = '', duration = 75) {
    fightBannerText.textContent = main;
    fightBannerSub.textContent = sub;
    fightBanner.classList.remove('hidden', 'flash');
    void fightBanner.offsetWidth;
    fightBanner.classList.add('flash');
    bannerTimer = duration;
  }

  function showBeastActivateBanner(fighterData, isPlayer2 = false) {
    const banner = isPlayer2 ? p2BeastBanner : p1BeastBanner;
    const nameEl = isPlayer2 ? p2BeastBannerName : p1BeastBannerName;
    const portraitEl = isPlayer2 ? p2BeastPortrait : p1BeastPortrait;

    nameEl.textContent = `- ${fighterData.beastName.toUpperCase()}`;
    if (portraitEl) {
      drawPortrait(portraitEl, fighterData, true);
    }
    banner.classList.remove('hidden', 'mk-pop');
    void banner.offsetWidth;
    banner.classList.add('mk-pop');

    if (isPlayer2) p2BeastBannerTimer = 300; // 5 seconds
    else p1BeastBannerTimer = 300; // 5 seconds
  }

  function showBossIntroBanner(quote) {
    beastActivateKicker.textContent = 'HERE COMES THE CLASS BOSS!';
    beastActivateName.textContent = 'VICKEY SHRESTHA';
    beastActivateQuote.textContent = quote;
    beastActivateQuote.classList.remove('hidden');
    beastActivateBanner.classList.remove('hidden', 'slam');
    void beastActivateBanner.offsetWidth;
    beastActivateBanner.classList.add('slam');
    beastBannerTimer = 155;
  }

  // 3-Phase Street Fighter Attack Frame Data
  // Punch: Startup 6 -> Active 6 -> Recovery 10
  // Kick:  Startup 10 -> Active 8 -> Recovery 14
  function getAttackSpec(fighter, type) {
    const pwr = fighter.data.stats.power;
    const rng = fighter.data.stats.range;
    // Human form deals 30% damage; Beast form unleashes full 1.45x power
    const formMult = fighter.isBeast ? 1.45 : 0.3;

    if (type === 'punch') {
      return {
        startup: 6,
        active: 6,
        recovery: 10,
        damage: Math.max(1, Math.round((5 + pwr * 0.55) * formMult)),
        range: 64 + rng * 4.5,
        height: 54,
        knockback: 4.5,
        hitstun: 16,
        heavy: false
      };
    }
    if (type === 'low_punch') {
      return {
        startup: 5,
        active: 5,
        recovery: 8,
        damage: Math.max(1, Math.round((4 + pwr * 0.45) * formMult)),
        range: 60 + rng * 4.2,
        height: 44,
        knockback: 3.5,
        hitstun: 14,
        heavy: false
      };
    }
    if (type === 'low_kick') {
      return {
        startup: 8,
        active: 8,
        recovery: 13,
        damage: Math.max(2, Math.round((8 + pwr * 0.85) * formMult)),
        range: 86 + rng * 5.4,
        height: 48,
        knockback: fighter.data.id === 'munna' ? 9.5 : 7.5,
        hitstun: 22,
        heavy: true
      };
    }
    return {
      startup: 10,
      active: 8,
      recovery: 14,
      damage: Math.max(2, Math.round((9 + pwr * 0.95) * formMult)),
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
    // Deplete Beast Gauge over ~10 seconds (600 frames at 60 FPS)
    fighter.beastDrainRate = Math.max(0.08, fighter.beastGauge / 600);
    fighter.state = 'transform';
    fighter.stateFrame = 0;
    fighter.vx = 0;
    SoundFX.playTransform(fighter.data.id);
    showBeastActivateBanner(fighter.data, fighter === p2);
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
    if (
      dist < 120 &&
      Math.abs(fighter.y - opponent.y) < 90 &&
      opponent.state !== 'ko' &&
      opponent.state !== 'transform'
    ) {
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
      if (f.stateFrame >= 120) f.state = 'idle';
      return;
    }

    if (
      f.state === 'punch' ||
      f.state === 'kick' ||
      f.state === 'low_punch' ||
      f.state === 'low_kick'
    ) {
      const spec = getAttackSpec(f, f.state);
      f.stateFrame++;

      if (
        !f.hasHitThisAttack &&
        f.stateFrame >= spec.startup &&
        f.stateFrame < spec.startup + spec.active
      ) {
        checkAttackHit(f, opponent, spec);
      }

      if (!f.isCPU && (f.state === 'punch' || f.state === 'low_punch') && keysJustPressed.has('KeyS')) {
        f.comboQueued = true;
      }

      const total = spec.startup + spec.active + spec.recovery;
      if (f.stateFrame >= total) {
        if (f.comboQueued) {
          f.comboQueued = false;
          f.state = f.state === 'low_punch' ? 'low_kick' : 'kick';
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
    // Noticeable speed boost in Beast Mode (+32%)
    const moveSpeed = (1.8 + f.data.stats.speed * 0.24) * (f.isBeast ? 1.32 : 1.0);

    let left = false;
    let right = false;
    let up = false;
    let down = false;
    let punch = false;
    let kick = false;
    let transform = false;

    if (!f.isCPU && !(onlineRole === 'host' && f === p2)) {
      left = keysHeld.has('ArrowLeft');
      right = keysHeld.has('ArrowRight');
      up = keysHeld.has('ArrowUp');
      down = keysHeld.has('ArrowDown');
      punch = keysJustPressed.has('KeyA');
      kick = keysJustPressed.has('KeyS');
      transform = keysJustPressed.has('KeyX');
    } else if (onlineRole === 'host' && f === p2) {
      left = remoteInput.left;
      right = remoteInput.right;
      up = remoteInput.up;
      down = remoteInput.down;
      punch = remoteInput.punch;
      kick = remoteInput.kick;
      transform = remoteInput.transform;
      remoteInput.punch = false;
      remoteInput.kick = false;
      remoteInput.transform = false;
    } else {
      const ai = computeCPUInput(f, opponent);
      left = ai.left;
      right = ai.right;
      up = ai.up;
      down = ai.down;
      punch = ai.punch;
      kick = ai.kick;
      transform = ai.transform;
    }

    const holdingBack = (f.facing === 1 && left && !right) || (f.facing === -1 && right && !left);
    f.holdingBack = holdingBack;

    if (transform && f.beastGauge >= 50 && !f.isBeast && grounded) {
      triggerTransform(f, opponent);
      return;
    }

    const opponentAttacking =
      opponent &&
      (opponent.state === 'punch' ||
        opponent.state === 'kick' ||
        opponent.state === 'low_punch' ||
        opponent.state === 'low_kick');
    if (holdingBack && grounded && opponentAttacking) {
      f.state = 'block';
      f.vx = 0;
      return;
    }

    if (punch) {
      f.state = down && grounded ? 'low_punch' : 'punch';
      f.stateFrame = 0;
      f.hasHitThisAttack = false;
      f.comboQueued = false;
      if (grounded) f.vx *= 0.2;
      SoundFX.playPunch();
      SoundFX.playAttackVoice(f.data.id, f.isBeast, false);
      return;
    }

    if (kick) {
      f.state = down && grounded ? 'low_kick' : 'kick';
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
      if (grounded) {
        f.state = 'walk';
        f.walkFrame++;
      } else {
        f.walkFrame = 0;
      }
    } else if (right && !left) {
      f.vx = moveSpeed;
      if (grounded) {
        f.state = 'walk';
        f.walkFrame++;
      } else {
        f.walkFrame = 0;
      }
    } else {
      f.vx = 0;
      f.walkFrame = 0;
      if (grounded) f.state = 'idle';
    }

    if (!grounded) {
      f.state = 'jump';
      f.walkFrame = 0;
    }
  }

  // CPU AI scaled by Options Difficulty (easy = original approachable AI)
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

    let diff = gameOptions.difficulty || 'easy';
    if (!onlineRole && arcadeStage === 5 && cpu === p2) {
      const bossTier = { easy: 'medium', normal: 'hard', medium: 'hard', hard: 'brutal', brutal: 'brutal' };
      diff = bossTier[diff] || 'medium';
    }
    const diffCfg = {
      easy: { minCd: 24, cdVar: 19, react: 12, blockProb: 0.25, aggro: 0.52 },
      medium: { minCd: 16, cdVar: 13, react: 8, blockProb: 0.42, aggro: 0.66 },
      hard: { minCd: 10, cdVar: 9, react: 4, blockProb: 0.62, aggro: 0.78 },
      brutal: { minCd: 5, cdVar: 6, react: 1, blockProb: 0.80, aggro: 0.90 }
    }[diff] || { minCd: 24, cdVar: 19, react: 12, blockProb: 0.25, aggro: 0.52 };

    const dx = player.x - cpu.x;
    const dist = Math.abs(dx);
    const dirToPlayer = dx >= 0 ? 1 : -1;

    const playerAttacking =
      player.state === 'punch' ||
      player.state === 'kick' ||
      player.state === 'low_punch' ||
      player.state === 'low_kick';
    if (playerAttacking && dist < 115) {
      cpu.aiReactionTimer++;
      if (cpu.aiReactionTimer >= diffCfg.react && cpu.aiAction === 'block_ready') {
        out.left = cpu.facing === 1;
        out.right = cpu.facing === -1;
        return out;
      }
      if (cpu.aiReactionTimer === diffCfg.react) {
        cpu.aiAction = Math.random() < diffCfg.blockProb ? 'block_ready' : 'pause';
      }
    } else {
      cpu.aiReactionTimer = 0;
      if (cpu.aiAction === 'block_ready') cpu.aiAction = 'pause';
    }

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

    cpu.aiCooldown = diffCfg.minCd + Math.floor(Math.random() * diffCfg.cdVar);
    const r = Math.random();

    if (!cpu.isBeast && cpu.beastGauge >= 50 && dist < 240 && r < (diff === 'brutal' ? 0.85 : 0.3)) {
      out.transform = true;
      return out;
    }

    if (dist < 88) {
      if (r < diffCfg.aggro * 0.58) out.punch = true;
      else if (r < diffCfg.aggro) out.kick = true;
      else if (r < 0.82) cpu.aiAction = 'pause';
      else cpu.aiAction = 'retreat';
    } else if (dist < 140) {
      if (r < 0.16) out.punch = true;
      else if (r < 0.30) out.kick = true;
      else if (r < 0.72) cpu.aiAction = 'approach';
      else if (r < 0.88) cpu.aiAction = 'pause';
      else cpu.aiAction = 'retreat';
    } else {
      if (r < 0.72) cpu.aiAction = 'approach';
      else if (r < 0.92) cpu.aiAction = 'pause';
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
    const isLow = f.state === 'crouch' || f.state === 'low_punch' || f.state === 'low_kick';
    const h = (isLow ? 120 : 192) * s;
    return { x: f.x - w / 2, y: f.y - h, w, h };
  }

  function getActiveHitbox(f) {
    if (
      f.state !== 'punch' &&
      f.state !== 'kick' &&
      f.state !== 'low_punch' &&
      f.state !== 'low_kick'
    ) {
      return null;
    }
    const spec = getAttackSpec(f, f.state);
    if (f.stateFrame < spec.startup || f.stateFrame >= spec.startup + spec.active) {
      return null;
    }
    const s = getFighterScale(f);
    const w = spec.range;
    const h = spec.height;
    const x = f.facing === 1 ? f.x + 20 * s : f.x - 20 * s - w;
    const isAir = f.y < STAGE.groundY - 1;
    let y = isAir ? f.y - 110 * s : f.y - 166 * s;
    if (f.state === 'kick') y = isAir ? f.y - 95 * s : f.y - 142 * s;
    else if (f.state === 'low_punch') y = f.y - 90 * s;
    else if (f.state === 'low_kick') y = f.y - 56 * s;
    return { x, y, w, h };
  }

  function boxesIntersect(a, b) {
    if (!a || !b) return false;
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function checkAttackHit(attacker, defender, spec) {
    if (defender.state === 'ko' || defender.state === 'transform') return;

    const defenderCrouching =
      defender.state === 'crouch' ||
      defender.state === 'low_punch' ||
      defender.state === 'low_kick';
    const attackerGrounded = attacker.y >= STAGE.groundY - 1;

    // Rock-Paper-Scissors: standing mid punch/kick whiffs over crouching opponents
    if (
      attackerGrounded &&
      (attacker.state === 'punch' || attacker.state === 'kick') &&
      defenderCrouching
    ) {
      return;
    }

    const hitbox = getActiveHitbox(attacker);
    const hurtbox = getHurtbox(defender);
    if (!boxesIntersect(hitbox, hurtbox)) return;

    attacker.hasHitThisAttack = true;
    const impactX = Math.max(hurtbox.x, Math.min(hurtbox.x + hurtbox.w, hitbox.x + (attacker.facing === 1 ? hitbox.w * 0.75 : hitbox.w * 0.25)));
    const impactY = hitbox.y + hitbox.h * 0.5;

    const defenderCanBlock =
      defender.state === 'block' ||
      (defender.holdingBack &&
        defender.y >= STAGE.groundY - 1 &&
        (defender.state === 'idle' || defender.state === 'walk' || defender.state === 'crouch'));
    if (defenderCanBlock) {
      defender.state = 'block';
      defender.vx = 0;
      const chipDmg = Math.max(1, Math.round(spec.damage * 0.25));
      defender.health = Math.max(0, defender.health - chipDmg);
      defender.beastGauge = Math.min(100, defender.beastGauge + 4.5);
      defender.blockRecoil = 8;
      attacker.beastGauge = Math.min(100, attacker.beastGauge + 2);
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
      const localAttacker = onlineRole === 'guest' ? attacker === p2 : attacker === p1;
      if (localAttacker) {
        liveMatchScore += spec.damage * 10 + (attacker.comboCount > 1 ? attacker.comboCount * 15 : 0);
      }
      if (!attacker.isBeast) attacker.beastGauge = Math.min(100, attacker.beastGauge + 6);
      if (!defender.isBeast) defender.beastGauge = Math.min(100, defender.beastGauge + 5);

      SoundFX.playHit(spec.heavy);
      SoundFX.playHitVoice(defender.data.id, defender.isBeast);
      spawnHitSparks(impactX, impactY, spec.heavy ? '#ff4d6d' : '#ffd369', spec.heavy ? 18 : 11);
      if (gameOptions.bloodGore) {
        spawnBloodSpray(impactX, impactY, attacker.facing, spec.heavy ? 22 : 12);
      }
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
    showBanner('K.O.!', `${winner.data.name.toUpperCase()} TAKES THE ROUND`, 180); // 3 seconds
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
    showBanner('TIME OVER!', winner ? `${winner.data.name.toUpperCase()} WINS ROUND` : 'DRAW ROUND', 180); // 3 seconds
    updateHUD();
  }

  function finishRoundTransition() {
    if (p1.roundsWon >= 2 || p2.roundsWon >= 2) {
      const p1Won = p1.roundsWon >= 2;

      if (!onlineRole) {
        if (p1Won) {
          arcadeScore = Math.max(arcadeScore, liveMatchScore) + 500 + Math.round(p1.health * 5);
          liveMatchScore = arcadeScore;
          if (arcadeStage < 5) {
            gameMode = 'POST_MATCH_BANNER';
            showBanner('YOU WIN!', `ADVANCING TO ${arcadeStage + 1 === 5 ? 'FINAL STAGE' : `STAGE ${arcadeStage + 1}`}`, 240);
            postMatchCallback = () => {
              arcadeStage++;
              startMatch(p1.data, arcadeOpponents[arcadeStage - 1]);
            };
            return;
          }
          const elapsedSec = Math.max(1, Math.round((Date.now() - arcadeStartTime) / 1000));
          const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
          const secs = String(elapsedSec % 60).padStart(2, '0');
          const clearTime = `${mins}:${secs}`;
          OnlineManager.submitHighScore({
            playerName,
            fighterId: p1.data.id,
            mode: 'arcade',
            score: arcadeScore + 1000,
            wins: 5,
            clearTime
          });
          gameMode = 'POST_MATCH_BANNER';
          showBanner('YOU WIN!', 'TOURNAMENT CHAMPION!', 240);
          postMatchCallback = () => {
            SoundFX.stopBossBGM();
            hudEl.classList.add('hidden');
            standaloneCredits = false;
            btnCreditsRematch.textContent = 'REMATCH';
            btnCreditsChange.textContent = 'CHANGE FIGHTER';
            gameMode = 'VICTORY_CUTSCENE';
            p1.x = 265;
            p1.y = STAGE.groundY;
            p1.facing = 1;
            p1.state = 'victory';
            document.getElementById('credits-winner-title').textContent =
              `${p1.data.name.toUpperCase()} WINS!`;
            const roll = document.getElementById('credits-roll');
            roll.style.animation = 'none';
            void roll.offsetWidth;
            roll.style.animation = '';
            showOnlyScreen(creditsCutscene);
          };
        } else {
          // Arcade loss: do not store unfinished run on scoreboard
          gameMode = 'POST_MATCH_BANNER';
          showBanner('YOU LOSE!', `${p2.data.name.toUpperCase()} TAKES THE MATCH`, 240);
          postMatchCallback = () => {
            SoundFX.stopBossBGM();
            hudEl.classList.add('hidden');
            showMatchEndScreen(
              'GAME OVER',
              `${p2.data.name} (Beast: ${p2.data.beastName}) defeated you on ${arcadeStage === 5 ? 'Final Stage' : `Stage ${arcadeStage}`}!`
            );
          };
        }
      } else {
        // Online Match End: broadcast to Guest and show 4s YOU WIN! / YOU LOSE! banner
        const payload = {
          p1RoundsWon: p1.roundsWon,
          p2RoundsWon: p2.roundsWon,
          p1Health: p1.health,
          p2Health: p2.health
        };
        OnlineManager.sendBroadcast('match_end', payload);
        handleOnlineMatchEnd(payload);
      }
    } else {
      roundNumber++;
      startRound();
    }
  }

  function handleOnlineMatchEnd(payload) {
    if (!p1 || !p2) return;
    if (payload) {
      p1.roundsWon = payload.p1RoundsWon ?? p1.roundsWon;
      p2.roundsWon = payload.p2RoundsWon ?? p2.roundsWon;
      p1.health = payload.p1Health ?? p1.health;
      p2.health = payload.p2Health ?? p2.health;
    }
    const p1Won = p1.roundsWon >= 2;
    const localIsP1 = onlineRole === 'host';
    const localFighter = localIsP1 ? p1 : p2;
    const localWon = (localIsP1 && p1Won) || (!localIsP1 && !p1Won);
    const matchScore = Math.max(liveMatchScore, 500) + 1000 + Math.round(localFighter.health * 5);

    // Online Mode: only store the winner on the scoreboard
    if (localWon) {
      OnlineManager.submitHighScore({
        playerName,
        fighterId: localFighter.data.id,
        mode: 'online',
        score: matchScore,
        wins: 1
      });
    }

    gameMode = 'POST_MATCH_BANNER';
    showBanner(
      localWon ? 'YOU WIN!' : 'YOU LOSE!',
      `${p1Won ? onlineHostName : onlineGuestName} wins ${p1.roundsWon} - ${p2.roundsWon}!`,
      240
    );
    postMatchCallback = () => {
      hudEl.classList.add('hidden');
      showMatchEndScreen(
        localWon ? 'YOU WIN!' : 'YOU LOSE!',
        `${p1Won ? onlineHostName : onlineGuestName} wins ${p1.roundsWon} - ${p2.roundsWon}! Score saved to Supabase.`
      );
    };
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

    if (f.isBeast && f.state !== 'transform' && gameMode === 'FIGHT') {
      f.beastGauge = Math.max(0, f.beastGauge - (f.beastDrainRate || 0.1));
      if (f.beastGauge <= 0) {
        f.isBeast = false;
        spawnFloatingText(f.x, f.y - 160, 'REVERT', '#8a92a6');
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

  function spawnBloodSpray(x, y, dir, count) {
    for (let i = 0; i < count; i++) {
      const speed = 2.5 + Math.random() * 6.5;
      const spread = (Math.random() - 0.35) * 1.1;
      bloodDrops.push({
        x,
        y,
        vx: dir * Math.cos(spread) * speed + (Math.random() - 0.5) * 2.5,
        vy: -2.0 - Math.random() * 5.0,
        size: 2.5 + Math.random() * 4.5,
        color: Math.random() < 0.45 ? '#8c0812' : '#d91122',
        life: 45 + Math.random() * 25
      });
    }
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

  let lastHudTimer = -1;
  let lastHudScore = -1;
  let lastHudRound = -1;
  const lastFighterHud = { p1: {}, p2: {} };

  function updateHUD() {
    if (!p1 || !p2) return;

    if (lastHudRound !== roundNumber) {
      lastHudRound = roundNumber;
      document.getElementById('p1-name').textContent = p1.data.name.toUpperCase();
      document.getElementById('p2-name').textContent = p2.data.name.toUpperCase();
      document.getElementById('round-label').textContent = `ROUND ${roundNumber}`;

      const stageBadge = document.getElementById('stage-badge');
      if (stageBadge) {
        if (onlineRole) {
          stageBadge.textContent = 'ONLINE 1V1';
          stageBadge.classList.remove('boss');
        } else {
          stageBadge.textContent = arcadeStage === 5 ? 'FINAL STAGE' : `STAGE ${arcadeStage}`;
          stageBadge.classList.toggle('boss', arcadeStage === 5);
        }
      }
    }

    if (lastHudTimer !== roundTimer) {
      lastHudTimer = roundTimer;
      const timerBox = document.getElementById('timer-box');
      timerBox.textContent = String(roundTimer).padStart(2, '0');
      timerBox.classList.toggle('urgent', roundTimer <= 15);
    }

    if (hudScoreBox && lastHudScore !== liveMatchScore) {
      lastHudScore = liveMatchScore;
      hudScoreBox.textContent = `SCORE: ${liveMatchScore}`;
    }

    updateFighterHUD('p1', p1);
    updateFighterHUD('p2', p2);

    if (!isMobileDevice()) {
      const keyMap = { KeyA: 'hud-key-A', KeyS: 'hud-key-S', KeyX: 'hud-key-X' };
      Object.entries(keyMap).forEach(([code, elId]) => {
        const el = document.getElementById(elId);
        if (el) el.classList.toggle('active', keysHeld.has(code));
      });
    }
  }

  function updateFighterHUD(prefix, f) {
    const cache = lastFighterHud[prefix];
    const hpPct = Math.max(0, Math.round((f.health / f.maxHealth) * 1000) / 10);
    const trailPct = Math.max(0, Math.round((f.trailHealth / f.maxHealth) * 1000) / 10);

    if (cache.hpPct !== hpPct) {
      cache.hpPct = hpPct;
      const fill = document.getElementById(`${prefix}-health-fill`);
      fill.style.width = `${hpPct}%`;
      fill.classList.toggle('low', hpPct < 28);
    }
    if (cache.trailPct !== trailPct) {
      cache.trailPct = trailPct;
      document.getElementById(`${prefix}-health-trail`).style.width = `${trailPct}%`;
    }

    if (cache.beastName !== f.data.beastName) {
      cache.beastName = f.data.beastName;
      const beastLabel = document.getElementById(`${prefix}-beast-label`);
      if (beastLabel) {
        beastLabel.textContent = `BEAST: ${f.data.beastName.toUpperCase()}`;
      }
    }

    const beastRound = Math.round(f.beastGauge * 10) / 10;
    const ready = !f.isBeast && f.beastGauge >= 50;
    if (cache.beastRound !== beastRound || cache.isBeast !== f.isBeast) {
      cache.beastRound = beastRound;
      const beastFill = document.getElementById(`${prefix}-beast-fill`);
      beastFill.style.width = `${beastRound}%`;
      beastFill.classList.toggle('ready', ready);
      beastFill.classList.toggle('active', f.isBeast);
    }

    if (cache.isBeast !== f.isBeast || cache.beastNameBadge !== f.data.beastName) {
      cache.isBeast = f.isBeast;
      cache.beastNameBadge = f.data.beastName;
      const badge = document.getElementById(`${prefix}-form-badge`);
      badge.textContent = f.isBeast ? `BEAST: ${f.data.beastName.toUpperCase()}` : 'HUMAN';
      badge.className = `form-badge ${f.isBeast ? 'beast' : 'human'}`;
    }

    if (cache.ready !== ready) {
      cache.ready = ready;
      document.getElementById(`${prefix}-beast-ready`).classList.toggle('hidden', !ready);
    }

    const showCombo = f.comboCount >= 2 && f.comboDisplayTimer > 0;
    const comboKey = showCombo ? f.comboCount : 0;
    if (cache.comboKey !== comboKey) {
      cache.comboKey = comboKey;
      const comboEl = document.getElementById(`${prefix}-combo`);
      if (showCombo) {
        comboEl.textContent = `${f.comboCount} HIT COMBO!`;
        comboEl.classList.remove('hidden');
      } else {
        comboEl.classList.add('hidden');
      }
    }

    if (cache.roundsWon !== f.roundsWon) {
      cache.roundsWon = f.roundsWon;
      const pips = document.getElementById(`${prefix}-rounds`).children;
      for (let i = 0; i < pips.length; i++) {
        pips[i].classList.toggle('won', i < f.roundsWon);
      }
    }
  }

  // Stage Background (random photo from assets/background1..10.jpg, aspect-safe without stretching)
  let mobileStageCacheCanvas = null;
  let mobileStageCacheKey = '';

  function renderStageToContext(targetCtx) {
    const bg = currentStageBg;
    if (bg && bg.complete && bg.naturalWidth > 0) {
      const iw = bg.naturalWidth;
      const ih = bg.naturalHeight;

      if (iw >= ih) {
        // Landscape photo: cover cleanly, biased slightly upward so faces stay visible
        const scale = Math.max(STAGE.width / iw, STAGE.height / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (STAGE.width - dw) / 2;
        const dy = (STAGE.height - dh) * 0.25;
        targetCtx.drawImage(bg, dx, dy, dw, dh);
      } else {
        // Portrait photo: skip expensive GPU blur on mobile for 60 FPS performance
        if (!isMobileDevice()) {
          targetCtx.save();
          targetCtx.filter = 'blur(14px) brightness(0.42)';
          const coverScale = Math.max(STAGE.width / iw, STAGE.height / ih);
          const cw = iw * coverScale;
          const ch = ih * coverScale;
          targetCtx.drawImage(bg, (STAGE.width - cw) / 2, (STAGE.height - ch) / 2, cw, ch);
          targetCtx.restore();
        } else {
          targetCtx.fillStyle = '#0b0d14';
          targetCtx.fillRect(0, 0, STAGE.width, STAGE.floorTopY);
        }

        const containScale = Math.min(STAGE.width / iw, STAGE.height / ih);
        const dw = iw * containScale;
        const dh = ih * containScale;
        targetCtx.drawImage(bg, (STAGE.width - dw) / 2, (STAGE.height - dh) / 2, dw, dh);
      }

      // Subtle dark contrast overlay so fighters & HUD stay crisp
      targetCtx.fillStyle = 'rgba(7, 8, 14, 0.34)';
      targetCtx.fillRect(0, 0, STAGE.width, STAGE.floorTopY);
    } else {
      const sky = targetCtx.createLinearGradient(0, 0, 0, STAGE.floorTopY);
      sky.addColorStop(0, '#07080d');
      sky.addColorStop(0.55, '#151824');
      sky.addColorStop(1, '#261822');
      targetCtx.fillStyle = sky;
      targetCtx.fillRect(0, 0, STAGE.width, STAGE.floorTopY);
    }

    // Polished Wooden Dojo Floor (starts at floorTopY; fighters stand in the middle at groundY)
    const floorH = STAGE.height - STAGE.floorTopY;
    const woodGrad = targetCtx.createLinearGradient(0, STAGE.floorTopY, 0, STAGE.height);
    woodGrad.addColorStop(0, '#5a3821');
    woodGrad.addColorStop(0.45, '#422716');
    woodGrad.addColorStop(1, '#24140b');
    targetCtx.fillStyle = woodGrad;
    targetCtx.fillRect(0, STAGE.floorTopY, STAGE.width, floorH);

    // Subtle horizontal plank bands
    targetCtx.fillStyle = 'rgba(255, 210, 160, 0.04)';
    targetCtx.fillRect(0, STAGE.floorTopY + 18, STAGE.width, 20);
    targetCtx.fillRect(0, STAGE.floorTopY + 64, STAGE.width, 24);

    // Perspective plank seams
    targetCtx.strokeStyle = 'rgba(18, 9, 4, 0.55)';
    targetCtx.lineWidth = 2;
    targetCtx.beginPath();
    for (let y = STAGE.floorTopY + 18; y < STAGE.height; y += 26) {
      targetCtx.moveTo(0, y);
      targetCtx.lineTo(STAGE.width, y);
    }
    for (let i = -6; i <= 6; i++) {
      targetCtx.moveTo(480 + i * 74, STAGE.floorTopY);
      targetCtx.lineTo(480 + i * 140, STAGE.height);
    }
    targetCtx.stroke();

    // Crisp wooden floor horizon trim
    targetCtx.strokeStyle = '#9c6b3b';
    targetCtx.lineWidth = 3;
    targetCtx.beginPath();
    targetCtx.moveTo(0, STAGE.floorTopY);
    targetCtx.lineTo(STAGE.width, STAGE.floorTopY);
    targetCtx.stroke();
  }

  function drawStage() {
    if (isMobileDevice()) {
      const bg = currentStageBg;
      const cacheKey = bg && bg.complete && bg.naturalWidth > 0 ? bg.src : 'fallback';
      if (!mobileStageCacheCanvas || mobileStageCacheKey !== cacheKey) {
        if (!mobileStageCacheCanvas) {
          mobileStageCacheCanvas = document.createElement('canvas');
          mobileStageCacheCanvas.width = STAGE.width;
          mobileStageCacheCanvas.height = STAGE.height;
        }
        const cctx = mobileStageCacheCanvas.getContext('2d');
        renderStageToContext(cctx);
        mobileStageCacheKey = cacheKey;
      }
      ctx.drawImage(mobileStageCacheCanvas, 0, 0);
      return;
    }
    renderStageToContext(ctx);
  }

  function renderEffects() {
    // Floor Blood Splatters
    for (let i = bloodStains.length - 1; i >= 0; i--) {
      const st = bloodStains[i];
      st.life--;
      if (st.life <= 0) {
        bloodStains.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = Math.min(0.72, st.life / 120);
      ctx.fillStyle = st.color;
      ctx.beginPath();
      ctx.ellipse(st.x, st.y, st.rx, st.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Flying Blood Droplets
    for (let i = bloodDrops.length - 1; i >= 0; i--) {
      const b = bloodDrops[i];
      b.x += b.vx;
      b.y += b.vy;
      b.vy += 0.38;
      b.life--;
      if (b.y >= STAGE.groundY) {
        if (bloodStains.length < 40) {
          bloodStains.push({
            x: b.x,
            y: STAGE.groundY + (Math.random() * 6 - 2),
            rx: b.size * 1.6,
            ry: b.size * 0.55,
            color: b.color,
            life: 240
          });
        }
        bloodDrops.splice(i, 1);
        continue;
      }
      if (b.life <= 0) {
        bloodDrops.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

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

  function packFighterState(f) {
    return {
      x: Math.round(f.x),
      y: Math.round(f.y),
      vx: f.vx,
      vy: f.vy,
      facing: f.facing,
      health: f.health,
      trailHealth: f.trailHealth,
      beastGauge: Math.round(f.beastGauge),
      isBeast: f.isBeast,
      roundsWon: f.roundsWon,
      state: f.state,
      stateFrame: f.stateFrame,
      walkFrame: f.walkFrame,
      comboCount: f.comboCount,
      hitFlash: f.hitFlash,
      blockRecoil: f.blockRecoil
    };
  }

  function applyFighterSnapshot(f, snap) {
    if (!f || !snap) return;
    Object.assign(f, snap);
  }

  function applyRemoteState(st) {
    if (!st || onlineRole !== 'guest') return;
    if (st.gameMode && st.gameMode !== gameMode) {
      gameMode = st.gameMode;
      if (gameMode === 'ROUND_INTRO' || gameMode === 'FIGHT') {
        showOnlyScreen(null);
        hudEl.classList.remove('hidden');
      }
    }
    roundNumber = st.roundNumber ?? roundNumber;
    roundTimer = st.roundTimer ?? roundTimer;
    applyFighterSnapshot(p1, st.p1);
    applyFighterSnapshot(p2, st.p2);
    updateHUD();
  }

  // Main Loop: PC runs 1 step/rAF (untouched); Mobile uses snappy 80Hz delta-time + cached stage + zero HUD thrashing
  const MOBILE_STEP_MS = 1000 / 80;
  let mobileLastTime = performance.now();
  let mobileAccumulator = 0;

  function stepSimulation() {
    if (isPaused) {
      keysJustPressed.clear();
      return;
    }
    globalTime++;

    if (gameMode === 'VS') {
      vsTimer--;
      if (vsTimer <= 0) {
        if (!onlineRole && arcadeStage === 5) showBossChallenge();
        else startRound();
      }
    }

    if (bannerTimer > 0) {
      bannerTimer--;
      if (bannerTimer <= 0) {
        fightBanner.classList.add('hidden');
        if (gameMode === 'ROUND_END' && onlineRole !== 'guest') {
          finishRoundTransition();
        } else if (gameMode === 'POST_MATCH_BANNER' && postMatchCallback) {
          const cb = postMatchCallback;
          postMatchCallback = null;
          cb();
        }
      }
    }

    if (p1BeastBannerTimer > 0) {
      p1BeastBannerTimer--;
      if (p1BeastBannerTimer <= 0) {
        p1BeastBanner.classList.add('hidden');
      }
    }
    if (p2BeastBannerTimer > 0) {
      p2BeastBannerTimer--;
      if (p2BeastBannerTimer <= 0) {
        p2BeastBanner.classList.add('hidden');
      }
    }

    if (gameMode === 'ROUND_INTRO' && onlineRole !== 'guest') {
      introTimer--;
      if (introTimer <= 0) {
        introPhase = 0;
        gameMode = 'FIGHT';
        showBanner('FIGHT!', '', 150); // 2.5 seconds hold for FIGHT!
        SoundFX.playRoundStart();
      }
    }

    // Online Guest: stream local input to Host
    if (onlineRole === 'guest' && (gameMode === 'FIGHT' || gameMode === 'ROUND_INTRO')) {
      onlineSyncTick++;
      const hasTrigger =
        keysJustPressed.has('KeyA') || keysJustPressed.has('KeyS') || keysJustPressed.has('KeyX');
      if (hasTrigger || onlineSyncTick % 2 === 0) {
        OnlineManager.sendBroadcast('input', {
          left: keysHeld.has('ArrowLeft'),
          right: keysHeld.has('ArrowRight'),
          up: keysHeld.has('ArrowUp'),
          down: keysHeld.has('ArrowDown'),
          punch: keysJustPressed.has('KeyA'),
          kick: keysJustPressed.has('KeyS'),
          transform: keysJustPressed.has('KeyX')
        });
      }
    }

    if (
      (gameMode === 'ROUND_INTRO' || gameMode === 'FIGHT' || gameMode === 'ROUND_END') &&
      onlineRole !== 'guest'
    ) {
      if (hitstopFrames > 0) {
        hitstopFrames--;
      } else {
        if (gameMode === 'FIGHT') {
          timerTicks++;
          const ticksPerSec = isMobileDevice() ? 80 : 60;
          if (timerTicks >= ticksPerSec) {
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

      // Online Host: broadcast authoritative state to Guest
      if (onlineRole === 'host') {
        onlineSyncTick++;
        if (onlineSyncTick % 2 === 0) {
          OnlineManager.sendBroadcast('state', {
            gameMode,
            roundNumber,
            roundTimer,
            p1: packFighterState(p1),
            p2: packFighterState(p2)
          });
        }
      }
    }

    keysJustPressed.clear();
  }

  function loop(now) {
    if (isMobileDevice()) {
      const ts = now || performance.now();
      const dt = Math.min(80, Math.max(0, ts - mobileLastTime));
      mobileLastTime = ts;
      mobileAccumulator += dt;
      let steps = 0;
      while (mobileAccumulator >= MOBILE_STEP_MS - 0.5 && steps < 3) {
        stepSimulation();
        mobileAccumulator -= MOBILE_STEP_MS;
        if (mobileAccumulator < 0) mobileAccumulator = 0;
        steps++;
      }
    } else {
      stepSimulation();
    }

    if (
      (gameMode === 'ROUND_INTRO' || gameMode === 'FIGHT' || gameMode === 'ROUND_END') &&
      onlineRole !== 'guest'
    ) {
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
    if (
      (gameMode === 'ROUND_INTRO' ||
        gameMode === 'FIGHT' ||
        gameMode === 'ROUND_END' ||
        gameMode === 'POST_MATCH_BANNER' ||
        gameMode === 'MATCH_END') &&
      p1 &&
      p2
    ) {
      drawFighter(ctx, p1, globalTime);
      drawFighter(ctx, p2, globalTime);
      drawDebugBoxes();
      renderEffects();
    } else if (gameMode === 'VICTORY_CUTSCENE' && p1) {
      drawTrophyCutscene(ctx, p1, globalTime);
      renderEffects();
    }
    ctx.restore();

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
