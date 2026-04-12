import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  HeaderLanguage,
  HeaderLanguageOption,
  NavLink,
  ViewMode
} from '../../models/storefront.model';

@Component({
  selector: 'app-store-header',
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './store-header.component.html'
})
export class StoreHeaderComponent {
  readonly languageOptions: Array<{
    code: HeaderLanguageOption;
    label: string;
    locale: string;
    available: boolean;
  }> = [
    { code: 'EN', label: 'English', locale: 'en-IN', available: true },
    { code: 'HI', label: 'Hindi', locale: 'hi-IN', available: false },
    { code: 'TA', label: 'Tamil', locale: 'ta-IN', available: false }
  ];

  readonly copy: Record<
    HeaderLanguage,
    {
      searchPlaceholder: string;
      allCategories: string;
      menuLabel: string;
      currentLabel: string;
      unavailableLabel: string;
      shop: string;
      mobiles: string;
      fashion: string;
      home: string;
      checkout: string;
      collections: string;
      accountNav: string;
      orders: string;
      support: string;
      account: string;
      signIn: string;
      signUp: string;
      signOut: string;
      helloSignIn: string;
      yourAccount: string;
      shopByCategory: string;
      panelSubtitle: string;
      trending: string;
      programs: string;
      helpSettings: string;
      allProducts: string;
      customerSupport: string;
      chooseLanguage: string;
      languageUnavailable: string;
      localTime: string;
      phoneLabel: string;
    }
  > = {
    EN: {
      searchPlaceholder: 'Search products, categories, and ideas',
      allCategories: 'All Categories',
      menuLabel: 'Menu',
      currentLabel: 'Current',
      unavailableLabel: 'Unavailable',
      shop: 'Shop',
      mobiles: 'Mobiles',
      fashion: 'Fashion',
      home: 'Home',
      checkout: 'Checkout',
      collections: 'Collections',
      accountNav: 'Account',
      orders: 'Orders',
      support: 'Support',
      account: 'Account',
      signIn: 'Sign in',
      signUp: 'Sign up',
      signOut: 'Sign out',
      helloSignIn: 'Hello, sign in',
      yourAccount: 'Your order history and account shortcuts',
      shopByCategory: 'Shop by category',
      panelSubtitle: 'Browse departments and account shortcuts from one menu.',
      trending: 'Trending',
      programs: 'Programs and features',
      helpSettings: 'Help and settings',
      allProducts: 'All products',
      customerSupport: 'Customer support',
      chooseLanguage: 'Choose language',
      languageUnavailable: 'This language is currently unavailable right now. Please use English.',
      localTime: 'Local time',
      phoneLabel: 'Call to'
    },
    TA: {
      searchPlaceholder: 'Porutkal, categories, ideas thedungal',
      allCategories: 'All Categories',
      menuLabel: 'Menu',
      currentLabel: 'Current',
      unavailableLabel: 'Unavailable',
      shop: 'Shop',
      mobiles: 'Mobiles',
      fashion: 'Fashion',
      home: 'Home',
      checkout: 'Checkout',
      collections: 'Collections',
      accountNav: 'Account',
      orders: 'Orders',
      support: 'Support',
      account: 'Account',
      signIn: 'Sign in',
      signUp: 'Sign up',
      signOut: 'Sign out',
      helloSignIn: 'Vanakkam, sign in',
      yourAccount: 'Ungal order history and account shortcuts',
      shopByCategory: 'Category padi shop pannungal',
      panelSubtitle: 'Departments matrum account shortcuts inga irukku.',
      trending: 'Trending',
      programs: 'Programs matrum features',
      helpSettings: 'Help matrum settings',
      allProducts: 'Ella products',
      customerSupport: 'Customer support',
      chooseLanguage: 'Language select pannungal',
      languageUnavailable:
        'Indha language ippo available illa. English use pannunga.',
      localTime: 'Local time',
      phoneLabel: 'Call pannungal'
    }
  };

  @Input({ required: true }) navLinks!: NavLink[];
  @Input({ required: true }) currentView!: ViewMode;
  @Input({ required: true }) searchTerm!: string;
  @Input({ required: true }) selectedCategory!: string;
  @Input() isCatalogNavigationActive = false;
  @Input({ required: true }) cartCount!: number;
  @Input({ required: true }) cartSubtotal!: number;
  @Input() selectedLanguage: HeaderLanguage = 'EN';
  @Input() wishlistCount = 0;
  @Input({ required: true }) categories!: string[];
  @Input() accountName: string | null = null;

  @Output() homeRequest = new EventEmitter<void>();
  @Output() homeTabRequest = new EventEmitter<void>();
  @Output() viewChange = new EventEmitter<ViewMode>();
  @Output() searchTermChange = new EventEmitter<string>();
  @Output() searchCategoryChange = new EventEmitter<string>();
  @Output() searchRequest = new EventEmitter<void>();
  @Output() catalogRequest = new EventEmitter<string>();
  @Output() checkoutRequest = new EventEmitter<void>();
  @Output() cartRequest = new EventEmitter<void>();
  @Output() wishlistRequest = new EventEmitter<void>();
  @Output() signInRequest = new EventEmitter<void>();
  @Output() signUpRequest = new EventEmitter<void>();
  @Output() signOutRequest = new EventEmitter<void>();
  @Output() languageChange = new EventEmitter<HeaderLanguage>();

  isCategoryMenuOpen = false;
  isNavCategoryMenuOpen = false;
  isLanguageMenuOpen = false;
  languageNotice = '';

  get text() {
    return this.copy[this.selectedLanguage];
  }

  get searchCategoryLabel(): string {
    return this.selectedCategory === 'All' ? this.text.allCategories : this.selectedCategory;
  }

  get currentTimeLabel(): string {
    const language = this.languageOptions.find((option) => option.code === this.selectedLanguage);

    return new Intl.DateTimeFormat(language?.locale || 'en-IN', {
      hour: 'numeric',
      minute: '2-digit'
    }).format(new Date());
  }

  @HostListener('document:click')
  closeMenusFromDocument(): void {
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  toggleCategoryMenu(event?: Event): void {
    event?.stopPropagation();
    this.isCategoryMenuOpen = !this.isCategoryMenuOpen;
    this.isNavCategoryMenuOpen = false;
    this.isLanguageMenuOpen = false;
    this.languageNotice = '';
  }

  closeCategoryMenu(): void {
    this.isCategoryMenuOpen = false;
  }

  toggleNavCategoryMenu(event?: Event): void {
    event?.stopPropagation();
    this.isNavCategoryMenuOpen = !this.isNavCategoryMenuOpen;
    this.isCategoryMenuOpen = false;
    this.isLanguageMenuOpen = false;
    this.languageNotice = '';
  }

  closeNavCategoryMenu(): void {
    this.isNavCategoryMenuOpen = false;
  }

  toggleLanguageMenu(event?: Event): void {
    event?.stopPropagation();
    this.isLanguageMenuOpen = !this.isLanguageMenuOpen;
    this.isCategoryMenuOpen = false;
    this.isNavCategoryMenuOpen = false;
    this.languageNotice = '';
  }

  closeLanguageMenu(): void {
    this.isLanguageMenuOpen = false;
    this.languageNotice = '';
  }

  chooseSearchCategory(category: string): void {
    this.searchCategoryChange.emit(category);
    this.closeCategoryMenu();
  }

  openCategory(category: string): void {
    this.catalogRequest.emit(category);
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  openView(view: ViewMode): void {
    this.viewChange.emit(view);
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  goHome(): void {
    this.homeRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  goHomeTab(): void {
    this.homeTabRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  submitSearch(): void {
    this.searchRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  openWishlist(): void {
    this.wishlistRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  openSignIn(): void {
    this.signInRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  openSignUp(): void {
    this.signUpRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  signOut(): void {
    this.signOutRequest.emit();
    this.closeCategoryMenu();
    this.closeNavCategoryMenu();
    this.closeLanguageMenu();
  }

  openPanelAccountAction(): void {
    if (this.accountName) {
      this.openView('account');
      return;
    }

    this.openSignIn();
  }

  selectLanguage(language: HeaderLanguageOption): void {
    const option = this.languageOptions.find((entry) => entry.code === language);

    if (!option?.available) {
      this.languageNotice = this.text.languageUnavailable;
      return;
    }

    if (language !== 'EN' && language !== 'TA') {
      return;
    }

    this.languageChange.emit(language);
    this.languageNotice = '';
    this.closeLanguageMenu();
  }

  isHomeActive(): boolean {
    return this.currentView === 'home';
  }

  isAllCategoriesActive(): boolean {
    return this.isNavCategoryMenuOpen;
  }

  isShopActive(): boolean {
    return this.currentView === 'home' && this.isCatalogNavigationActive;
  }

  isCategoryActive(categories: string[]): boolean {
    return this.currentView === 'home' && categories.includes(this.selectedCategory);
  }

  isCheckoutActive(): boolean {
    return this.currentView === 'checkout';
  }

  navLabel(link: NavLink): string {
    if (link.id === 'discover') {
      return this.text.collections;
    }

    if (link.id === 'account') {
      return this.text.accountNav;
    }

    if (link.id === 'support') {
      return this.text.support;
    }

    if (link.id === 'orders') {
      return this.text.orders;
    }

    return link.label;
  }
}
