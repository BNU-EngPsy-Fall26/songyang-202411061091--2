import { OceanEngine } from "./engine";
import type { SharkSpec } from "./world";

const roster: SharkSpec[] = [
  { kind: "whaleshark", size: 1 },
  { kind: "manta", size: 0.83 },
  { kind: "hammerhead", size: 0.86 },
  { kind: "sunfish", size: 0.64 },
  { kind: "classic", size: 0.78 }
];

class CharacterOceanBackground {
  private engine: OceanEngine;
  private active = true;
  private paused = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new OceanEngine(canvas, roster);
    this.engine.setSharks(roster);
    this.engine.setRenderMode("braille");
    this.engine.setTheme(false);
    this.engine.setSpeed(0.65);
  }

  setActive(active: boolean) {
    this.active = active;
    this.canvas.classList.toggle("is-hidden", !active);
    this.engine.setPaused(!active || this.paused);
  }

  setPaused(paused: boolean) {
    this.paused = paused;
    this.engine.setPaused(!this.active || paused);
  }

  setDark(dark: boolean) {
    this.engine.setTheme(dark);
  }

  destroy() {
    this.engine.destroy();
  }
}

(window as unknown as { CharacterOceanBackground: typeof CharacterOceanBackground }).CharacterOceanBackground = CharacterOceanBackground;
