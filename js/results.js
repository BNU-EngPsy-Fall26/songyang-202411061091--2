(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const U = A.util;
  const W = A.logical.width;
  const H = A.logical.height;

  function getYes(trial) {
    if (typeof trial.yes === "boolean") return trial.yes;
    return trial.key === "KeyF" || trial.response === "yes";
  }

  function changeMetrics(trials) {
    const formal = trials || [];
    const neutral = formal.filter((trial) => trial.condition === "neutral");
    const spatial = formal.filter((trial) => trial.condition === "spatial");
    const valid = formal.filter((trial) => trial.cue_type === "valid");
    const invalid = formal.filter((trial) => trial.cue_type === "invalid");

    function summarize(rows) {
      const detected = rows.filter((trial) => trial.detected);
      return {
        n: rows.length,
        detectRate: rows.length ? detected.length / rows.length : null,
        detectTime: U.mean(detected.map((trial) => trial.detection_ms)),
        clickAccuracy: U.mean(rows.map((trial) => trial.correct_click ? 1 : 0)),
        timeoutRate: rows.length ? rows.filter((trial) => trial.timeout).length / rows.length : null,
        lookedNotSeen: rows.filter((trial) => {
          if (trial.detected || !Array.isArray(trial.samples) || !Array.isArray(trial.bbox)) return false;
          return trial.samples.some((sample) => {
            if (!sample || sample[1] < 0) return false;
            const x = sample[1] * W;
            const y = sample[2] * H;
            return x >= trial.bbox[0] && x <= trial.bbox[0] + trial.bbox[2] &&
              y >= trial.bbox[1] && y <= trial.bbox[1] + trial.bbox[3];
          });
        }).length
      };
    }
    return {
      neutral: summarize(neutral),
      spatial: summarize(spatial),
      valid: summarize(valid),
      invalid: summarize(invalid),
      all: summarize(formal),
      detectionRateDifference: spatial.length && neutral.length
        ? summarize(spatial).detectRate - summarize(neutral).detectRate
        : null,
      detectionTimeDifference: spatial.length && neutral.length &&
        summarize(spatial).detectTime != null && summarize(neutral).detectTime != null
        ? summarize(spatial).detectTime - summarize(neutral).detectTime
        : null
    };
  }

  function lowprevMetrics(trials) {
    const groups = {};
    for (const trial of trials || []) {
      const block = trial.block || trial.condition || "unknown";
      if (!groups[block]) groups[block] = [];
      groups[block].push(trial);
    }
    const metrics = {};
    for (const [block, rows] of Object.entries(groups)) {
      let hits = 0;
      let misses = 0;
      let falseAlarms = 0;
      let correctRejects = 0;
      for (const trial of rows) {
        const yes = getYes(trial);
        const present = Boolean(trial.present);
        if (present && yes) hits += 1;
        else if (present && !yes) misses += 1;
        else if (!present && yes) falseAlarms += 1;
        else correctRejects += 1;
      }
      const signal = U.sdt(hits, misses, falseAlarms, correctRejects);
      metrics[block] = {
        n: rows.length,
        hits,
        misses,
        falseAlarms,
        correctRejects,
        missRate: hits + misses ? misses / (hits + misses) : null,
        faRate: falseAlarms + correctRejects ? falseAlarms / (falseAlarms + correctRejects) : null,
        dprime: signal.dprime,
        criterion: signal.criterion,
        meanRt: U.mean(rows.filter((trial) => trial.correct && Number.isFinite(trial.rt)).map((trial) => trial.rt)),
        score: U.mean(rows.map((trial) => Number.isFinite(trial.score) ? trial.score : null))
      };
    }
    return {
      blocks: metrics,
      high: metrics.p50 || null,
      baseline: metrics.p10 || null,
      disclosed: metrics.p10_disclosed || null,
      payoff: metrics.p10_payoff || null
    };
  }

  function linearSlope(xs, ys) {
    const xMean = U.mean(xs);
    const yMean = U.mean(ys);
    if (xMean == null || yMean == null) return null;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < xs.length; i += 1) {
      numerator += (xs[i] - xMean) * (ys[i] - yMean);
      denominator += (xs[i] - xMean) ** 2;
    }
    return denominator ? numerator / denominator : null;
  }

  function standardizedDifference(first, second) {
    const a = (first || []).filter(Number.isFinite);
    const b = (second || []).filter(Number.isFinite);
    const meanA = U.mean(a);
    const meanB = U.mean(b);
    const sdA = U.sd(a);
    const sdB = U.sd(b);
    if (meanA == null || meanB == null || sdA == null || sdB == null) return null;
    const pooled = Math.sqrt((sdA * sdA + sdB * sdB) / 2);
    return pooled ? (meanB - meanA) / pooled : null;
  }

  function cmMetrics(trials) {
    const groups = {};
    for (const trial of trials || []) {
      if (!groups[trial.encoding]) groups[trial.encoding] = [];
      groups[trial.encoding].push(trial);
    }
    const encodings = {};
    for (const [encoding, rows] of Object.entries(groups)) {
      const judged = rows.map((trial) => Number(trial.judged));
      const ratios = rows.map((trial) => Number(trial.ratio));
      const errors = rows.map((trial) => Number(trial.error));
      const logRatios = ratios.map((ratio) => Math.log(ratio));
      const logJudged = judged.map((value) => Math.log(Math.max(0.01, value)));
      encodings[encoding] = {
        n: rows.length,
        meanError: U.mean(errors),
        meanJudged: U.mean(judged),
        meanRt: U.mean(rows.map((trial) => trial.rt)),
        stevensB: encoding === "area" ? linearSlope(logRatios, logJudged) : null,
        bias: encoding === "area" ? U.mean(judged.map((value, index) => value - ratios[index])) : null
      };
    }
    const order = Object.keys(encodings).sort((a, b) => encodings[a].meanError - encodings[b].meanError);
    const common = encodings.position || null;
    const nonCommon = encodings.length || null;
    return {
      encodings,
      order,
      common,
      nonCommon,
      commonAdvantage: common && nonCommon ? nonCommon.meanError - common.meanError : null,
      meanError: U.mean(Object.values(encodings).map((encoding) => encoding.meanError))
    };
  }

  function analyze(experimentId, trials) {
    if (experimentId === "changeblind") return changeMetrics(trials);
    if (experimentId === "lowprev") return lowprevMetrics(trials);
    if (experimentId === "cm") return cmMetrics(trials);
    return {};
  }

  function lastByParticipant(records) {
    const map = new Map();
    const ordered = (records || []).slice().sort((a, b) =>
      String(a.created_at || "").localeCompare(String(b.created_at || ""))
    );
    for (const record of ordered) {
      if (!record) continue;
      let trials = record.trials;
      if (typeof trials === "string") {
        try {
          trials = JSON.parse(trials);
        } catch (error) {
          trials = null;
        }
      }
      if (!Array.isArray(trials)) continue;
      const participant = record.participant || "unknown";
      map.set(participant, Object.assign({}, record, { trials }));
    }
    return [...map.values()];
  }

  function groupMetrics(experimentId, records) {
    const latest = lastByParticipant(records);
    const rows = latest.map((record) => ({
      participant: record.participant,
      metrics: analyze(experimentId, record.trials)
    }));
    const result = {
      n: rows.length,
      rows
    };
    if (experimentId === "changeblind") {
      const neutralRate = [];
      const spatialRate = [];
      const neutralTime = [];
      const spatialTime = [];
      rows.forEach((row) => {
        neutralRate.push(row.metrics.neutral.detectRate);
        spatialRate.push(row.metrics.spatial.detectRate);
        if (row.metrics.neutral.detectTime != null && row.metrics.spatial.detectTime != null) {
          neutralTime.push(row.metrics.neutral.detectTime);
          spatialTime.push(row.metrics.spatial.detectTime);
        }
      });
      result.neutral = { detectRate: U.mean(neutralRate), detectTime: U.mean(neutralTime) };
      result.spatial = { detectRate: U.mean(spatialRate), detectTime: U.mean(spatialTime) };
      result.rateEffect = spatialRate.length && neutralRate.length
        ? U.cohenDz(neutralRate, spatialRate)
        : { meanDifference: null, dz: null };
      result.timeEffect = neutralTime.length && spatialTime.length
        ? U.cohenDz(neutralTime, spatialTime)
        : { meanDifference: null, dz: null };
    } else if (experimentId === "lowprev") {
      const blocks = ["p50", "p10", "p10_disclosed", "p10_payoff"];
      result.blocks = {};
      for (const block of blocks) {
        const values = rows.map((row) => row.metrics.blocks[block]).filter(Boolean);
        result.blocks[block] = {
          missRate: U.mean(values.map((value) => value.missRate)),
          faRate: U.mean(values.map((value) => value.faRate)),
          dprime: U.mean(values.map((value) => value.dprime)),
          criterion: U.mean(values.map((value) => value.criterion)),
          meanRt: U.mean(values.map((value) => value.meanRt))
        };
      }
      const baseC = rows.filter((row) => row.metrics.baseline && row.metrics.disclosed).map((row) => row.metrics.baseline.criterion);
      const disclosedC = rows.filter((row) => row.metrics.baseline && row.metrics.disclosed).map((row) => row.metrics.disclosed.criterion);
      const payoffC = rows.filter((row) => row.metrics.baseline && row.metrics.payoff).map((row) => row.metrics.payoff.criterion);
      result.disclosedEffect = baseC.length && disclosedC.length ? U.cohenDz(baseC, disclosedC) : null;
      result.payoffEffect = baseC.length && payoffC.length ? U.cohenDz(baseC, payoffC) : null;
    } else if (experimentId === "cm") {
      result.encodings = {};
      for (const encoding of ["position", "length", "angle", "area"]) {
        const values = rows.map((row) => row.metrics.encodings[encoding]).filter(Boolean);
        result.encodings[encoding] = {
          meanError: U.mean(values.map((value) => value.meanError)),
          meanJudged: U.mean(values.map((value) => value.meanJudged)),
          meanRt: U.mean(values.map((value) => value.meanRt)),
          stevensB: U.mean(values.map((value) => value.stevensB)),
          bias: U.mean(values.map((value) => value.bias))
        };
      }
      result.order = Object.keys(result.encodings).sort((a, b) => result.encodings[a].meanError - result.encodings[b].meanError);
      const pos = [];
      const len = [];
      rows.forEach((row) => {
        if (row.metrics.common && row.metrics.nonCommon) {
          pos.push(row.metrics.common.meanError);
          len.push(row.metrics.nonCommon.meanError);
        }
      });
      result.commonEffect = pos.length && len.length ? U.cohenDz(pos, len) : null;
    }
    return result;
  }

  function metric(label, value, sub) {
    return `<div class="result-metric"><span>${U.escapeHtml(label)}</span><strong>${U.escapeHtml(value)}</strong>${sub ? `<small>${U.escapeHtml(sub)}</small>` : ""}</div>`;
  }

  function barRows(rows, key, label, max) {
    return rows.map((row) => {
      const value = Number.isFinite(row[key]) ? row[key] : 0;
      const width = max ? Math.max(1, Math.min(100, value / max * 100)) : value;
      return `<div class="result-bar-row">
        <span>${U.escapeHtml(row.label)}</span>
        <div class="result-bar-track"><i style="width:${width}%"></i></div>
        <b>${U.escapeHtml(label(row))}</b>
      </div>`;
    }).join("");
  }

  function dataQuality(local) {
    const trials = local && local.trials ? local.trials : [];
    const total = trials.length;
    const eyeTrials = trials.filter((trial) => Array.isArray(trial.samples) && trial.samples.length).length;
    const camera = A.eyeTracker.mode === "camera";
    const quality = A.eyeTracker.lastCalibration;
    return `<div class="data-quality">
      <span>试次数 <b>${total}</b></span>
      <span>眼动来源 <b>${camera ? "摄像头" : "鼠标兜底"}</b></span>
      <span>${camera ? "有效眼动试次" : "含指针轨迹试次"} <b>${eyeTrials}</b></span>
      <span>校准误差 <b>${quality && quality.errorPx != null ? Math.round(quality.errorPx) + " px" : "—"}</b></span>
    </div>`;
  }

  function samplesOf(trial) {
    if (Array.isArray(trial.samples)) {
      return trial.samples.filter((sample) => Array.isArray(sample) && sample.length >= 3 && sample[1] >= 0 && sample[2] >= 0);
    }
    if (Array.isArray(trial.eye_flat)) {
      const samples = [];
      for (let i = 0; i + 2 < trial.eye_flat.length; i += 3) {
        if (trial.eye_flat[i + 1] >= 0 && trial.eye_flat[i + 2] >= 0) {
          samples.push([trial.eye_flat[i], trial.eye_flat[i + 1], trial.eye_flat[i + 2]]);
        }
      }
      return samples;
    }
    return [];
  }

  function aoiFor(experimentId, trial) {
    if (experimentId === "changeblind") {
      if (Array.isArray(trial.bbox)) return { x: trial.bbox[0] / W, y: trial.bbox[1] / H, w: trial.bbox[2] / W, h: trial.bbox[3] / H, label: "变化区域" };
      if (Number.isFinite(trial.bbox_x)) return { x: trial.bbox_x / W, y: trial.bbox_y / H, w: trial.bbox_w / W, h: trial.bbox_h / H, label: "变化区域" };
    }
    if (experimentId === "lowprev" && trial.present && Number.isFinite(trial.targetX)) {
      return { x: trial.targetX / W - 0.06, y: trial.targetY / H - 0.1, w: 0.12, h: 0.2, label: "违禁品" };
    }
    if (experimentId === "cm" && Number.isFinite(trial.a_box_x)) {
      return { x: trial.a_box_x / W, y: trial.a_box_y / H, w: trial.a_box_w / W, h: trial.a_box_h / H, label: "A 图形" };
    }
    if (experimentId === "cm" && trial.a_box) {
      return { x: trial.a_box.x / W, y: trial.a_box.y / H, w: trial.a_box.width / W, h: trial.a_box.height / H, label: "A 图形" };
    }
    return null;
  }

  function initGazeViz(container, experimentId, trials) {
    const available = (trials || []).filter((trial) => samplesOf(trial).length > 1);
    if (!available.length) {
      container.innerHTML = `<p class="muted">本机数据没有足够的指针轨迹或眼动样本。摄像头模式会记录约 15 Hz 注视坐标；鼠标模式需要移动鼠标。</p>`;
      return;
    }
    let index = 0;
    container.innerHTML = `
      <div class="gaze-toolbar">
        <button type="button" class="text-button" data-gaze-prev>上一题</button>
        <span class="mono" data-gaze-label></span>
        <button type="button" class="text-button" data-gaze-next>下一题</button>
      </div>
      <canvas class="gaze-canvas" width="960" height="540" role="img" aria-label="注视热图与当前试次扫描路径"></canvas>
      <p class="gaze-legend"><i class="gaze-dot"></i>汇总热区　<i class="gaze-line"></i>当前试次扫描路径　<i class="gaze-box"></i>关键 AOI</p>`;
    const canvas = container.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const label = container.querySelector("[data-gaze-label]");

    function draw() {
      const trial = available[index];
      const rootStyle = getComputedStyle(document.documentElement);
      const ink = rootStyle.getPropertyValue("--ink").trim() || "#14140f";
      const muted = rootStyle.getPropertyValue("--muted").trim() || "#6f7169";
      const paper = document.documentElement.dataset.theme === "dark" ? "#0c1b24" : "#f4f3ef";
      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "rgba(120,120,110,0.16)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }

      for (const option of available) {
        for (const sample of samplesOf(option)) {
          const x = sample[1] * width;
          const y = sample[2] * height;
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
          gradient.addColorStop(0, "rgba(180,73,62,0.16)");
          gradient.addColorStop(1, "rgba(180,73,62,0)");
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      const aoi = aoiFor(experimentId, trial);
      if (aoi) {
        ctx.strokeStyle = "#3f7657";
        ctx.lineWidth = 3;
        ctx.strokeRect(aoi.x * width, aoi.y * height, aoi.w * width, aoi.h * height);
        ctx.fillStyle = "#3f7657";
        ctx.font = '600 12px "Cascadia Mono", Consolas, monospace';
        ctx.fillText(aoi.label, aoi.x * width + 6, aoi.y * height - 7);
      }

      const path = samplesOf(trial);
      ctx.strokeStyle = "#4e7f9c";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      path.forEach((sample, sampleIndex) => {
        const x = sample[1] * width;
        const y = sample[2] * height;
        if (sampleIndex === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.fillStyle = ink;
      path.forEach((sample, sampleIndex) => {
        if (sampleIndex > 0 && sampleIndex < path.length - 1) return;
        ctx.beginPath();
        ctx.arc(sample[1] * width, sample[2] * height, sampleIndex ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = muted;
      ctx.font = '11px "Cascadia Mono", Consolas, monospace';
      ctx.fillText("起点", path[0][1] * width + 8, path[0][2] * height - 8);
      const last = path[path.length - 1];
      ctx.fillText("终点", last[1] * width + 8, last[2] * height + 16);

      const source = trial.samples ? (A.eyeTracker.mode === "camera" ? "眼动" : "指针") : "已上传眼动";
      label.textContent = `TRIAL ${index + 1} / ${available.length} · ${source} · ${path.length} 个样本`;
    }
    function move(direction) {
      index = (index + direction + available.length) % available.length;
      draw();
    }
    container.querySelector("[data-gaze-prev]").addEventListener("click", () => move(-1));
    container.querySelector("[data-gaze-next]").addEventListener("click", () => move(1));
    draw();
  }

  function renderChange(local, group) {
    const m = local.metrics;
    return `
      <div class="result-metrics">
        ${metric("中性线索发现率", U.formatPercent(m.neutral.detectRate))}
        ${metric("空间线索发现率", U.formatPercent(m.spatial.detectRate))}
        ${metric("中性线索发现时间", m.neutral.detectTime == null ? "—" : (m.neutral.detectTime / 1000).toFixed(1) + " s")}
        ${metric("空间线索发现时间", m.spatial.detectTime == null ? "—" : (m.spatial.detectTime / 1000).toFixed(1) + " s")}
      </div>
      <div class="result-section">
        <h3>线索条件</h3>
        ${barRows([
          { label: "中性线索", rate: m.neutral.detectRate },
          { label: "空间线索", rate: m.spatial.detectRate },
          { label: "有效线索", rate: m.valid.detectRate },
          { label: "无效线索", rate: m.invalid.detectRate }
        ], "rate", (row) => U.formatPercent(row.rate), 1)}
      </div>
      <p class="effect-line"><b>个人线索效应：</b>空间线索使发现率变化 ${U.formatPercent(m.detectionRateDifference)}${m.detectionTimeDifference == null ? "" : `，发现时间变化 ${Math.round(m.detectionTimeDifference)} ms`}；发现时间的标准化均值差 d = ${U.formatNumber(standardizedDifference(
        (local.trials || []).filter((trial) => trial.condition === "neutral" && trial.detected).map((trial) => trial.detection_ms),
        (local.trials || []).filter((trial) => trial.condition === "spatial" && trial.detected).map((trial) => trial.detection_ms)
      ), 2)}。</p>
      <div class="result-section">
        <h3>你与全班</h3>
        <table class="result-table">
          <tr><th></th><th>中性线索</th><th>空间线索</th><th>差值</th></tr>
          <tr><td>你</td><td>${U.formatPercent(m.neutral.detectRate)}</td><td>${U.formatPercent(m.spatial.detectRate)}</td><td>${U.formatPercent(m.detectionRateDifference)}</td></tr>
          <tr><td>全班</td><td>${group.n ? U.formatPercent(group.neutral.detectRate) : "等待数据"}</td><td>${group.n ? U.formatPercent(group.spatial.detectRate) : "等待数据"}</td><td>${group.n && group.rateEffect ? U.formatPercent(group.rateEffect.meanDifference) : "—"}</td></tr>
        </table>
      </div>
      <div class="result-compare">
        <b>与 Rensink et al. (1997) 对照：</b>
        变化觉察依赖注意。有效空间线索应降低发现时间并提高发现率；无效线索可作为注意代价的探索性指标。
      </div>`;
  }

  function renderLowprev(local, group) {
    const m = local.metrics;
    const rows = [
      { label: "高流行率 50%", value: m.high },
      { label: "低流行率 10%", value: m.baseline },
      { label: "明示 10%", value: m.disclosed },
      { label: "不对称奖惩", value: m.payoff }
    ];
    return `
      <div class="result-metrics">
        ${metric("低流行率漏报", U.formatPercent(m.baseline && m.baseline.missRate), "基线")}
        ${metric("明示后漏报", U.formatPercent(m.disclosed && m.disclosed.missRate), "改进条件")}
        ${metric("奖惩后漏报", U.formatPercent(m.payoff && m.payoff.missRate), "改进条件")}
        ${metric("低流行率 c", U.formatNumber(m.baseline && m.baseline.criterion, 2), "判断标准")}
      </div>
      <div class="result-section">
        <h3>各段漏报率</h3>
        ${barRows(rows.map((row) => ({
          label: row.label,
          rate: row.value ? row.value.missRate : null
        })), "rate", (row) => U.formatPercent(row.rate), 1)}
      </div>
      <div class="result-section">
        <h3>各段指标</h3>
        <table class="result-table">
          <tr><th>条件</th><th>漏报</th><th>误报</th><th>d′</th><th>c</th><th>正确 RT</th></tr>
          ${rows.map((row) => {
            const value = row.value || {};
            return `<tr><td>${row.label}</td><td>${U.formatPercent(value.missRate)}</td><td>${U.formatPercent(value.faRate, 1)}</td><td>${U.formatNumber(value.dprime, 2)}</td><td>${U.formatNumber(value.criterion, 2)}</td><td>${value.meanRt == null ? "—" : Math.round(value.meanRt) + " ms"}</td></tr>`;
          }).join("")}
        </table>
      </div>
      <p class="effect-line"><b>个人改进效应：</b>明示流行率使 c 变化 ${m.baseline && m.disclosed ? U.formatNumber(m.disclosed.criterion - m.baseline.criterion, 2) : "—"}，漏报率变化 ${m.baseline && m.disclosed ? U.formatPercent(m.disclosed.missRate - m.baseline.missRate) : "—"}；不对称奖惩使 c 变化 ${m.baseline && m.payoff ? U.formatNumber(m.payoff.criterion - m.baseline.criterion, 2) : "—"}，漏报率变化 ${m.baseline && m.payoff ? U.formatPercent(m.payoff.missRate - m.baseline.missRate) : "—"}。</p>
      <div class="result-section">
        <h3>全班对照</h3>
        <table class="result-table">
          <tr><th>条件</th><th>全班漏报</th><th>全班 d′</th><th>全班 c</th></tr>
          ${["p50", "p10", "p10_disclosed", "p10_payoff"].map((block) => {
            const value = group.blocks && group.blocks[block];
            return `<tr><td>${block === "p50" ? "50%" : block === "p10" ? "10% 基线" : block === "p10_disclosed" ? "明示 10%" : "不对称奖惩"}</td><td>${value ? U.formatPercent(value.missRate) : "等待数据"}</td><td>${value ? U.formatNumber(value.dprime, 2) : "—"}</td><td>${value ? U.formatNumber(value.criterion, 2) : "—"}</td></tr>`;
          }).join("")}
        </table>
        <p class="muted">改进效应：明示流行率使 c 变化 ${group.disclosedEffect ? U.formatNumber(group.disclosedEffect.meanDifference, 2) : "—"}；奖惩使 c 变化 ${group.payoffEffect ? U.formatNumber(group.payoffEffect.meanDifference, 2) : "—"}。数值越负，判断越倾向于报告“有违禁品”。</p>
      </div>
      <div class="result-compare">
        <b>与 Wolfe et al. (2005) 对照：</b>
        原文在 50% / 10% / 1% 流行率下漏报约为 7% / 16% / 30%。本实验采用 10% 低流行率，以获得每段至少两个目标试次；重点比较方向而非精确数值。
      </div>`;
  }

  function renderCm(local, group) {
    const m = local.metrics;
    const labels = { position: "共同基线", length: "非共同基线", angle: "角度", area: "面积" };
    const rows = Object.entries(m.encodings).map(([key, value]) => ({
      label: labels[key],
      key,
      error: value.meanError
    }));
    return `
      <div class="result-metrics">
        ${metric("共同基线误差", U.formatNumber(m.common && m.common.meanError, 2), "log2")}
        ${metric("非共同基线误差", U.formatNumber(m.nonCommon && m.nonCommon.meanError, 2), "log2")}
        ${metric("面积 Stevens b", U.formatNumber(m.encodings.area && m.encodings.area.stevensB, 2), "越接近 1 越接近真实比例")}
        ${metric("误差排序", m.order.map((key) => labels[key]).join(" < "), "越小越准确")}
      </div>
      <div class="result-section">
        <h3>四种编码的平均误差</h3>
        ${barRows(rows, "error", (row) => U.formatNumber(row.error, 2), 4)}
      </div>
      <div class="result-section">
        <h3>共同基线与非共同基线</h3>
        <p>非共同基线误差 − 共同基线误差 = <b>${U.formatNumber(m.commonAdvantage, 2)}</b>。正值表示共同基线更准确。标准化均值差 d = <b>${U.formatNumber(standardizedDifference(
          (local.trials || []).filter((trial) => trial.encoding === "position").map((trial) => trial.error),
          (local.trials || []).filter((trial) => trial.encoding === "length").map((trial) => trial.error)
        ), 2)}</b>。</p>
        <p class="muted">全班共同基线效应：${group.commonEffect ? "平均差 " + U.formatNumber(group.commonEffect.meanDifference, 2) + "，Cohen's dz = " + U.formatNumber(group.commonEffect.dz, 2) : "等待数据"}</p>
      </div>
      <div class="result-compare">
        <b>与 Cleveland & McGill (1984) 对照：</b>
        原研究的典型排序为位置 &lt; 长度 &lt; 角度 &lt; 面积。本研究把共同基线和非共同基线单独作为改进条件，同时保留角度和面积编码。
      </div>`;
  }

  function render(container, experimentId, local, group) {
    let body = "";
    if (experimentId === "changeblind") body = renderChange(local, group);
    if (experimentId === "lowprev") body = renderLowprev(local, group);
    if (experimentId === "cm") body = renderCm(local, group);
    container.innerHTML = `
      <section class="result-screen">
        <p class="eyebrow">RESULT / ${experimentId.toUpperCase()}</p>
        <h2>${A.config.experiments[experimentId].title}</h2>
        ${dataQuality(local)}
        ${body}
        <div class="result-section">
          <h3>眼动热图与扫描路径</h3>
          <p class="muted">汇总热区展示所有试次的轨迹密度；彩色路径为当前试次，绿色框为关键 AOI。</p>
          <div class="gaze-viz" data-gaze-viz></div>
        </div>
        <div class="result-actions">
          <button class="button primary" data-next-experiment type="button">继续</button>
          <button class="button" data-download-local type="button">下载本机数据</button>
        </div>
      </section>`;
    const gazeContainer = container.querySelector("[data-gaze-viz]");
    if (gazeContainer) initGazeViz(gazeContainer, experimentId, local.trials || []);
  }

  A.results = {
    analyze,
    groupMetrics,
    render,
    changeMetrics,
    lowprevMetrics,
    cmMetrics
  };
})();
