import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { Product } from '../../models/product.model';
import { PromoBoard } from '../../models/storefront.model';

@Component({
  selector: 'app-promo-board-grid',
  imports: [CommonModule],
  templateUrl: './promo-board-grid.component.html'
})
export class PromoBoardGridComponent {
  @Input({ required: true }) promoBoards!: PromoBoard[];
  @Input({ required: true }) products!: Product[];

  @Output() shopCategory = new EventEmitter<string>();

  getBoardProducts(board: PromoBoard, boardIndex: number): Product[] {
    const categoryMap: Record<string, string[]> = {
      'Wireless tech': ['Mobiles, Computers'],
      'Finds for home': ['Home, Kitchen, Pets'],
      'Deals on top categories': [
        'Books',
        "Men's Fashion",
        'Mobiles, Computers',
        'Beauty, Health, Grocery'
      ],
      'Gear up to get fit': [
        'Sports, Fitness, Bags, Luggage',
        "Men's Fashion",
        'Home, Kitchen, Pets',
        'Mobiles, Computers'
      ]
    };

    const preferredCategories = categoryMap[board.title] ?? [board.category];
    const selectedProducts: Product[] = [];
    const usedIds = new Set<number>();

    preferredCategories.forEach((category) => {
      const matches = this.products.filter(
        (product) => product.category === category && !usedIds.has(product.id)
      );
      const match = matches.length ? matches[(boardIndex + selectedProducts.length) % matches.length] : null;

      if (match) {
        usedIds.add(match.id);
        selectedProducts.push(match);
      }
    });

    if (selectedProducts.length < 4) {
      this.products
        .filter((product) => product.category === board.category && !usedIds.has(product.id))
        .slice(0, 4 - selectedProducts.length)
        .forEach((product) => selectedProducts.push(product));
    }

    return selectedProducts.slice(0, 4);
  }
}
