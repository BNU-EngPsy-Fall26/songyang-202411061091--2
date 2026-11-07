(function () {
  "use strict";

  const A = window.ATTLAB = window.ATTLAB || {};

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = typeof seed === "number" ? seed >>> 0 : hashString(String(seed));
    return function next() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function randomBetween(rng, min, max) {
    return min + rng() * (max - min);
  }

  function mean(values) {
    const valid = values.filter((value) => Number.isFinite(value));
    return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : null;
  }

  function sd(values) {
    const valid = values.filter((value) => Number.isFinite(value));
    if (valid.length < 2) return null;
    const average = mean(valid);
    const variance = valid.reduce((sum, value) => sum + (value - average) ** 2, 0) / (valid.length - 1);
    return Math.sqrt(variance);
  }

  function median(values) {
    const valid = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
    if (!valid.length) return null;
    const middle = Math.floor(valid.length / 2);
    return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
  }

  function normalCdf(value) {
    const sign = value < 0 ? -1 : 1;
    const x = Math.abs(value) / Math.sqrt(2);
    const t = 1 / (1 + 0.3275911 * x);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * erf);
  }

  function inverseNormalCdf(probability) {
    const p = Math.max(0.0001, Math.min(0.9999, probability));
    const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
    const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
    const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
    const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q;
    let r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p > pHigh) {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function sdt(hits, misses, falseAlarms, correctRejects) {
    const hitRate = (hits + 0.5) / (hits + misses + 1);
    const faRate = (falseAlarms + 0.5) / (falseAlarms + correctRejects + 1);
    const zHit = inverseNormalCdf(hitRate);
    const zFa = inverseNormalCdf(faRate);
    return {
      dprime: zHit - zFa,
      criterion: -0.5 * (zHit + zFa),
      hitRate,
      faRate
    };
  }

  function cohenDz(before, after) {
    const diffs = before.map((value, index) => after[index] - value).filter(Number.isFinite);
    const average = mean(diffs);
    const deviation = sd(diffs);
    return {
      meanDifference: average,
      sdDifference: deviation,
      dz: average != null && deviation ? average / deviation : null
    };
  }

  function formatNumber(value, digits) {
    return value == null || !Number.isFinite(value) ? "—" : Number(value).toFixed(digits == null ? 2 : digits);
  }

  function formatPercent(value, digits) {
    return value == null || !Number.isFinite(value) ? "—" : (value * 100).toFixed(digits == null ? 0 : digits) + "%";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function experimentOrder(participant) {
    const ids = ["changeblind", "lowprev", "cm"];
    const shift = hashString(participant || "P00") % ids.length;
    return ids.slice(shift).concat(ids.slice(0, shift));
  }

  A.util = {
    sleep,
    shuffle,
    hashString,
    seededRandom,
    randomBetween,
    mean,
    sd,
    median,
    normalCdf,
    inverseNormalCdf,
    sdt,
    cohenDz,
    formatNumber,
    formatPercent,
    escapeHtml,
    downloadJson,
    experimentOrder
  };
})();
