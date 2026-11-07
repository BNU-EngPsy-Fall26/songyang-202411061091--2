(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT } = A.config.stage;

  class Stage {
    constructor(options) {
      const opts = options || {};
      this.host = opts.host || document.body;
      this.wrapper = document.createElement("div");
      this.wrapper.className = "experiment-stage";
      this.wrapper.innerHTML = `
        <div class="stage-frame">
          <canvas class="stage-canvas" width="${LOGICAL_WIDTH}" height="${LOGICAL_HEIGHT}"></canvas>
          <div class="stage-hud"></div>
          <div class="stage-overlay"></div>
        </div>`;
      this.host.appendChild(this.wrapper);
      this.frame = this.wrapper.querySelector(".stage-frame");
      this.canvas = this.wrapper.querySelector(".stage-canvas");
      this.ctx = this.canvas.getContext("2d");
      this.hud = this.wrapper.querySelector(".stage-hud");
      this.overlay = this.wrapper.querySelector(".stage-overlay");
      this.onResize = this.resize.bind(this);
      window.addEventListener("resize", this.onResize);
      this.resize();
    }

    resize() {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const scale = Math.min(viewportWidth / LOGICAL_WIDTH, viewportHeight / LOGICAL_HEIGHT);
      const displayWidth = Math.round(LOGICAL_WIDTH * scale);
      const displayHeight = Math.round(LOGICAL_HEIGHT * scale);
      this.frame.style.width = displayWidth + "px";
      this.frame.style.height = displayHeight + "px";
    }

    clear(color) {
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.fillStyle = color || "#f5f5f1";
      this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
      this.ctx.restore();
    }

    setHud(html) {
      this.hud.innerHTML = html || "";
    }

    setOverlay(html) {
      this.overlay.innerHTML = html || "";
    }

    hideOverlay() {
      this.overlay.innerHTML = "";
    }

    toLogical(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return [
        (clientX - rect.left) / rect.width * LOGICAL_WIDTH,
        (clientY - rect.top) / rect.height * LOGICAL_HEIGHT
      ];
    }

    toNorm(clientX, clientY) {
      const [x, y] = this.toLogical(clientX, clientY);
      return [
        Math.max(0, Math.min(1, x / LOGICAL_WIDTH)),
        Math.max(0, Math.min(1, y / LOGICAL_HEIGHT))
      ];
    }

    waitForKey(keys, timeoutMs, startTime) {
      return new Promise((resolve) => {
        const accepted = Array.isArray(keys) ? keys : [keys];
        const start = startTime == null ? performance.now() : startTime;
        let finished = false;
        const timer = setTimeout(() => finish({ key: null, rt: null, timeout: true }), timeoutMs);
        function finish(result) {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          window.removeEventListener("keydown", onKey, true);
          resolve(result);
        }
        function onKey(event) {
          if (!accepted.includes(event.code) || event.repeat) return;
          event.preventDefault();
          finish({ key: event.code, rt: performance.now() - start, timeout: false });
        }
        window.addEventListener("keydown", onKey, true);
      });
    }

    waitForClick(timeoutMs) {
      return new Promise((resolve) => {
        let finished = false;
        const timer = timeoutMs ? setTimeout(() => finish(null), timeoutMs) : 0;
        const finish = (value) => {
          if (finished) return;
          finished = true;
          if (timer) clearTimeout(timer);
          this.canvas.removeEventListener("pointerdown", onClick);
          resolve(value);
        };
        const onClick = (event) => {
          const [x, y] = this.toLogical(event.clientX, event.clientY);
          finish({ x, y, nx: x / LOGICAL_WIDTH, ny: y / LOGICAL_HEIGHT, rt: performance.now() });
        };
        this.canvas.addEventListener("pointerdown", onClick);
      });
    }

    nextFrame() {
      return new Promise((resolve) => requestAnimationFrame(() => resolve()));
    }

    destroy() {
      window.removeEventListener("resize", this.onResize);
      this.wrapper.remove();
    }
  }

  A.Stage = Stage;
  A.logical = { width: LOGICAL_WIDTH, height: LOGICAL_HEIGHT };
})();
