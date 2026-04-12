import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';
import { CompactProductCardComponent } from '../compact-product-card/compact-product-card.component';

@Component({
  selector: 'app-best-seller-story-section',
  imports: [CommonModule, CompactProductCardComponent],
  templateUrl: './best-seller-story-section.component.html'
})
export class BestSellerStorySectionComponent {
  @Input({ required: true }) bestSellerProducts!: Product[];
  @Input() canShowMore = false;
  @Input() canShowLess = false;

  @Output() productOpen = new EventEmitter<Product>();
  @Output() showMore = new EventEmitter<void>();
  @Output() showLess = new EventEmitter<void>();
  @Output() supportRequest = new EventEmitter<void>();
}
