(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;

  function pointInPolygon(x, y, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i += 1) {
      const xi = polygon[i][0];
      const yi = polygon[i][1];
      const xj = polygon[j][0];
      const yj = polygon[j][1];
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-6) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  function buildFish(polygons, seed, step) {
    const rng = U.seededRandom(seed);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    polygons.forEach((polygon) => polygon.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }));
    const points = [];
    for (let y = minY; y <= maxY; y += step) {
      for (let x = minX; x <= maxX; x += step) {
        if (!polygons.some((polygon) => pointInPolygon(x, y, polygon))) continue;
        const skip = rng();
        if (skip < 0.14) continue;
        points.push({
          x: x + (rng() - 0.5) * step * 0.45,
          y: y + (rng() - 0.5) * step * 0.45,
          scale: 0.45 + rng() * 0.8,
          alpha: 0.22 + rng() * 0.62
        });
      }
    }
    return points;
  }

  const sharkPolygons = [
    [[-238, 0], [-184, -18], [-116, -27], [-38, -29], [48, -24], [132, -13], [238, 0], [139, 14], [57, 25], [-24, 28], [-108, 23], [-181, 14]],
    [[-238, 0], [-344, -79], [-300, -2], [-346, 78], [-236, 6]],
    [[-72, -24], [-3, -72], [45, -21]],
    [[-25, 24], [24, 61], [61, 20]],
    [[72, -11], [154, -48], [136, -5]]
  ];

  const mantaPolygons = [
    [[-296, 0], [-248, -19], [-213, -55], [-162, -68], [-116, -105], [-26, -72], [31, -131], [82, -75], [151, -88], [202, -55], [255, -20], [303, 0], [251, 21], [202, 58], [149, 90], [80, 76], [30, 134], [-26, 73], [-118, 108], [-163, 70], [-214, 57], [-249, 20]],
    [[-296, 3], [-241, 0], [-177, 14], [-103, 18], [-26, 33], [58, 29], [146, 15], [246, 5], [202, -9], [119, -5], [31, -18], [-57, -11], [-161, -7], [-238, -6]],
    [[-296, 1], [-455, 38], [-447, 20], [-294, -16]],
    [[-200, -56], [-346, -118], [-236, -34]],
    [[-201, 57], [-349, 119], [-237, 34]]
  ];

  class DotsScene {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.shark = buildFish(sharkPolygons, "attention-shark", 9);
      this.manta = buildFish(mantaPolygons, "attention-manta", 8);
      this.width = 0;
      this.height = 0;
      this.dpr = 1;
      this.lastTime = 0;
      this.frame = 0;
      this.active = true;
      this.paused = false;
      this.dark = false;
      this.pointer = { x: -1000, y: -1000 };
      this.reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
      this.fish = [];
      this.motes = [];
      this.resize = this.resize.bind(this);
      this.tick = this.tick.bind(this);
      this.onPointer = this.onPointer.bind(this);
      window.addEventListener("resize", this.resize);
      window.addEventListener("pointermove", this.onPointer, { passive: true });
      this.resize();
    }

    setActive(active) {
      this.active = Boolean(active);
      this.canvas.classList.toggle("is-hidden", !this.active);
      if (this.active && !this.paused && !this.reduced.matches) this.start();
      if (!this.active) cancelAnimationFrame(this.frame);
    }

    setPaused(paused) {
      this.paused = Boolean(paused);
      if (this.paused) {
        cancelAnimationFrame(this.frame);
        this.draw(performance.now(), 0);
      } else if (this.active && !this.reduced.matches) {
        this.start();
      }
    }

    setDark(dark) {
      this.dark = Boolean(dark);
      this.draw(performance.now(), 0);
    }

    resize() {
      this.width = window.innerWidth;
      this.height = window.innerHeight;
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.round(this.width * this.dpr);
      this.canvas.height = Math.round(this.height * this.dpr);
      this.canvas.style.width = this.width + "px";
      this.canvas.style.height = this.height + "px";
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.createScene();
      this.draw(performance.now(), 0);
    }

    createScene() {
      const narrow = this.width < 760;
      this.fish = [
        { points: this.shark, x: this.width * 0.21, y: this.height * 0.23, vx: 5.4, vy: 0.5, scale: narrow ? 0.2 : 0.33, rot: -0.23, phase: 0.4, opacity: 0.9 },
        { points: this.manta, x: this.width * 0.78, y: this.height * 0.27, vx: -3.8, vy: 0.35, scale: narrow ? 0.29 : 0.53, rot: -0.38, phase: 2.1, opacity: 0.88 },
        { points: this.shark, x: this.width * 0.13, y: this.height * 0.69, vx: 3.5, vy: -0.3, scale: narrow ? 0.17 : 0.29, rot: -0.1, phase: 3.7, opacity: 0.65 },
        { points: this.manta, x: this.width * 0.82, y: this.height * 0.74, vx: -2.7, vy: -0.25, scale: narrow ? 0.24 : 0.43, rot: -0.25, phase: 5.2, opacity: 0.58 }
      ];
      const moteCount = Math.round(Math.min(220, Math.max(70, this.width * this.height / 7500)));
      const rng = U.seededRandom("dots-motes-" + this.width);
      this.motes = Array.from({ length: moteCount }, () => ({
        x: rng() * this.width,
        y: rng() * this.height,
        vx: (rng() - 0.5) * 2.2,
        vy: (rng() - 0.5) * 0.7,
        r: 0.5 + rng() * 1.5,
        alpha: 0.04 + rng() * 0.1,
        pulse: rng() * Math.PI * 2
      }));
    }

    colors() {
      return this.dark
        ? { dot: "rgba(151, 201, 211, ", mote: "rgba(139, 182, 196, ", grid: "rgba(120, 161, 174, 0.04)" }
        : { dot: "rgba(32, 36, 33, ", mote: "rgba(87, 96, 84, ", grid: "rgba(87, 96, 84, 0.055)" };
    }

    draw(time, delta) {
      const ctx = this.ctx;
      const colors = this.colors();
      ctx.clearRect(0, 0, this.width, this.height);
      ctx.fillStyle = this.dark ? "#07111a" : "#f4f3ef";
      ctx.fillRect(0, 0, this.width, this.height);

      const grid = this.width < 700 ? 28 : 34;
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let x = grid; x < this.width; x += grid) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, this.height);
      }
      for (let y = grid; y < this.height; y += grid) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(this.width, y + 0.5);
      }
      ctx.stroke();

      for (const mote of this.motes) {
        if (!this.paused && delta) {
          mote.x += mote.vx * delta / 1000;
          mote.y += mote.vy * delta / 1000;
          if (mote.x < 0) mote.x = this.width;
          if (mote.x > this.width) mote.x = 0;
          if (mote.y < 0) mote.y = this.height;
          if (mote.y > this.height) mote.y = 0;
        }
        const pulse = 0.75 + Math.sin(time * 0.0006 + mote.pulse) * 0.25;
        ctx.fillStyle = colors.mote + (mote.alpha * pulse).toFixed(3) + ")";
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const fish of this.fish) {
        if (!this.paused && delta) {
          fish.x += fish.vx * delta / 1000;
          fish.y += fish.vy * delta / 1000;
        }
        const margin = 430 * fish.scale;
        if (fish.x > this.width + margin) fish.x = -margin;
        if (fish.x < -margin) fish.x = this.width + margin;
        if (fish.y > this.height + margin) fish.y = -margin;
        if (fish.y < -margin) fish.y = this.height + margin;
        const wobble = this.paused ? 0 : Math.sin(time * 0.00032 + fish.phase) * 0.045;
        const direction = fish.vx < 0 ? -1 : 1;
        const pointerDistance = Math.hypot(fish.x - this.pointer.x, fish.y - this.pointer.y);
        const glow = pointerDistance < 260 ? (1 - pointerDistance / 260) * 0.1 : 0;

        ctx.save();
        ctx.translate(fish.x, fish.y);
        ctx.rotate(fish.rot + wobble);
        ctx.scale(direction * fish.scale, fish.scale);
        for (const point of fish.points) {
          const alpha = Math.min(0.9, (point.alpha + glow) * fish.opacity);
          ctx.fillStyle = colors.dot + alpha.toFixed(3) + ")";
          const size = 2.5 + point.scale * 3;
          ctx.beginPath();
          ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    tick(time) {
      if (!this.active || this.paused || this.reduced.matches) return;
      const delta = Math.min(48, time - (this.lastTime || time));
      this.lastTime = time;
      if (delta >= 28) this.draw(time, delta);
      this.frame = requestAnimationFrame(this.tick);
    }

    start() {
      cancelAnimationFrame(this.frame);
      this.lastTime = performance.now();
      this.frame = requestAnimationFrame(this.tick);
    }

    onPointer(event) {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
    }
  }

  A.DotsScene = DotsScene;
})();
