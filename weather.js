// Lightweight Three.js WebGL Weather Overlay (Sunny, Cloudy, Rain, Snow)

class WeatherOverlay {
  static PRESETS = ['sunny', 'cloudy', 'rain', 'snow'];

  constructor(canvas) {
    this.canvas = canvas;
    this.available = typeof THREE !== 'undefined' && Boolean(canvas);
    this.preset = 'sunny';
    this.lastPreset = null;
    this.paused = false;
    this.active = false;
    this.time = 0;
    this.sunFromRight = false;

    this.rainData = null;
    this.snowData = null;
    this.cloudSprites = [];
    this.rayMeshes = [];
    this.moteData = null;
    this.sharedCloudTex = null;

    if (!this.available) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 100);
    this.camera.position.set(0, 0, 12);

    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: false,
        powerPreference: 'low-power'
      });
      this.renderer.setClearColor(0x000000, 0);
      this.resize();
    } catch {
      this.available = false;
      return;
    }

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    this.resetForStage(false);
  }

  isCompactDevice() {
    return typeof window !== 'undefined' && window.innerWidth <= 900;
  }

  resize() {
    if (!this.available) return;
    const parent = this.canvas.parentElement;
    const w = parent ? parent.clientWidth : 960;
    const h = parent ? parent.clientHeight : 540;
    if (w <= 0 || h <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setActive(active) {
    this.active = Boolean(active);
    if (this.canvas) {
      this.canvas.style.opacity = this.active ? '1' : '0';
    }
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  resetForStage(avoidRepeat = true) {
    if (!this.available) return 'sunny';
    const pool =
      avoidRepeat && this.lastPreset
        ? WeatherOverlay.PRESETS.filter((p) => p !== this.lastPreset)
        : WeatherOverlay.PRESETS;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.setPreset(chosen);
    return chosen;
  }

  _clearScene() {
    if (!this.available) return;
    while (this.scene.children.length > 0) {
      const obj = this.scene.children[0];
      this.scene.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (let i = 0; i < mats.length; i++) {
          const m = mats[i];
          if (m.map && m.map !== this.sharedCloudTex) m.map.dispose();
          m.dispose();
        }
      }
    }
    this.rainData = null;
    this.snowData = null;
    this.cloudSprites = [];
    this.rayMeshes = [];
    this.moteData = null;
  }

  _getCloudTexture() {
    if (this.sharedCloudTex) return this.sharedCloudTex;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    const puffs = [
      { x: 64, y: 66, r: 44, a: 0.52 },
      { x: 46, y: 68, r: 32, a: 0.42 },
      { x: 84, y: 68, r: 30, a: 0.4 },
      { x: 62, y: 52, r: 34, a: 0.45 }
    ];
    for (let i = 0; i < puffs.length; i++) {
      const p = puffs[i];
      const grad = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(255, 255, 255, ${p.a})`);
      grad.addColorStop(0.55, `rgba(242, 247, 255, ${p.a * 0.45})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      g.fill();
    }
    this.sharedCloudTex = new THREE.CanvasTexture(c);
    return this.sharedCloudTex;
  }

  setPreset(preset) {
    this.preset = WeatherOverlay.PRESETS.includes(preset) ? preset : 'sunny';
    this.lastPreset = this.preset;
    this.time = 0;
    if (!this.available) return;
    this._clearScene();

    const compact = this.isCompactDevice();

    if (this.preset === 'rain') {
      this._buildRain(compact ? 180 : 340);
    } else if (this.preset === 'snow') {
      this._buildSnow(compact ? 140 : 260);
    } else if (this.preset === 'cloudy') {
      this._buildClouds(compact ? 6 : 9);
    } else if (this.preset === 'sunny') {
      this._buildSunny(compact ? 3 : 5, compact ? 35 : 65);
    }
  }

  _buildRain(count) {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = Math.random() * 14 - 7;
      speeds[i] = 0.22 + Math.random() * 0.16;
      sizes[i] = 14 + Math.random() * 12;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(0xc8e0ff) }
      },
      vertexShader: `
        attribute float aSize;
        varying float vDepth;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = clamp((-mv.z - 4.0) / 16.0, 0.0, 1.0);
          gl_PointSize = aSize * (18.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying float vDepth;
        void main() {
          vec2 uv = gl_PointCoord - 0.5;
          // Rotate slightly for angled rain streak
          float c = 0.985, s = -0.17;
          vec2 ruv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
          float streakX = smoothstep(0.055, 0.012, abs(ruv.x));
          float streakY = smoothstep(0.5, 0.15, abs(ruv.y));
          float alpha = streakX * streakY * mix(0.45, 0.16, vDepth);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.rainData = { geo, positions, speeds, count };
  }

  _buildSnow(count) {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    const phases = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = Math.random() * 14 - 7;
      speeds[i] = 0.025 + Math.random() * 0.032;
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = 10 + Math.random() * 14;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float aSize;
        varying float vDepth;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vDepth = clamp((-mv.z - 4.0) / 16.0, 0.0, 1.0);
          gl_PointSize = aSize * (16.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vDepth;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.08, d) * mix(0.65, 0.25, vDepth);
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(0.95, 0.98, 1.0, alpha);
        }
      `
    });

    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.snowData = { geo, positions, speeds, phases, count };
  }

  _buildClouds(clusterCount) {
    const tex = this._getCloudTexture();
    for (let i = 0; i < clusterCount; i++) {
      const z = -9 + Math.random() * 6.5;
      const baseX = (Math.random() - 0.5) * 24;
      const baseY = 2.4 + Math.random() * 2.5;
      const speed = 0.004 + (z + 10) * 0.0012;
      const puffs = 5 + Math.floor(Math.random() * 3);

      for (let p = 0; p < puffs; p++) {
        const isUnderside = p % 3 === 0;
        const mat = new THREE.SpriteMaterial({
          map: tex,
          color: isUnderside ? 0x8a9bb5 : 0xf2f7ff,
          transparent: true,
          opacity: isUnderside ? 0.22 : 0.3,
          depthWrite: false
        });
        const sprite = new THREE.Sprite(mat);
        const scale = 2.8 + Math.random() * 2.4;
        sprite.scale.set(scale * 1.45, scale * 0.85, 1);
        sprite.position.set(
          baseX + (Math.random() - 0.5) * 3.0,
          baseY + (isUnderside ? -0.35 : Math.random() * 0.45),
          z + (Math.random() - 0.5) * 0.6
        );
        this.scene.add(sprite);
        this.cloudSprites.push({ sprite, speed });
      }
    }
  }

  _buildSunny(rayCount, moteCount) {
    this.sunFromRight = Math.random() < 0.5;
    const originX = this.sunFromRight ? 7.8 : -7.8;
    const dir = this.sunFromRight ? -1 : 1;

    for (let i = 0; i < rayCount; i++) {
      const geo = new THREE.PlaneGeometry(2.6 + Math.random() * 1.8, 16);
      const mat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uPhase: { value: Math.random() * Math.PI * 2 },
          uAlpha: { value: 0.09 + Math.random() * 0.05 }
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uPhase;
          uniform float uAlpha;
          varying vec2 vUv;
          void main() {
            float edge = sin(vUv.x * 3.14159265);
            float fadeY = smoothstep(0.0, 0.85, vUv.y);
            float pulse = 0.78 + 0.22 * sin(uTime * 0.8 + uPhase);
            float a = edge * edge * fadeY * uAlpha * pulse;
            gl_FragColor = vec4(1.0, 0.91, 0.65, a);
          }
        `
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(originX + dir * (1.8 + i * 2.1), 1.4, -3.5 - i * 0.4);
      mesh.rotation.z = dir * (0.42 + i * 0.08);
      this.scene.add(mesh);
      this.rayMeshes.push(mesh);
    }

    // Floating dust motes in sunbeams
    const positions = new Float32Array(moteCount * 3);
    const phases = new Float32Array(moteCount);
    const sizes = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 11;
      positions[i * 3 + 2] = Math.random() * 10 - 5;
      phases[i] = Math.random() * Math.PI * 2;
      sizes[i] = 6 + Math.random() * 8;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `
        attribute float aSize;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (14.0 / max(1.0, -mv.z));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.05, d) * 0.35;
          if (a < 0.01) discard;
          gl_FragColor = vec4(1.0, 0.92, 0.7, a);
        }
      `
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.moteData = { geo, positions, phases, count: moteCount };
  }

  updateAndRender() {
    if (!this.available || !this.active) return;

    if (!this.paused) {
      this.time += 0.016;

      if (this.preset === 'rain' && this.rainData) {
        const { geo, positions, speeds, count } = this.rainData;
        for (let i = 0; i < count; i++) {
          positions[i * 3] -= speeds[i] * 0.24;
          positions[i * 3 + 1] -= speeds[i];
          if (positions[i * 3 + 1] < -7) {
            positions[i * 3 + 1] = 7;
            positions[i * 3] = (Math.random() - 0.5) * 24;
          }
        }
        geo.attributes.position.needsUpdate = true;
      } else if (this.preset === 'snow' && this.snowData) {
        const { geo, positions, speeds, phases, count } = this.snowData;
        for (let i = 0; i < count; i++) {
          const ph = phases[i];
          positions[i * 3 + 1] -= speeds[i];
          positions[i * 3] += Math.sin(this.time * 1.4 + ph) * 0.012;
          positions[i * 3 + 2] += Math.cos(this.time * 1.1 + ph) * 0.008;
          if (positions[i * 3 + 1] < -7) {
            positions[i * 3 + 1] = 7;
            positions[i * 3] = (Math.random() - 0.5) * 24;
          }
        }
        geo.attributes.position.needsUpdate = true;
      } else if (this.preset === 'cloudy') {
        for (let i = 0; i < this.cloudSprites.length; i++) {
          const item = this.cloudSprites[i];
          item.sprite.position.x += item.speed;
          if (item.sprite.position.x > 14.5) item.sprite.position.x = -14.5;
        }
      } else if (this.preset === 'sunny') {
        for (let i = 0; i < this.rayMeshes.length; i++) {
          this.rayMeshes[i].material.uniforms.uTime.value = this.time;
        }
        if (this.moteData) {
          const { geo, positions, phases, count } = this.moteData;
          for (let i = 0; i < count; i++) {
            positions[i * 3] += Math.sin(this.time + phases[i]) * 0.004;
            positions[i * 3 + 1] += 0.006;
            if (positions[i * 3 + 1] > 6) positions[i * 3 + 1] = -5.5;
          }
          geo.attributes.position.needsUpdate = true;
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

if (typeof window !== 'undefined') {
  window.WeatherOverlay = WeatherOverlay;
}
