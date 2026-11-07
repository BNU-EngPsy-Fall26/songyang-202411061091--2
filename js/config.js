(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const testMode = params.get("test") === "1";

  window.ATTLAB = window.ATTLAB || {};
  window.ATTLAB.config = Object.freeze({
    version: "1.0.0",
    projectCode: "WRFG5G",
    labBaseUrl: "https://attention-lab-production.up.railway.app",
    testMode,
    stage: Object.freeze({ width: 1600, height: 900 }),
    eye: Object.freeze({
      sampleMs: 66,
      staleMs: 420,
      errorLimitPx: 200,
      viewDistanceCm: 60,
      cmPerPx: 2.54 / 96
    }),
    experiments: Object.freeze({
      changeblind: Object.freeze({
        id: "changeblind",
        title: "闪烁找不同",
        short: "变化觉察",
        minutes: 5,
        practiceTrials: 2,
        trials: 20,
        neutralTrials: 10,
        cuedTrials: 10,
        cueValidShare: 0.8,
        timeoutMs: 20000,
        onMs: 240,
        blankMs: 100
      }),
      lowprev: Object.freeze({
        id: "lowprev",
        title: "安检员：行李 X 光",
        short: "低流行率搜索",
        minutes: 7,
        practiceTrials: 4,
        trials: 80,
        blockSize: 20,
        lowPrevalence: 0.1,
        highPrevalence: 0.5,
        timeoutMs: 3500,
        blocks: Object.freeze([
          Object.freeze({ id: "p50", label: "高流行率参照", prevalence: 0.5, instruction: "standard" }),
          Object.freeze({ id: "p10", label: "低流行率基线", prevalence: 0.1, instruction: "standard" }),
          Object.freeze({ id: "p10_disclosed", label: "明示流行率", prevalence: 0.1, instruction: "disclosed" }),
          Object.freeze({ id: "p10_payoff", label: "不对称奖惩", prevalence: 0.1, instruction: "payoff" })
        ]),
        payoff: Object.freeze({ hit: 1, correctReject: 1, miss: -5, falseAlarm: -1 })
      }),
      cm: Object.freeze({
        id: "cm",
        title: "估一估：图形直觉排序",
        short: "图形知觉",
        minutes: 5,
        practiceTrials: 2,
        trials: 40,
        ratios: Object.freeze([17.8, 26.1, 46.4, 68.1, 82.5]),
        encodings: Object.freeze([
          Object.freeze({ id: "position", label: "共同基线", repeats: 2 }),
          Object.freeze({ id: "length", label: "非共同基线", repeats: 2 }),
          Object.freeze({ id: "angle", label: "角度 / 饼图", repeats: 2 }),
          Object.freeze({ id: "area", label: "面积 / 气泡", repeats: 2 })
        ])
      })
    }),
    storageKeys: Object.freeze({
      participant: "attlab_participant",
      mode: "attlab_mode",
      order: "attlab_order"
    })
  });

  window.ATTLAB.experimentName = function experimentName(id, meta) {
    const test = (meta && meta.testMode) || window.ATTLAB.config.testMode;
    return (test ? "test_" : "") + id;
  };
})();
