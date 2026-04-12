import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { BestSellerStorySectionComponent } from '../../components/best-seller-story-section/best-seller-story-section.component';
import { CatalogSectionComponent } from '../../components/catalog-section/catalog-section.component';
import { HighlightsStripComponent } from '../../components/highlights-strip/highlights-strip.component';
import { HomeHeroSectionComponent } from '../../components/home-hero-section/home-hero-section.component';
import { PromoBoardGridComponent } from '../../components/promo-board-grid/promo-board-grid.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { Product } from '../../models/product.model';
import {
  HeroAction,
  HeroSlide,
  HighlightCard,
  PromoBoard
} from '../../models/storefront.model';

@Component({
  selector: 'app-home-page',
  imports: [
    CommonModule,
    HomeHeroSectionComponent,
    HighlightsStripComponent,
    PromoBoardGridComponent,
    CatalogSectionComponent,
    BestSellerStorySectionComponent,
    ProductCardComponent
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.css'
})
export class HomePageComponent {
  @Input({ required: true }) activeHero!: HeroSlide;
  @Input({ required: true }) heroSlides!: HeroSlide[];
  @Input({ required: true }) activeHeroIndex!: number;
  @Input({ required: true }) highlights!: HighlightCard[];
  @Input({ required: true }) promoBoards!: PromoBoard[];
  @Input({ required: true }) categories!: string[];
  @Input({ required: true }) selectedCategory!: string;
  @Input({ required: true }) searchTerm!: string;
  @Input({ required: true }) loading!: boolean;
  @Input({ required: true }) error!: string;
  @Input({ required: true }) allProducts!: Product[];
  @Input() showWishlistSection = false;
  @Input({ required: true }) wishlistProducts!: Product[];
  @Input({ required: true }) showcaseProducts!: Product[];
  @Input({ required: true }) hasMoreCatalogProducts!: boolean;
  @Input({ required: true }) canShowLessCatalogProducts!: boolean;
  @Input({ required: true }) bestSellerProducts!: Product[];
  @Input({ required: true }) hasMoreBestSellerProducts!: boolean;
  @Input({ required: true }) canShowLessBestSellerProducts!: boolean;

  @Output() heroAction = new EventEmitter<HeroAction>();
  @Output() previousHero = new EventEmitter<void>();
  @Output() nextHero = new EventEmitter<void>();
  @Output() heroSelect = new EventEmitter<number>();
  @Output() shopCategory = new EventEmitter<string>();
  @Output() refreshProducts = new EventEmitter<void>();
  @Output() categorySelect = new EventEmitter<string>();
  @Output() productOpen = new EventEmitter<Product>();
  @Output() productAdd = new EventEmitter<Product>();
  @Output() productBuy = new EventEmitter<Product>();
  @Output() wishlistToggle = new EventEmitter<Product>();
  @Output() showMoreCatalog = new EventEmitter<void>();
  @Output() showLessCatalog = new EventEmitter<void>();
  @Output() showMoreBestSeller = new EventEmitter<void>();
  @Output() showLessBestSeller = new EventEmitter<void>();
  @Output() supportRequest = new EventEmitter<void>();

  get isSearching(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  get wishlistProductIds(): number[] {
    return this.wishlistProducts.map((product) => product.id);
  }
}
