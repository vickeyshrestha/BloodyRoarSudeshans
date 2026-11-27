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
    this.drops = [];
    this.splashes = [];
    this.flakes = [];
    this.motes = [];
    this.rays = [];
    this.resetForStage(false);
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

    if (this.preset === 'cloudy') {
      const count = compact ? 6 : 9;
      for (let i = 0; i < count; i++) {
        this.clouds.push(this._makeCloud(Math.random() * this.width, i < count - 2 ? Math.random() * 0.54 : 0.62 + Math.random() * 0.25));
      }
    } else if (this.preset === 'rain') {
      const cloudCount = compact ? 4 : 6;
      for (let i = 0; i < cloudCount; i++) {
        this.clouds.push(this._makeCloud(Math.random() * this.width, 0.1 + Math.random() * 0.4, true));
      }
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
    const scale = 0.55 + z * 0.85;
    const puffCount = 4 + Math.floor(Math.random() * 3);
    const puffs = [];
    for (let i = 0; i < puffCount; i++) {
      const t = puffCount === 1 ? 0.5 : i / (puffCount - 1);
      puffs.push({
        ox: (t - 0.5) * 95 * scale + (Math.random() - 0.5) * 14 * scale,
        oy: -Math.sin(t * Math.PI) * 16 * scale + (Math.random() - 0.5) * 6 * scale,
        r: (22 + Math.sin(t * Math.PI) * 18 + Math.random() * 8) * scale
      });
    }
    return {
      x,
      y: 34 + (1 - z) * 95 + Math.random() * 22,
      z,
      scale,
      speed: (0.14 + z * 0.34) * (0.85 + Math.random() * 0.3),
      alpha: dark ? 0.22 + z * 0.14 : 0.24 + z * 0.2,
      dark,
      puffs
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

    if (this.preset === 'cloudy' || this.preset === 'rain') {
      for (let i = 0; i < this.clouds.length; i++) {
        const c = this.clouds[i];
        c.x += c.speed * dtScale;
        const wrapMargin = 140 * c.scale;
        if (c.x - wrapMargin > this.width) {
          c.x = -wrapMargin;
        }
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
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.globalAlpha = c.alpha;

    // Subtle 3D underside shading
    ctx.fillStyle = c.dark ? '#465063' : '#7f8da3';
    for (let i = 0; i < c.puffs.length; i++) {
      const p = c.puffs[i];
      ctx.beginPath();
      ctx.arc(p.ox, p.oy + p.r * 0.22, p.r * 0.94, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mid-tone cloud body
    ctx.fillStyle = c.dark ? '#69758a' : '#cfd8e6';
    for (let i = 0; i < c.puffs.length; i++) {
      const p = c.puffs[i];
      ctx.beginPath();
      ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top-lit highlight edge
    ctx.fillStyle = c.dark ? '#8794aa' : '#f4f8ff';
    ctx.globalAlpha = c.alpha * 0.72;
    for (let i = 0; i < c.puffs.length; i++) {
      const p = c.puffs[i];
      ctx.beginPath();
      ctx.arc(p.ox - p.r * 0.08, p.oy - p.r * 0.18, p.r * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }

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

    if (this.preset === 'cloudy') {
      for (let i = 0; i < this.clouds.length; i++) {
        if (this.clouds[i].z < 0.55) this._drawCloudObject(ctx, this.clouds[i]);
      }
    } else if (this.preset === 'rain') {
      ctx.save();
      ctx.fillStyle = 'rgba(18, 28, 46, 0.16)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
      for (let i = 0; i < this.clouds.length; i++) {
        this._drawCloudObject(ctx, this.clouds[i]);
      }
      this._drawRainLayer(ctx, false);
    } else if (this.preset === 'snow') {
      ctx.save();
      ctx.fillStyle = 'rgba(205, 224, 245, 0.07)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
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

    if (this.preset === 'cloudy') {
      for (let i = 0; i < this.clouds.length; i++) {
        if (this.clouds[i].z >= 0.55) {
          const origAlpha = this.clouds[i].alpha;
          this.clouds[i].alpha = origAlpha * 0.42; // keep foreground high-sky wisps subtle
          this._drawCloudObject(ctx, this.clouds[i]);
          this.clouds[i].alpha = origAlpha;
        }
      }
    } else if (this.preset === 'rain') {
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
