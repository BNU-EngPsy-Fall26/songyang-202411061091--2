(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;

  class LowPass {
    constructor() {
      this.value = null;
    }
    filter(input, alpha) {
      this.value = this.value == null ? input : alpha * input + (1 - alpha) * this.value;
      return this.value;
    }
  }

  class EyeTracker {
    constructor() {
      this.mode = null;
      this.fallbackMode = "mouse";
      this.current = null;
      this.webgazer = null;
      this.listeners = new Set();
      this.recording = null;
      this.stats = { frames: 0, nulls: 0, times: [] };
      this.xFilter = new LowPass();
      this.yFilter = new LowPass();
      this.pointerBound = false;
      this.lastCalibration = null;
    }

    hasCameraApi() {
      return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    bindPointer() {
      if (this.pointerBound) return;
      this.pointerBound = true;
      window.addEventListener("pointermove", (event) => {
        if (this.mode !== "mouse") return;
        this.current = { x: event.clientX, y: event.clientY, t: performance.now() };
        this.listeners.forEach((listener) => listener(this.current));
      }, { passive: true });
    }

    useMouse() {
      this.mode = "mouse";
      this.bindPointer();
      if (this.webgazer) {
        try {
          this.webgazer.pause();
          this.webgazer.showVideo(false);
        } catch (error) {
          // The camera may already be stopped.
        }
      }
      return this.mode;
    }

    loadWebGazerScript() {
      if (window.webgazer) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = new URL("./vendor/webgazer/webgazer.js", document.baseURI).href;
        script.onload = resolve;
        script.onerror = () => reject(new Error("WebGazer 脚本加载失败"));
        document.head.appendChild(script);
      });
    }

    async startCamera() {
      if (!this.hasCameraApi()) {
        throw new Error("浏览器不支持摄像头接口，请使用 HTTPS、localhost 或新版 Chrome/Edge");
      }
      await this.loadWebGazerScript();
      const wg = window.webgazer;
      let cameraFailed = null;
      wg.params.faceMeshSolutionPath = new URL("./vendor/webgazer/mediapipe/face_mesh", document.baseURI).href;
      wg.params.showVideoPreview = true;
      wg.saveDataAcrossSessions(false);
      wg.applyKalmanFilter(false);
      wg.setRegression("ridge");
      wg.setGazeListener((data, timestamp) => {
        const now = performance.now();
        this.stats.frames += 1;
        if (!data) {
          this.stats.nulls += 1;
          return;
        }
        this.stats.times.push(now);
        if (this.stats.times.length > 180) this.stats.times.shift();
        const dt = 1 / 30;
        const x = this.xFilter.filter(data.x, 0.32);
        const y = this.yFilter.filter(data.y, 0.32);
        this.current = { x, y, t: now };
        this.listeners.forEach((listener) => listener(this.current));
      });
      await wg.begin(() => {
        cameraFailed = new Error("摄像头不可用或被拒绝");
      });
      if (cameraFailed) throw cameraFailed;
      const startedAt = performance.now();
      while (performance.now() - startedAt < 25000) {
        if (this.stats.frames > 3) break;
        await U.sleep(250);
      }
      if (this.stats.frames <= 3) throw new Error("人脸模型初始化超时");
      wg.showPredictionPoints(false);
      this.webgazer = wg;
      this.mode = "camera";
      return wg;
    }

    showPreview(show) {
      if (!this.webgazer) return;
      try {
        this.webgazer.showVideo(show);
        this.webgazer.showFaceOverlay(show);
        this.webgazer.showFaceFeedbackBox(show);
        if (show) {
          this.webgazer.setVideoViewerSize(240, 180);
          const container = document.getElementById("webgazerVideoContainer");
          if (container) {
            container.style.left = "50%";
            container.style.top = "28%";
            container.style.transform = "translate(-50%, -50%)";
            container.style.borderRadius = "10px";
            container.style.overflow = "hidden";
            container.style.zIndex = "20";
          }
        }
      } catch (error) {
        // Video overlays are optional on some camera backends.
      }
    }

    setTraining(value) {
      if (!this.webgazer) return;
      try {
        if (value) this.webgazer.addMouseEventListeners();
        else this.webgazer.removeMouseEventListeners();
      } catch (error) {
        // Ignore WebGazer training toggle errors.
      }
    }

    clearCalibration() {
      if (this.webgazer) {
        try {
          this.webgazer.clearData();
        } catch (error) {
          // Ignore clearData errors.
        }
      }
      this.xFilter = new LowPass();
      this.yFilter = new LowPass();
    }

    resetStats() {
      this.stats = { frames: 0, nulls: 0, times: [] };
    }

    hz() {
      if (this.mode !== "camera") return 1000 / A.config.eye.sampleMs;
      const now = performance.now();
      return this.stats.times.filter((time) => now - time < 2000).length / 2;
    }

    faceLoss() {
      return this.stats.frames ? this.stats.nulls / this.stats.frames : 0;
    }

    startRecording(stage) {
      this.stopRecording();
      this.resetStats();
      const startedAt = performance.now();
      const recording = { stage, startedAt, samples: [], lost: 0, ticks: 0 };
      recording.timer = setInterval(() => {
        const now = performance.now();
        recording.ticks += 1;
        const sample = this.current;
        if (!sample || (this.mode === "camera" && now - sample.t > A.config.eye.staleMs)) {
          recording.lost += 1;
          recording.samples.push([Math.round(now - startedAt), -1, -1]);
          return;
        }
        const [x, y] = stage.toNorm(sample.x, sample.y);
        recording.samples.push([Math.round(now - startedAt), Number(x.toFixed(4)), Number(y.toFixed(4))]);
      }, A.config.eye.sampleMs);
      this.recording = recording;
      return startedAt;
    }

    stopRecording() {
      const recording = this.recording;
      if (!recording) return null;
      clearInterval(recording.timer);
      this.recording = null;
      const durationSeconds = Math.max(0.001, (performance.now() - recording.startedAt) / 1000);
      return {
        samples: recording.samples,
        hz: this.mode === "camera" ? (this.stats.frames - this.stats.nulls) / durationSeconds : 1000 / A.config.eye.sampleMs,
        face_loss: this.mode === "camera" ? this.faceLoss() : 0,
        lost_share: recording.ticks ? recording.lost / recording.ticks : 0
      };
    }

    createOverlay(html) {
      const overlay = document.createElement("div");
      overlay.className = "calibration-layer";
      overlay.innerHTML = html + '<div class="calibration-dots"></div>';
      document.body.appendChild(overlay);
      return overlay;
    }

    async calibrate() {
      if (this.mode !== "camera") return null;
      this.clearCalibration();
      this.setTraining(true);
      this.showPreview(true);
      const overlay = this.createOverlay(`
        <div class="calibration-copy">
          <p class="eyebrow">9-POINT EYE CALIBRATION</p>
          <h2>眼动校准</h2>
          <p>保持头部不动，眼睛盯住圆点，并连续点击同一个圆点 5 次。</p>
          <button class="calibration-button" data-calibration-start type="button">开始校准</button>
        </div>`);
      const dots = overlay.querySelector(".calibration-dots");
      dots.hidden = true;
      await new Promise((resolve) => {
        overlay.querySelector("[data-calibration-start]").addEventListener("click", () => {
          overlay.querySelector(".calibration-copy").remove();
          dots.hidden = false;
          resolve();
        }, { once: true });
      });
      const points = [];
      for (const y of [0.1, 0.5, 0.9]) {
        for (const x of [0.08, 0.5, 0.92]) points.push([x, y]);
      }
      U.shuffle(points);
      for (const [x, y] of points) {
        await new Promise((resolve) => {
          const dot = document.createElement("button");
          dot.type = "button";
          dot.className = "calibration-dot";
          dot.style.left = x * 100 + "%";
          dot.style.top = y * 100 + "%";
          let count = 0;
          dot.textContent = "5";
          dot.addEventListener("click", () => {
            count += 1;
            dot.textContent = String(5 - count);
            dot.style.opacity = String(1 - count * 0.15);
            if (count >= 5) {
              dot.remove();
              resolve();
            }
          });
          dots.appendChild(dot);
        });
      }
      overlay.remove();
      this.setTraining(false);
      return this.validate();
    }

    async validate(options) {
      if (this.mode !== "camera") return null;
      const opts = options || {};
      this.showPreview(false);
      this.setTraining(false);
      const overlay = this.createOverlay(`
        <div class="calibration-copy">
          <p class="eyebrow">${opts.quick ? "QUICK VALIDATION" : "5-POINT VALIDATION"}</p>
          <h2>${opts.quick ? "快速验证" : "验证眼动精度"}</h2>
          <p>只需盯住出现的圆点，不要点击。</p>
          <button class="calibration-button" data-calibration-start type="button">开始验证</button>
        </div>`);
      const dots = overlay.querySelector(".calibration-dots");
      dots.hidden = true;
      await new Promise((resolve) => {
        overlay.querySelector("[data-calibration-start]").addEventListener("click", () => {
          overlay.querySelector(".calibration-copy").remove();
          dots.hidden = false;
          resolve();
        }, { once: true });
      });
      const targets = [[0.5, 0.5], [0.2, 0.2], [0.8, 0.2], [0.2, 0.8], [0.8, 0.8]];
      const samplesPerPoint = [];
      this.resetStats();
      await U.sleep(600);
      for (const [tx, ty] of targets) {
        const dot = document.createElement("div");
        dot.className = "calibration-dot validation-dot";
        dot.style.left = tx * 100 + "%";
        dot.style.top = ty * 100 + "%";
        dots.appendChild(dot);
        const targetX = tx * window.innerWidth;
        const targetY = ty * window.innerHeight;
        const samples = [];
        const startedAt = performance.now();
        const listener = (sample) => {
          if (performance.now() - startedAt > 550) samples.push([sample.x, sample.y]);
        };
        this.listeners.add(listener);
        await U.sleep(opts.quick ? 1300 : 1700);
        this.listeners.delete(listener);
        dot.remove();
        if (!samples.length) {
          samplesPerPoint.push({ target: [tx, ty], error: null, n: 0 });
          continue;
        }
        const mx = U.median(samples.map((sample) => sample[0]));
        const my = U.median(samples.map((sample) => sample[1]));
        samplesPerPoint.push({ target: [tx, ty], error: Math.hypot(mx - targetX, my - targetY), n: samples.length });
      }
      overlay.remove();
      const valid = samplesPerPoint.filter((point) => Number.isFinite(point.error));
      const averageError = U.mean(valid.map((point) => point.error));
      const radians = Math.atan((averageError * A.config.eye.cmPerPx) / A.config.eye.viewDistanceCm);
      const result = {
        ok: averageError != null && averageError <= A.config.eye.errorLimitPx && valid.length >= 3,
        errorPx: averageError,
        errorDeg: averageError == null ? null : radians * 180 / Math.PI,
        nPoints: valid.length,
        points: samplesPerPoint,
        hz: this.hz(),
        faceLoss: this.faceLoss()
      };
      this.lastCalibration = result;
      return result;
    }
  }

  A.eyeTracker = new EyeTracker();
})();
