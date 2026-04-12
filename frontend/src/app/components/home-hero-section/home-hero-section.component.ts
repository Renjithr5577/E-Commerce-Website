import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HeroAction, HeroSlide } from '../../models/storefront.model';

@Component({
  selector: 'app-home-hero-section',
  imports: [CommonModule],
  templateUrl: './home-hero-section.component.html',
  styleUrl: './home-hero-section.component.css'
})
export class HomeHeroSectionComponent {
  @Input({ required: true }) activeHero!: HeroSlide;
  @Input({ required: true }) heroSlides!: HeroSlide[];
  @Input({ required: true }) activeHeroIndex!: number;

  @Output() heroAction = new EventEmitter<HeroAction>();
  @Output() previousHero = new EventEmitter<void>();
  @Output() nextHero = new EventEmitter<void>();
  @Output() heroSelect = new EventEmitter<number>();
}
