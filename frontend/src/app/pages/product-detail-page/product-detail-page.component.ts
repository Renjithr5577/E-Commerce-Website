import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { CompactProductCardComponent } from '../../components/compact-product-card/compact-product-card.component';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-detail-page',
  imports: [CommonModule, CurrencyPipe, CompactProductCardComponent],
  templateUrl: './product-detail-page.component.html'
})
export class ProductDetailPageComponent {
  @Input({ required: true }) product!: Product | null;
  @Input({ required: true }) relatedProducts!: Product[];

  @Output() showCatalog = new EventEmitter<string>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() buyNow = new EventEmitter<Product>();
  @Output() openProduct = new EventEmitter<Product>();

  readonly fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 620'%3E%3Crect width='800' height='620' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' fill='%23334155' font-family='Arial' font-size='36'%3ELuxeCart%3C/text%3E%3Ctext x='50%25' y='58%25' dominant-baseline='middle' text-anchor='middle' fill='%2364758b' font-family='Arial' font-size='24'%3EImage unavailable%3C/text%3E%3C/svg%3E";

  handleImageError(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = this.fallbackImage;
  }
}
