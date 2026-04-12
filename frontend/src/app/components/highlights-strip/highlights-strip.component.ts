import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { HighlightCard } from '../../models/storefront.model';

@Component({
  selector: 'app-highlights-strip',
  imports: [CommonModule],
  templateUrl: './highlights-strip.component.html'
})
export class HighlightsStripComponent {
  @Input({ required: true }) highlights!: HighlightCard[];
}
