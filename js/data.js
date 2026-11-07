(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};
  const CFG = A.config;

  function flattenSamples(samples, maxSamples) {
    if (!Array.isArray(samples) || !samples.length) return [];
    const limit = maxSamples || 150;
    const stride = Math.max(1, Math.ceil(samples.length / limit));
    const selected = [];
    for (let i = 0; i < samples.length; i += stride) selected.push(samples[i]);
    const last = samples[samples.length - 1];
    if (selected[selected.length - 1] !== last) selected.push(last);
    const flat = [];
    for (const sample of selected) {
      if (!Array.isArray(sample) || sample.length < 3) continue;
      flat.push(Math.round(sample[0]), Number(sample[1].toFixed(3)), Number(sample[2].toFixed(3)));
    }
    return flat;
  }

  function prepareTrial(trial, experimentId) {
    const output = Object.assign({}, trial);
    if (Array.isArray(output.samples)) {
      output.eye_flat = flattenSamples(output.samples, experimentId === "changeblind" ? 150 : 100);
      delete output.samples;
    }
    if (output.click && typeof output.click === "object") {
      output.click_x = output.click.x;
      output.click_y = output.click.y;
      output.click_nx = output.click.nx;
      output.click_ny = output.click.ny;
      delete output.click;
    }
    if (output.a_box && typeof output.a_box === "object") {
      output.a_box_x = output.a_box.x;
      output.a_box_y = output.a_box.y;
      output.a_box_w = output.a_box.width;
      output.a_box_h = output.a_box.height;
      delete output.a_box;
    }
    if (output.b_box && typeof output.b_box === "object") {
      output.b_box_x = output.b_box.x;
      output.b_box_y = output.b_box.y;
      output.b_box_w = output.b_box.width;
      output.b_box_h = output.b_box.height;
      delete output.b_box;
    }
    if (Array.isArray(output.bbox)) {
      output.bbox_x = output.bbox[0];
      output.bbox_y = output.bbox[1];
      output.bbox_w = output.bbox[2];
      output.bbox_h = output.bbox[3];
      delete output.bbox;
    }
    return output;
  }

  async function request(path, options) {
    const opts = options || {};
    const response = await fetch(CFG.labBaseUrl + path, {
      method: opts.method || "GET",
      headers: Object.assign({ "Content-Type": "application/json" }, opts.headers || {}),
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("服务器返回了无法解析的数据（HTTP " + response.status + "）");
    }
    if (!response.ok || data.ok === false) throw new Error(data.msg || "请求失败（HTTP " + response.status + "）");
    return data;
  }

  async function submitExperiment(options) {
    const experiment = A.experimentName(options.experimentId, options.meta || {});
    const trials = (options.trials || []).map((trial) => prepareTrial(trial, options.experimentId));
    const body = {
      project: CFG.projectCode,
      experiment,
      participant: options.participant,
      condition: options.condition || "within_subject",
      trials,
      meta: Object.assign({
        app_version: CFG.version,
        test_mode: CFG.testMode,
        eye_mode: A.eyeTracker.mode || "mouse",
        calibration_error_px: A.eyeTracker.lastCalibration ? A.eyeTracker.lastCalibration.errorPx : null,
        viewport: [window.innerWidth, window.innerHeight],
        user_agent: navigator.userAgent.slice(0, 120)
      }, options.meta || {})
    };
    return request("/api/hw2/submit", { method: "POST", body });
  }

  async function fetchExperimentData(experimentId) {
    const experiment = A.experimentName(experimentId);
    const response = await request("/api/hw2/data?project=" + encodeURIComponent(CFG.projectCode) + "&experiment=" + encodeURIComponent(experiment));
    return response.records || [];
  }

  A.api = {
    request,
    submitExperiment,
    fetchExperimentData,
    prepareTrial
  };
})();
