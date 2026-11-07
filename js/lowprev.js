(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;
  const CFG = A.config.experiments.lowprev;
  const W = A.logical.width;
  const H = A.logical.height;

  function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function drawWeapon(ctx, x, y, angle, scale, flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale * (flip ? -1 : 1), scale);
    ctx.fillStyle = "rgba(28,56,154,0.82)";
    ctx.strokeStyle = "rgba(12,28,100,0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-62, -23, 124, 24, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgba(24,48,136,0.95)";
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(56, 0);
    ctx.lineTo(62, 50);
    ctx.lineTo(35, 54);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(18,42,130,0.95)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(12, 12, 12, 0.12, Math.PI * 0.96);
    ctx.stroke();
    ctx.fillStyle = "rgba(16,36,112,0.95)";
    ctx.fillRect(42, 8, 10, 31);
    ctx.restore();
  }

  function drawObject(ctx, type, x, y, angle, scale, rng) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    if (type === "clothes") {
      ctx.fillStyle = "rgba(230,139,44,0.34)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 95, 55, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(230,139,44,0.2)";
      ctx.beginPath();
      ctx.ellipse(15, -10, 58, 34, -0.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "book") {
      ctx.fillStyle = "rgba(222,142,44,0.72)";
      drawRoundedRect(ctx, -67, -45, 134, 90, 4);
      ctx.fill();
      ctx.strokeStyle = "rgba(171,90,20,0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(-60, -38, 120, 76);
    } else if (type === "bottle") {
      ctx.fillStyle = "rgba(73,173,103,0.48)";
      drawRoundedRect(ctx, -23, -63, 46, 120, 12);
      ctx.fill();
      ctx.fillStyle = "rgba(35,58,160,0.75)";
      ctx.fillRect(-10, -77, 20, 17);
    } else if (type === "laptop") {
      ctx.fillStyle = "rgba(68,160,91,0.42)";
      drawRoundedRect(ctx, -115, -75, 230, 150, 7);
      ctx.fill();
      ctx.strokeStyle = "rgba(31,77,48,0.42)";
      ctx.lineWidth = 2;
      for (let i = -5; i <= 5; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 18, -58);
        ctx.lineTo(i * 18, 22);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(35,62,165,0.62)";
      ctx.fillRect(55, 45, 45, 25);
    } else if (type === "phone") {
      ctx.fillStyle = "rgba(35,64,165,0.72)";
      drawRoundedRect(ctx, -22, -43, 44, 86, 7);
      ctx.fill();
      ctx.fillStyle = "rgba(62,160,86,0.55)";
      ctx.fillRect(-15, -32, 30, 58);
    } else if (type === "keys") {
      ctx.strokeStyle = "rgba(32,57,155,0.82)";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 3; i += 1) {
        ctx.save();
        ctx.rotate(i * 0.85);
        ctx.fillStyle = "rgba(32,57,155,0.82)";
        ctx.fillRect(14, -5, 45, 10);
        ctx.fillRect(49, -5, 7, 18);
        ctx.restore();
      }
    } else if (type === "umbrella") {
      ctx.strokeStyle = "rgba(33,59,150,0.75)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-140, 0);
      ctx.lineTo(115, 0);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(116, 16, 18, -Math.PI / 2, Math.PI * 0.62);
      ctx.stroke();
    } else if (type === "bracket") {
      ctx.fillStyle = "rgba(28,53,154,0.76)";
      ctx.fillRect(-50, -10, 100, 18);
      ctx.fillRect(31, -10, 18, 57);
    } else if (type === "stapler") {
      ctx.fillStyle = "rgba(33,59,155,0.72)";
      drawRoundedRect(ctx, -60, -13, 120, 26, 9);
      ctx.fill();
    } else if (type === "charger") {
      ctx.fillStyle = "rgba(68,165,94,0.5)";
      drawRoundedRect(ctx, -30, -22, 60, 44, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(34,59,153,0.68)";
      ctx.fillRect(28, -10, 18, 4);
      ctx.fillRect(28, 6, 18, 4);
    }
    ctx.restore();
  }

  function drawBag(ctx, layout, showTarget) {
    ctx.fillStyle = "#e7e9e7";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#c8ccd0";
    ctx.fillRect(0, 118, W, 666);
    ctx.strokeStyle = "rgba(92,100,104,0.28)";
    ctx.lineWidth = 2;
    for (let x = 0; x < W; x += 78) {
      ctx.beginPath();
      ctx.moveTo(x, 118);
      ctx.lineTo(x, 784);
      ctx.stroke();
    }
    const bag = layout.bag;
    ctx.fillStyle = "#fbfbf7";
    ctx.strokeStyle = "#4f5962";
    ctx.lineWidth = 4;
    drawRoundedRect(ctx, bag[0] - 22, bag[1] - 22, bag[2] + 44, bag[3] + 44, 30);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bag[0] - 22, bag[1] - 22, bag[2] + 44, bag[3] + 44, 30);
    ctx.clip();
    ctx.globalCompositeOperation = "multiply";
    for (const object of layout.objects) {
      drawObject(ctx, object.type, object.x, object.y, object.angle, object.scale, layout.rng);
    }
    if (showTarget) drawWeapon(ctx, layout.target.x, layout.target.y, layout.target.angle, layout.target.scale, layout.target.flip);
    ctx.restore();
  }

  function makeLayout(participant, blockId, index) {
    const seed = participant + "-" + blockId + "-" + index;
    const rng = U.seededRandom(seed);
    const bag = [300, 155, 1000, 590];
    const target = {
      x: U.randomBetween(rng, bag[0] + 150, bag[0] + bag[2] - 150),
      y: U.randomBetween(rng, bag[1] + 130, bag[1] + bag[3] - 130),
      angle: rng() * Math.PI * 2,
      scale: 0.72 + rng() * 0.2,
      flip: rng() < 0.5
    };
    const types = ["clothes", "book", "bottle", "laptop", "phone", "keys", "umbrella", "bracket", "stapler", "charger"];
    const objects = Array.from({ length: 18 }, (_, objectIndex) => ({
      type: types[Math.floor(rng() * types.length)],
      x: U.randomBetween(rng, bag[0] + 70, bag[0] + bag[2] - 70),
      y: U.randomBetween(rng, bag[1] + 70, bag[1] + bag[3] - 70),
      angle: rng() * Math.PI * 2,
      scale: 0.68 + rng() * 0.55,
      z: objectIndex
    })).sort((a, b) => a.z - b.z);
    return { rng, bag, target, objects };
  }

  function scheduleBlock(participant, block) {
    const targetCount = block.prevalence >= 0.5
      ? 10
      : Math.round(CFG.blockSize * block.prevalence);
    const targetIndices = U.shuffle(
      Array.from({ length: CFG.blockSize - 2 }, (_, i) => i + 2)
    ).slice(0, targetCount);
    const targetSet = new Set(targetIndices);
    return Array.from({ length: CFG.blockSize }, (_, index) => ({
      block: block.id,
      blockLabel: block.label,
      prevalence: block.prevalence,
      instructionCondition: block.instruction,
      indexInBlock: index,
      present: targetSet.has(index)
    }));
  }

  function payoffScore(present, yes) {
    if (present && yes) return CFG.payoff.hit;
    if (!present && !yes) return CFG.payoff.correctReject;
    if (present && !yes) return CFG.payoff.miss;
    return CFG.payoff.falseAlarm;
  }

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

  async function runTrial(stage, eye, layout, trial, practice) {
    const ctx = stage.ctx;
    stage.clear("#d8dcdf");
    ctx.fillStyle = "#323a40";
    ctx.strokeStyle = "#323a40";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 17, H / 2);
    ctx.lineTo(W / 2 + 17, H / 2);
    ctx.moveTo(W / 2, H / 2 - 17);
    ctx.lineTo(W / 2, H / 2 + 17);
    ctx.stroke();
    await U.sleep(300);
    drawBag(ctx, layout, trial.present);
    await stage.nextFrame();
    const startedAt = performance.now();
    const gaze = !practice ? eye.startRecording(stage) : null;
    const response = await stage.waitForKey(["KeyF", "KeyJ"], CFG.timeoutMs, startedAt);
    const recording = gaze ? eye.stopRecording() : null;
    const yes = response.key === "KeyF";
    const correct = yes === trial.present;
    let outcome = "timeout";
    if (response.key) {
      if (trial.present && yes) outcome = "hit";
      else if (trial.present && !yes) outcome = "miss";
      else if (!trial.present && yes) outcome = "false_alarm";
      else outcome = "correct_reject";
    } else {
      outcome = trial.present ? "miss" : "correct_reject";
    }

    if (trial.present && !yes) {
      ctx.strokeStyle = "#b4493e";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(layout.target.x, layout.target.y, 104, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(20,20,15,0.86)";
    ctx.fillRect(W / 2 - 280, 80, 560, 74);
    ctx.fillStyle = "#fff";
    ctx.font = '600 26px "Cascadia Mono", Consolas, monospace';
    ctx.textAlign = "center";
    const message = correct
      ? (yes ? "查获违禁品" : "放行正确")
      : (trial.present ? "漏报：有违禁品" : "误报：没有违禁品");
    ctx.fillText(message + (response.key ? "" : "（超时）"), W / 2, 126);
    await U.sleep(A.config.testMode ? 80 : (trial.present && !correct ? 1000 : 420));
    ctx.fillStyle = "#d8dcdf";
    ctx.fillRect(0, 0, W, H);
    await U.sleep(A.config.testMode ? 40 : 220);

    return Object.assign({}, trial, {
      key: response.key,
      yes,
      rt: response.rt == null ? null : Math.round(response.rt),
      timeout: response.timeout,
      correct,
      outcome,
      score: trial.instructionCondition === "payoff" ? payoffScore(trial.present, yes) : null,
      targetX: trial.present ? layout.target.x : null,
      targetY: trial.present ? layout.target.y : null,
      samples: recording ? recording.samples : [],
      hz: recording ? recording.hz : null,
      face_loss: recording ? recording.face_loss : null
    });
  }

  async function runPractice(stage, eye, participant) {
    const trials = [
      { present: true, indexInBlock: 0, block: "practice" },
      { present: false, indexInBlock: 1, block: "practice" },
      { present: false, indexInBlock: 2, block: "practice" },
      { present: true, indexInBlock: 3, block: "practice" }
    ];
    for (let i = 0; i < trials.length; i += 1) {
      const trial = Object.assign({}, trials[i], { indexInBlock: i, instructionCondition: "practice" });
      await runTrial(stage, eye, makeLayout(participant, "practice", i), trial, true);
    }
  }

  function blockInstruction(block) {
    if (block.instruction === "disclosed") {
      return `
        <p class="eyebrow">PREVALENCE DISCLOSED</p>
        <h2>${block.label}</h2>
        <p>本段共 ${CFG.blockSize} 件行李，其中约 <b>10%</b> 含违禁品。请判断每件行李是否有违禁品。</p>
        <p class="muted">有：按 F（开包检查）　没有：按 J（放行）。时间到视为放行。</p>`;
    }
    if (block.instruction === "payoff") {
      return `
        <p class="eyebrow">ASYMMETRIC PAYOFF</p>
        <h2>${block.label}</h2>
        <p>本段中，漏报代价远高于误报。请根据下列计分矩阵作答。</p>
        <div class="payoff-table">
          <span>查获 +1</span><span>正确放行 +1</span>
          <span>漏报 -5</span><span>误报 -1</span>
        </div>
        <p class="muted">有：按 F　没有：按 J。时间到视为放行。</p>`;
    }
    return `
      <p class="eyebrow">X-RAY SCREENING</p>
      <h2>${block.label}</h2>
      <p>每件行李最多 3.5 秒。请判断其中有没有违禁品。</p>
      <p class="muted">有：按 F（开包检查）　没有：按 J（放行）。时间到视为放行。</p>`;
  }

  async function run(options) {
    const stage = new A.Stage({ host: document.getElementById("app") });
    await instruct(stage, `
      <p class="eyebrow">LOW PREVALENCE SEARCH</p>
      <h2>安检员：行李 X 光</h2>
      <p>你是机场安检员。请在行李中寻找手枪，并尽快判断是否有违禁品。</p>
      <p class="muted">正式实验分为四段，每段 20 件行李。不同段落的提示和计分规则不同，请按每段开头的说明完成。</p>`, "开始练习");
    await runPractice(stage, A.eyeTracker, options.participant);
    await instruct(stage, `
      <p class="eyebrow">BLOCKS READY</p>
      <h2>练习结束</h2>
      <p>接下来有 4 段正式行李检查，每段之间有说明和休息。</p>`, "开始正式实验");

    const blocks = U.shuffle(CFG.blocks.slice());
    const results = [];
    for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
      const block = blocks[blockIndex];
      await instruct(stage, blockInstruction(block), "开始本段");
      const schedule = scheduleBlock(options.participant, block);
      for (let i = 0; i < schedule.length; i += 1) {
        const trial = schedule[i];
        const layout = makeLayout(options.participant, block.id, i);
        results.push(await runTrial(stage, A.eyeTracker, layout, trial, false));
      }
      if (blockIndex < blocks.length - 1) {
        await instruct(stage, `
          <p class="eyebrow">BLOCK COMPLETE</p>
          <h2>第 ${blockIndex + 1} 段完成</h2>
          <p>休息一下，下一段将显示新的指导语。</p>`, "继续");
      }
    }
    await instruct(stage, `
      <p class="eyebrow">X-RAY COMPLETE</p>
      <h2>安检实验完成</h2>
      <p>四段数据将合并提交，并保留每段的条件信息。</p>`, "保存并返回");
    stage.destroy();
    return {
      trials: results,
      meta: {
        block_size: CFG.blockSize,
        prevalence_low: CFG.lowPrevalence,
        prevalence_high: CFG.highPrevalence,
        block_order: blocks.map((block) => block.id)
      }
    };
  }

  A.experiments = A.experiments || {};
  A.experiments.lowprev = { run };
})();
