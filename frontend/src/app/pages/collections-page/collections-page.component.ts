import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';
import { CollectionCard } from '../../models/storefront.model';

@Component({
  selector: 'app-collections-page',
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './collections-page.component.html'
})
export class CollectionsPageComponent {
  @Input({ required: true }) collectionCards!: CollectionCard[];
  @Input({ required: true }) dealProducts!: Product[];
  @Input({ required: true }) featuredCount!: number;
  @Input({ required: true }) bestSellerCount!: number;
  @Input({ required: true }) categoryCount!: number;

  @Output() showCatalog = new EventEmitter<string>();
  @Output() openProduct = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<Product>();
}
