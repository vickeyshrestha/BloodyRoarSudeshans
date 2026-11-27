// Modular, lightweight procedural 2D Canvas WeatherSystem with 3D z-depth parallax

class WeatherSystem {
  static PRESETS = ['sunny', 'cloudy', 'rain', 'snow'];

  constructor(options = {}) {
    this.width = options.width || 960;
    this.height = options.height || 540;
    this.floorTopY = options.floorTopY || 412;
    this.groundY = options.groundY || 488;
    this.enabled = options.enabled !== false;
    this.preset = 'sunny';
    this.lastPreset = null;
    this.time = 0;
    this.sunFromRight = false;
    this.clouds = [];
    this.cloudStamps = { light: [], dark: [] };
    this.drops = [];
    this.splashes = [];
    this.flakes = [];
    this.motes = [];
    this.rays = [];
    this._initCloudStamps();
    this.resetForStage(false);
  }

  _initCloudStamps() {
    if (typeof document === 'undefined') return;
    for (let i = 0; i < 4; i++) {
      this.cloudStamps.light.push(this._bakeVolumetricCloud(260, 110, 13.7 + i * 31.3, false));
      this.cloudStamps.dark.push(this._bakeVolumetricCloud(260, 110, 91.1 + i * 27.9, true));
    }
  }

  _hash2(ix, iy, seed) {
    const n = Math.sin(ix * 127.1 + iy * 311.7 + seed * 74.7) * 43758.5453123;
    return n - Math.floor(n);
  }

  _vnoise(x, y, seed) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = this._hash2(ix, iy, seed);
    const b = this._hash2(ix + 1, iy, seed);
    const c = this._hash2(ix, iy + 1, seed);
    const d = this._hash2(ix + 1, iy + 1, seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  _fbm(x, y, seed) {
    let v = 0;
    let amp = 0.52;
    let freq = 1;
    for (let o = 0; o < 4; o++) {
      v += amp * this._vnoise(x * freq, y * freq, seed + o * 17.3);
      freq *= 2.05;
      amp *= 0.48;
    }
    return v;
  }

  _cloudDensity(nx, ny, seed) {
    // Cumulus silhouette: flatter base around ny = 0.25, billowy domes above
    const rx = nx / 0.88;
    const ry = ny > 0 ? (ny / 0.42) : (ny / 0.82);
    const dist = Math.sqrt(rx * rx + ry * ry);
    if (dist >= 1.05) return 0;
    const falloff = Math.max(0, 1 - dist * dist);
    const n = this._fbm(nx * 2.8 + 4.0, ny * 3.1 + 4.0, seed);
    const raw = falloff * 0.85 + n * 0.62 - 0.56;
    return Math.max(0, Math.min(1, raw * 2.1));
  }

  _bakeVolumetricCloud(w, h, seed, dark) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    const data = img.data;

    for (let py = 0; py < h; py++) {
      const ny = (py / h) * 2 - 1.15;
      for (let px = 0; px < w; px++) {
        const nx = (px / w) * 2 - 1;
        const d = this._cloudDensity(nx, ny, seed);
        if (d <= 0.01) continue;

        // Sample toward upper-left sunlight for 3D self-shadowing
        const dSun = this._cloudDensity(nx - 0.055, ny - 0.085, seed);
        const shadowTerm = Math.max(0, dSun - d);
        const heightTerm = Math.max(0, Math.min(1, 0.72 - ny * 0.75));
        const light = Math.max(0, Math.min(1, 0.62 * heightTerm + 0.55 * Math.exp(-shadowTerm * 4.5) - d * 0.12));

        let r, gr, b;
        if (dark) {
          // Moody storm cloud palette
          r = Math.round(52 + light * 92);
          gr = Math.round(62 + light * 98);
          b = Math.round(80 + light * 108);
        } else {
          // Sunlit realistic cumulus palette
          r = Math.round(135 + light * 120);
          gr = Math.round(150 + light * 103);
          b = Math.round(175 + light * 76);
        }

        const idx = (py * w + px) * 4;
        data[idx] = Math.min(255, r);
        data[idx + 1] = Math.min(255, gr);
        data[idx + 2] = Math.min(255, b);
        data[idx + 3] = Math.round(Math.min(1, d * 1.15) * 235);
      }
    }

    g.putImageData(img, 0, 0);
    return c;
  }

  isCompactDevice() {
    return typeof window !== 'undefined' && window.innerWidth <= 900;
  }

  setEnabled(enabled) {
    this.enabled = Boolean(enabled);
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  resetForStage(avoidRepeat = true) {
    const pool =
      avoidRepeat && this.lastPreset
        ? WeatherSystem.PRESETS.filter((p) => p !== this.lastPreset)
        : WeatherSystem.PRESETS;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.setPreset(chosen);
    return chosen;
  }

  setPreset(preset) {
    this.preset = WeatherSystem.PRESETS.includes(preset) ? preset : 'sunny';
    this.lastPreset = this.preset;
    this.time = 0;
    this.clouds = [];
    this.drops = [];
    this.splashes = [];
    this.flakes = [];
    this.motes = [];
    this.rays = [];

    const compact = this.isCompactDevice();
    const isStorm = this.preset === 'rain';
    const cloudCount =
      this.preset === 'cloudy'
        ? (compact ? 7 : 10)
        : this.preset === 'rain'
          ? (compact ? 6 : 9)
          : (compact ? 5 : 7);

    for (let i = 0; i < cloudCount; i++) {
      const z = (i / Math.max(1, cloudCount - 1)) * 0.85 + Math.random() * 0.15;
      this.clouds.push(this._makeCloud(Math.random() * this.width, Math.min(1, z), isStorm));
    }
    this.clouds.sort((a, b) => a.z - b.z);

    if (this.preset === 'rain') {
      const dropCount = compact ? 75 : 135;
      for (let i = 0; i < dropCount; i++) {
        this.drops.push(this._makeDrop(true));
      }
    } else if (this.preset === 'snow') {
      const flakeCount = compact ? 60 : 110;
      for (let i = 0; i < flakeCount; i++) {
        this.flakes.push(this._makeFlake(true));
      }
    } else if (this.preset === 'sunny') {
      this.sunFromRight = Math.random() < 0.5;
      const rayCount = compact ? 4 : 6;
      for (let i = 0; i < rayCount; i++) {
        this.rays.push({
          offset: i / rayCount,
          width: 48 + Math.random() * 68,
          alpha: 0.045 + Math.random() * 0.04,
          phase: Math.random() * Math.PI * 2,
          speed: 0.015 + Math.random() * 0.015
        });
      }
      const moteCount = compact ? 22 : 38;
      for (let i = 0; i < moteCount; i++) {
        this.motes.push(this._makeMote(true));
      }
    }
  }

  _makeCloud(x, z, dark = false) {
    const scale = 0.65 + z * 0.95;
    const stamps = dark ? this.cloudStamps.dark : this.cloudStamps.light;
    const stampIdx = stamps.length ? Math.floor(Math.random() * stamps.length) : 0;
    return {
      x,
      y: 12 + (1 - z) * 78 + Math.random() * 18,
      z,
      scale,
      speed: (0.12 + z * 0.36) * (0.85 + Math.random() * 0.3),
      alpha: dark ? 0.52 + z * 0.25 : (this.preset === 'sunny' ? 0.42 + z * 0.24 : 0.58 + z * 0.26),
      dark,
      stampIdx
    };
  }

  _makeDrop(randomY = false) {
    const z = Math.random();
    const speed = 7.5 + z * 9.5;
    return {
      x: Math.random() * (this.width + 180) - 90,
      y: randomY ? Math.random() * this.groundY : -20 - Math.random() * 80,
      z,
      len: 10 + z * 16,
      speed,
      vx: -1.6 - z * 1.4,
      targetGroundY: this.floorTopY + 14 + Math.random() * (this.groundY - this.floorTopY + 12)
    };
  }

  _makeFlake(randomY = false) {
    const z = Math.random();
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * this.groundY : -12 - Math.random() * 40,
      z,
      r: 1.1 + z * 3.1,
      vy: 0.45 + z * 1.35,
      phase: Math.random() * Math.PI * 2,
      turbFreq: 0.018 + Math.random() * 0.025,
      turbAmp: 0.25 + z * 0.65
    };
  }

  _makeMote(randomY = false) {
    const z = Math.random();
    return {
      x: Math.random() * this.width,
      y: randomY ? Math.random() * (this.groundY - 20) : this.groundY - 30,
      z,
      r: 1.0 + z * 2.0,
      vx: (Math.random() - 0.5) * (0.15 + z * 0.25),
      vy: -0.08 - Math.random() * 0.18,
      phase: Math.random() * Math.PI * 2
    };
  }

  update(dtScale = 1) {
    if (!this.enabled) return;
    this.time += dtScale;

    // Always drift top-horizon 3D clouds in real time across all weather presets
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.x += c.speed * dtScale;
      const wrapMargin = 160 * c.scale;
      if (c.x - wrapMargin > this.width) {
        c.x = -wrapMargin;
      }
    }

    if (this.preset === 'rain') {
      const windSway = Math.sin(this.time * 0.015) * 0.9;
      for (let i = 0; i < this.drops.length; i++) {
        const d = this.drops[i];
        d.x += (d.vx + windSway * (0.6 + d.z * 0.6)) * dtScale;
        d.y += d.speed * dtScale;

        if (d.y >= d.targetGroundY) {
          if (d.z >= 0.55 && this.splashes.length < 36) {
            this.splashes.push({
              x: d.x,
              y: d.targetGroundY,
              r: 1.5,
              maxR: 6 + d.z * 5,
              alpha: 0.42
            });
          }
          const next = this._makeDrop(false);
          d.x = next.x;
          d.y = next.y;
          d.z = next.z;
          d.len = next.len;
          d.speed = next.speed;
          d.vx = next.vx;
          d.targetGroundY = next.targetGroundY;
        }
      }

      for (let i = this.splashes.length - 1; i >= 0; i--) {
        const s = this.splashes[i];
        s.r += 0.42 * dtScale;
        s.alpha -= 0.028 * dtScale;
        if (s.alpha <= 0 || s.r >= s.maxR) {
          this.splashes.splice(i, 1);
        }
      }
    }

    if (this.preset === 'snow') {
      const globalWind = Math.sin(this.time * 0.008) * 0.45;
      for (let i = 0; i < this.flakes.length; i++) {
        const f = this.flakes[i];
        f.y += f.vy * dtScale;
        f.x += (globalWind + Math.sin(this.time * f.turbFreq + f.phase) * f.turbAmp) * dtScale;
        if (f.y > this.groundY + 12) {
          f.y = -10;
          f.x = Math.random() * this.width;
        }
        if (f.x < -15) f.x = this.width + 15;
        else if (f.x > this.width + 15) f.x = -15;
      }
    }

    if (this.preset === 'sunny') {
      for (let i = 0; i < this.motes.length; i++) {
        const m = this.motes[i];
        m.x += (m.vx + Math.sin(this.time * 0.02 + m.phase) * 0.14) * dtScale;
        m.y += m.vy * dtScale;
        if (m.y < 15) {
          m.y = this.groundY - 25;
          m.x = Math.random() * this.width;
        }
        if (m.x < 0) m.x += this.width;
        else if (m.x > this.width) m.x -= this.width;
      }
    }
  }

  _drawCloudObject(ctx, c) {
    const stamps = c.dark ? this.cloudStamps.dark : this.cloudStamps.light;
    const stamp = stamps[c.stampIdx];
    if (!stamp) return;
    const drawW = stamp.width * c.scale;
    const drawH = stamp.height * c.scale;
    ctx.save();
    ctx.globalAlpha = c.alpha;
    ctx.drawImage(stamp, c.x - drawW / 2, c.y - drawH * 0.35, drawW, drawH);
    ctx.restore();
  }

  _drawRainLayer(ctx, foreground) {
    const windSway = Math.sin(this.time * 0.015) * 0.9;
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < this.drops.length; i++) {
      const d = this.drops[i];
      const isFg = d.z >= 0.55;
      if (isFg !== foreground) continue;

      const alpha = foreground ? 0.22 + d.z * 0.18 : 0.1 + d.z * 0.14;
      ctx.strokeStyle = foreground
        ? `rgba(205, 226, 255, ${alpha.toFixed(2)})`
        : `rgba(170, 198, 232, ${alpha.toFixed(2)})`;
      ctx.lineWidth = foreground ? 1.3 + d.z * 0.8 : 0.85;
      const dx = (d.vx + windSway * (0.6 + d.z * 0.6)) * (d.len / d.speed);
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + dx, d.y + d.len);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawSnowLayer(ctx, foreground) {
    ctx.save();
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      const isFg = f.z >= 0.55;
      if (isFg !== foreground) continue;

      if (foreground) {
        // Soft depth-blur halo + core without expensive shadowBlur
        ctx.fillStyle = `rgba(235, 245, 255, ${(0.14 + f.z * 0.1).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 2.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(250, 253, 255, ${(0.42 + f.z * 0.24).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r * 0.88, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = `rgba(225, 238, 255, ${(0.22 + f.z * 0.25).toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawMotesLayer(ctx, foreground) {
    ctx.save();
    for (let i = 0; i < this.motes.length; i++) {
      const m = this.motes[i];
      const isFg = m.z >= 0.55;
      if (isFg !== foreground) continue;
      const twinkle = 0.5 + 0.5 * Math.sin(this.time * 0.05 + m.phase);
      const alpha = (foreground ? 0.18 : 0.12) + twinkle * 0.16;
      ctx.fillStyle = `rgba(255, 238, 185, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawBackgroundWeather(ctx) {
    if (!this.enabled) return;

    if (this.preset === 'rain') {
      ctx.save();
      ctx.fillStyle = 'rgba(18, 28, 46, 0.16)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    } else if (this.preset === 'snow') {
      ctx.save();
      ctx.fillStyle = 'rgba(205, 224, 245, 0.07)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    // Always draw real-time drifting 3D volumetric clouds across the top horizon
    for (let i = 0; i < this.clouds.length; i++) {
      this._drawCloudObject(ctx, this.clouds[i]);
    }

    if (this.preset === 'rain') {
      this._drawRainLayer(ctx, false);
    } else if (this.preset === 'snow') {
      this._drawSnowLayer(ctx, false);
    } else if (this.preset === 'sunny') {
      const originX = this.sunFromRight ? this.width - 55 : 55;
      const originY = 24;
      const pulse = 0.85 + Math.sin(this.time * 0.025) * 0.15;

      // Soft pulsing sun halo
      ctx.save();
      const sunGrad = ctx.createRadialGradient(originX, originY, 6, originX, originY, 175 * pulse);
      sunGrad.addColorStop(0, 'rgba(255, 246, 204, 0.26)');
      sunGrad.addColorStop(0.45, 'rgba(255, 214, 130, 0.09)');
      sunGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(originX, originY, 175 * pulse, 0, Math.PI * 2);
      ctx.fill();

      // Volumetric diagonal god-rays
      const dir = this.sunFromRight ? -1 : 1;
      for (let i = 0; i < this.rays.length; i++) {
        const r = this.rays[i];
        const rayAlpha = r.alpha * (0.78 + 0.22 * Math.sin(this.time * r.speed + r.phase));
        const spread = 180 + r.offset * 540;
        const x1 = originX + dir * (r.offset * 70);
        const x2 = x1 + dir * spread;
        const rayGrad = ctx.createLinearGradient(x1, originY, x2, this.groundY);
        rayGrad.addColorStop(0, `rgba(255, 236, 175, ${rayAlpha.toFixed(3)})`);
        rayGrad.addColorStop(1, 'rgba(255, 236, 175, 0)');
        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(x1 - r.width * 0.22, originY);
        ctx.lineTo(x1 + r.width * 0.22, originY);
        ctx.lineTo(x2 + r.width, this.groundY);
        ctx.lineTo(x2 - r.width, this.groundY);
        ctx.closePath();
        ctx.fill();
      }

      // Subtle lens flare bokeh rings along sun-to-center axis
      const cx = this.width / 2;
      const cy = this.height / 2;
      const flares = [
        { t: 0.28, r: 16, a: 0.055 },
        { t: 0.46, r: 9, a: 0.07 },
        { t: 0.68, r: 24, a: 0.04 }
      ];
      for (let i = 0; i < flares.length; i++) {
        const fl = flares[i];
        const fx = originX + (cx - originX) * fl.t;
        const fy = originY + (cy - originY) * fl.t;
        ctx.fillStyle = `rgba(255, 232, 168, ${(fl.a * pulse).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(fx, fy, fl.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      this._drawMotesLayer(ctx, false);
    }
  }

  drawForegroundWeather(ctx) {
    if (!this.enabled) return;

    if (this.preset === 'rain') {
      this._drawRainLayer(ctx, true);
      if (this.splashes.length) {
        ctx.save();
        ctx.lineWidth = 1.1;
        for (let i = 0; i < this.splashes.length; i++) {
          const s = this.splashes[i];
          ctx.strokeStyle = `rgba(210, 232, 255, ${Math.max(0, s.alpha).toFixed(2)})`;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.r, s.r * 0.35, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }
    } else if (this.preset === 'snow') {
      this._drawSnowLayer(ctx, true);
    } else if (this.preset === 'sunny') {
      this._drawMotesLayer(ctx, true);
    }
  }
}

if (typeof window !== 'undefined') {
  window.WeatherSystem = WeatherSystem;
}
