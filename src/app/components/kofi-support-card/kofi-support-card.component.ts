import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-kofi-support-card',
  templateUrl: './kofi-support-card.component.html',
  styleUrls: ['./kofi-support-card.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
})
export class KofiSupportCardComponent {
  @Input() title: string = 'KOFI.TITLE';
  @Input() avatarSrc: string = 'assets/images/avatar.png';
  @Input() kofiIconSrc: string = 'assets/images/kofi.png';

  href: string = 'https://ko-fi.com/santigl';
  displayUrl: string = 'ko-fi.com/santigl';
}
