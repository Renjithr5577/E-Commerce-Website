import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';
import { ProductCardComponent } from '../product-card/product-card.component';

@Component({
  selector: 'app-catalog-section',
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './catalog-section.component.html'
})
export class CatalogSectionComponent {
  @Input({ required: true }) categories!: string[];
  @Input({ required: true }) selectedCategory!: string;
  @Input() searchTerm = '';
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) error!: string;
  @Input({ required: true }) products!: Product[];
  @Input() wishlistProductIds: number[] = [];
  @Input() canShowMore = false;
  @Input() canShowLess = false;

  @Output() refresh = new EventEmitter<void>();
  @Output() categorySelect = new EventEmitter<string>();
  @Output() productOpen = new EventEmitter<Product>();
  @Output() productAdd = new EventEmitter<Product>();
  @Output() productBuy = new EventEmitter<Product>();
  @Output() productWishlistToggle = new EventEmitter<Product>();
  @Output() showMore = new EventEmitter<void>();
  @Output() showLess = new EventEmitter<void>();

  get catalogHeading(): string {
    if (this.searchTerm.trim()) {
      return 'Search results';
    }

    return this.selectedCategory === 'All'
      ? 'Attractive products with more meaning around them'
      : this.selectedCategory;
  }

  get catalogDescription(): string {
    if (this.searchTerm.trim()) {
      return `Showing ${this.products.length} matching products for "${this.searchTerm.trim()}".`;
    }

    if (this.selectedCategory === 'All') {
      return 'Search, filter, open a detail page, and move into checkout through a layout that feels closer to a full marketplace experience.';
    }

    return `Showing ${this.products.length} products from ${this.selectedCategory}. Search this category, open any product, and continue to checkout from here.`;
  }

  get visibleCategories(): string[] {
    if (this.selectedCategory === 'All') {
      return this.categories;
    }

    return this.categories.filter(
      (category) => category === 'All' || category === this.selectedCategory
    );
  }

  isWishlisted(product: Product): boolean {
    return this.wishlistProductIds.includes(product.id);
  }
}
