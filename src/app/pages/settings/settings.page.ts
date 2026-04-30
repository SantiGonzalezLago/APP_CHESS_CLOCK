import { Component, inject } from '@angular/core';
import { AlertController } from '@ionic/angular';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonBackButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonSelect,
    IonSelectOption,
    IonNote,
    TranslateModule,
  ],
})
export class SettingsPage {
  private alertController = inject(AlertController);
  private translate = inject(TranslateService);
  private settingsService = inject(SettingsService);

  currentSettings = this.settingsService.currentSettings;
  modes = this.settingsService.modes;

  get hasIncrement() {
    return this.currentSettings().incrementType !== 'none';
  }

  get incrementValueLabelKey() {
    return this.currentSettings().incrementType === 'turn-limit'
      ? 'SETTINGS.CURRENT.TURN_LIMIT_SECONDS'
      : 'SETTINGS.CURRENT.INCREMENT_SECONDS';
  }

  incrementTypeLabel(value: string) {
    if (value === 'fischer') {
      return this.translate.instant('SETTINGS.INCREMENT.FISCHER');
    }

    if (value === 'bronstein') {
      return this.translate.instant('SETTINGS.INCREMENT.BRONSTEIN');
    }

    if (value === 'turn-limit') {
      return this.translate.instant('SETTINGS.INCREMENT.TURN_LIMIT');
    }

    return this.translate.instant('SETTINGS.INCREMENT.NONE');
  }

  onBaseMinutesChange(event: Event) {
    const customEvent = event as CustomEvent;
    const rawValue = (customEvent.detail?.value as string | number | null | undefined) ?? '';
    this.settingsService.setBaseMinutes(this.parseNumber(rawValue));
  }

  onIncrementTypeChange(event: Event) {
    const customEvent = event as CustomEvent;
    const selected = (customEvent.detail?.value as string | null | undefined) ?? 'none';
    this.settingsService.setIncrementType(selected);
  }

  onIncrementSecondsChange(event: Event) {
    const customEvent = event as CustomEvent;
    const rawValue = (customEvent.detail?.value as string | number | null | undefined) ?? '';
    this.settingsService.setIncrementSeconds(this.parseNumber(rawValue));
  }

  async saveCurrentAsMode() {
    const alert = await this.alertController.create({
      header: this.translate.instant('SETTINGS.MODES.NEW_MODE_TITLE'),
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: this.translate.instant('SETTINGS.MODES.NEW_MODE_PLACEHOLDER'),
        },
      ],
      buttons: [
        {
          text: this.translate.instant('SETTINGS.BUTTONS.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('SETTINGS.BUTTONS.SAVE'),
          handler: (value) => {
            const name = typeof value?.name === 'string' ? value.name : '';
            this.settingsService.saveMode(name);
          },
        },
      ],
    });

    await alert.present();
  }

  applyMode(id: string) {
    this.settingsService.applyMode(id);
  }

  async deleteMode(id: string) {
    const alert = await this.alertController.create({
      header: this.translate.instant('SETTINGS.MODES.DELETE_MODE_TITLE'),
      message: this.translate.instant('SETTINGS.MODES.DELETE_MODE_MESSAGE'),
      buttons: [
        {
          text: this.translate.instant('SETTINGS.BUTTONS.CANCEL'),
          role: 'cancel',
        },
        {
          text: this.translate.instant('SETTINGS.BUTTONS.DELETE'),
          role: 'destructive',
          handler: () => {
            this.settingsService.deleteMode(id);
          },
        },
      ],
    });

    await alert.present();
  }

  private parseNumber(value: string | number) {
    if (typeof value === 'number') {
      return value;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
}
