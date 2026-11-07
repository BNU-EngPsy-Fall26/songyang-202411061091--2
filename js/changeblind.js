(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;
  const CFG = A.config.experiments.changeblind;
  const W = A.logical.width;
  const H = A.logical.height;

  function waitForButton(overlay) {
    return new Promise((resolve) => {
      const button = overlay.querySelector("[data-next]");
      if (!button) {
        resolve();
        return;
      }
      button.addEventListener("click", () => resolve(), { once: true });
    });
  }

  async function instruction(stage, html, buttonLabel) {
    stage.setOverlay(`
      <div class="experiment-instructions">
        ${html}
        <button class="button primary" data-next type="button">${buttonLabel || "继续"}</button>
      </div>`);
    await waitForButton(stage.overlay);
    stage.hideOverlay();
  }

  function scenePalette(seed) {
    const rng = U.seededRandom(seed + "-palette");
    const ink = rng() > 0.4 ? "#263034" : "#34312b";
    return {
      background: rng() > 0.5 ? "#f3f2ed" : "#eceee9",
      ink,
      muted: "#aeb3ad",
      light: "#d8dbd5",
      accent: rng() > 0.5 ? "#b8cbbf" : "#d2bda9",
      blue: "#4e7f9c",
      red: "#b4493e"
    };
  }

  function drawSceneBase(ctx, seed, side) {
    const rng = U.seededRandom(seed + "-base");
    const palette = scenePalette(seed);
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(48, 55, 51, 0.12)";
    ctx.lineWidth = 2;
    ctx.strokeRect(70, 70, W - 140, H - 140);

    for (let i = 0; i < 14; i += 1) {
      const x = U.randomBetween(rng, 110, W - 310);
      const y = U.randomBetween(rng, 110, H - 210);
      const width = U.randomBetween(rng, 120, 280);
      const height = U.randomBetween(rng, 70, 170);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(U.randomBetween(rng, -0.05, 0.05));
      ctx.fillStyle = i % 3 === 0 ? palette.light : "rgba(255,255,255,0.64)";
      ctx.strokeStyle = "rgba(48,55,51,0.14)";
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(42,48,45,0.26)";
      ctx.fillRect(20, 25, width * 0.48, 7);
      ctx.fillRect(20, 45, width * 0.68, 4);
      ctx.fillRect(20, 58, width * 0.54, 4);
      if (i % 4 === 0) {
        ctx.fillStyle = palette.accent;
        ctx.fillRect(20, height - 35, width * 0.28, 16);
      }
      ctx.restore();
    }

    for (let i = 0; i < 5; i += 1) {
      const x = U.randomBetween(rng, 150, W - 180);
      const y = U.randomBetween(rng, 130, H - 170);
      ctx.strokeStyle = "rgba(52,62,57,0.23)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, y, U.randomBetween(rng, 24, 72), 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(39,46,42,0.42)";
    ctx.font = '500 18px "Cascadia Mono", Consolas, monospace';
    ctx.textAlign = "left";
    ctx.fillText(side.toUpperCase() + " PANEL / " + seed.slice(-4), 92, 112);
  }

  function makeScene(seed, side, changeType) {
    const rng = U.seededRandom(seed + "-target");
    const left = side === "left";
    const centerX = left
      ? U.randomBetween(rng, 260, 650)
      : U.randomBetween(rng, 950, 1340);
    const centerY = U.randomBetween(rng, 265, 650);
    const width = U.randomBetween(rng, 130, 190);
    const height = U.randomBetween(rng, 100, 160);
    const bbox = [centerX - width / 2, centerY - height / 2, width, height];
    const palette = scenePalette(seed);
    const a = document.createElement("canvas");
    const b = document.createElement("canvas");
    a.width = b.width = W;
    a.height = b.height = H;
    const actx = a.getContext("2d");
    const bctx = b.getContext("2d");
    drawSceneBase(actx, seed, side);
    drawSceneBase(bctx, seed, side);

    function drawTarget(context, changed) {
      context.save();
      context.translate(centerX, centerY);
      context.fillStyle = changed ? palette.blue : palette.red;
      context.strokeStyle = palette.ink;
      context.lineWidth = 3;
      context.beginPath();
      context.roundRect(-width / 2, -height / 2, width, height, 12);
      context.fill();
      context.stroke();
      context.fillStyle = "rgba(255,255,255,0.76)";
      context.beginPath();
      context.arc(0, -10, Math.min(width, height) * 0.16, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = palette.ink;
      context.font = '600 16px "Cascadia Mono", Consolas, monospace';
      context.textAlign = "center";
      context.fillText("ALERT", 0, height * 0.27);
      context.restore();
    }

    if (changeType === "color") {
      drawTarget(actx, false);
      drawTarget(bctx, true);
    } else if (changeType === "presence") {
      drawTarget(actx, false);
    } else {
      drawTarget(actx, false);
      drawTarget(bctx, true);
    }
    return { a, b, bbox, palette };
  }

  function drawCue(ctx, cue) {
    ctx.save();
    ctx.fillStyle = "#2c3934";
    ctx.strokeStyle = "#2c3934";
    ctx.lineWidth = 6;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (cue.type === "neutral") {
      ctx.font = '600 34px "Cascadia Mono", Consolas, monospace';
      ctx.fillText("+", W / 2, H / 2);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 44, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      const direction = cue.side === "left" ? -1 : 1;
      ctx.translate(W / 2, H / 2);
      ctx.beginPath();
      ctx.moveTo(direction * 18, 0);
      ctx.lineTo(direction * 110, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(direction * 110, 0);
      ctx.lineTo(direction * 70, -30);
      ctx.lineTo(direction * 70, 30);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function hitBbox(click, bbox, margin) {
    if (!click) return false;
    const m = margin == null ? 0.04 : margin;
    const left = bbox[0] / W - m;
    const right = (bbox[0] + bbox[2]) / W + m;
    const top = bbox[1] / H - m;
    const bottom = (bbox[1] + bbox[3]) / H + m;
    return click.nx >= left && click.nx <= right && click.ny >= top && click.ny <= bottom;
  }

  async function runTrial(stage, eye, participant, trial, practice) {
    const ctx = stage.ctx;
    const scene = makeScene(trial.sceneSeed, trial.changeSide, trial.changeType);
    const first = trial.abFirst === "B" ? scene.b : scene.a;
    const second = trial.abFirst === "B" ? scene.a : scene.b;
    stage.clear("#f4f3ef");
    ctx.fillStyle = "#2c3934";
    ctx.font = '600 26px "Cascadia Mono", Consolas, monospace';
    ctx.textAlign = "center";
    ctx.fillText("盯住中央", W / 2, H / 2 - 70);
    ctx.strokeStyle = "#2c3934";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 22, H / 2);
    ctx.lineTo(W / 2 + 22, H / 2);
    ctx.moveTo(W / 2, H / 2 - 22);
    ctx.lineTo(W / 2, H / 2 + 22);
    ctx.stroke();
    await U.sleep(550);

    stage.clear("#f4f3ef");
    drawCue(ctx, trial.cue);
    await U.sleep(330);
    stage.clear("#f4f3ef");

    const cycle = 2 * (CFG.onMs + CFG.blankMs);
    const start = performance.now();
    let detected = null;
    const gaze = !practice ? eye.startRecording(stage) : null;
    const keyPromise = stage.waitForKey(["Space"], CFG.timeoutMs, start);
    let continueLoop = true;
    function loop() {
      if (!continueLoop) return;
      const elapsed = performance.now() - start;
      if (elapsed >= CFG.timeoutMs) {
        continueLoop = false;
        return;
      }
      const phase = elapsed % cycle;
      if (phase < CFG.onMs) ctx.drawImage(first, 0, 0);
      else if (phase < CFG.onMs + CFG.blankMs) {
        ctx.fillStyle = "#777b76";
        ctx.fillRect(0, 0, W, H);
      } else if (phase < 2 * CFG.onMs + CFG.blankMs) ctx.drawImage(second, 0, 0);
      else {
        ctx.fillStyle = "#777b76";
        ctx.fillRect(0, 0, W, H);
      }
      stage.setHud(`<span>${practice ? "练习" : "正式"} · 第 ${trial.trialIndex + 1} 题</span><span>发现变化按空格</span>`);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
    const response = await keyPromise;
    continueLoop = false;
    detected = !response.timeout;
    const recording = gaze ? eye.stopRecording() : null;
    stage.setHud("");

    let click = null;
    if (detected) {
      ctx.drawImage(second, 0, 0);
      ctx.fillStyle = "rgba(244,243,239,0.85)";
      ctx.fillRect(0, H - 76, W, 76);
      ctx.fillStyle = "#2c3934";
      ctx.font = '600 24px "Cascadia Mono", Consolas, monospace';
      ctx.textAlign = "center";
      ctx.fillText("点击变化的位置", W / 2, H - 30);
      const clickResponse = await stage.waitForClick(8000);
      if (clickResponse) click = { x: clickResponse.x, y: clickResponse.y, nx: clickResponse.nx, ny: clickResponse.ny };
    }

    const correctLocation = hitBbox(click, scene.bbox, 0.04);
    ctx.drawImage(scene.b, 0, 0);
    ctx.strokeStyle = "#b4493e";
    ctx.lineWidth = 6;
    ctx.strokeRect(scene.bbox[0], scene.bbox[1], scene.bbox[2], scene.bbox[3]);
    if (click) {
      ctx.fillStyle = "#2c3934";
      ctx.beginPath();
      ctx.arc(click.x, click.y, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(244,243,239,0.9)";
    ctx.fillRect(0, H - 76, W, 76);
    ctx.fillStyle = "#2c3934";
    ctx.textAlign = "center";
    ctx.font = '600 24px "Cascadia Mono", Consolas, monospace';
    ctx.fillText(detected ? (correctLocation ? "发现了变化" : "发现变化，但位置不准确") : "时间到，未发现变化", W / 2, H - 30);
    await U.sleep(A.config.testMode ? 250 : 1200);
    if (!detected) {
      detected = false;
    }

    return {
      scene: trial.sceneSeed,
      trial: trial.trialIndex,
      condition: trial.condition,
      cue_type: trial.cueType,
      cue_side: trial.cue.type === "neutral" ? null : trial.cue.side,
      change_side: trial.changeSide,
      change_type: trial.changeType,
      ab_first: trial.abFirst,
      timeout: response.timeout,
      detected,
      detection_ms: detected ? Math.round(response.rt) : null,
      click,
      correct_click: correctLocation,
      bbox: scene.bbox,
      samples: recording ? recording.samples : [],
      hz: recording ? recording.hz : null,
      face_loss: recording ? recording.face_loss : null
    };
  }

  function makeTrials(participant) {
    const trials = [];
    let index = 0;
    for (let i = 0; i < CFG.neutralTrials; i += 1) {
      const side = i % 2 ? "left" : "right";
      trials.push({
        sceneSeed: participant + "-neutral-" + i + "-" + U.hashString(participant + i),
        trialIndex: index++,
        condition: "neutral",
        cueType: "neutral",
        cue: { type: "neutral" },
        changeSide: side,
        changeType: ["color", "presence"][i % 2],
        abFirst: i % 2 ? "B" : "A"
      });
    }
    for (let i = 0; i < CFG.cuedTrials; i += 1) {
      const cueSide = i % 2 ? "left" : "right";
      const valid = i < Math.round(CFG.cuedTrials * CFG.cueValidShare);
      const changeSide = valid ? cueSide : (cueSide === "left" ? "right" : "left");
      trials.push({
        sceneSeed: participant + "-cued-" + i + "-" + U.hashString(participant + "cue" + i),
        trialIndex: index++,
        condition: "spatial",
        cueType: valid ? "valid" : "invalid",
        cue: { type: "spatial", side: cueSide },
        changeSide,
        changeType: ["color", "presence"][i % 2],
        abFirst: i % 2 ? "B" : "A"
      });
    }
    return U.shuffle(trials).map((trial, i) => Object.assign(trial, { trialIndex: i }));
  }

  async function practiceTrials(stage, participant) {
    const trials = [
      {
        sceneSeed: participant + "-practice-neutral",
        trialIndex: 0,
        condition: "practice",
        cueType: "neutral",
        cue: { type: "neutral" },
        changeSide: "left",
        changeType: "color",
        abFirst: "A"
      },
      {
        sceneSeed: participant + "-practice-cue",
        trialIndex: 1,
        condition: "practice",
        cueType: "valid",
        cue: { type: "spatial", side: "right" },
        changeSide: "right",
        changeType: "presence",
        abFirst: "B"
      }
    ];
    const results = [];
    for (let i = 0; i < trials.length; i += 1) {
      const trial = Object.assign({}, trials[i], { trialIndex: i });
      results.push(await runTrial(stage, A.eyeTracker, participant, trial, true));
    }
    return results;
  }

  async function run(options) {
    const stage = new A.Stage({ host: document.getElementById("app") });
    await instruction(stage, `
      <p class="eyebrow">CHANGE BLINDNESS</p>
      <h2>闪烁找不同</h2>
      <p>两张几乎一样的画面会快速交替，中间夹着灰色空白。两张图之间只有一处变化。</p>
      <div class="instruction-grid">
        <div><b>1</b><span>盯住中央</span></div>
        <div><b>2</b><span>发现变化后按空格</span></div>
        <div><b>3</b><span>点击变化的位置</span></div>
      </div>
      <p class="muted">线索条件会指向变化较可能出现的一侧，但并非每次都有效。</p>`, "开始练习");
    await practiceTrials(stage, options.participant);
    await instruction(stage, `
      <p class="eyebrow">FORMAL TRIALS</p>
      <h2>正式实验</h2>
      <p>共 20 题，其中 10 题有中性线索，10 题有空间线索。每题最长 20 秒。</p>
      <p class="muted">请保持头部稳定，发现变化后立即按空格。</p>`, "开始正式实验");

    const trials = makeTrials(options.participant);
    const results = [];
    for (let i = 0; i < trials.length; i += 1) {
      const trial = Object.assign({}, trials[i], { trialIndex: i });
      results.push(await runTrial(stage, A.eyeTracker, options.participant, trial, false));
    }
    await instruction(stage, `
      <p class="eyebrow">BLOCK COMPLETE</p>
      <h2>变化觉察完成</h2>
      <p>本实验完成，数据将与其他两个实验分别上传。</p>`, "保存并返回");
    stage.destroy();
    return {
      trials: results,
      meta: {
        neutral_trials: CFG.neutralTrials,
        spatial_trials: CFG.cuedTrials,
        cue_valid_share: CFG.cueValidShare,
        timeout_ms: CFG.timeoutMs
      }
    };
  }

  A.experiments = A.experiments || {};
  A.experiments.changeblind = { run, makeTrials };
})();
