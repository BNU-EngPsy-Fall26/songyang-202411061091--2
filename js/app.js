(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;
  const app = document.getElementById("app");
  const BackgroundClass = window.CharacterOceanBackground || A.DotsScene;
  const dots = new BackgroundClass(document.getElementById("dots-background"));
  const eye = A.eyeTracker;
  const state = {
    participant: localStorage.getItem(A.config.storageKeys.participant) || "",
    mode: null,
    consent: false,
    lowQuality: false,
    order: [],
    currentIndex: 0,
    results: {},
    records: {},
    finished: false
  };
  const toastElement = document.getElementById("toast");
  let toastTimer = 0;

  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#07111a" : "#f4f3ef");
    dots.setDark(dark);
    const button = document.querySelector("[data-theme-toggle]");
    if (button) button.textContent = dark ? "LIGHT" : "DARK";
  }

  function showToast(message, duration) {
    clearTimeout(toastTimer);
    toastElement.textContent = message;
    toastElement.classList.add("visible");
    toastTimer = setTimeout(() => toastElement.classList.remove("visible"), duration || 3200);
  }

  function dock() {
    return "";
  }

  function bindChrome() {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => setTheme(document.documentElement.dataset.theme !== "dark"));
    });
    document.querySelectorAll("[data-motion-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        dots.setPaused(!dots.paused);
        document.querySelectorAll("[data-motion-toggle]").forEach((item) => {
          item.textContent = dots.paused ? "PLAY" : "PAUSE";
        });
      });
    });
  }

  function pageShell(content, options) {
    const opts = options || {};
    dots.setActive(true);
    document.body.classList.remove("is-experiment");
    app.innerHTML = `
      <div class="site-shell">
        <header class="site-header">
          <span class="site-brand mono">ATTENTION LAB / W05–W07</span>
          ${opts.history ? '<button class="glass record-button" data-record type="button">实验记录</button>' : ""}
        </header>
        <main class="site-main">${content}</main>
        <footer class="site-footer">
          <span class="credit mono">attention lab ↗</span>
        </footer>
      </div>`;
    bindChrome();
  }

  function welcomeScreen() {
    pageShell(`
      <section class="welcome-screen">
        <p class="eyebrow">ATTENTION FIELD / ENGINEERING PSYCHOLOGY</p>
        <h1>你看见了吗？</h1>
        <p class="welcome-copy">在变化、搜索与图形之间，看见你的注意力。</p>
        <form class="subject-entry glass" data-subject-form>
          <label class="sr-only" for="participant">匿名编号</label>
          <svg class="entry-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <input id="participant" value="${U.escapeHtml(state.participant)}" placeholder="输入匿名编号" autocomplete="off" maxlength="40">
          <button type="submit" aria-label="进入实验"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path><path d="m13 6 6 6-6 6"></path></svg></button>
        </form>
        <p class="entry-note">编号可填 1、P01 或其他匿名编号，不需要姓名或学号。</p>
        <div class="onboarding-guide">
          <div class="onboarding-step"><span>01</span><b>输入匿名编号</b><p>填写 1、P01 或任意简短编号，进入知情同意。</p></div>
          <div class="onboarding-step"><span>02</span><b>选择作答方式</b><p>选择摄像头眼动或鼠标兜底，摄像头仅在本机处理。</p></div>
          <div class="onboarding-step"><span>03</span><b>依次完成实验</b><p>系统会安排三个实验的顺序，点击“继续”进入下一项。</p></div>
        </div>
      </section>`, { history: true });
    app.querySelector("[data-subject-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = app.querySelector("#participant");
      const participant = input.value.trim();
      if (!participant) {
        showToast("请先输入匿名编号");
        input.focus();
        return;
      }
      if (!/^[A-Za-z0-9_\-\u4e00-\u9fa5]{1,40}$/.test(participant)) {
        showToast("编号可包含 1 个字符以上的汉字、字母、数字、下划线或短横线");
        input.focus();
        return;
      }
      state.participant = participant;
      localStorage.setItem(A.config.storageKeys.participant, participant);
      consentScreen();
    });
    app.querySelector("[data-record]")?.addEventListener("click", () => {
      modal({
        title: "实验记录",
        body: `<p class="muted">本机只保存匿名编号和实验完成状态，不上传姓名或学号。</p>
          <p>${state.order.length ? state.order.map((id) => `${A.config.experiments[id].short}：${state.results[id] ? "已完成" : "未完成"}`).join("<br>") : "尚未开始实验。"}</p>`,
        buttons: [{ label: "知道了", value: true, primary: true }]
      });
    });
  }

  function consentScreen() {
    pageShell(`
      <section class="content-screen consent-screen">
        <p class="eyebrow">INFORMED CONSENT</p>
        <h2>知情同意</h2>
        <div class="paper-panel">
          <p>本实验用于工程心理学课程作业，研究变化觉察、视觉搜索与图形比例判断。</p>
          <p>你需要完成三个短实验，预计 15–20 分钟。网页会记录匿名编号、按键反应、反应时和眼动坐标，不收集姓名、学号或任何可识别个人身份的信息。</p>
          <p>如启用摄像头眼动，视频只在浏览器本机处理，不会上传。若拒绝摄像头，可改用鼠标模式完成全部实验。</p>
          <label class="check-row"><input id="consent-check" type="checkbox"> <span>我已阅读并同意参与</span></label>
        </div>
        <div class="screen-actions">
          <button class="button" data-back type="button">返回</button>
          <button class="button primary" data-consent-next type="button">继续</button>
        </div>
      </section>`, { history: false });
    app.querySelector("[data-back]").addEventListener("click", welcomeScreen);
    app.querySelector("[data-consent-next]").addEventListener("click", () => {
      if (!app.querySelector("#consent-check").checked) {
        showToast("请先勾选同意");
        return;
      }
      state.consent = true;
      modeScreen();
    });
  }

  function modeScreen() {
    pageShell(`
      <section class="content-screen">
        <p class="eyebrow">EYE TRACKING</p>
        <h2>选择作答方式</h2>
        <div class="mode-grid">
          <button class="mode-card" data-camera type="button">
            <span class="mode-number">01</span>
            <b>摄像头眼动</b>
            <span>使用 WebGazer 完成 9 点校准。视频仅在本机处理，不上传。</span>
          </button>
          <button class="mode-card" data-mouse type="button">
            <span class="mode-number">02</span>
            <b>鼠标兜底</b>
            <span>不启用摄像头，仍可完成全部实验。数据会标记为 mouse。</span>
          </button>
        </div>
        <p class="muted mode-note">摄像头模式建议使用电脑版 Chrome 或 Edge，并允许摄像头权限。</p>
      </section>`, { history: false });

    app.querySelector("[data-mouse]").addEventListener("click", () => {
      state.mode = "mouse";
      eye.useMouse();
      A.eyeTracker.lastCalibration = null;
      prepareSession();
    });
    app.querySelector("[data-camera]").addEventListener("click", async () => {
      showToast("正在加载摄像头与眼动模型……", 8000);
      try {
        await eye.startCamera();
        state.mode = "camera";
        const result = await cameraCalibrationFlow();
        if (result) {
          prepareSession();
        } else if (state.mode === "mouse") {
          prepareSession();
        } else {
          modeScreen();
        }
      } catch (error) {
        eye.useMouse();
        state.mode = "mouse";
        await modal({
          title: "摄像头不可用",
          body: `<p>${U.escapeHtml(error.message || error)}</p><p class="muted">已切换到鼠标兜底模式，实验仍可完成。</p>`,
          buttons: [{ label: "继续", value: true, primary: true }]
        });
        prepareSession();
      }
    });
  }

  async function cameraCalibrationFlow() {
    for (;;) {
      const result = await eye.calibrate();
      if (result && result.ok) {
        state.lowQuality = false;
        A.eyeTracker.lastCalibration = result;
        showToast(`校准完成：平均误差 ${Math.round(result.errorPx)} px`, 3500);
        return result;
      }
      const choice = await modal({
        title: "校准误差偏高",
        body: `<p>平均误差 ${result && result.errorPx != null ? Math.round(result.errorPx) + " px" : "无法计算"}。建议重新校准，或在光线不足时改用鼠标模式。</p>`,
        buttons: [
          { label: "重新校准", value: "retry", primary: true },
          { label: "继续并标记低质量", value: "continue" },
          { label: "改用鼠标", value: "mouse" }
        ]
      });
      if (choice === "retry") continue;
      if (choice === "mouse") {
        eye.useMouse();
        state.mode = "mouse";
        state.lowQuality = false;
        A.eyeTracker.lastCalibration = null;
        return null;
      }
      state.lowQuality = true;
      A.eyeTracker.lastCalibration = result;
      return result;
    }
  }

  async function quickValidation() {
    if (state.mode !== "camera") return true;
    let result;
    try {
      result = await eye.validate({ quick: true });
    } catch (error) {
      eye.useMouse();
      state.mode = "mouse";
      state.lowQuality = false;
      showToast("快速验证失败，已切换到鼠标模式");
      return true;
    }
    if (result && result.ok) {
      A.eyeTracker.lastCalibration = result;
      state.lowQuality = state.lowQuality || !result.ok;
      return true;
    }
    const choice = await modal({
      title: "快速验证未通过",
      body: `<p>当前眼动误差 ${result && result.errorPx != null ? Math.round(result.errorPx) + " px" : "无法计算"}。继续会标记为低质量数据。</p>`,
      buttons: [
        { label: "继续", value: "continue", primary: true },
        { label: "重新校准", value: "retry" },
        { label: "改用鼠标", value: "mouse" }
      ]
    });
    if (choice === "retry") {
      const calibrated = await cameraCalibrationFlow();
      if (!calibrated) return true;
      return quickValidation();
    }
    if (choice === "mouse") {
      eye.useMouse();
      state.mode = "mouse";
      state.lowQuality = false;
      return true;
    }
    state.lowQuality = true;
    return true;
  }

  function prepareSession() {
    state.order = U.experimentOrder(state.participant);
    state.currentIndex = 0;
    state.results = {};
    state.records = {};
    homeScreen();
  }

  function homeScreen() {
    const completed = state.order.filter((id) => state.results[id]).length;
    pageShell(`
      <section class="content-screen home-screen">
        <p class="eyebrow">SESSION READY / ${U.escapeHtml(state.participant)}</p>
        <h2>三项注意任务</h2>
        <p class="home-copy">请按顺序完成。每项实验都有练习，数据会在实验结束后单独上传。</p>
        <div class="task-list">
          ${state.order.map((id, index) => {
            const exp = A.config.experiments[id];
            const done = Boolean(state.results[id]);
            return `<div class="task-row ${done ? "is-done" : ""}">
              <span class="task-number">${String(index + 1).padStart(2, "0")}</span>
              <div><b>${exp.short}</b><span>${exp.title} · 约 ${exp.minutes} 分钟</span></div>
              <span class="task-state">${done ? "已完成" : "等待"}</span>
            </div>`;
          }).join("")}
        </div>
        <div class="screen-actions">
          <button class="button primary" data-start-session type="button">${completed ? "继续实验" : "开始完整实验"}</button>
        </div>
        <div class="session-meta mono">
          <span>MODE / ${state.mode === "camera" ? "WEBCAM" : "MOUSE"}</span>
          <span>PROJECT / ${A.config.projectCode}</span>
          <span>${A.config.testMode ? "TEST MODE" : "LIVE MODE"}</span>
        </div>
      </section>`, { history: true });
    app.querySelector("[data-start-session]").addEventListener("click", runNextExperiment);
    app.querySelector("[data-record]")?.addEventListener("click", showSessionRecord);
  }

  function showSessionRecord() {
    modal({
      title: "实验记录",
      body: state.order.map((id) => {
        const result = state.results[id];
        return `<p><b>${A.config.experiments[id].short}</b><br><span class="muted">${result ? "已完成，个人结果已生成" : "未完成"}</span></p>`;
      }).join(""),
      buttons: [{ label: "关闭", value: true, primary: true }]
    });
  }

  async function runNextExperiment() {
    const nextId = state.order.find((id) => !state.results[id]);
    if (!nextId) {
      finalScreen();
      return;
    }
    state.currentIndex = state.order.indexOf(nextId);
    const ok = await quickValidation();
    if (!ok) return;
    dots.setActive(false);
    document.body.classList.add("is-experiment");
    app.innerHTML = "";
    try {
      await document.documentElement.requestFullscreen?.().catch(() => {});
    } catch (error) {
      // Fullscreen is optional.
    }
    try {
      const result = await A.experiments[nextId].run({
        participant: state.participant,
        testMode: A.config.testMode
      });
      state.results[nextId] = result;
      state.results[nextId].metrics = A.results.analyze(nextId, result.trials);
      await uploadAndShowResult(nextId, result);
    } catch (error) {
      console.error(error);
      dots.setActive(true);
      document.body.classList.remove("is-experiment");
      showToast("实验运行出错：" + error.message, 6000);
      pageShell(`
        <section class="content-screen">
          <p class="eyebrow">ERROR</p>
          <h2>实验未完成</h2>
          <p>${U.escapeHtml(error.message || error)}</p>
          <div class="screen-actions"><button class="button primary" data-return-home type="button">返回实验首页</button></div>
        </section>`, { history: false });
      app.querySelector("[data-return-home]").addEventListener("click", homeScreen);
    } finally {
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch (error) {
        // Ignore fullscreen exit failures.
      }
    }
  }

  async function uploadAndShowResult(experimentId, result) {
    pageShell(`
      <section class="content-screen upload-screen">
        <p class="eyebrow">SAVING / ${experimentId.toUpperCase()}</p>
        <h2>正在保存结果</h2>
        <p>数据正在上传到注意实验室收数接口。</p>
        <div class="upload-spinner" aria-hidden="true"></div>
        <p class="muted" id="upload-status">请保持网络连接……</p>
      </section>`, { history: false });
    const status = app.querySelector("#upload-status");
    let uploadError = null;
    let response = null;
    try {
      response = await A.api.submitExperiment({
        experimentId,
        participant: state.participant,
        trials: result.trials,
        meta: result.meta
      });
      status.textContent = response.warnings && response.warnings.length
        ? "已保存，但服务器提示：" + response.warnings.join("；")
        : "上传成功。";
    } catch (error) {
      uploadError = error;
      status.textContent = "上传失败：" + error.message + "。数据仍可在本机下载。";
    }
    let records = [];
    try {
      records = await A.api.fetchExperimentData(experimentId);
    } catch (error) {
      records = [];
    }
    state.records[experimentId] = records;
    const group = A.results.groupMetrics(experimentId, records);
    pageShell("", { history: false });
    A.results.render(app.querySelector(".site-main"), experimentId, {
      trials: result.trials,
      metrics: result.metrics
    }, group);
    const finalResult = state.results[experimentId];
    app.querySelector("[data-next-experiment]").addEventListener("click", () => {
      saveDownloadButton(experimentId, finalResult);
      runNextExperiment();
    });
    saveDownloadButton(experimentId, finalResult);
    if (uploadError) showToast("上传失败，请下载本地数据并稍后重试", 5000);
  }

  function saveDownloadButton(experimentId, result) {
    const button = app.querySelector("[data-download-local]");
    if (!button || button.dataset.bound) return;
    button.dataset.bound = "1";
    button.addEventListener("click", () => {
      U.downloadJson(
        `${state.participant}-${experimentId}-${Date.now()}.json`,
        {
          project: A.config.projectCode,
          experiment: A.experimentName(experimentId),
          participant: state.participant,
          trials: result.trials,
          meta: result.meta
        }
      );
    });
  }

  function finalScreen() {
    const ids = state.order;
    pageShell(`
      <section class="content-screen final-screen">
        <p class="eyebrow">SESSION COMPLETE</p>
        <h2>三个实验完成</h2>
        <p class="home-copy">感谢参与。你的匿名编号为 <b>${U.escapeHtml(state.participant)}</b>。结果页展示的是个人表现与当前已收到的全班数据。</p>
        <div class="task-list">
          ${ids.map((id) => {
            const metrics = state.results[id] ? state.results[id].metrics : null;
            let summary = "";
            if (id === "changeblind" && metrics) {
              summary = `空间线索发现率 ${U.formatPercent(metrics.spatial.detectRate)}`;
            } else if (id === "lowprev" && metrics) {
              summary = `低流行率漏报 ${U.formatPercent(metrics.baseline && metrics.baseline.missRate)}`;
            } else if (id === "cm" && metrics) {
              summary = `误差排序 ${metrics.order.map((key) => ({ position: "位置", length: "长度", angle: "角度", area: "面积" }[key])).join(" < ")}`;
            }
            return `<div class="task-row is-done">
              <div><b>${A.config.experiments[id].short}</b><span>${summary}</span></div>
              <button class="text-button" data-view-result="${id}" type="button">查看结果</button>
            </div>`;
          }).join("")}
        </div>
        <div class="screen-actions">
          <button class="button primary" data-download-all type="button">下载全部本机数据</button>
          <button class="button" data-new-session type="button">开始新的被试</button>
        </div>
      </section>`, { history: true });
    app.querySelectorAll("[data-view-result]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.viewResult;
        const result = state.results[id];
        const records = state.records[id] || [];
        const group = A.results.groupMetrics(id, records);
        pageShell("", { history: false });
        A.results.render(app.querySelector(".site-main"), id, {
          trials: result.trials,
          metrics: result.metrics
        }, group);
        saveDownloadButton(id, result);
        app.querySelector("[data-next-experiment]").textContent = "返回总览";
        app.querySelector("[data-next-experiment]").addEventListener("click", finalScreen);
      });
    });
    app.querySelector("[data-download-all]").addEventListener("click", () => {
      U.downloadJson(`${state.participant}-attention-lab-all.json`, {
        project: A.config.projectCode,
        participant: state.participant,
        mode: state.mode,
        experiments: Object.fromEntries(Object.entries(state.results).map(([id, result]) => [id, {
          trials: result.trials,
          meta: result.meta
        }]))
      });
    });
    app.querySelector("[data-new-session]").addEventListener("click", () => {
      state.results = {};
      state.records = {};
      state.finished = false;
      state.participant = "";
      localStorage.removeItem(A.config.storageKeys.participant);
      eye.useMouse();
      A.eyeTracker.lastCalibration = null;
      state.mode = "mouse";
      welcomeScreen();
    });
  }

  function modal(options) {
    return new Promise((resolve) => {
      const buttons = options.buttons || [{ label: "关闭", value: true, primary: true }];
      const overlay = document.createElement("div");
      overlay.className = "modal-layer";
      overlay.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <p class="eyebrow">ATTENTION LAB</p>
          <h2 id="modal-title">${U.escapeHtml(options.title || "")}</h2>
          <div class="modal-body">${options.body || ""}</div>
          <div class="modal-actions">
            ${buttons.map((button, index) =>
              `<button type="button" class="button ${button.primary ? "primary" : ""}" data-modal-index="${index}">${U.escapeHtml(button.label)}</button>`
            ).join("")}
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelectorAll("[data-modal-index]").forEach((button) => {
        button.addEventListener("click", () => {
          const value = buttons[Number(button.dataset.modalIndex)].value;
          overlay.remove();
          resolve(value);
        });
      });
    });
  }

  function renderError(error) {
    pageShell(`
      <section class="content-screen">
        <p class="eyebrow">ERROR</p>
        <h2>页面无法继续</h2>
        <p>${U.escapeHtml(error.message || error)}</p>
        <button class="button primary" data-reload type="button">重新加载</button>
      </section>`, { history: false });
    app.querySelector("[data-reload]").addEventListener("click", () => location.reload());
  }

  try {
    state.order = U.experimentOrder(state.participant || "guest");
    welcomeScreen();
  } catch (error) {
    console.error(error);
    renderError(error);
  }
})();
