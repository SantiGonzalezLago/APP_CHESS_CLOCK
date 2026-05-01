import { Component, inject } from '@angular/core';
import { ActionSheetController, AlertController } from '@ionic/angular';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonToggle,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, globeOutline, notificationsOutline, volumeMediumOutline } from 'ionicons/icons';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../services/language.service';
import { ThemeService } from '../../services/theme.service';
import { KofiSupportCardComponent } from '../../components/kofi-support-card/kofi-support-card.component';

@Component({
  selector: 'app-theme',
  templateUrl: './theme.page.html',
  styleUrls: ['./theme.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonButton,
    IonContent,
    IonInput,
    IonToggle,
    IonIcon,
    TranslateModule,
    KofiSupportCardComponent,
  ],
})
export class ThemePage {
  private themeService = inject(ThemeService);
  private alertController = inject(AlertController);
  private actionSheetCtrl = inject(ActionSheetController);
  private languageService = inject(LanguageService);
  private translate = inject(TranslateService);

  currentLang = this.languageService.currentLang;
  languageOptions = this.languageService.languageOptions;

  constructor() {
    addIcons({ globeOutline, chevronForwardOutline, volumeMediumOutline, notificationsOutline });
  }

  currentLangLabel(): string {
    const opt = this.languageOptions.find((o) => o.value === this.currentLang());
    return opt ? this.translate.instant(opt.labelKey) : '';
  }

  get config() {
    return this.themeService.config();
  }

  onTopNameChange(event: Event) {
    const customEvent = event as CustomEvent;
    const inputValue = (customEvent.detail?.value as string | undefined) ?? '';
    this.themeService.setTopPlayerName(inputValue);
  }

  onBottomNameChange(event: Event) {
    const customEvent = event as CustomEvent;
    const inputValue = (customEvent.detail?.value as string | undefined) ?? '';
    this.themeService.setBottomPlayerName(inputValue);
  }

  onTopColorChange(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.themeService.setTopPanelColor(target?.value ?? '');
  }

  onBottomColorChange(event: Event) {
    const target = event.target as HTMLInputElement | null;
    this.themeService.setBottomPanelColor(target?.value ?? '');
  }

  onClickSoundToggle(event: Event) {
    const customEvent = event as CustomEvent;
    this.themeService.setClickSoundEnabled(!!customEvent.detail?.checked);
  }

  onAlarmSoundToggle(event: Event) {
    const customEvent = event as CustomEvent;
    this.themeService.setAlarmSoundEnabled(!!customEvent.detail?.checked);
  }

  async openLanguageSelector(): Promise<void> {
    const buttons = this.languageOptions.map((option) => {
      const isActive = option.value === this.currentLang();
      return {
        text: this.translate.instant(option.labelKey),
        cssClass: isActive
          ? `action-sheet-option action-sheet-option--active action-sheet-lang-${option.value}`
          : `action-sheet-option action-sheet-lang-${option.value}`,
        handler: () => {
          this.languageService.setLanguage(option.value);
        },
      };
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translate.instant('THEME.LANGUAGE.LABEL'),
      buttons: [
        ...buttons,
        {
          text: this.translate.instant('THEME.RESET_ALERT.CANCEL'),
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async resetDefaults() {
    const header = this.translate.instant('THEME.RESET_ALERT.HEADER');
    const message = this.translate.instant('THEME.RESET_ALERT.MESSAGE');
    const cancel = this.translate.instant('THEME.RESET_ALERT.CANCEL');
    const confirm = this.translate.instant('THEME.RESET_ALERT.CONFIRM');

    const alert = await this.alertController.create({
      header,
      message,
      buttons: [
        {
          text: cancel,
          role: 'cancel',
        },
        {
          text: confirm,
          role: 'destructive',
          handler: () => {
            this.themeService.resetDefaults();
          },
        },
      ],
    });

    await alert.present();
  }
}

