import { Component, OnDestroy, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent, IonButton, IonIcon } from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { settingsOutline, brushOutline, refreshOutline, pauseOutline, playOutline } from 'ionicons/icons';
import { ThemeService } from '../../services/theme.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [IonContent, IonButton, IonIcon, TranslateModule],
})
export class HomePage implements OnDestroy {
  topTime = '';
  bottomTime = '';
  topTurnTime = '';
  bottomTurnTime = '';

  showTurnClock = false;
  isAlertActive = false;
  private alertReason: 'total' | 'turn-limit' | null = null;
  private timedOutSide: 'top' | 'bottom' | null = null;

  private topMainSeconds = 180;
  private bottomMainSeconds = 180;
  private topTurnSeconds = 0;
  private bottomTurnSeconds = 0;
  private currentTurnElapsedSeconds = 0;

  private incrementType = 'none';
  private incrementSeconds = 0;
  private activeSide: 'top' | 'bottom' | null = null;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private tickRemainderMs = 0;
  private lastTickAt = 0;
  private gameFinished = false;
  private paused = false;
  private pauseReason: 'manual' | null = null;
  private turnLimitExpired = false;
  private audioContext: AudioContext | null = null;
  private pendingResetAttentionFromSettings = false;

  private router = inject(Router);
  private themeService = inject(ThemeService);
  private settingsService = inject(SettingsService);
  private translate = inject(TranslateService);

  get config() {
    return this.themeService.config();
  }

  get topDisplayName() {
    const name = this.config.topPlayerName.trim();
    return name || this.translate.instant('HOME.PLAYER_TOP_DEFAULT');
  }

  get bottomDisplayName() {
    const name = this.config.bottomPlayerName.trim();
    return name || this.translate.instant('HOME.PLAYER_BOTTOM_DEFAULT');
  }

  get topIsActive() {
    return this.activeSide === 'top' && !this.gameFinished && !this.paused;
  }

  get bottomIsActive() {
    return this.activeSide === 'bottom' && !this.gameFinished && !this.paused;
  }

  get isClockRunning() {
    return !!this.timerId && !!this.activeSide && !this.gameFinished && !this.paused;
  }

  get isManualPauseActive() {
    return this.paused && this.pauseReason === 'manual' && !this.gameFinished;
  }

  get hasGameStarted() {
    return this.activeSide !== null || this.gameFinished;
  }

  get topTotalTimeoutAlert() {
    return this.isAlertActive && this.alertReason === 'total' && this.timedOutSide === 'top';
  }

  get bottomTotalTimeoutAlert() {
    return this.isAlertActive && this.alertReason === 'total' && this.timedOutSide === 'bottom';
  }

  get isTotalTimeoutAlert() {
    return this.isAlertActive && this.alertReason === 'total';
  }

  get isTurnLimitAlert() {
    return this.isAlertActive && this.alertReason === 'turn-limit' && !this.paused;
  }

  constructor() {
    addIcons({ settingsOutline, brushOutline, refreshOutline, pauseOutline, playOutline });
    this.loadClockFromSettings();
  }

  ngOnDestroy() {
    this.stopTicker();
  }

  ionViewWillEnter() {
    if (!this.pendingResetAttentionFromSettings) {
      return;
    }

    this.pendingResetAttentionFromSettings = false;
    this.loadClockFromSettings();
  }

  openTheme() {
    this.router.navigateByUrl('/theme');
  }

  openSettings() {
    this.pendingResetAttentionFromSettings = true;
    this.router.navigateByUrl('/settings');
  }

  resetClockFromSettings() {
    this.loadClockFromSettings();
  }

  resumeFromPlayButton(event: Event) {
    event.stopPropagation();

    if (!this.isManualPauseActive) {
      return;
    }

    this.resumeClock();
  }

  onClockTap(side: 'top' | 'bottom') {
    if (this.gameFinished) {
      return;
    }

    if (this.isManualPauseActive) {
      return;
    }

    if (this.turnLimitExpired && this.activeSide) {
      if (side !== this.activeSide) {
        return;
      }

      this.playClickSound();
      this.completeTurnAndSwitch();
      return;
    }

    if (this.activeSide === null) {
      const initialActiveSide = side === 'top' ? 'bottom' : 'top';
      this.playClickSound();
      this.startTurn(initialActiveSide);
      return;
    }

    if (side !== this.activeSide) {
      return;
    }

    this.playClickSound();
    this.completeTurnAndSwitch();
  }

  onMiddleStripTap(event: Event) {
    const target = event.target as HTMLElement | null;
    if (target?.closest('ion-button')) {
      return;
    }

    if (!this.isClockRunning) {
      return;
    }

    this.pauseClock();
  }

  private loadClockFromSettings() {
    this.stopTicker();

    const settings = this.settingsService.currentSettings();
    this.incrementType = settings.incrementType;
    this.incrementSeconds = Math.max(0, Math.floor(settings.incrementSeconds));
    this.showTurnClock = this.incrementType === 'bronstein' || this.incrementType === 'turn-limit';

    const initialMainSeconds = Math.max(0, Math.floor(settings.baseMinutes * 60));

    this.topMainSeconds = initialMainSeconds;
    this.bottomMainSeconds = initialMainSeconds;
    this.topTurnSeconds = this.incrementSeconds;
    this.bottomTurnSeconds = this.incrementSeconds;
    this.currentTurnElapsedSeconds = 0;
    this.activeSide = null;
    this.gameFinished = false;
    this.paused = false;
    this.pauseReason = null;
    this.turnLimitExpired = false;
    this.isAlertActive = false;
    this.alertReason = null;
    this.timedOutSide = null;
    this.tickRemainderMs = 0;

    this.syncDisplay();
  }

  private completeTurnAndSwitch() {
    if (!this.activeSide) {
      return;
    }

    this.clearTurnLimitAlertIfNeeded();

    const completedSide = this.activeSide;
    const nextSide = completedSide === 'top' ? 'bottom' : 'top';

    if (this.incrementType === 'fischer') {
      this.addMainTime(completedSide, this.incrementSeconds);
    }

    if (this.incrementType === 'bronstein') {
      const refund = Math.min(this.incrementSeconds, this.currentTurnElapsedSeconds);
      this.addMainTime(completedSide, refund);
    }

    this.startTurn(nextSide);
  }

  private startTurn(side: 'top' | 'bottom') {
    this.activeSide = side;
    this.paused = false;
    this.pauseReason = null;
    this.turnLimitExpired = false;
    this.currentTurnElapsedSeconds = 0;

    if (this.showTurnClock) {
      if (side === 'top') {
        this.topTurnSeconds = this.incrementSeconds;
      } else {
        this.bottomTurnSeconds = this.incrementSeconds;
      }
    }

    if (!this.timerId) {
      this.startTicker();
    }

    this.syncDisplay();
  }

  private clearTurnLimitAlertIfNeeded() {
    if (this.alertReason !== 'turn-limit') {
      return;
    }

    this.isAlertActive = false;
    this.alertReason = null;
    this.timedOutSide = null;
  }

  private startTicker() {
    this.lastTickAt = Date.now();
    this.timerId = setInterval(() => {
      this.tick();
    }, 100);
  }

  private stopTicker() {
    if (!this.timerId) {
      return;
    }

    clearInterval(this.timerId);
    this.timerId = null;
  }

  private tick() {
    if (!this.activeSide || this.gameFinished) {
      return;
    }

    const now = Date.now();
    const elapsedMs = Math.max(0, now - this.lastTickAt);
    this.lastTickAt = now;

    if (elapsedMs === 0) {
      return;
    }

    this.tickRemainderMs += elapsedMs;
    const elapsedSeconds = Math.floor(this.tickRemainderMs / 1000);

    if (elapsedSeconds <= 0) {
      return;
    }

    this.tickRemainderMs = this.tickRemainderMs % 1000;

    if (this.turnLimitExpired) {
      return;
    }

    this.currentTurnElapsedSeconds += elapsedSeconds;
    this.addMainTime(this.activeSide, -elapsedSeconds);

    if (this.showTurnClock) {
      if (this.activeSide === 'top') {
        this.topTurnSeconds = Math.max(0, this.topTurnSeconds - elapsedSeconds);
      } else {
        this.bottomTurnSeconds = Math.max(0, this.bottomTurnSeconds - elapsedSeconds);
      }
    }

    const activeMainSeconds = this.activeSide === 'top' ? this.topMainSeconds : this.bottomMainSeconds;
    const activeTurnSeconds = this.activeSide === 'top' ? this.topTurnSeconds : this.bottomTurnSeconds;

    if (activeMainSeconds <= 0) {
      this.finishGame();
      return;
    }

    if (this.incrementType === 'turn-limit' && this.showTurnClock && activeTurnSeconds <= 0) {
      this.handleTurnLimitExpired();
      return;
    }

    this.syncDisplay();
  }

  private finishGame() {
    const finishedSide = this.activeSide;

    this.gameFinished = true;
    this.paused = false;
    this.pauseReason = null;
    this.turnLimitExpired = false;
    this.stopTicker();
    this.activeSide = null;
    this.tickRemainderMs = 0;
    this.triggerTimeoutAlert('total', finishedSide);
    this.syncDisplay();
  }

  private pauseClock() {
    this.paused = true;
    this.pauseReason = 'manual';
    this.stopTicker();
    this.tickRemainderMs = 0;
    this.syncDisplay();
  }

  private handleTurnLimitExpired() {
    this.turnLimitExpired = true;
    this.tickRemainderMs = 0;
    this.triggerTimeoutAlert('turn-limit', this.activeSide);
    this.syncDisplay();
  }

  private resumeClock() {
    if (!this.activeSide || this.gameFinished) {
      return;
    }

    this.paused = false;
    this.pauseReason = null;
    this.tickRemainderMs = 0;
    this.startTicker();
    this.syncDisplay();
  }

  private playClickSound() {
    if (!this.config.clickSoundEnabled) {
      return;
    }

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioCtx();
    }

    const context = this.audioContext;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const now = context.currentTime;

    const pulse = (startAt: number, baseFrequency: number, highFrequency: number, volume: number) => {
      const bodyOscillator = context.createOscillator();
      const bodyGain = context.createGain();
      const clickOscillator = context.createOscillator();
      const clickGain = context.createGain();

      bodyOscillator.type = 'square';
      bodyOscillator.frequency.setValueAtTime(baseFrequency, startAt);
      bodyOscillator.frequency.exponentialRampToValueAtTime(Math.max(90, baseFrequency * 0.5), startAt + 0.012);

      bodyGain.gain.setValueAtTime(0.001, startAt);
      bodyGain.gain.exponentialRampToValueAtTime(volume, startAt + 0.0012);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.014);

      clickOscillator.type = 'square';
      clickOscillator.frequency.setValueAtTime(highFrequency, startAt);
      clickOscillator.frequency.exponentialRampToValueAtTime(Math.max(750, highFrequency * 0.62), startAt + 0.007);

      clickGain.gain.setValueAtTime(0.001, startAt);
      clickGain.gain.exponentialRampToValueAtTime(volume * 0.9, startAt + 0.0007);
      clickGain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.008);

      bodyOscillator.connect(bodyGain);
      clickOscillator.connect(clickGain);
      bodyGain.connect(context.destination);
      clickGain.connect(context.destination);

      bodyOscillator.start(startAt);
      clickOscillator.start(startAt);
      bodyOscillator.stop(startAt + 0.016);
      clickOscillator.stop(startAt + 0.01);
    };

    // Two very short hits to emulate a harder mechanical clack.
    pulse(now, 230, 2900, 0.075);
    pulse(now + 0.011, 180, 2200, 0.042);
  }

  private triggerTimeoutAlert(reason: 'total' | 'turn-limit', side: 'top' | 'bottom' | null) {
    this.isAlertActive = true;
    this.alertReason = reason;
    this.timedOutSide = side;
    this.playAlertSound();
  }

  private playAlertSound() {
    if (!this.config.alarmSoundEnabled) {
      return;
    }

    const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) {
      return;
    }

    if (!this.audioContext) {
      this.audioContext = new AudioCtx();
    }

    const context = this.audioContext;
    if (context.state === 'suspended') {
      void context.resume();
    }

    const now = context.currentTime;
    const beep = (startAt: number, frequency: number) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(frequency, startAt);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(1800, frequency * 0.93), startAt + 0.075);

      gain.gain.setValueAtTime(0.001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.075);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.08);
    };

    for (let i = 0; i < 40; i += 1) {
      const startAt = now + i * 0.08;
      const frequency = i % 2 === 0 ? 2400 : 2100;
      beep(startAt, frequency);
    }
  }

  private addMainTime(side: 'top' | 'bottom', deltaSeconds: number) {
    if (side === 'top') {
      this.topMainSeconds = Math.max(0, this.topMainSeconds + deltaSeconds);
      return;
    }

    this.bottomMainSeconds = Math.max(0, this.bottomMainSeconds + deltaSeconds);
  }

  private syncDisplay() {
    this.topTime = this.formatSecondsToClock(this.topMainSeconds);
    this.bottomTime = this.formatSecondsToClock(this.bottomMainSeconds);

    if (this.showTurnClock) {
      this.topTurnTime = this.formatSecondsToClock(this.topTurnSeconds);
      this.bottomTurnTime = this.formatSecondsToClock(this.bottomTurnSeconds);
      return;
    }

    this.topTurnTime = '00:00';
    this.bottomTurnTime = '00:00';
  }

  private formatSecondsToClock(totalSeconds: number) {
    const normalized = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(normalized / 60);
    const seconds = normalized % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
}

