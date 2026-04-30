import { Injectable, effect, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private currentStorageKey = 'chess-clock-current-settings';
  private modesStorageKey = 'chess-clock-modes';
  private legacyPresetsStorageKey = 'chess-clock-presets';

  private defaultCurrent = {
    baseMinutes: 3,
    incrementType: 'fischer',
    incrementSeconds: 2,
  };

  private defaultModes = [
    {
      name: 'Bullet',
      baseMinutes: 1,
      incrementType: 'none',
      incrementSeconds: 0,
    },
    {
      name: 'Blitz Pro',
      baseMinutes: 3,
      incrementType: 'fischer',
      incrementSeconds: 2,
    },
    {
      name: 'Blitz Casual',
      baseMinutes: 5,
      incrementType: 'none',
      incrementSeconds: 0,
    },
    {
      name: 'Rapid Social',
      baseMinutes: 10,
      incrementType: 'none',
      incrementSeconds: 0,
    },
    {
      name: 'Rapid Club',
      baseMinutes: 15,
      incrementType: 'fischer',
      incrementSeconds: 10,
    },
    {
      name: 'Clasico',
      baseMinutes: 60,
      incrementType: 'fischer',
      incrementSeconds: 30,
    },
  ];

  private currentState = signal({
    ...this.defaultCurrent,
  });

  private modesState = signal<Array<{
    id: string;
    name: string;
    baseMinutes: number;
    incrementType: string;
    incrementSeconds: number;
  }>>([]);

  currentSettings = this.currentState.asReadonly();
  modes = this.modesState.asReadonly();

  constructor() {
    const storedCurrent = this.loadCurrentFromStorage();
    if (storedCurrent) {
      this.currentState.set(storedCurrent);
    }

    const storedModes = this.loadModesFromStorage();
    if (storedModes.length > 0) {
      this.modesState.set(storedModes);
    } else {
      this.modesState.set(this.createDefaultModes());
    }

    effect(() => {
      this.saveCurrentToStorage(this.currentState());
    });

    effect(() => {
      this.saveModesToStorage(this.modesState());
    });
  }

  setBaseMinutes(value: number) {
    this.currentState.update((current) => ({
      ...current,
      baseMinutes: this.normalizeSecondsLikeValue(value, this.defaultCurrent.baseMinutes),
    }));
  }

  setIncrementType(value: string) {
    const normalized = this.normalizeIncrementType(value);

    this.currentState.update((current) => ({
      ...current,
      incrementType: normalized,
      incrementSeconds:
        normalized === 'none'
          ? 0
          : this.normalizeSecondsLikeValue(current.incrementSeconds, this.defaultCurrent.incrementSeconds),
    }));
  }

  setIncrementSeconds(value: number) {
    this.currentState.update((current) => ({
      ...current,
      incrementSeconds: this.normalizeSecondsLikeValue(value, this.defaultCurrent.incrementSeconds),
    }));
  }

  saveMode(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) {
      return;
    }

    const source = this.currentState();
    const mode = {
      id: this.createId(),
      name: normalizedName,
      baseMinutes: source.baseMinutes,
      incrementType: source.incrementType,
      incrementSeconds: source.incrementSeconds,
    };

    this.modesState.update((current) => [mode, ...current]);
  }

  applyMode(id: string) {
    const mode = this.modesState().find((item) => item.id === id);
    if (!mode) {
      return;
    }

    this.currentState.set({
      baseMinutes: this.normalizeSecondsLikeValue(mode.baseMinutes, this.defaultCurrent.baseMinutes),
      incrementType: this.normalizeIncrementType(mode.incrementType),
      incrementSeconds: this.normalizeSecondsLikeValue(mode.incrementSeconds, this.defaultCurrent.incrementSeconds),
    });
  }

  deleteMode(id: string) {
    this.modesState.update((current) => current.filter((item) => item.id !== id));
  }

  private createId() {
    return `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  private normalizeIncrementType(value: string) {
    if (value === 'fischer' || value === 'bronstein' || value === 'turn-limit' || value === 'none') {
      return value;
    }

    return this.defaultCurrent.incrementType;
  }

  private normalizeSecondsLikeValue(value: number, fallback: number) {
    if (!Number.isFinite(value)) {
      return fallback;
    }

    const normalized = Math.floor(value);
    if (normalized < 0) {
      return 0;
    }

    return normalized;
  }

  private loadCurrentFromStorage() {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.currentStorageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const legacyTurnLimitEnabled = !!parsed?.turnLimitEnabled;
      const parsedType = legacyTurnLimitEnabled ? 'turn-limit' : this.normalizeIncrementType(parsed?.incrementType);
      const normalizedSeconds = legacyTurnLimitEnabled
        ? this.normalizeSecondsLikeValue(parsed?.turnLimitSeconds, this.defaultCurrent.incrementSeconds)
        : this.normalizeSecondsLikeValue(parsed?.incrementSeconds, this.defaultCurrent.incrementSeconds);
      const normalizedType = parsedType !== 'none' && normalizedSeconds === 0 ? 'none' : parsedType;

      return {
        baseMinutes: this.normalizeSecondsLikeValue(parsed?.baseMinutes, this.defaultCurrent.baseMinutes),
        incrementType: normalizedType,
        incrementSeconds: normalizedSeconds,
      };
    } catch {
      return null;
    }
  }

  private loadModesFromStorage() {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const raw = localStorage.getItem(this.modesStorageKey) ?? localStorage.getItem(this.legacyPresetsStorageKey);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((item) => item && typeof item === 'object')
        .map((item) => {
          const legacyTurnLimitEnabled = !!item.turnLimitEnabled;
          const parsedType = legacyTurnLimitEnabled ? 'turn-limit' : this.normalizeIncrementType(item.incrementType);
          const normalizedSeconds = legacyTurnLimitEnabled
            ? this.normalizeSecondsLikeValue(item.turnLimitSeconds, this.defaultCurrent.incrementSeconds)
            : this.normalizeSecondsLikeValue(item.incrementSeconds, this.defaultCurrent.incrementSeconds);
          const normalizedType = parsedType !== 'none' && normalizedSeconds === 0 ? 'none' : parsedType;

          return {
            id: typeof item.id === 'string' && item.id.trim() ? item.id : this.createId(),
            name: typeof item.name === 'string' && item.name.trim() ? item.name.trim() : 'Modo',
            baseMinutes: this.normalizeSecondsLikeValue(item.baseMinutes, this.defaultCurrent.baseMinutes),
            incrementType: normalizedType,
            incrementSeconds: normalizedSeconds,
          };
        });
    } catch {
      return [];
    }
  }

  private saveCurrentToStorage(value: {
    baseMinutes: number;
    incrementType: string;
    incrementSeconds: number;
  }) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.currentStorageKey, JSON.stringify(value));
    } catch {
      // Ignore write errors (quota exceeded/private mode).
    }
  }

  private saveModesToStorage(value: Array<{
    id: string;
    name: string;
    baseMinutes: number;
    incrementType: string;
    incrementSeconds: number;
  }>) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.modesStorageKey, JSON.stringify(value));
    } catch {
      // Ignore write errors (quota exceeded/private mode).
    }
  }

  private createDefaultModes() {
    return this.defaultModes.map((mode) => ({
      id: this.createId(),
      name: mode.name,
      baseMinutes: this.normalizeSecondsLikeValue(mode.baseMinutes, this.defaultCurrent.baseMinutes),
      incrementType: this.normalizeIncrementType(mode.incrementType),
      incrementSeconds: this.normalizeSecondsLikeValue(mode.incrementSeconds, this.defaultCurrent.incrementSeconds),
    }));
  }
}
