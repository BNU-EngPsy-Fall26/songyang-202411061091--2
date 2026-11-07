(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;
  const CFG = A.config.experiments.cm;
  const W = A.logical.width;
  const H = A.logical.height;
  const FONT = '"Trebuchet MS", "Microsoft YaHei UI", sans-serif';

  function waitForButton(overlay) {
    return new Promise((resolve) => overlay.querySelector("[data-next]").addEventListener("click", resolve, { once: true }));
  }

  async function instruct(stage, html, label) {
    stage.setOverlay(`
      <div class="experiment-instructions">
        ${html}
        <button class="button primary" data-next type="button">${label}</button>
      </div>`);
    await waitForButton(stage.overlay);
    stage.hideOverlay();
  }

  function makeTrial(seed, encoding, ratio, trialIndex) {
    const rng = U.seededRandom(seed);
    const n = 5;
    const values = Array.from({ length: n }, () => U.randomBetween(rng, 12, 95));
    const aValue = U.randomBetween(rng, 62, 95);
    const bValue = aValue * ratio / 100;
    const positions = U.shuffle(Array.from({ length: n }, (_, i) => i));
    const aIndex = positions[0];
    const bIndex = positions[1];
    values[aIndex] = aValue;
    values[bIndex] = bValue;
    return {
      seed,
      encoding,
      ratio,
      trialIndex,
      values,
      aIndex,
      bIndex,
      offsets: Array.from({ length: n }, () => U.randomBetween(rng, 0, 160)),
      rotation: U.randomBetween(rng, 0, Math.PI * 2)
    };
  }

  function drawLabel(ctx, text, x, y) {
    ctx.fillStyle = "#b4493e";
    ctx.font = `800 29px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
  }

  function drawPositionOrLength(ctx, trial, commonBaseline) {
    const n = 5;
    const barWidth = 112;
    const gap = 66;
    const x0 = W / 2 - (n * barWidth + (n - 1) * gap) / 2;
    const base = commonBaseline ? 725 : 760;
    const maxHeight = 560;
    if (commonBaseline) {
      ctx.strokeStyle = "#272d2a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x0 - 38, base);
      ctx.lineTo(x0 + n * barWidth + (n - 1) * gap + 38, base);
      ctx.moveTo(x0 - 38, base);
      ctx.lineTo(x0 - 38, base - maxHeight - 30);
      ctx.stroke();
    }
    const boxes = [];
    trial.values.forEach((value, index) => {
      const x = x0 + index * (barWidth + gap);
      const height = value / 100 * maxHeight;
      const bottom = commonBaseline ? base : base - trial.offsets[index] * 0.55;
      const top = bottom - height;
      ctx.fillStyle = index === trial.aIndex ? "#b8c9c3" : "#dfe3df";
      ctx.strokeStyle = "#39433f";
      ctx.lineWidth = 2;
      ctx.fillRect(x, top, barWidth, height);
      ctx.strokeRect(x, top, barWidth, height);
      if (index === trial.aIndex) drawLabel(ctx, "A", x + barWidth / 2, top - 28);
      if (index === trial.bIndex) drawLabel(ctx, "B", x + barWidth / 2, top - 28);
      boxes.push({ index, x, y: top, width: barWidth, height });
    });
    return boxes;
  }

  function drawAngle(ctx, trial) {
    const cx = W / 2;
    const cy = 410;
    const radius = 300;
    const total = trial.values.reduce((sum, value) => sum + value, 0);
    let start = trial.rotation;
    const boxes = [];
    trial.values.forEach((value, index) => {
      const end = start + value / total * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = index === trial.aIndex ? "#b8c9c3" : "#dfe3df";
      ctx.strokeStyle = "#39433f";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      const mid = (start + end) / 2;
      const lx = cx + Math.cos(mid) * radius * 0.64;
      const ly = cy + Math.sin(mid) * radius * 0.64;
      if (index === trial.aIndex) drawLabel(ctx, "A", lx, ly);
      if (index === trial.bIndex) drawLabel(ctx, "B", lx, ly);
      boxes.push({ index, x: lx - 25, y: ly - 25, width: 50, height: 50 });
      start = end;
    });
    return boxes;
  }

  function drawArea(ctx, trial) {
    const maxRadius = 118;
    const boxes = [];
    trial.values.forEach((value, index) => {
      const radius = maxRadius * Math.sqrt(value / 95);
      const x = 260 + index * 270;
      const y = 440 + trial.offsets[index] * 0.55 - 75;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = index === trial.aIndex ? "#b8c9c3" : "#dfe3df";
      ctx.strokeStyle = "#39433f";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      if (index === trial.aIndex) drawLabel(ctx, "A", x, y - radius - 28);
      if (index === trial.bIndex) drawLabel(ctx, "B", x, y - radius - 28);
      boxes.push({ index, x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 });
    });
    return boxes;
  }

  function drawTrial(stage, trial) {
    const ctx = stage.ctx;
    stage.clear("#f3f3ee");
    ctx.fillStyle = "#2d342f";
    ctx.font = `500 18px "Cascadia Mono", Consolas, monospace`;
    ctx.textAlign = "center";
    ctx.fillText("B 的数值是 A 的百分之几？", W / 2, 90);
    let boxes;
    if (trial.encoding === "position") boxes = drawPositionOrLength(ctx, trial, true);
    else if (trial.encoding === "length") boxes = drawPositionOrLength(ctx, trial, false);
    else if (trial.encoding === "angle") boxes = drawAngle(ctx, trial);
    else boxes = drawArea(ctx, trial);
    return boxes;
  }

  function askResponse(stage, practice) {
    return new Promise((resolve) => {
      stage.setOverlay(`
        <form class="cm-response" data-cm-form>
          <label for="cm-input"><b>B</b> 是 <b>A</b> 的</label>
          <input id="cm-input" type="number" min="0" max="100" step="1" inputmode="numeric" autocomplete="off" aria-label="估计百分比">
          <span>%</span>
          <button class="button primary" type="submit">确定</button>
          ${practice ? '<span class="muted">练习</span>' : ""}
        </form>`);
      const form = stage.overlay.querySelector("[data-cm-form]");
      const input = form.querySelector("#cm-input");
      setTimeout(() => input.focus(), 40);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = Number(input.value);
        if (!Number.isFinite(value) || value < 0 || value > 100) {
          input.focus();
          return;
        }
        stage.hideOverlay();
        resolve(value);
      }, { once: true });
    });
  }

  async function runTrial(stage, eye, trial, practice, participant) {
    const boxes = drawTrial(stage, trial);
    await stage.nextFrame();
    const startedAt = performance.now();
    const recording = practice ? null : eye.startRecording(stage);
    const judged = await askResponse(stage, practice);
    const rt = performance.now() - startedAt;
    const recordingData = recording ? eye.stopRecording() : null;
    const error = Math.log2(Math.abs(judged - trial.ratio) + 1 / 8);
    if (practice) {
      stage.clear("#f3f3ee");
      stage.ctx.fillStyle = "#2d342f";
      stage.ctx.font = `700 38px ${FONT}`;
      stage.ctx.textAlign = "center";
      stage.ctx.fillText(`正确值 ${trial.ratio.toFixed(1)}%`, W / 2, H / 2 - 20);
      stage.ctx.font = `500 28px ${FONT}`;
      stage.ctx.fillText(`你的估计 ${judged}%`, W / 2, H / 2 + 42);
      await U.sleep(A.config.testMode ? 320 : 1300);
    }
    const aBox = boxes.find((box) => box.index === trial.aIndex);
    const bBox = boxes.find((box) => box.index === trial.bIndex);
    return {
      encoding: trial.encoding,
      trial: trial.trialIndex,
      ratio: trial.ratio,
      judged,
      rt: Math.round(rt),
      error,
      values: trial.values,
      a_index: trial.aIndex,
      b_index: trial.bIndex,
      a_box: aBox,
      b_box: bBox,
      samples: recordingData ? recordingData.samples : [],
      hz: recordingData ? recordingData.hz : null,
      face_loss: recordingData ? recordingData.face_loss : null,
      participant
    };
  }

  function makeTrials(participant) {
    const trials = [];
    let index = 0;
    for (const encoding of CFG.encodings) {
      for (let repeat = 0; repeat < encoding.repeats; repeat += 1) {
        for (const ratio of CFG.ratios) {
          trials.push(makeTrial(
            participant + "-" + encoding.id + "-" + repeat + "-" + ratio,
            encoding.id,
            ratio,
            index++
          ));
        }
      }
    }
    return U.shuffle(trials).map((trial, i) => Object.assign(trial, { trialIndex: i }));
  }

  async function run(options) {
    const stage = new A.Stage({ host: document.getElementById("app") });
    await instruct(stage, `
      <p class="eyebrow">GRAPHICAL PERCEPTION</p>
      <h2>估一估：图形直觉排序</h2>
      <p>每一屏有 5 个图形，其中 A 和 B 被标出，A 总是较大的数值。请估计 B 是 A 的百分之几。</p>
      <div class="instruction-grid">
        <div><b>1</b><span>观察 A 与 B</span></div>
        <div><b>2</b><span>输入 0–100</span></div>
        <div><b>3</b><span>按 Enter 确认</span></div>
      </div>
      <p class="muted">正式实验不显示正确答案。</p>`, "开始练习");

    const practice = U.shuffle(CFG.encodings).slice(0, CFG.practiceTrials);
    for (let i = 0; i < practice.length; i += 1) {
      const trial = makeTrial(options.participant + "-practice-" + i, practice[i].id, [35, 60][i % 2], i);
      await runTrial(stage, A.eyeTracker, trial, true, options.participant);
    }
    await instruct(stage, `
      <p class="eyebrow">FORMAL TRIALS</p>
      <h2>正式实验</h2>
      <p>共 40 题，四种图形编码各 10 题。请凭第一眼估计，不要使用尺子或计算器。</p>`, "开始正式实验");

    const trials = makeTrials(options.participant);
    const results = [];
    for (let i = 0; i < trials.length; i += 1) {
      results.push(await runTrial(stage, A.eyeTracker, trials[i], false, options.participant));
    }
    await instruct(stage, `
      <p class="eyebrow">GRAPHICAL PERCEPTION COMPLETE</p>
      <h2>图形知觉完成</h2>
      <p>本实验完成，数据将与其他两个实验分别上传。</p>`, "保存并返回");
    stage.destroy();
    return {
      trials: results,
      meta: {
        encodings: CFG.encodings.map((encoding) => encoding.id),
        ratios: CFG.ratios,
        trials_per_encoding: 10
      }
    };
  }

  A.experiments = A.experiments || {};
  A.experiments.cm = { run, makeTrials };
})();
