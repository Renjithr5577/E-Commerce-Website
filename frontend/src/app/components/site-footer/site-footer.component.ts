import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { FooterColumn } from '../../models/storefront.model';

@Component({
  selector: 'app-site-footer',
  imports: [CommonModule],
  templateUrl: './site-footer.component.html'
})
export class SiteFooterComponent {
  @Input({ required: true }) footerColumns!: FooterColumn[];
  @Input() showBackToTop = false;

  @Output() backToTop = new EventEmitter<void>();
}
