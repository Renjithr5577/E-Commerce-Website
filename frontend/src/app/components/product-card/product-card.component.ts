import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-card',
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './product-card.component.html'
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() wishlisted = false;

  @Output() open = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();
  @Output() buyNow = new EventEmitter<Product>();
  @Output() toggleWishlist = new EventEmitter<Product>();

  readonly fallbackImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 620'%3E%3Crect width='800' height='620' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='48%25' dominant-baseline='middle' text-anchor='middle' fill='%23334155' font-family='Arial' font-size='36'%3ELuxeCart%3C/text%3E%3Ctext x='50%25' y='58%25' dominant-baseline='middle' text-anchor='middle' fill='%2364758b' font-family='Arial' font-size='24'%3EImage unavailable%3C/text%3E%3C/svg%3E";

  get listPrice(): number {
    return Math.round(this.product.price * 1.35);
  }

  get savingsPercent(): number {
    return Math.max(5, Math.round(((this.listPrice - this.product.price) / this.listPrice) * 100));
  }

  get ratingStars(): string {
    const filledStars = Math.max(1, Math.min(5, Math.round(this.product.rating)));
    return '★'.repeat(filledStars) + '☆'.repeat(5 - filledStars);
  }

  handleImageError(event: Event): void {
    const element = event.target as HTMLImageElement;
    element.src = this.fallbackImage;
  }

  openDetails(): void {
    this.open.emit(this.product);
  }

  onAddToCart(event: Event): void {
    event.stopPropagation();
    this.addToCart.emit(this.product);
  }

  onBuyNow(event: Event): void {
    event.stopPropagation();
    this.buyNow.emit(this.product);
  }

  onToggleWishlist(event: Event): void {
    event.stopPropagation();
    this.toggleWishlist.emit(this.product);
  }
}
