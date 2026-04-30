import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly storageKey = 'chess-clock-language';
  readonly languageOptions = [
    { value: 'en', labelKey: 'THEME.LANGUAGE.EN' },
    { value: 'es', labelKey: 'THEME.LANGUAGE.ES' },
    { value: 'gl', labelKey: 'THEME.LANGUAGE.GL' },
  ] as const;

  private readonly supportedLangs: readonly string[] = this.languageOptions.map((option) => option.value);
  private readonly translate = inject(TranslateService);

  private _currentLang = signal('es');
  currentLang = this._currentLang.asReadonly();

  constructor() {
    this.translate.addLangs([...this.supportedLangs]);

    const saved = localStorage.getItem(this.storageKey);
    const lang = saved && this.isSupportedLanguage(saved) ? saved : this.detectSystemLanguage();

    this.applyLanguage(lang);
  }

  setLanguage(lang: string) {
    if (!this.isSupportedLanguage(lang)) {
      return;
    }

    this.applyLanguage(lang);
    localStorage.setItem(this.storageKey, lang);
  }

  private detectSystemLanguage(): string {
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && this.isSupportedLanguage(browserLang)) {
      return browserLang;
    }

    return 'es';
  }

  private applyLanguage(lang: string) {
    this.translate.use(lang);
    this._currentLang.set(lang);
  }

  private isSupportedLanguage(lang: string) {
    return this.supportedLangs.includes(lang);
  }
}
