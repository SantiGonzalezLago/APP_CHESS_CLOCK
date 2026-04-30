import { Injectable, effect, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private storageKey = 'chess-clock-theme';
  private defaultState = {
    topPlayerName: '',
    bottomPlayerName: '',
    topPanelColor: '#e7d7b8',
    bottomPanelColor: '#1d4d45',
    topTextColor: '#15231f',
    bottomTextColor: '#f4f3ef',
    clickSoundEnabled: true,
    alarmSoundEnabled: true,
  };

  private state = signal({
    ...this.defaultState,
  });

  config = this.state.asReadonly();

  constructor() {
    const storedState = this.loadFromStorage();
    if (storedState) {
      this.state.set(storedState);
    }

    effect(() => {
      this.saveToStorage(this.state());
    });
  }

  setTopPlayerName(name: string) {
    this.state.update((current) => ({
      ...current,
      topPlayerName: name,
    }));
  }

  setBottomPlayerName(name: string) {
    this.state.update((current) => ({
      ...current,
      bottomPlayerName: name,
    }));
  }

  setTopPanelColor(color: string) {
    const normalized = this.normalizeHexColor(color, '#e7d7b8');
    this.state.update((current) => ({
      ...current,
      topPanelColor: normalized,
      topTextColor: this.getContrastTextColor(normalized),
    }));
  }

  setBottomPanelColor(color: string) {
    const normalized = this.normalizeHexColor(color, '#1d4d45');
    this.state.update((current) => ({
      ...current,
      bottomPanelColor: normalized,
      bottomTextColor: this.getContrastTextColor(normalized),
    }));
  }

  setClickSoundEnabled(enabled: boolean) {
    this.state.update((current) => ({
      ...current,
      clickSoundEnabled: !!enabled,
    }));
  }

  setAlarmSoundEnabled(enabled: boolean) {
    this.state.update((current) => ({
      ...current,
      alarmSoundEnabled: !!enabled,
    }));
  }

  resetDefaults() {
    const topPanelColor = this.defaultState.topPanelColor;
    const bottomPanelColor = this.defaultState.bottomPanelColor;

    this.state.set({
      topPlayerName: '',
      bottomPlayerName: '',
      topPanelColor,
      bottomPanelColor,
      topTextColor: this.getContrastTextColor(topPanelColor),
      bottomTextColor: this.getContrastTextColor(bottomPanelColor),
      clickSoundEnabled: this.defaultState.clickSoundEnabled,
      alarmSoundEnabled: this.defaultState.alarmSoundEnabled,
    });
  }

  private normalizeHexColor(color: string, fallback: string) {
    if (!color) {
      return fallback;
    }

    const value = color.trim();
    const shortHexMatch = /^#([0-9a-fA-F]{3})$/.exec(value);

    if (shortHexMatch) {
      const shortHex = shortHexMatch[1];
      return `#${shortHex[0]}${shortHex[0]}${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}`.toLowerCase();
    }

    const fullHexMatch = /^#([0-9a-fA-F]{6})$/.exec(value);
    if (fullHexMatch) {
      return `#${fullHexMatch[1]}`.toLowerCase();
    }

    return fallback;
  }

  private getContrastTextColor(backgroundHex: string) {
    const hex = this.normalizeHexColor(backgroundHex, '#ffffff').slice(1);
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);

    const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
    return luminance > 0.6 ? '#15231f' : '#f4f3ef';
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw);
      const topPlayerName = typeof parsed?.topPlayerName === 'string' ? parsed.topPlayerName : '';
      const bottomPlayerName = typeof parsed?.bottomPlayerName === 'string' ? parsed.bottomPlayerName : '';
      const topPanelColor = this.normalizeHexColor(parsed?.topPanelColor, this.defaultState.topPanelColor);
      const bottomPanelColor = this.normalizeHexColor(parsed?.bottomPanelColor, this.defaultState.bottomPanelColor);
      const clickSoundEnabled = typeof parsed?.clickSoundEnabled === 'boolean'
        ? parsed.clickSoundEnabled
        : this.defaultState.clickSoundEnabled;
      const alarmSoundEnabled = typeof parsed?.alarmSoundEnabled === 'boolean'
        ? parsed.alarmSoundEnabled
        : this.defaultState.alarmSoundEnabled;

      return {
        topPlayerName,
        bottomPlayerName,
        topPanelColor,
        bottomPanelColor,
        topTextColor: this.getContrastTextColor(topPanelColor),
        bottomTextColor: this.getContrastTextColor(bottomPanelColor),
        clickSoundEnabled,
        alarmSoundEnabled,
      };
    } catch {
      return null;
    }
  }

  private saveToStorage(value: {
    topPlayerName: string;
    bottomPlayerName: string;
    topPanelColor: string;
    bottomPanelColor: string;
    topTextColor: string;
    bottomTextColor: string;
    clickSoundEnabled: boolean;
    alarmSoundEnabled: boolean;
  }) {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(value));
    } catch {
      // Ignore storage write errors (private mode, quota exceeded, etc.)
    }
  }
}
