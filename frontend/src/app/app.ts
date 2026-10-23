import { CommonModule } from '@angular/common';
import {
  Component,
  DoCheck,
  effect,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewEncapsulation
} from '@angular/core';

import {
  COLLECTION_CARDS,
  FAQS,
  FOOTER_COLUMNS,
  HERO_SLIDES,
  HIGHLIGHTS,
  MARKETPLACE_CATEGORIES,
  NAV_LINKS,
  PAYMENT_OPTIONS,
  PROMO_BOARDS,
  SUPPORT_ISSUE_OPTIONS,
  SUPPORT_CARDS
} from './data/storefront.data';
import {
  AdminCustomerUser,
  AdminCreateSubAdminPayload,
  AdminOrderDetail,
  AdminOverview,
  AdminSession,
  AdminSupportTicket,
  AdminSupportTicketStatus,
  AdminSupportTicketUpdatePayload,
  AdminUser
} from './models/admin.model';
import {
  CheckoutPayload,
  CustomerOrderDetail,
  CustomerOrderSummary,
  CustomerRecentOrderedProduct,
  OrderResponse,
  PaymentCardSnapshot
} from './models/order.model';
import { Product, ProductCreatePayload } from './models/product.model';
import {
  CustomerSupportTicket,
  SupportForm,
  SupportRequestPayload
} from './models/support.model';
import {
  AccountPasswordForm,
  AccountProfileForm,
  AccountRecoveryProfile,
  AdminLoginForm,
  AdminProductForm,
  AuthForm,
  AuthPasswordResetPayload,
  CartItem,
  CheckoutStage,
  CheckoutForm,
  CustomerAccountRecord,
  HeaderLanguage,
  HeroSlide,
  RegisteredAccount,
  SavedDeliveryAddress,
  SavedPaymentCard,
  StoreSection,
  ViewMode
} from './models/storefront.model';
import { CollectionsPageComponent } from './pages/collections-page/collections-page.component';
import { ConfirmationPageComponent } from './pages/confirmation-page/confirmation-page.component';
import { CheckoutPageComponent } from './pages/checkout-page/checkout-page.component';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { OrdersPageComponent } from './pages/orders-page/orders-page.component';
import { ProductDetailPageComponent } from './pages/product-detail-page/product-detail-page.component';
import { AdminPageComponent } from './pages/admin-page/admin-page.component';
import { AccountPageComponent } from './pages/account-page/account-page.component';
import { SignInPageComponent } from './pages/sign-in-page/sign-in-page.component';
import { SignUpPageComponent } from './pages/sign-up-page/sign-up-page.component';
import { SupportPageComponent } from './pages/support-page/support-page.component';
import { StoreService } from './services/store.service';
import { SiteFooterComponent } from './components/site-footer/site-footer.component';
import { StoreHeaderComponent } from './components/store-header/store-header.component';

type CartUpdateResult = {
  items: CartItem[];
  addedQuantity: number;
  cartQuantity: number;
  availableStock: number;
};

type StoredCartCollectionMap = Record<string, CartItem[]>;

type SupportTicketUpdateAction =
  | 'save_reply'
  | 'mark_in_progress'
  | 'resolve_ticket'
  | 'close_ticket'
  | 'reopen_ticket';

type CheckoutDraft = {
  accountEmail: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  paymentMethod: string;
  cardHolderName: string;
  cardExpiry: string;
  notes: string;
  selectedDeliveryAddressId: string | null;
  selectedPaymentCardId: string | null;
};

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    StoreHeaderComponent,
    HomePageComponent,
    OrdersPageComponent,
    CollectionsPageComponent,
    SupportPageComponent,
    ProductDetailPageComponent,
    CheckoutPageComponent,
    ConfirmationPageComponent,
    AdminPageComponent,
    AccountPageComponent,
    SignInPageComponent,
    SignUpPageComponent,
    SiteFooterComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  encapsulation: ViewEncapsulation.None
})
export class App implements OnInit, OnDestroy, DoCheck {
  private readonly storeService = inject(StoreService);
  private readonly storageKey = 'luxe-cart-items';
  private readonly savedItemsStorageKey = 'luxe-saved-items';
  private readonly wishlistStorageKey = 'luxe-wishlist-items';
  private readonly languageStorageKey = 'luxe-header-language';
  private readonly accountStorageKey = 'luxe-account-name';
  private readonly registeredAccountStorageKey = 'luxe-registered-account';
  private readonly adminSessionStorageKey = 'luxe-admin-session';
  private readonly routeStorageKey = 'luxe-last-route';
  private readonly customerCartStorageKey = 'luxe-customer-carts';
  private readonly customerSavedItemsStorageKey = 'luxe-customer-saved-items';
  private readonly deliveryAddressesStorageKey = 'luxe-delivery-addresses';
  private readonly savedPaymentCardsStorageKey = 'luxe-saved-payment-cards';
  private readonly checkoutDraftStorageKey = 'luxe-checkout-draft';
  private readonly initialCatalogVisibleCount = 10;
  private readonly initialBestSellerVisibleCount = 8;
  private readonly productLoadStep = 10;
  private readonly maxAdminImageSize = 2 * 1024 * 1024;
  private readonly defaultStoreSectionNames = MARKETPLACE_CATEGORIES;
  private checkoutSource: 'cart' | 'instant' = 'cart';
  private isApplyingRoute = false;
  private heroAutoSlideId: ReturnType<typeof setInterval> | null = null;
  private pendingProductRouteId: number | null = null;
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private toastAudioContext: AudioContext | null = null;
  private protectedViewAfterAuth: ViewMode | null = null;
  private productShuffleSeed = 0;
  private lastPersistedCheckoutDraftSnapshot = '';

  readonly products = signal<Product[]>([]);
  readonly storeSections = signal<StoreSection[]>(
    this.defaultStoreSectionNames.map((name, index) => ({
      id: index + 1,
      name,
      sortOrder: index + 1
    }))
  );
  readonly cart = signal<CartItem[]>([]);
  readonly instantCheckoutItems = signal<CartItem[]>([]);
  readonly wishlist = signal<Product[]>([]);
  readonly isWishlistSectionVisible = signal(false);
  readonly savedItems = signal<CartItem[]>([]);
  readonly selectedProduct = signal<Product | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly orderSubmitting = signal(false);
  readonly checkoutError = signal('');
  readonly orderReceipt = signal<OrderResponse | null>(null);
  readonly accountName = signal<string | null>(null);
  readonly registeredAccount = signal<RegisteredAccount | null>(null);
  readonly savedDeliveryAddresses = signal<SavedDeliveryAddress[]>([]);
  readonly selectedDeliveryAddressId = signal<string | null>(null);
  readonly savedPaymentCards = signal<SavedPaymentCard[]>([]);
  readonly selectedPaymentCardId = signal<string | null>(null);
  readonly isAdminAuthenticated = signal(false);
  readonly adminSessionToken = signal<string | null>(null);
  readonly currentAdmin = signal<AdminUser | null>(null);
  readonly adminAccounts = signal<AdminUser[]>([]);
  readonly adminUsers = signal<AdminCustomerUser[]>([]);
  readonly adminOverview = signal<AdminOverview | null>(null);
  readonly adminAccountsLoading = signal(false);
  readonly adminUsersLoading = signal(false);
  readonly adminOverviewLoading = signal(false);
  readonly adminDetailLoading = signal(false);
  readonly selectedAdminOrderDetail = signal<AdminOrderDetail | null>(null);
  readonly selectedAdminProduct = signal<Product | null>(null);
  readonly supportSubmitting = signal(false);
  readonly customerSupportTickets = signal<CustomerSupportTicket[]>([]);
  readonly customerSupportLoading = signal(false);
  readonly customerOrders = signal<CustomerOrderSummary[]>([]);
  readonly customerOrdersLoading = signal(false);
  readonly customerLatestOrder = signal<CustomerOrderDetail | null>(null);
  readonly customerLatestOrderLoading = signal(false);
  readonly customerSelectedOrderId = signal<number | null>(null);
  readonly customerRecentOrderedProducts = signal<CustomerRecentOrderedProduct[]>([]);
  readonly customerRecentOrderedProductsLoading = signal(false);
  readonly showBackToTop = signal(false);
  readonly toastMessage = signal('');
  readonly toastTone = signal<'success' | 'error'>('success');
  private customerSavedPaymentCardsRequestId = 0;
  private readonly customerCollectionSyncPaused = signal(false);

  readonly navLinks = NAV_LINKS;
  readonly paymentOptions = PAYMENT_OPTIONS;
  readonly supportIssueOptions = SUPPORT_ISSUE_OPTIONS;
  private readonly heroSlideSet = HERO_SLIDES;
  readonly promoBoards = PROMO_BOARDS;
  readonly collectionCards = COLLECTION_CARDS;
  readonly supportCards = SUPPORT_CARDS;
  readonly footerColumns = FOOTER_COLUMNS;
  readonly faqs = FAQS;
  readonly highlights = HIGHLIGHTS;
  private readonly heroLanguageOverrides: Record<HeaderLanguage, Partial<HeroSlide>[]> = {
    EN: this.heroSlideSet.map(() => ({})),
    TA: [
      {
        eyebrow: 'Style Specials',
        title: 'Season deals-oda standout fashion savings',
        subtitle:
          'Gift-ready looks, daily essentials, matrum brighter shopping week-kana fresh edit.',
        cta: 'Shop deals',
        secondaryCta: 'View collections',
        background:
          'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1600&q=85',
        accent: 'Fresh trend picks'
      },
      {
        eyebrow: 'Home Edit',
        title: 'Daily living-kku warm home upgrades',
        subtitle:
          'Kitchen tools, decor, matrum practical home picks ungal space-ai complete panna.',
        cta: 'Browse home picks',
        secondaryCta: 'Read our story',
        background:
          'https://images.unsplash.com/photo-1484101403633-562f891dc89a?auto=format&fit=crop&w=1600&q=85',
        accent: 'Home refresh ideas'
      },
      {
        eyebrow: 'Fashion Focus',
        title: 'Comfort-um color-um kooda easy style deals',
        subtitle:
          'Bags, shoes, matrum daily outfits fast fashion showcase-la ready-a irukku.',
        cta: 'See fashion picks',
        secondaryCta: 'Contact support',
        background:
          'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1600&q=85',
        accent: 'Tamil trend edit'
      },
      {
        eyebrow: 'Tech Focus',
        title: 'Daily work-kku smart tech matrum desk setup picks',
        subtitle:
          'Laptops, accessories, matrum easy productivity tools inga one quick edit-la ready-a irukku.',
        cta: 'Open tech deals',
        secondaryCta: 'Browse catalog',
        background:
          'https://images.unsplash.com/photo-1496171367470-9ed9a91ea931?auto=format&fit=crop&w=1600&q=85',
        accent: 'Desk upgrade ideas'
      },
      {
        eyebrow: 'Reading Corner',
        title: 'Books, gifting picks, matrum study reads one clean shelf-la',
        subtitle:
          'Fiction, guides, matrum simple gift-ready books browse panna intha reading edit use pannunga.',
        cta: 'See book picks',
        secondaryCta: 'Browse catalog',
        background:
          'https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1600&q=85',
        accent: 'Top reads this week'
      }
    ]
  };

  checkoutForm: CheckoutForm = this.createCheckoutForm();
  signInForm: AuthForm = this.createAuthForm();
  signUpForm: AuthForm = this.createAuthForm();
  signInPasswordResetForm: AuthPasswordResetPayload = this.createAuthPasswordResetForm();
  signInPasswordResetMode: 'closed' | 'verify' | 'reset' = 'closed';
  accountProfileForm: AccountProfileForm = this.createAccountProfileForm();
  accountPasswordForm: AccountPasswordForm = this.createAccountPasswordForm();
  adminLoginForm: AdminLoginForm = this.createAdminLoginForm();
  adminProductForm: AdminProductForm = this.createAdminProductForm();
  adminEditingProductId: number | null = null;
  supportForm: SupportForm = this.createSupportForm();
  searchTerm = '';
  selectedCategory = 'All';
  currentLanguage: HeaderLanguage = this.readStoredLanguage();
  currentView: ViewMode = this.getInitialViewFromLocation();
  isCatalogNavigationActive = false;
  activeHeroIndex = 0;
  checkoutStage: CheckoutStage = 'cart';
  catalogVisibleCount = this.initialCatalogVisibleCount;
  bestSellerVisibleCount = this.initialBestSellerVisibleCount;
  private _authError = '';
  private _authSuccess = '';
  authNotice = '';
  private _adminError = '';
  adminSuccess = '';
  adminSubmitting = false;
  adminSectionSubmitting = false;
  adminSubAdminSubmitting = false;
  adminDeletingCustomerUserEmail: string | null = null;
  adminSupportUpdatingTicketId: number | null = null;
  private _supportError = '';
  supportSuccess = '';
  accountProfileError = '';
  accountPasswordError = '';
  accountSuccess = '';
  accountPasswordHintMode = false;
  accountPasswordHintMismatch = false;
  supportHistoryError = '';
  customerOrdersError = '';
  customerLatestOrderError = '';
  customerRecentOrderedProductsError = '';
  private productDisplayOffset = 0;

  get authError(): string {
    return this._authError;
  }

  set authError(message: string) {
    this._authError = message;

    if (message) {
      this.showToast(message, 'error');
    }
  }

  get authSuccess(): string {
    return this._authSuccess;
  }

  set authSuccess(message: string) {
    this._authSuccess = message;

    if (message) {
      this.showToast(message, 'success');
    }
  }

  get adminError(): string {
    return this._adminError;
  }

  set adminError(message: string) {
    this._adminError = message;

    if (message) {
      this.showToast(message, 'error');
    }
  }

  get supportError(): string {
    return this._supportError;
  }

  set supportError(message: string) {
    this._supportError = message;

    if (message) {
      this.showToast(message, 'error');
    }
  }

  constructor() {
    const savedCart = localStorage.getItem(this.storageKey);
    const savedForLater = localStorage.getItem(this.savedItemsStorageKey);
    const savedWishlist = localStorage.getItem(this.wishlistStorageKey);
    const savedAccountName = localStorage.getItem(this.accountStorageKey);
    const savedRegisteredAccount = localStorage.getItem(this.registeredAccountStorageKey);
    const savedAdminSession = localStorage.getItem(this.adminSessionStorageKey);
    const savedDeliveryAddresses = localStorage.getItem(this.deliveryAddressesStorageKey);
    const savedPaymentCards = localStorage.getItem(this.savedPaymentCardsStorageKey);

    if (savedCart) {
      this.cart.set(JSON.parse(savedCart) as CartItem[]);
    }

    if (savedForLater) {
      this.savedItems.set(JSON.parse(savedForLater) as CartItem[]);
    }

    if (savedWishlist) {
      this.wishlist.set(JSON.parse(savedWishlist) as Product[]);
    }

    if (savedAccountName) {
      this.accountName.set(savedAccountName);
    }

    if (savedRegisteredAccount) {
      try {
        const parsedAccount = JSON.parse(savedRegisteredAccount) as Partial<RegisteredAccount>;

        this.registeredAccount.set({
          name: parsedAccount.name?.trim() || '',
          email: (parsedAccount.email || '').trim().toLowerCase(),
          phone: this.normalizePhone(parsedAccount.phone || ''),
          password: parsedAccount.password || '',
          passwordHint: parsedAccount.passwordHint?.trim() || parsedAccount.name?.trim() || ''
        });
      } catch {
        localStorage.removeItem(this.registeredAccountStorageKey);
      }
    }

    if (savedDeliveryAddresses) {
      try {
        const parsedAddresses = JSON.parse(savedDeliveryAddresses) as SavedDeliveryAddress[];

        this.savedDeliveryAddresses.set(
          parsedAddresses
            .filter((address) => !!address?.id && !!address?.accountEmail)
            .map((address) => ({
              ...address,
              accountEmail: String(address.accountEmail || '').trim().toLowerCase(),
              customerName: String(address.customerName || '').trim(),
              email: String(address.email || '').trim().toLowerCase(),
              phone: this.normalizePhone(address.phone || ''),
              addressLine: String(address.addressLine || '').trim(),
              city: String(address.city || '').trim(),
              state: String(address.state || '').trim(),
              postalCode: String(address.postalCode || '').trim(),
              createdAt: String(address.createdAt || ''),
              updatedAt: String(address.updatedAt || '')
            }))
        );
      } catch {
        localStorage.removeItem(this.deliveryAddressesStorageKey);
      }
    }

    if (savedPaymentCards) {
      try {
        const parsedCards = JSON.parse(savedPaymentCards) as SavedPaymentCard[];

        this.savedPaymentCards.set(
          parsedCards
            .filter((card) => !!card?.id && !!card?.accountEmail)
            .map((card) => ({
              ...card,
              accountEmail: String(card.accountEmail || '').trim().toLowerCase(),
              cardHolderName: String(card.cardHolderName || '').trim(),
              cardNumber: String(card.cardNumber || '')
                .replace(/\D/g, '')
                .slice(0, 16),
              last4: String(card.cardNumber || card.last4 || '')
                .replace(/\D/g, '')
                .slice(-4),
              expiry: String(card.expiry || '').trim(),
              brand: String(card.brand || '').trim() || 'Card',
              createdAt: String(card.createdAt || ''),
              updatedAt: String(card.updatedAt || '')
            }))
            .filter((card) => /^\d{4}$/.test(card.last4))
        );
      } catch {
        localStorage.removeItem(this.savedPaymentCardsStorageKey);
      }
    }

    if (savedAdminSession) {
      try {
        const parsedAdminSession = JSON.parse(savedAdminSession) as Partial<AdminSession>;

        if (parsedAdminSession.token && parsedAdminSession.admin) {
          const restoredAdminToken = String(parsedAdminSession.token).trim();
          this.storeService.setAdminSession(restoredAdminToken);
          this.adminSessionToken.set(restoredAdminToken);
          this.currentAdmin.set(this.normalizeAdminUser(parsedAdminSession.admin));
          this.isAdminAuthenticated.set(true);
        } else {
          localStorage.removeItem(this.adminSessionStorageKey);
        }
      } catch {
        localStorage.removeItem(this.adminSessionStorageKey);
      }
    }

    this.restorePersistedAdminRoute();
    this.restoreCustomerCollectionsForCurrentSession();
    this.restoreCheckoutDraft();

    this.populateSupportIdentity();
    this.populateAccountForms();

    effect(() => {
      const isSyncPaused = this.customerCollectionSyncPaused();
      const activeCustomerStorageId = this.getSignedInCustomerStorageId();
      const cartItems = this.cart();

      if (isSyncPaused) {
        return;
      }

      this.persistCartCollection(activeCustomerStorageId, cartItems);
    });

    effect(() => {
      const isSyncPaused = this.customerCollectionSyncPaused();
      const activeCustomerStorageId = this.getSignedInCustomerStorageId();
      const savedItems = this.savedItems();

      if (isSyncPaused) {
        return;
      }

      this.persistSavedItemsCollection(activeCustomerStorageId, savedItems);
    });

    effect(() => {
      localStorage.setItem(this.wishlistStorageKey, JSON.stringify(this.wishlist()));
    });

    effect(() => {
      const accountName = this.accountName();

      if (accountName) {
        localStorage.setItem(this.accountStorageKey, accountName);
        return;
      }

      localStorage.removeItem(this.accountStorageKey);
    });

    effect(() => {
      const registeredAccount = this.registeredAccount();

      if (registeredAccount) {
        localStorage.setItem(
          this.registeredAccountStorageKey,
          JSON.stringify(registeredAccount)
        );
        return;
      }

      localStorage.removeItem(this.registeredAccountStorageKey);
    });

    effect(() => {
      localStorage.setItem(
        this.deliveryAddressesStorageKey,
        JSON.stringify(this.savedDeliveryAddresses())
      );
    });

    effect(() => {
      localStorage.setItem(this.savedPaymentCardsStorageKey, JSON.stringify(this.savedPaymentCards()));
    });

    effect(() => {
      const adminToken = this.adminSessionToken();
      const admin = this.currentAdmin();

      if (adminToken && admin) {
        this.storeService.setAdminSession(adminToken);
        localStorage.setItem(
          this.adminSessionStorageKey,
          JSON.stringify({
            token: adminToken,
            admin
          })
        );
        return;
      }

      this.storeService.setAdminSession(null);
      localStorage.removeItem(this.adminSessionStorageKey);
    });
  }

  ngDoCheck(): void {
    this.persistCheckoutDraftIfNeeded();
  }

  ngOnInit(): void {
    this.applyRouteFromLocation();
    this.loadStoreSections();
    this.loadProducts();
    this.syncCurrentCustomerSavedPaymentCards();
    if (this.isAdminAuthenticated()) {
      this.loadAdminOverview(false);
      this.loadAdminAccounts(false);
      this.loadAdminUsers(false);
    }
    this.startHeroAutoSlide();
    this.updateBackToTopVisibility();
  }

  ngOnDestroy(): void {
    if (this.heroAutoSlideId) {
      clearInterval(this.heroAutoSlideId);
    }

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }
  }

  get activeHero() {
    return this.heroSlides[this.activeHeroIndex];
  }

  get storeSectionNames(): string[] {
    const configuredSections = this.storeSections().map((section) =>
      this.normalizeStoreSectionName(section.name)
    );
    const productSections = this.products().map((product) =>
      this.normalizeStoreSectionName(product.category)
    );

    return [...new Set([...configuredSections, ...productSections].filter((name) => name.length > 0))];
  }

  get heroSlides(): HeroSlide[] {
    const overrides = this.heroLanguageOverrides[this.currentLanguage];

    return this.heroSlideSet.map((slide, index) => ({
      ...slide,
      ...(overrides[index] ?? {})
    }));
  }

  get categories(): string[] {
    return ['All', ...this.storeSectionNames];
  }

  get visibleProducts(): Product[] {
    const availableSections = new Set(this.storeSectionNames);
    const rotatedProducts = this.rotateProducts(
      this.products().filter((product) =>
        availableSections.has(this.normalizeStoreSectionName(product.category))
      ),
      this.productDisplayOffset
    );

    return this.productShuffleSeed
      ? this.shuffleProducts(rotatedProducts, this.productShuffleSeed)
      : rotatedProducts;
  }

  get filteredProducts(): Product[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.visibleProducts.filter((product) => {
      const matchesCategory =
        this.selectedCategory === 'All' || product.category === this.selectedCategory;
      const matchesSearch =
        term.length === 0 ||
        product.name.toLowerCase().includes(term) ||
        product.description.toLowerCase().includes(term) ||
        product.category.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }

  get featuredProducts(): Product[] {
    return this.visibleProducts
      .filter((product) => product.featured)
      .slice(0, 25);
  }

  get bestSellerProducts(): Product[] {
    return this.rotateProducts(
      [...this.bestSellerPool].sort((left, right) => right.rating - left.rating),
      this.productDisplayOffset
    )
      .slice(0, this.bestSellerVisibleCount);
  }

  get dealProducts(): Product[] {
    return [...this.visibleProducts]
      .sort((left, right) => left.price - right.price)
      .slice(0, 25);
  }

  get homeShowcaseProducts(): Product[] {
    return this.filteredProducts.slice(0, this.catalogVisibleCount);
  }

  get promoBoardProducts(): Product[] {
    const usedIds = new Set([
      ...this.homeShowcaseProducts.map((product) => product.id),
      ...this.bestSellerProducts.map((product) => product.id)
    ]);
    const remainingProducts = this.visibleProducts.filter((product) => !usedIds.has(product.id));

    return remainingProducts.length >= 4 ? remainingProducts : this.visibleProducts;
  }

  get bestSellerPool(): Product[] {
    const showcasedIds = new Set(this.homeShowcaseProducts.map((product) => product.id));

    return this.visibleProducts.filter((product) => !showcasedIds.has(product.id));
  }

  get hasMoreCatalogProducts(): boolean {
    return this.filteredProducts.length > this.catalogVisibleCount;
  }

  get canShowLessCatalogProducts(): boolean {
    return (
      this.filteredProducts.length > this.initialCatalogVisibleCount &&
      !this.hasMoreCatalogProducts
    );
  }

  get hasMoreBestSellerProducts(): boolean {
    return this.bestSellerPool.length > this.bestSellerVisibleCount;
  }

  get canShowLessBestSellerProducts(): boolean {
    return (
      this.bestSellerPool.length > this.initialBestSellerVisibleCount &&
      !this.hasMoreBestSellerProducts
    );
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.updateBackToTopVisibility();
  }

  @HostListener('window:popstate')
  onWindowPopState(): void {
    this.applyRouteFromLocation();
  }

  get relatedProducts(): Product[] {
    const product = this.selectedProduct();

    if (!product) {
      return [];
    }

    return this.visibleProducts
      .filter((item) => item.id !== product.id && item.category === product.category)
      .slice(0, 8);
  }

  get cartCount(): number {
    return this.cart().reduce((count, item) => count + item.quantity, 0);
  }

  get cartSubtotal(): number {
    return this.cart().reduce((total, item) => total + item.price * item.quantity, 0);
  }

  get deliveryFee(): number {
    return this.cart().length ? 12 : 0;
  }

  get cartTotal(): number {
    return this.cartSubtotal + this.deliveryFee;
  }

  get checkoutItems(): CartItem[] {
    return this.checkoutSource === 'instant' ? this.instantCheckoutItems() : this.cart();
  }

  get checkoutSubtotal(): number {
    return this.checkoutItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }

  get checkoutDeliveryFee(): number {
    return this.checkoutItems.length ? 12 : 0;
  }

  get checkoutTotal(): number {
    return this.checkoutSubtotal + this.checkoutDeliveryFee;
  }

  get savedDeliveryAddressesForCurrentAccount(): SavedDeliveryAddress[] {
    const account = this.registeredAccount();
    const accountEmail = account?.email?.trim().toLowerCase();

    if (!this.accountName() || !accountEmail) {
      return [];
    }

    return this.savedDeliveryAddresses()
      .filter((address) => address.accountEmail === accountEmail)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  get savedPaymentCardsForCurrentAccount(): SavedPaymentCard[] {
    const account = this.registeredAccount();
    const accountEmail = account?.email?.trim().toLowerCase();

    if (!this.accountName() || !accountEmail) {
      return [];
    }

    return this.savedPaymentCards()
      .filter((card) => card.accountEmail === accountEmail)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  get totalInventory(): number {
    return this.visibleProducts.reduce((total, product) => total + product.stock, 0);
  }

  get averagePrice(): number {
    if (!this.visibleProducts.length) {
      return 0;
    }

    const total = this.visibleProducts.reduce((sum, product) => sum + product.price, 0);
    return total / this.visibleProducts.length;
  }

  get checkoutItemCount(): number {
    return this.checkoutItems.reduce((count, item) => count + item.quantity, 0);
  }

  get isCheckoutDisabled(): boolean {
    return this.orderSubmitting() || this.checkoutItems.length === 0;
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set('');

    this.storeService.getProducts().subscribe({
      next: (products) => {
        this.products.set(products);
        this.cart.set(this.syncCartItemsWithCatalog(this.cart(), products));
        this.savedItems.set(this.syncCartItemsWithCatalog(this.savedItems(), products));
        this.instantCheckoutItems.set(
          this.syncCartItemsWithCatalog(this.instantCheckoutItems(), products)
        );
        this.loading.set(false);

        if (this.wishlist().length) {
          const wishlistIds = new Set(this.wishlist().map((product) => product.id));
          this.wishlist.set(products.filter((product) => wishlistIds.has(product.id)));
        }

        const selected = this.selectedProduct();

        if (selected) {
          const refreshed = products.find((product) => product.id === selected.id) || null;
          this.selectedProduct.set(refreshed);
        }

        const selectedAdminProduct = this.selectedAdminProduct();

        if (selectedAdminProduct) {
          const refreshedAdminProduct =
            products.find((product) => product.id === selectedAdminProduct.id) || null;
          this.selectedAdminProduct.set(refreshedAdminProduct);
        }

        this.resolvePendingProductRoute();
      },
      error: (error: Error) => {
        this.error.set(error.message);
        this.loading.set(false);
      }
    });
  }

  loadStoreSections(): void {
    this.storeService.getStoreSections().subscribe({
      next: (sections) => {
        this.storeSections.set(
          [...sections]
            .map((section) => ({
              ...section,
              name: this.normalizeStoreSectionName(section.name)
            }))
            .filter((section) => section.name.length > 0)
        );
      },
      error: () => {
        // Keep the default section list when the dedicated endpoint is unavailable.
      }
    });
  }

  setSearchTerm(term: string): void {
    this.searchTerm = term;
    this.isWishlistSectionVisible.set(false);
    this.resetProductSectionCounts();
  }

  setSearchCategory(category: string): void {
    this.openCatalog(category, false, false);
  }

  setLanguage(language: HeaderLanguage): void {
    if (language !== 'EN') {
      this.currentLanguage = 'EN';
      localStorage.setItem(this.languageStorageKey, 'EN');
      return;
    }

    this.currentLanguage = language;
    localStorage.setItem(this.languageStorageKey, language);
  }

  performSearch(): void {
    this.resetProductSectionCounts();
    this.openCatalog(this.selectedCategory, false, false);
  }

  goHomeLanding(
    options: { syncRoute?: boolean; scrollBehavior?: ScrollBehavior } = {}
  ): void {
    this.setView('home', options);
  }

  goHomeTab(
    options: { syncRoute?: boolean; scrollBehavior?: ScrollBehavior } = {}
  ): void {
    const homeScrollTarget = this.getHomeReturnScrollTarget();
    this.applyViewChange('home', options, false, homeScrollTarget);
  }

  setView(
    view: ViewMode,
    options: { syncRoute?: boolean; scrollBehavior?: ScrollBehavior } = {}
  ): void {
    this.applyViewChange(view, options, view === 'home');
  }

  private applyViewChange(
    view: ViewMode,
    options: { syncRoute?: boolean; scrollBehavior?: ScrollBehavior } = {},
    resetHomeLanding = view === 'home',
    homeScrollTarget: 'catalog' | 'wishlist' | 'best-sellers' | null = null
  ): void {
    const { syncRoute = true, scrollBehavior = 'smooth' } = options;

    if ((view === 'orders' || view === 'account') && !this.accountName()) {
      if (view === 'account') {
        this.openAccountSignIn();
        return;
      }

      this.openOrdersSignIn();
      return;
    }

    this.currentView = view;
    this.authError = '';

    if (view === 'home' && resetHomeLanding) {
      this.resetHomeLandingState();
    }

    if (view !== 'home') {
      this.isWishlistSectionVisible.set(false);
    }

    if (view !== 'product') {
      this.selectedProduct.set(null);
    }

    if (view !== 'signin' && view !== 'signup') {
      this.authSuccess = '';
      this.authNotice = '';
      this.protectedViewAfterAuth = null;
    }

    if (view !== 'admin') {
      this.adminError = '';
      this.adminSuccess = '';
      this.adminSubmitting = false;
      this.adminSectionSubmitting = false;
      this.adminDeletingCustomerUserEmail = null;
      this.adminSupportUpdatingTicketId = null;
      this.clearAdminDetails();
    }

    if (view !== 'support') {
      this.supportError = '';
      this.supportSuccess = '';
      this.supportHistoryError = '';
    }

    if (view !== 'orders') {
      this.customerOrdersError = '';
      this.clearCustomerOrderDetail(false);
      this.customerLatestOrderError = '';
      this.customerRecentOrderedProductsError = '';
    }

    if (view !== 'account') {
      this.clearAccountFeedback();
    }

    if (view === 'support') {
      this.populateSupportIdentity();
      this.loadCustomerSupportTickets();
      this.loadCustomerOrders();
    }

    if (view === 'orders') {
      this.loadCustomerOrders();
      this.clearCustomerOrderDetail();
      this.loadCustomerRecentOrderedProducts();
    }

    if (view === 'account') {
      this.populateAccountForms();
    }

    if (syncRoute) {
      this.syncCurrentRoute();
    }

    if (view === 'home' && !resetHomeLanding && homeScrollTarget) {
      this.scrollHomeSectionIntoView(homeScrollTarget, scrollBehavior);
      return;
    }

    window.scrollTo({ top: 0, behavior: scrollBehavior });
    this.updateBackToTopVisibility();
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.showBackToTop.set(false);
  }

  showCatalog(category: string = 'All'): void {
    this.openCatalog(category, true);
  }

  showWishlist(): void {
    this.currentView = 'home';
    this.isCatalogNavigationActive = false;
    this.selectedCategory = 'All';
    this.searchTerm = '';
    this.resetProductSectionCounts();
    this.selectedProduct.set(null);
    this.isWishlistSectionVisible.set(this.wishlist().length > 0);
    this.pendingProductRouteId = null;
    this.syncCurrentRoute();
    this.scrollHomeSectionIntoView(this.isWishlistSectionVisible() ? 'wishlist' : 'catalog');
  }

  showCart(): void {
    this.useCartCheckout();
    this.checkoutStage = 'cart';
    this.openCheckoutView();
  }

  prevHero(): void {
    this.activeHeroIndex =
      (this.activeHeroIndex - 1 + this.heroSlides.length) % this.heroSlides.length;
  }

  nextHero(): void {
    this.activeHeroIndex = (this.activeHeroIndex + 1) % this.heroSlides.length;
  }

  setHero(index: number): void {
    this.activeHeroIndex = index;
  }

  runHeroAction(action: ViewMode | 'catalog'): void {
    if (action === 'catalog') {
      this.showCatalog(this.activeHero.category ?? 'All');
      return;
    }

    if (action === 'support') {
      this.openSupport();
      return;
    }

    this.setView(action);
  }

  selectCategory(category: string): void {
    this.openCatalog(category, true, true);
  }

  openProduct(product: Product): void {
    this.clearAdminDetails();
    this.selectedProduct.set(product);
    this.currentView = 'product';
    this.pendingProductRouteId = null;
    this.syncCurrentRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  startCheckout(): void {
    this.showCart();
  }

  addToCart(product: Product): void {
    const availableStock = this.getAvailableStock(product);
    const updateResult = this.addOrIncreaseCartItem(this.cart(), product, 1, availableStock);

    this.savedItems.update((items) => items.filter((item) => item.id !== product.id));

    if (updateResult.addedQuantity === 0) {
      this.showToast(this.getStockLimitMessage(product.name, availableStock), 'error');
      return;
    }

    this.cart.set(updateResult.items);
    this.showToast(
      this.getCartQuantityMessage(product.name, updateResult.cartQuantity, updateResult.availableStock),
      'success'
    );
  }

  toggleWishlist(product: Product): void {
    this.wishlist.update((items) => {
      const exists = items.some((item) => item.id === product.id);

      if (exists) {
        return items.filter((item) => item.id !== product.id);
      }

      return [product, ...items];
    });

    if (!this.wishlist().length) {
      this.isWishlistSectionVisible.set(false);
    }
  }

  showMoreCatalogProducts(): void {
    this.catalogVisibleCount += this.productLoadStep;
  }

  showLessCatalogProducts(): void {
    this.catalogVisibleCount = this.initialCatalogVisibleCount;
    this.scrollHomeSectionIntoView('catalog');
  }

  showMoreBestSellerProducts(): void {
    this.bestSellerVisibleCount += this.productLoadStep;
  }

  showLessBestSellerProducts(): void {
    this.bestSellerVisibleCount = this.initialBestSellerVisibleCount;
    this.scrollHomeSectionIntoView('best-sellers');
  }

  refreshProductDisplay(): void {
    const productCount = this.products().filter((product) =>
      this.storeSectionNames.includes(this.normalizeStoreSectionName(product.category))
    ).length;

    if (productCount > 1) {
      const nextOffset = Math.floor(Math.random() * productCount);
      this.productDisplayOffset =
        nextOffset === this.productDisplayOffset
          ? (nextOffset + 1) % productCount
          : nextOffset;
      this.productShuffleSeed = Date.now();
    }

    this.resetProductSectionCounts();
    this.showToast('Product order refreshed across the home sections.', 'success');
  }

  buyNow(product: Product): void {
    const availableStock = this.getAvailableStock(product);

    if (availableStock <= 0) {
      this.showToast(this.getStockLimitMessage(product.name, availableStock), 'error');
      return;
    }

    this.useInstantCheckout({ ...product, stock: availableStock });
    this.checkoutStage = 'details';

    if (!this.ensureSignedInForCheckout()) {
      return;
    }

    this.checkoutStage = 'details';
    this.populateCheckoutIdentity();
    this.openCheckoutView();
  }

  proceedToCheckout(): void {
    this.useCartCheckout();

    if (!this.ensureSignedInForCheckout()) {
      return;
    }

    this.checkoutStage = 'details';
    this.populateCheckoutIdentity();
    this.openCheckoutView();
  }

  backToCartStage(): void {
    this.useCartCheckout();
    this.checkoutStage = 'cart';
    this.openCheckoutView();
  }

  chooseCheckoutSavedAddress(addressId: string): void {
    const address = this.findSavedDeliveryAddressForCurrentAccount(addressId);

    if (!address) {
      return;
    }

    this.selectedDeliveryAddressId.set(address.id);
    this.patchCheckoutFormWithSavedAddress(address);
  }

  confirmCheckoutSavedAddress(addressId: string): void {
    this.chooseCheckoutSavedAddress(addressId);
    this.showToast('Selected delivery address applied to the checkout form.');
  }

  editCheckoutSavedAddress(addressId: string): void {
    const address = this.findSavedDeliveryAddressForCurrentAccount(addressId);

    if (!address) {
      return;
    }

    this.selectedDeliveryAddressId.set(address.id);
    this.patchCheckoutFormWithSavedAddress(address);
    this.showToast('Address loaded into the form. Update it and place the order to save changes.');
  }

  startNewCheckoutAddress(): void {
    const registeredAccount = this.registeredAccount();

    this.selectedDeliveryAddressId.set(null);
    this.checkoutForm = {
      ...this.checkoutForm,
      customerName: registeredAccount?.name || this.checkoutForm.customerName,
      email: registeredAccount?.email || this.checkoutForm.email,
      phone: registeredAccount?.phone || this.checkoutForm.phone,
      addressLine: '',
      city: '',
      state: '',
      postalCode: ''
    };
    this.showToast('Add a new delivery address below and place the order to save it.');
  }

  startNewCheckoutPaymentCard(): void {
    this.selectedPaymentCardId.set(null);
    this.checkoutForm = {
      ...this.checkoutForm,
      paymentMethod: 'Card payment',
      cardHolderName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: ''
    };
    this.showToast('Enter a new card below and place the order to save it.', 'success');
  }

  chooseCheckoutSavedPaymentCard(cardId: string): void {
    const card = this.findSavedPaymentCardForCurrentAccount(cardId);

    if (!card) {
      return;
    }

    this.selectedPaymentCardId.set(card.id);
    this.patchCheckoutFormWithSavedPaymentCard(card);
  }

  confirmCheckoutSavedPaymentCard(cardId: string): void {
    this.chooseCheckoutSavedPaymentCard(cardId);
    const selectedCard = this.findSavedPaymentCardForCurrentAccount(cardId);

    if (
      selectedCard &&
      /^\d{16}$/.test(String(selectedCard.cardNumber || '').replace(/\D/g, '').slice(0, 16))
    ) {
      this.showToast('Saved card selected. You can place the order now, or switch to a new card.');
      return;
    }

    this.showToast(
      'This saved card only has old last-4 data. Enter the full 16-digit card number once below to save it again.',
      'error'
    );
  }

  removeSavedPaymentCard(cardId: string): void {
    const card = this.findSavedPaymentCardForCurrentAccount(cardId);

    if (!card) {
      return;
    }

    if (!this.confirmDeleteAction(`Delete the saved ${card.brand} card ending ${card.last4}?`)) {
      return;
    }

    const accountEmail = (this.registeredAccount()?.email || this.checkoutForm.email)
      .trim()
      .toLowerCase();
    const backendCardId = this.parseBackendSavedPaymentCardId(card.id);

    if (backendCardId === null) {
      this.finalizeSavedPaymentCardRemoval(cardId, accountEmail);
      this.showToast('Saved payment card deleted successfully.', 'success');
      return;
    }

    this.storeService.deleteCustomerSavedPaymentCard(backendCardId, accountEmail).subscribe({
      next: () => {
        this.finalizeSavedPaymentCardRemoval(cardId, accountEmail);
        this.showToast('Saved payment card deleted successfully.', 'success');
      },
      error: (error: Error) => {
        this.setCheckoutError(error.message);
      }
    });
  }

  requestRemoveFromCart(productId: number): void {
    const item = this.cart().find((entry) => entry.id === productId);

    if (!item) {
      return;
    }

    if (!this.confirmDeleteAction(`Delete "${item.name}" from your cart?`)) {
      return;
    }

    this.removeCartItem(productId);
    this.showToast(`${item.name} removed from your cart.`, 'success');
  }

  removeSavedDeliveryAddress(addressId: string): void {
    const address = this.findSavedDeliveryAddressForCurrentAccount(addressId);

    if (!address) {
      return;
    }

    if (
      !this.confirmDeleteAction(
        `Delete the saved delivery address for "${address.customerName}"?`
      )
    ) {
      return;
    }

    const accountEmail = (this.registeredAccount()?.email || this.checkoutForm.email)
      .trim()
      .toLowerCase();
    let remainingAddressesForAccount: SavedDeliveryAddress[] = [];

    this.savedDeliveryAddresses.update((addresses) => {
      const filteredAddresses = addresses.filter((entry) => entry.id !== addressId);
      remainingAddressesForAccount = filteredAddresses.filter(
        (entry) => entry.accountEmail === accountEmail
      );
      return filteredAddresses;
    });

    if (this.selectedDeliveryAddressId() === addressId) {
      const nextSelectedAddress = remainingAddressesForAccount[0] ?? null;

      this.selectedDeliveryAddressId.set(nextSelectedAddress?.id ?? null);

      if (nextSelectedAddress) {
        this.patchCheckoutFormWithSavedAddress(nextSelectedAddress);
      } else {
        const registeredAccount = this.registeredAccount();

        this.checkoutForm = {
          ...this.checkoutForm,
          customerName: registeredAccount?.name || this.checkoutForm.customerName,
          email: registeredAccount?.email || this.checkoutForm.email,
          phone: registeredAccount?.phone || this.checkoutForm.phone,
          addressLine: '',
          city: '',
          state: '',
          postalCode: ''
        };
      }
    }

    this.showToast('Saved delivery address deleted successfully.', 'success');
  }

  private removeCartItem(productId: number): void {
    this.cart.update((items) => items.filter((item) => item.id !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
  }

  increaseCartQuantity(productId: number): void {
    const item = this.cart().find((entry) => entry.id === productId);

    if (!item) {
      return;
    }

    const availableStock = this.getAvailableStock(item);
    const updateResult = this.addOrIncreaseCartItem(this.cart(), item, 1, availableStock);

    if (updateResult.addedQuantity === 0) {
      this.showToast(this.getStockLimitMessage(item.name, availableStock), 'error');
      return;
    }

    this.cart.set(updateResult.items);
    this.showToast(
      this.getCartQuantityMessage(item.name, updateResult.cartQuantity, updateResult.availableStock),
      'success'
    );
  }

  decreaseCartQuantity(productId: number): void {
    this.cart.update((items) =>
      items.flatMap((item) => {
        if (item.id !== productId) {
          return [item];
        }

        if (item.quantity <= 1) {
          return [];
        }

        return [{ ...item, quantity: item.quantity - 1 }];
      })
    );
  }

  saveItemForLater(productId: number): void {
    const item = this.cart().find((entry) => entry.id === productId);

    if (!item) {
      return;
    }

    this.savedItems.update((items) => {
      const existing = items.find((entry) => entry.id === productId);

      if (existing) {
        return items;
      }

      return [...items, { ...item }];
    });

    this.removeCartItem(productId);
  }

  moveSavedItemToCart(productId: number): void {
    const item = this.savedItems().find((entry) => entry.id === productId);

    if (!item) {
      return;
    }

    const availableStock = this.getAvailableStock(item);
    const updateResult = this.addOrIncreaseCartItem(
      this.cart(),
      item,
      item.quantity,
      availableStock
    );

    if (updateResult.addedQuantity === 0) {
      this.showToast(this.getStockLimitMessage(item.name, availableStock), 'error');
      return;
    }

    this.cart.set(updateResult.items);
    this.savedItems.update((items) => items.filter((entry) => entry.id !== productId));
    this.showToast(
      this.getCartQuantityMessage(item.name, updateResult.cartQuantity, updateResult.availableStock),
      'success'
    );
  }

  requestRemoveSavedItem(productId: number): void {
    const item = this.savedItems().find((entry) => entry.id === productId);

    if (!item) {
      return;
    }

    if (!this.confirmDeleteAction(`Delete "${item.name}" from saved items?`)) {
      return;
    }

    this.removeSavedItem(productId);
    this.showToast(`${item.name} removed from saved items.`, 'success');
  }

  private removeSavedItem(productId: number): void {
    this.savedItems.update((items) => items.filter((item) => item.id !== productId));
  }

  submitOrder(): void {
    const checkoutItems = this.checkoutItems;

    if (!this.ensureSignedInForCheckout()) {
      return;
    }

    this.clearCheckoutError();
    if (!checkoutItems.length) {
      this.setCheckoutError('Add products to the cart before opening checkout.');
      return;
    }

    const checkoutValidationError = this.validateCheckoutForm();

    if (checkoutValidationError) {
      this.setCheckoutError(checkoutValidationError);
      return;
    }

    this.orderSubmitting.set(true);
    this.clearCheckoutError();

    const checkoutPaymentCard = this.buildCheckoutPaymentCard();
    const checkoutNotes = this.buildCheckoutNotes(checkoutPaymentCard);

    const payload: CheckoutPayload = {
      customerName: this.checkoutForm.customerName,
      email: this.checkoutForm.email,
      phone: this.checkoutForm.phone,
      addressLine: this.checkoutForm.addressLine,
      city: this.checkoutForm.city,
      state: this.checkoutForm.state,
      postalCode: this.checkoutForm.postalCode,
      paymentMethod: this.checkoutForm.paymentMethod,
      paymentCard: checkoutPaymentCard,
      notes: checkoutNotes,
      items: checkoutItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity
      }))
    };

    this.storeService.placeOrder(payload).subscribe({
      next: (receipt) => {
        this.orderReceipt.set(receipt);
        this.saveCheckoutDeliveryAddress();
        this.saveCheckoutPaymentCard(checkoutPaymentCard);
        if (this.checkoutSource === 'cart') {
          this.cart.set([]);
        }

        this.useCartCheckout();
        this.checkoutForm = this.createCheckoutForm();
        this.selectedDeliveryAddressId.set(null);
        this.selectedPaymentCardId.set(null);
        this.clearPersistedCheckoutDraft();
        this.checkoutStage = 'cart';
        this.orderSubmitting.set(false);
        this.currentView = 'confirmation';
        this.syncCurrentRoute();
        if (this.isAdminAuthenticated()) {
          this.loadAdminOverview();
          this.loadAdminUsers();
        }
        this.loadCustomerOrders();
        this.clearCustomerOrderDetail();
        this.loadCustomerRecentOrderedProducts();
        this.showToast('Order placed successfully.', 'success');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (error: Error) => {
        this.setCheckoutError(error.message);
        this.orderSubmitting.set(false);
      }
    });
  }

  handleInvalidCheckoutSubmit(): void {
    if (!this.ensureSignedInForCheckout()) {
      return;
    }

    const checkoutValidationError =
      this.validateCheckoutForm() || 'Please correct the highlighted checkout fields and try again.';

    this.setCheckoutError(checkoutValidationError);
  }

  continueShopping(): void {
    this.orderReceipt.set(null);
    this.useCartCheckout();
    this.checkoutStage = 'cart';
    this.showCatalog();
  }

  openAdmin(options: { syncRoute?: boolean; scrollBehavior?: ScrollBehavior } = {}): void {
    const { syncRoute = true, scrollBehavior = 'smooth' } = options;
    this.adminError = '';
    this.adminSuccess = '';
    if (!this.isAdminAuthenticated()) {
      this.adminLoginForm = this.createAdminLoginForm();
    }
    this.currentView = 'admin';
    if (this.isAdminAuthenticated()) {
      this.loadAdminOverview(false);
      this.loadAdminAccounts(false);
      this.loadAdminUsers(false);
    }
    if (syncRoute) {
      this.syncCurrentRoute();
    }
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  }

  openSupport(): void {
    this.setView('support');
  }

  openOrdersSignIn(): void {
    this.protectedViewAfterAuth = 'orders';
    this.openAuthView(
      'signin',
      'Sign in to view your ordered products and full order details.',
      true
    );
  }

  openAccountSignIn(): void {
    this.protectedViewAfterAuth = 'account';
    this.openAuthView(
      'signin',
      'Sign in to open your account settings and update your password.',
      true
    );
  }

  openSupportSignIn(): void {
    this.protectedViewAfterAuth = 'support';
    this.openAuthView(
      'signin',
      'Sign in to send a support request and track ticket replies.',
      true
    );
  }

  openCustomerOrderDetail(orderId: number, syncRoute = true): void {
    this.loadCustomerOrderDetail(orderId, syncRoute);
  }

  closeCustomerOrderDetail(syncRoute = true): void {
    this.clearCustomerOrderDetail(syncRoute);
  }

  openSignIn(): void {
    const preserveProtectedView =
      this.protectedViewAfterAuth !== null &&
      (this.currentView === 'signin' || this.currentView === 'signup');

    this.openAuthView('signin', preserveProtectedView ? this.authNotice : '', preserveProtectedView);
  }

  openSignUp(): void {
    const preserveProtectedView =
      this.protectedViewAfterAuth !== null &&
      (this.currentView === 'signin' || this.currentView === 'signup');

    this.openAuthView('signup', preserveProtectedView ? this.authNotice : '', preserveProtectedView);
  }

  openSignInPasswordReset(): void {
    this.signInPasswordResetMode = 'verify';
    this.signInPasswordResetForm = {
      ...this.createAuthPasswordResetForm(),
      identifier: this.signInForm.identifier.trim()
    };
    this.authError = '';
    this.authSuccess = '';
  }

  closeSignInPasswordReset(clearFeedback = false): void {
    this.signInPasswordResetMode = 'closed';
    this.signInPasswordResetForm = this.createAuthPasswordResetForm();

    if (clearFeedback) {
      this.authError = '';
      this.authSuccess = '';
    }
  }

  submitSignInPasswordResetVerification(): void {
    const identifier = this.signInPasswordResetForm.identifier.trim();
    const passwordHint = this.signInPasswordResetForm.passwordHint.trim();
    const registeredAccount = this.registeredAccount();
    const isEmailIdentifier = this.looksLikeEmail(identifier);

    if (!identifier || !passwordHint) {
      this.authError = 'Enter your email or mobile number and the password hint first.';
      this.authSuccess = '';
      return;
    }

    if (isEmailIdentifier) {
      const email = identifier.toLowerCase();

      if (!this.isValidEmail(email)) {
        this.authError = 'Enter a valid email address before checking the password hint.';
        this.authSuccess = '';
        return;
      }
    } else {
      const phone = this.normalizePhone(identifier);

      if (!this.isValidPhone(phone)) {
        this.authError = 'Enter a valid 10-digit mobile number before checking the password hint.';
        this.authSuccess = '';
        return;
      }
    }

    if (passwordHint.length < 3) {
      this.authError = 'Password hint must be at least 3 characters long.';
      this.authSuccess = '';
      return;
    }

    const normalizedIdentifier = isEmailIdentifier
      ? identifier.toLowerCase()
      : this.normalizePhone(identifier);
    const matchesStoredAccount =
      !!registeredAccount &&
      (isEmailIdentifier
        ? registeredAccount.email === normalizedIdentifier
        : registeredAccount.phone === normalizedIdentifier);

    if (!matchesStoredAccount) {
      this.authError =
        'This account is not saved on this device yet. Create the account here first, then use forgot password.';
      this.authSuccess = '';
      return;
    }

    if (!registeredAccount.passwordHint.trim()) {
      this.authError =
        'This account does not have a saved password hint yet. Create a new account with a hint on this device first.';
      this.authSuccess = '';
      return;
    }

    if (registeredAccount.passwordHint.trim().toLowerCase() !== passwordHint.toLowerCase()) {
      this.authError = 'The password hint is incorrect for this account.';
      this.authSuccess = '';
      return;
    }

    this.signInPasswordResetMode = 'reset';
    this.signInPasswordResetForm = {
      ...this.signInPasswordResetForm,
      identifier: normalizedIdentifier,
      passwordHint,
      newPassword: '',
      confirmPassword: ''
    };
    this.authError = '';
    this.authSuccess = '';
  }

  submitSignInPasswordReset(): void {
    const identifier = this.signInPasswordResetForm.identifier.trim();
    const newPassword = this.signInPasswordResetForm.newPassword.trim();
    const confirmPassword = this.signInPasswordResetForm.confirmPassword.trim();
    const registeredAccount = this.registeredAccount();
    const isEmailIdentifier = this.looksLikeEmail(identifier);

    if (!identifier) {
      this.authError = 'Enter your email or mobile number first.';
      this.authSuccess = '';
      return;
    }

    if (newPassword.length < 6) {
      this.authError = 'New password must be at least 6 characters long.';
      this.authSuccess = '';
      return;
    }

    if (newPassword !== confirmPassword) {
      this.authError = 'Confirm password must match the new password.';
      this.authSuccess = '';
      return;
    }

    const matchesStoredAccount =
      !!registeredAccount &&
      (isEmailIdentifier
        ? registeredAccount.email === identifier.toLowerCase()
        : registeredAccount.phone === this.normalizePhone(identifier));

    if (matchesStoredAccount) {
      if (
        !registeredAccount.passwordHint.trim() ||
        registeredAccount.passwordHint.trim().toLowerCase() !==
          this.signInPasswordResetForm.passwordHint.trim().toLowerCase()
      ) {
        this.authError = 'Password hint confirmation failed for this account.';
        this.authSuccess = '';
        this.signInPasswordResetMode = 'verify';
        return;
      }

      this.registeredAccount.set({
        ...registeredAccount,
        password: newPassword
      });
      this.closeSignInPasswordReset();
      this.signInForm = {
        ...this.createAuthForm(),
        identifier: isEmailIdentifier ? identifier.toLowerCase() : this.normalizePhone(identifier)
      };
      this.authError = '';
      this.authSuccess = 'Password reset completed successfully. Sign in with your new password now.';
      this.currentView = 'signin';
      this.syncCurrentRoute();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.authError =
      'This account is not saved on this device yet. Create the account here first, then use forgot password.';
    this.authSuccess = '';
  }

  submitSignIn(): void {
    const identifier = this.signInForm.identifier.trim();
    const password = this.signInForm.password.trim();
    const registeredAccount = this.registeredAccount();
    const isEmailIdentifier = this.looksLikeEmail(identifier);

    if (!identifier || !password) {
      this.authError = 'Enter your mobile number or email and password to sign in.';
      this.authSuccess = '';
      return;
    }

    if (isEmailIdentifier) {
      const email = identifier.toLowerCase();

      if (!this.isValidEmail(email)) {
        this.authError = 'Enter a valid email address.';
        this.authSuccess = '';
        return;
      }
    } else {
      const phone = this.normalizePhone(identifier);

      if (!this.isValidPhone(phone)) {
        this.authError = 'Enter a valid 10-digit mobile number or email address.';
        this.authSuccess = '';
        return;
      }
    }

    const matchesStoredAccount =
      !!registeredAccount &&
      (isEmailIdentifier
        ? registeredAccount.email === identifier.toLowerCase()
        : registeredAccount.phone === this.normalizePhone(identifier));

    if (matchesStoredAccount) {
      if (registeredAccount.password !== password) {
        this.authError = 'The password is incorrect for this account.';
        this.authSuccess = '';
        return;
      }

      this.finishCustomerSignIn(registeredAccount);
      return;
    }

    this.storeService.loginCustomerAccount(identifier, password).subscribe({
      next: (account) => {
        const signedInAccount = this.buildRegisteredAccountFromRecord(account, password);
        this.registeredAccount.set(signedInAccount);
        this.finishCustomerSignIn(signedInAccount);
      },
      error: (error: Error) => {
        const normalizedMessage = error.message.toLowerCase();

        if (!normalizedMessage.includes('no customer account')) {
          this.authError =
            error.message ||
            (isEmailIdentifier
              ? 'This email is not registered. Use the email you signed up with.'
              : 'This mobile number is not registered. Use the number you signed up with.');
          this.authSuccess = '';
          return;
        }

        this.storeService.getCustomerRecoveryProfile(identifier).subscribe({
          next: (profile) => {
            const recoveredAccount = this.buildRecoveredAccount(profile, password);
            this.registeredAccount.set(recoveredAccount);
            this.finishCustomerSignIn(
              recoveredAccount,
              'Login completed successfully. Your account was restored from a previous order on this device.'
            );
          },
          error: (recoveryError: Error) => {
            this.authError =
              recoveryError.message ||
              (isEmailIdentifier
                ? 'This email is not registered. Use the email you signed up with.'
                : 'This mobile number is not registered. Use the number you signed up with.');
            this.authSuccess = '';
          }
        });
      }
    });
  }

  submitSignUp(): void {
    const name = this.signUpForm.name.trim();
    const email = this.signUpForm.email.trim().toLowerCase();
    const phone = this.normalizePhone(this.signUpForm.phone);
    const password = this.signUpForm.password.trim();
    const passwordHint = this.signUpForm.passwordHint.trim();
    const registeredAccount = this.registeredAccount();

    if (!name || !email || !phone || !password || !passwordHint) {
      this.authError =
        'Complete your name, mobile number, email, password, and password hint to create an account.';
      this.authSuccess = '';
      return;
    }

    if (!this.signUpForm.acceptTerms) {
      this.authError = 'Please accept the terms checkbox before creating your account.';
      this.authSuccess = '';
      return;
    }

    if (!this.isValidEmail(email)) {
      this.authError = 'Enter a valid email address before signing up.';
      this.authSuccess = '';
      return;
    }

    if (!this.isValidPhone(phone)) {
      this.authError = 'Mobile number must be exactly 10 digits.';
      this.authSuccess = '';
      return;
    }

    if (password.length < 6) {
      this.authError = 'Password must be at least 6 characters long.';
      this.authSuccess = '';
      return;
    }

    if (passwordHint.length < 3) {
      this.authError = 'Password hint must be at least 3 characters long.';
      this.authSuccess = '';
      return;
    }

    if (registeredAccount?.email === email) {
      this.authError = 'This email is already registered. Please sign in instead.';
      this.authSuccess = '';
      return;
    }

    if (registeredAccount?.phone === phone) {
      this.authError = 'This mobile number is already registered. Please sign in instead.';
      this.authSuccess = '';
      return;
    }

    this.storeService
      .registerCustomerAccount({
        name,
        email,
        phone,
        password,
        passwordHint
      })
      .subscribe({
        next: (account) => {
          this.registeredAccount.set(this.buildRegisteredAccountFromRecord(account, password));
          this.accountName.set(null);
          this.signUpForm = this.createAuthForm();
          this.closeSignInPasswordReset();
          this.signInForm = {
            name: '',
            phone: '',
            email,
            identifier: email,
            password: '',
            passwordHint: '',
            acceptTerms: false
          };
          this.authError = '';
          this.authSuccess =
            'Account created successfully. Sign in with your email or 10-digit mobile number and password.';
          this.currentView = 'signin';
          this.syncCurrentRoute();
          if (this.isAdminAuthenticated()) {
            this.loadAdminUsers();
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (error: Error) => {
          this.authError = error.message;
          this.authSuccess = '';
        }
      });
  }

  submitAdminLogin(): void {
    const rawIdentifier = this.adminLoginForm.identifier.trim();
    const identifier = this.looksLikeEmail(rawIdentifier)
      ? rawIdentifier.toLowerCase()
      : this.normalizePhone(rawIdentifier);
    const password = this.adminLoginForm.password.trim();

    if (!identifier || !password) {
      this.adminError = 'Enter the admin email or mobile number and password to continue.';
      this.adminSuccess = '';
      return;
    }

    if (this.looksLikeEmail(rawIdentifier) && !this.isValidEmail(identifier)) {
      this.adminError = 'Enter a valid admin email address or 10-digit mobile number.';
      this.adminSuccess = '';
      return;
    }

    if (!this.looksLikeEmail(rawIdentifier) && !this.isValidPhone(identifier)) {
      this.adminError = 'Enter a valid 10-digit mobile number or the admin email address.';
      this.adminSuccess = '';
      return;
    }

    if (password.length < 6) {
      this.adminError = 'Password must be at least 6 characters long.';
      this.adminSuccess = '';
      return;
    }

    this.storeService.loginAdmin(identifier, password).subscribe({
      next: (session) => {
        this.applyAdminSession(session);
        this.adminLoginForm = this.createAdminLoginForm();
        this.adminError = '';
        this.adminSuccess =
          session.admin.role === 'main_admin'
            ? 'Admin login completed successfully. You can now manage products, sections, tickets, and sub-admin accounts.'
            : 'Admin login completed successfully. You can now manage the store workspace.';
        this.showToast('Admin login completed successfully.', 'success', false);
        this.loadAdminOverview();
        this.loadAdminAccounts();
        this.loadAdminUsers();
      },
      error: (error: Error) => {
        this.handleAdminError(error);
      }
    });
  }

  submitAdminSubAdmin(payload: AdminCreateSubAdminPayload): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before adding sub-admin accounts.';
      this.adminSuccess = '';
      return;
    }

    if (this.currentAdmin()?.role !== 'main_admin') {
      this.adminError = 'Only the main admin can create sub-admin accounts.';
      this.adminSuccess = '';
      return;
    }

    const normalizedPayload: AdminCreateSubAdminPayload = {
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      phone: this.normalizePhone(payload.phone),
      password: payload.password.trim()
    };

    if (
      !normalizedPayload.name ||
      !normalizedPayload.email ||
      !normalizedPayload.phone ||
      !normalizedPayload.password
    ) {
      this.adminError = 'Enter the sub-admin name, email, mobile number, and password before saving.';
      this.adminSuccess = '';
      return;
    }

    if (!this.isValidEmail(normalizedPayload.email)) {
      this.adminError = 'Enter a valid sub-admin email address.';
      this.adminSuccess = '';
      return;
    }

    if (normalizedPayload.password.length < 6) {
      this.adminError = 'Sub-admin password must be at least 6 characters long.';
      this.adminSuccess = '';
      return;
    }

    if (!this.isValidPhone(normalizedPayload.phone)) {
      this.adminError = 'Enter a valid 10-digit mobile number for the sub-admin.';
      this.adminSuccess = '';
      return;
    }

    this.adminSubAdminSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.createSubAdmin(normalizedPayload).subscribe({
      next: (adminAccount) => {
        this.adminSubAdminSubmitting = false;
        this.adminAccounts.update((accounts) => this.mergeAdminAccount(accounts, adminAccount));
        this.adminSuccess = `${adminAccount.email} was added as a sub-admin successfully.`;
        this.showToast(`${adminAccount.email} added as sub-admin.`, 'success');
        this.loadAdminAccounts();
      },
      error: (error: Error) => {
        this.adminSubAdminSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  submitAdminProduct(): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before adding products.';
      this.adminSuccess = '';
      return;
    }

    const payload = this.buildAdminProductPayload();

    if (!payload) {
      this.adminError =
        'Complete every product field, upload an image, and correct the price, rating, and stock values before saving.';
      this.adminSuccess = '';
      return;
    }

    this.adminSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';
    const editingProductId = this.adminEditingProductId;
    const request$ = editingProductId
      ? this.storeService.updateProduct(editingProductId, payload)
      : this.storeService.createProduct(payload);

    request$.subscribe({
      next: (product) => {
        this.adminSubmitting = false;
        this.adminSuccess = editingProductId
          ? `${product.name} was updated successfully.`
          : `${product.name} was added to ${product.category}.`;
        this.resetAdminProductEditor(product.category);
        this.showToast(
          editingProductId
            ? `${product.name} updated successfully.`
            : `${product.name} added successfully.`,
          'success'
        );
        this.loadStoreSections();
        this.loadProducts();
        this.loadAdminOverview();
      },
      error: (error: Error) => {
        this.adminSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  submitAdminSection(sectionName: string): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before adding store sections.';
      this.adminSuccess = '';
      return;
    }

    const normalizedSectionName = this.normalizeStoreSectionName(sectionName);

    if (normalizedSectionName.length < 2) {
      this.adminError = 'Enter a store section name with at least 2 characters.';
      this.adminSuccess = '';
      return;
    }

    this.adminSectionSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.createStoreSection(normalizedSectionName).subscribe({
      next: (section) => {
        this.adminSectionSubmitting = false;
        this.upsertStoreSection(section);
        this.adminSuccess = `${section.name} section was added successfully.`;

        if (!this.adminEditingProductId) {
          this.adminProductForm = {
            ...this.adminProductForm,
            category: section.name
          };
        }

        this.showToast(`${section.name} section added successfully.`, 'success');
      },
      error: (error: Error) => {
        this.adminSectionSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  updateAdminSection(payload: { sectionId: number; name: string }): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before editing store sections.';
      this.adminSuccess = '';
      return;
    }

    const existingSection = this.storeSections().find(
      (section) => section.id === payload.sectionId
    );

    if (!existingSection) {
      this.adminError = 'We could not find that store section anymore.';
      this.adminSuccess = '';
      return;
    }

    const normalizedSectionName = this.normalizeStoreSectionName(payload.name);

    if (normalizedSectionName.length < 2) {
      this.adminError = 'Enter a store section name with at least 2 characters.';
      this.adminSuccess = '';
      return;
    }

    this.adminSectionSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.updateStoreSection(payload.sectionId, normalizedSectionName).subscribe({
      next: (section) => {
        this.adminSectionSubmitting = false;
        this.upsertStoreSection(section);

        if (
          this.normalizeStoreSectionName(this.adminProductForm.category).toLowerCase() ===
          this.normalizeStoreSectionName(existingSection.name).toLowerCase()
        ) {
          this.adminProductForm = {
            ...this.adminProductForm,
            category: section.name
          };
        }

        this.adminSuccess = `${existingSection.name} section was updated to ${section.name}.`;
        this.showToast(`${existingSection.name} section updated successfully.`, 'success');
        this.loadStoreSections();
        this.loadProducts();
        this.loadAdminOverview();
      },
      error: (error: Error) => {
        this.adminSectionSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  deleteAdminSection(sectionId: number): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before deleting store sections.';
      this.adminSuccess = '';
      return;
    }

    if (this.currentAdmin()?.role !== 'main_admin') {
      this.adminError = 'Only the main admin can delete store sections.';
      this.adminSuccess = '';
      return;
    }

    const existingSection = this.storeSections().find((section) => section.id === sectionId);

    if (!existingSection) {
      this.adminError = 'We could not find that store section anymore.';
      this.adminSuccess = '';
      return;
    }

    this.adminSectionSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.deleteStoreSection(sectionId).subscribe({
      next: (result) => {
        this.adminSectionSubmitting = false;
        this.removeStoreSection(sectionId);
        const deletedProductCount = Number(result.deletedProductCount || 0);

        if (
          this.normalizeStoreSectionName(this.adminProductForm.category).toLowerCase() ===
          this.normalizeStoreSectionName(result.name || existingSection.name).toLowerCase()
        ) {
          this.resetAdminProductEditor();
        }

        const successMessage =
          deletedProductCount > 0
            ? `${result.name} section and ${deletedProductCount} ${
                deletedProductCount === 1 ? 'product was' : 'products were'
              } deleted successfully.`
            : `${result.name} section was deleted successfully.`;

        this.adminSuccess = successMessage;
        this.showToast(successMessage, 'success');
        this.loadStoreSections();
        this.loadProducts();
        this.loadAdminOverview();
      },
      error: (error: Error) => {
        this.adminSectionSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  deleteAdminProduct(productId: number): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before deleting products.';
      this.adminSuccess = '';
      return;
    }

    if (this.currentAdmin()?.role !== 'main_admin') {
      this.adminError = 'Only the main admin can delete products.';
      this.adminSuccess = '';
      return;
    }

    const existingProduct =
      this.products().find((product) => product.id === productId) ??
      (this.selectedAdminProduct()?.id === productId ? this.selectedAdminProduct() : null);

    this.adminSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.deleteProduct(productId).subscribe({
      next: (result) => {
        this.adminSubmitting = false;

        if (this.adminEditingProductId === productId) {
          this.resetAdminProductEditor(result.category || existingProduct?.category);
        }

        if (this.selectedAdminProduct()?.id === productId) {
          this.selectedAdminProduct.set(null);
          this.adminDetailLoading.set(false);
        }

        this.adminSuccess = `${result.name} was deleted successfully.`;
        this.showToast(`${result.name} deleted successfully.`, 'success');
        this.loadStoreSections();
        this.loadProducts();
        this.loadAdminOverview();
      },
      error: (error: Error) => {
        this.adminSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  deleteAdminSubAdmin(adminId: number): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before deleting sub-admin accounts.';
      this.adminSuccess = '';
      return;
    }

    if (this.currentAdmin()?.role !== 'main_admin') {
      this.adminError = 'Only the main admin can delete sub-admin accounts.';
      this.adminSuccess = '';
      return;
    }

    const adminAccount = this.adminAccounts().find((account) => account.id === adminId) ?? null;

    if (!adminAccount || adminAccount.role !== 'sub_admin') {
      this.adminError = 'We could not find that sub-admin account anymore.';
      this.adminSuccess = '';
      return;
    }

    this.adminSubAdminSubmitting = true;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.deleteSubAdmin(adminId).subscribe({
      next: (result) => {
        this.adminSubAdminSubmitting = false;
        this.adminAccounts.update((accounts) =>
          accounts.filter((account) => account.id !== result.adminId)
        );
        this.adminSuccess = `${result.email} was removed from sub-admin accounts.`;
        this.showToast(`${result.email} deleted successfully.`, 'success');
        this.loadAdminAccounts();
      },
      error: (error: Error) => {
        this.adminSubAdminSubmitting = false;
        this.handleAdminError(error);
      }
    });
  }

  deleteAdminCustomerUser(email: string): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before deleting store users.';
      this.adminSuccess = '';
      return;
    }

    if (this.currentAdmin()?.role !== 'main_admin') {
      this.adminError = 'Only the main admin can delete store users.';
      this.adminSuccess = '';
      return;
    }

    const normalizedEmail = String(email || '').trim().toLowerCase();
    const customerUser = this.adminUsers().find((user) => user.email === normalizedEmail) ?? null;

    if (!customerUser) {
      this.adminError = 'We could not find that store user anymore.';
      this.adminSuccess = '';
      return;
    }

    this.adminDeletingCustomerUserEmail = normalizedEmail;
    this.adminError = '';
    this.adminSuccess = '';

    this.storeService.deleteAdminCustomerUser(normalizedEmail).subscribe({
      next: (result) => {
        this.adminDeletingCustomerUserEmail = null;
        this.adminUsers.update((users) => users.filter((user) => user.email !== result.email));
        this.adminSuccess = `${result.email} was removed from store users.`;
        this.showToast(`${result.email} deleted successfully.`, 'success');
        this.loadAdminUsers();
        this.loadAdminOverview();
      },
      error: (error: Error) => {
        this.adminDeletingCustomerUserEmail = null;
        this.handleAdminError(error);
      }
    });
  }

  confirmSignOut(): void {
    if (!window.confirm('Are you sure you want to sign out?')) {
      return;
    }

    this.signOut();
  }

  signOut(): void {
    this.switchCustomerCollectionContext(() => {
      const signedInCustomerStorageId = this.getSignedInCustomerStorageId();

      if (signedInCustomerStorageId) {
        this.persistStoredCustomerCollection(
          this.customerCartStorageKey,
          signedInCustomerStorageId,
          this.cart()
        );
        this.persistStoredCustomerCollection(
          this.customerSavedItemsStorageKey,
          signedInCustomerStorageId,
          this.savedItems()
        );
      }

      this.accountName.set(null);
      this.cart.set(this.readStoredCartCollection(this.storageKey));
      this.savedItems.set(this.readStoredCartCollection(this.savedItemsStorageKey));
    });

    this.selectedDeliveryAddressId.set(null);
    this.selectedPaymentCardId.set(null);
    this.clearPersistedCheckoutDraft();
    this.checkoutForm = this.createCheckoutForm();
    this.signInForm = this.createAuthForm();
    this.accountProfileForm = this.createAccountProfileForm();
    this.accountPasswordForm = this.createAccountPasswordForm();
    this.accountPasswordHintMode = false;
    this.accountPasswordHintMismatch = false;
    this.supportForm = this.createSupportForm();
    this.customerSupportTickets.set([]);
    this.customerSupportLoading.set(false);
    this.customerOrders.set([]);
    this.customerOrdersLoading.set(false);
    this.customerLatestOrder.set(null);
    this.customerLatestOrderLoading.set(false);
    this.customerSelectedOrderId.set(null);
    this.customerRecentOrderedProducts.set([]);
    this.customerRecentOrderedProductsLoading.set(false);
    this.customerOrdersError = '';
    this.customerLatestOrderError = '';
    this.customerRecentOrderedProductsError = '';
    this.supportHistoryError = '';
    this.authError = '';
    this.authSuccess = '';
    this.authNotice = '';
    this.clearAccountFeedback();
    this.protectedViewAfterAuth = null;
    this.setView('home');
    this.showToast('Logout completed successfully.', 'success', false);
  }

  signOutAdmin(): void {
    if (this.isAdminAuthenticated()) {
      this.storeService.logoutAdmin().subscribe({
        error: () => {
          // The local admin session is cleared below even if the server session already expired.
        }
      });
    }

    this.clearAdminSessionState();
    this.showToast('Admin logout completed successfully.', 'success', false);
  }

  private createCheckoutForm(): CheckoutForm {
    return {
      customerName: '',
      email: '',
      phone: '',
      addressLine: '',
      city: '',
      state: '',
      postalCode: '',
      paymentMethod: this.paymentOptions[0],
      cardHolderName: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvv: '',
      notes: ''
    };
  }

  private readStoredCheckoutDraft(): CheckoutDraft | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const savedCheckoutDraft = localStorage.getItem(this.checkoutDraftStorageKey);

    if (!savedCheckoutDraft) {
      return null;
    }

    try {
      const parsedDraft = JSON.parse(savedCheckoutDraft) as Partial<CheckoutDraft>;
      const accountEmail = String(parsedDraft.accountEmail || '').trim().toLowerCase();
      const email = String(parsedDraft.email || '').trim().toLowerCase();
      const paymentMethod = String(parsedDraft.paymentMethod || '').trim();

      if (!this.isValidEmail(accountEmail || email)) {
        this.clearPersistedCheckoutDraft();
        return null;
      }

      return {
        accountEmail: accountEmail || email,
        customerName: String(parsedDraft.customerName || '').trim(),
        email,
        phone: this.normalizePhone(parsedDraft.phone || ''),
        addressLine: String(parsedDraft.addressLine || '').trim(),
        city: String(parsedDraft.city || '').trim(),
        state: String(parsedDraft.state || '').trim(),
        postalCode: String(parsedDraft.postalCode || '').trim(),
        paymentMethod: this.paymentOptions.includes(paymentMethod)
          ? paymentMethod
          : this.paymentOptions[0],
        cardHolderName: String(parsedDraft.cardHolderName || '').trim(),
        cardExpiry: String(parsedDraft.cardExpiry || '')
          .replace(/\s+/g, '')
          .replace(/[^0-9/]/g, '')
          .slice(0, 5),
        notes: String(parsedDraft.notes || ''),
        selectedDeliveryAddressId: this.normalizeStoredCheckoutSelectionId(
          parsedDraft.selectedDeliveryAddressId
        ),
        selectedPaymentCardId: this.normalizeStoredCheckoutSelectionId(
          parsedDraft.selectedPaymentCardId
        )
      };
    } catch {
      this.clearPersistedCheckoutDraft();
      return null;
    }
  }

  private restoreCheckoutDraft(): void {
    const checkoutDraft = this.readStoredCheckoutDraft();

    if (!checkoutDraft) {
      return;
    }

    const activeAccountEmail = this.registeredAccount()?.email?.trim().toLowerCase() || '';

    if (activeAccountEmail && checkoutDraft.accountEmail !== activeAccountEmail) {
      this.clearPersistedCheckoutDraft();
      return;
    }

    this.checkoutForm = {
      ...this.checkoutForm,
      customerName: checkoutDraft.customerName,
      email: checkoutDraft.email,
      phone: checkoutDraft.phone,
      addressLine: checkoutDraft.addressLine,
      city: checkoutDraft.city,
      state: checkoutDraft.state,
      postalCode: checkoutDraft.postalCode,
      paymentMethod: checkoutDraft.paymentMethod,
      cardHolderName: checkoutDraft.cardHolderName,
      cardExpiry: checkoutDraft.cardExpiry,
      notes: checkoutDraft.notes
    };
    this.selectedDeliveryAddressId.set(checkoutDraft.selectedDeliveryAddressId);
    this.selectedPaymentCardId.set(checkoutDraft.selectedPaymentCardId);
    this.lastPersistedCheckoutDraftSnapshot = JSON.stringify(checkoutDraft);
  }

  private buildCheckoutDraft(): CheckoutDraft | null {
    const accountEmail = (this.registeredAccount()?.email || this.checkoutForm.email)
      .trim()
      .toLowerCase();
    const paymentMethod = String(this.checkoutForm.paymentMethod || '').trim();
    const normalizedPaymentMethod = this.paymentOptions.includes(paymentMethod)
      ? paymentMethod
      : this.paymentOptions[0];

    if (!this.accountName() || !this.isValidEmail(accountEmail)) {
      return null;
    }

    const checkoutDraft: CheckoutDraft = {
      accountEmail,
      customerName: this.checkoutForm.customerName.trim(),
      email: this.checkoutForm.email.trim().toLowerCase(),
      phone: this.normalizePhone(this.checkoutForm.phone),
      addressLine: this.checkoutForm.addressLine.trim(),
      city: this.checkoutForm.city.trim(),
      state: this.checkoutForm.state.trim(),
      postalCode: this.checkoutForm.postalCode.trim(),
      paymentMethod: normalizedPaymentMethod,
      cardHolderName:
        normalizedPaymentMethod === 'Card payment' ? this.checkoutForm.cardHolderName.trim() : '',
      cardExpiry:
        normalizedPaymentMethod === 'Card payment'
          ? this.checkoutForm.cardExpiry.replace(/\s+/g, '').replace(/[^0-9/]/g, '').slice(0, 5)
          : '',
      notes: this.checkoutForm.notes,
      selectedDeliveryAddressId: this.selectedDeliveryAddressId(),
      selectedPaymentCardId:
        normalizedPaymentMethod === 'Card payment' ? this.selectedPaymentCardId() : null
    };
    const hasDraftData =
      [
        checkoutDraft.customerName,
        checkoutDraft.email,
        checkoutDraft.phone,
        checkoutDraft.addressLine,
        checkoutDraft.city,
        checkoutDraft.state,
        checkoutDraft.postalCode,
        checkoutDraft.cardHolderName,
        checkoutDraft.cardExpiry,
        checkoutDraft.notes
      ].some((value) => Boolean(String(value || '').trim())) ||
      checkoutDraft.paymentMethod !== this.paymentOptions[0] ||
      Boolean(checkoutDraft.selectedDeliveryAddressId) ||
      Boolean(checkoutDraft.selectedPaymentCardId);

    return hasDraftData ? checkoutDraft : null;
  }

  private persistCheckoutDraftIfNeeded(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const checkoutDraft = this.buildCheckoutDraft();
    const nextSnapshot = checkoutDraft ? JSON.stringify(checkoutDraft) : '';

    if (nextSnapshot === this.lastPersistedCheckoutDraftSnapshot) {
      return;
    }

    if (!nextSnapshot) {
      localStorage.removeItem(this.checkoutDraftStorageKey);
      this.lastPersistedCheckoutDraftSnapshot = '';
      return;
    }

    localStorage.setItem(this.checkoutDraftStorageKey, nextSnapshot);
    this.lastPersistedCheckoutDraftSnapshot = nextSnapshot;
  }

  private clearPersistedCheckoutDraft(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.checkoutDraftStorageKey);
    }

    this.lastPersistedCheckoutDraftSnapshot = '';
  }

  private normalizeStoredCheckoutSelectionId(value: unknown): string | null {
    const normalizedValue = String(value || '').trim();
    return normalizedValue || null;
  }

  private createSupportForm(): SupportForm {
    return {
      customerName: '',
      email: '',
      orderReference: '',
      issueType: this.supportIssueOptions[0],
      subject: '',
      message: ''
    };
  }

  private createAuthForm(): AuthForm {
    return {
      name: '',
      phone: '',
      email: '',
      identifier: '',
      password: '',
      passwordHint: '',
      acceptTerms: false
    };
  }

  private createAuthPasswordResetForm(): AuthPasswordResetPayload {
    return {
      identifier: '',
      passwordHint: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  private createAccountProfileForm(): AccountProfileForm {
    return {
      name: '',
      phone: '',
      email: '',
      currentPassword: ''
    };
  }

  private createAccountPasswordForm(): AccountPasswordForm {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      passwordHint: ''
    };
  }

  private confirmDeleteAction(message: string): boolean {
    if (typeof window === 'undefined') {
      return true;
    }

    return window.confirm(message);
  }

  private clearAccountErrors(): void {
    this.accountProfileError = '';
    this.accountPasswordError = '';
  }

  private clearAccountFeedback(): void {
    this.clearAccountErrors();
    this.accountSuccess = '';
  }

  private setAccountProfileError(message: string): void {
    this.accountProfileError = message;
    this.accountPasswordError = '';
    this.accountSuccess = '';
    this.showToast(message, 'error');
  }

  private setAccountPasswordError(message: string): void {
    this.accountPasswordError = message;
    this.accountProfileError = '';
    this.accountSuccess = '';
    this.showToast(message, 'error');
  }

  private setAccountSuccessMessage(message: string): void {
    this.clearAccountErrors();
    this.accountSuccess = message;
    this.showToast(message, 'success');
  }

  private setCheckoutError(message: string): void {
    this.checkoutError.set(message);

    if (message) {
      this.showToast(message, 'error');
    }
  }

  private clearCheckoutError(): void {
    this.checkoutError.set('');
  }

  private buildRegisteredAccountFromRecord(
    account: CustomerAccountRecord,
    password: string
  ): RegisteredAccount {
    return {
      name: account.name.trim(),
      email: account.email.trim().toLowerCase(),
      phone: this.normalizePhone(account.phone),
      password,
      passwordHint: account.passwordHint.trim()
    };
  }

  private buildRecoveredAccount(
    profile: AccountRecoveryProfile,
    password: string
  ): RegisteredAccount {
    return {
      name: profile.name.trim(),
      email: profile.email.trim().toLowerCase(),
      phone: this.normalizePhone(profile.phone),
      password,
      passwordHint: profile.name.trim()
    };
  }

  private finishCustomerSignIn(
    account: RegisteredAccount,
    successMessage = 'Login completed successfully.'
  ): void {
    this.switchCustomerCollectionContext(() => {
      const mergedCart = this.mergeCartCollections(
        this.getStoredCustomerCart(account.email),
        this.cart()
      );
      const mergedSavedItems = this.mergeSavedItemCollections(
        this.getStoredCustomerSavedItems(account.email),
        this.savedItems(),
        mergedCart
      );

      this.accountName.set(account.name);
      this.cart.set(mergedCart);
      this.savedItems.set(mergedSavedItems);
      this.clearGuestCustomerCollections();
    });

    this.populateCheckoutIdentity();
    this.loadCustomerSavedPaymentCards(account.email);
    this.populateSupportIdentity();
    this.populateAccountForms();
    this.closeSignInPasswordReset();
    this.signInForm = this.createAuthForm();
    this.authError = '';
    this._authSuccess = successMessage;
    this.authNotice = '';
    this.showToast(successMessage, 'success', false);

    if (this.protectedViewAfterAuth === 'checkout') {
      this.protectedViewAfterAuth = null;
      this.checkoutStage = 'details';
      this.openCheckoutView();
      return;
    }

    if (this.protectedViewAfterAuth) {
      const protectedView = this.protectedViewAfterAuth;
      this.protectedViewAfterAuth = null;
      this.setView(protectedView);
      return;
    }

    this.setView('home');
  }

  private createAdminLoginForm(): AdminLoginForm {
    return {
      identifier: '',
      password: ''
    };
  }

  private createAdminProductForm(category = this.defaultAdminSection): AdminProductForm {
    return {
      name: '',
      category,
      description: '',
      imageUrl: '',
      imageName: '',
      price: '',
      rating: '',
      stock: '',
      badge: 'New Arrival',
      featured: false
    };
  }

  private applyAdminSession(session: AdminSession): void {
    this.storeService.setAdminSession(session.token);
    this.adminSessionToken.set(session.token);
    this.currentAdmin.set(this.normalizeAdminUser(session.admin));
    this.isAdminAuthenticated.set(true);
  }

  private clearAdminSessionState(stayOnAdminView = true): void {
    this.storeService.setAdminSession(null);
    this.isAdminAuthenticated.set(false);
    this.adminSessionToken.set(null);
    this.currentAdmin.set(null);
    this.adminAccounts.set([]);
    this.adminAccountsLoading.set(false);
    this.adminUsers.set([]);
    this.adminUsersLoading.set(false);
    this.adminOverview.set(null);
    this.adminOverviewLoading.set(false);
    this.adminSubAdminSubmitting = false;
    this.adminDeletingCustomerUserEmail = null;
    this.adminLoginForm = this.createAdminLoginForm();
    this.resetAdminProductEditor();
    this.adminError = '';
    this.adminSuccess = '';
    this.adminSupportUpdatingTicketId = null;
    this.clearAdminDetails();

    if (stayOnAdminView) {
      this.currentView = 'admin';
      this.syncCurrentRoute();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  private normalizeAdminUser(admin: Partial<AdminUser>): AdminUser {
    return {
      id: Number(admin.id || 0),
      name: String(admin.name || '').trim(),
      email: String(admin.email || '').trim().toLowerCase(),
      phone: this.normalizePhone(String(admin.phone || '')),
      role: admin.role === 'main_admin' ? 'main_admin' : 'sub_admin',
      createdByAdminId:
        admin.createdByAdminId === null || admin.createdByAdminId === undefined
          ? null
          : Number(admin.createdByAdminId),
      createdByEmail: admin.createdByEmail
        ? String(admin.createdByEmail).trim().toLowerCase()
        : null,
      createdAt: String(admin.createdAt || ''),
      updatedAt: String(admin.updatedAt || '')
    };
  }

  submitSupport(): void {
    if (!this.accountName() || !this.registeredAccount()?.email) {
      this.supportError = '';
      this.supportSuccess = '';
      this.openSupportSignIn();
      return;
    }

    if (this.customerOrdersLoading()) {
      this.supportError = 'Please wait while we load your order references.';
      this.supportSuccess = '';
      return;
    }

    if (this.customerOrdersError) {
      this.supportError = this.customerOrdersError;
      this.supportSuccess = '';
      return;
    }

    if (!this.customerOrders().length) {
      this.supportError =
        'No orders were found for this account. Support requests require a valid order reference from your Orders page.';
      this.supportSuccess = '';
      return;
    }

    const payload = this.buildSupportPayload();

    if (!payload) {
      this.supportError =
        'Enter a valid order reference from your Orders page, choose an issue type, add a subject, and include at least 15 characters before sending.';
      this.supportSuccess = '';
      return;
    }

    this.supportSubmitting.set(true);
    this.supportError = '';
    this.supportSuccess = '';

    this.storeService.submitSupport(payload).subscribe({
      next: (ticket) => {
        this.supportSubmitting.set(false);
        this.supportSuccess = `Support ticket #${ticket.ticketId} was submitted successfully. You can track replies in Your support updates below.`;
        this.supportForm = this.createSupportForm();
        this.populateSupportIdentity();
        this.loadCustomerSupportTickets();
        this.showToast(`Support ticket #${ticket.ticketId} submitted successfully.`, 'success');
        if (this.isAdminAuthenticated()) {
          this.loadAdminOverview();
          this.loadAdminUsers();
        }
      },
      error: (error: Error) => {
        this.supportSubmitting.set(false);
        this.supportError = error.message;
      }
    });
  }

  updateAdminSupportTicket(payload: {
    ticketId: number;
    status: AdminSupportTicketStatus;
    adminResponse: string;
    action: SupportTicketUpdateAction;
  }): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before updating support tickets.';
      return;
    }

    this.adminSupportUpdatingTicketId = payload.ticketId;
    this.adminError = '';

    const requestPayload: AdminSupportTicketUpdatePayload = {
      status: payload.status,
      adminResponse: payload.adminResponse
    };

    this.storeService.updateAdminSupportTicket(payload.ticketId, requestPayload).subscribe({
      next: (result) => {
        this.adminSupportUpdatingTicketId = null;
        this.adminOverview.update((overview) => {
          if (!overview) {
            return overview;
          }

          return {
            ...overview,
            openTicketCount: result.openTicketCount,
            recentTickets: this.mergeUpdatedSupportTicket(overview.recentTickets, result.ticket)
          };
        });

        const signedInAccount = this.registeredAccount();

        if (signedInAccount?.email === result.ticket.email) {
          this.customerSupportTickets.update((tickets) =>
            this.mergeCustomerSupportTicket(tickets, this.toCustomerSupportTicket(result.ticket))
          );
        }

        this.showToast(this.getSupportTicketToastMessage(result.ticket, payload.action), 'success');
      },
      error: (error: Error) => {
        this.adminSupportUpdatingTicketId = null;
        this.handleAdminError(error);
      }
    });
  }

  handleAdminImageSelection(file: File | null): void {
    if (!file) {
      this.adminProductForm = {
        ...this.adminProductForm,
        imageUrl: '',
        imageName: ''
      };
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.adminError = 'Choose a valid image file from your device gallery.';
      this.adminSuccess = '';
      this.adminProductForm = {
        ...this.adminProductForm,
        imageUrl: '',
        imageName: ''
      };
      return;
    }

    if (file.size > this.maxAdminImageSize) {
      this.adminError = 'Choose an image smaller than 2 MB so it can be saved safely.';
      this.adminSuccess = '';
      this.adminProductForm = {
        ...this.adminProductForm,
        imageUrl: '',
        imageName: ''
      };
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        this.adminError = 'We could not read that image. Please choose another file.';
        this.adminSuccess = '';
        return;
      }

      this.adminProductForm = {
        ...this.adminProductForm,
        imageUrl: reader.result,
        imageName: file.name
      };
      this.adminError = '';
    };

    reader.onerror = () => {
      this.adminError = 'We could not read that image. Please choose another file.';
      this.adminSuccess = '';
    };

    reader.readAsDataURL(file);
  }

  startAdminProductEdit(productId: number): void {
    if (!this.isAdminAuthenticated()) {
      this.adminError = 'Sign in as admin before editing products.';
      return;
    }

    const existingProduct = this.products().find((product) => product.id === productId);

    if (existingProduct) {
      this.applyAdminProductForm(existingProduct);
      return;
    }

    this.storeService.getProductById(productId).subscribe({
      next: (product) => {
        this.applyAdminProductForm(product);
      },
      error: (error: Error) => {
        this.handleAdminError(error);
      }
    });
  }

  resetAdminProductEditor(category = this.adminProductForm.category || this.defaultAdminSection): void {
    this.adminEditingProductId = null;
    this.adminProductForm = this.createAdminProductForm(category);
  }

  openAdminOrderDetail(orderId: number): void {
    this.selectedAdminProduct.set(null);
    this.selectedAdminOrderDetail.set(null);
    this.adminDetailLoading.set(true);

    this.storeService.getAdminOrderDetail(orderId).subscribe({
      next: (order) => {
        this.selectedAdminOrderDetail.set(order);
        this.adminDetailLoading.set(false);
      },
      error: (error: Error) => {
        this.handleAdminError(error);
        this.adminDetailLoading.set(false);
      }
    });
  }

  openAdminProductDetail(productId: number): void {
    this.selectedAdminOrderDetail.set(null);
    this.selectedAdminProduct.set(null);
    this.adminDetailLoading.set(true);

    const existingProduct = this.products().find((product) => product.id === productId);

    if (existingProduct) {
      this.selectedAdminProduct.set(existingProduct);
      this.adminDetailLoading.set(false);
      return;
    }

    this.storeService.getProductById(productId).subscribe({
      next: (product) => {
        this.selectedAdminProduct.set(product);
        this.adminDetailLoading.set(false);
      },
      error: (error: Error) => {
        this.handleAdminError(error);
        this.adminDetailLoading.set(false);
      }
    });
  }

  clearAdminDetails(): void {
    this.selectedAdminOrderDetail.set(null);
    this.selectedAdminProduct.set(null);
    this.adminDetailLoading.set(false);
  }

  dismissToast(): void {
    this.toastMessage.set('');

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
      this.toastTimeoutId = null;
    }
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private looksLikeEmail(value: string): boolean {
    return value.includes('@');
  }

  private normalizeOrderReference(value: string): string {
    const normalizedValue = String(value || '').trim().toUpperCase().replace(/\s+/g, '');

    if (!normalizedValue) {
      return '';
    }

    if (/^#?\d+$/.test(normalizedValue)) {
      return this.formatOrderReference(Number(normalizedValue.replace('#', '')));
    }

    const prefixedMatch = normalizedValue.match(/^(?:LC|ORD|ORDER)[-#]?0*(\d+)$/);

    if (prefixedMatch) {
      return this.formatOrderReference(Number(prefixedMatch[1]));
    }

    return normalizedValue;
  }

  private formatOrderReference(orderId: number): string {
    const normalizedOrderId = Number(orderId);

    if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
      return '';
    }

    return `LC-${String(normalizedOrderId).padStart(6, '0')}`;
  }

  private normalizePhone(value: string): string {
    return value.replace(/\D/g, '');
  }

  private isValidPhone(phone: string): boolean {
    return /^\d{10}$/.test(phone);
  }

  private isValidOrderReference(orderReference: string): boolean {
    return /^LC-\d{6}$/.test(orderReference);
  }

  private addOrIncreaseCartItem(
    items: CartItem[],
    product: Product | CartItem,
    requestedQuantity: number,
    availableStock: number
  ): CartUpdateResult {
    const existingItem = items.find((item) => item.id === product.id);
    const currentQuantity = existingItem?.quantity ?? 0;
    const cartQuantity = Math.min(currentQuantity + requestedQuantity, availableStock);
    const addedQuantity = Math.max(0, cartQuantity - currentQuantity);

    if (addedQuantity === 0) {
      return {
        items,
        addedQuantity,
        cartQuantity: currentQuantity,
        availableStock
      };
    }

    if (existingItem) {
      return {
        items: items.map((item) =>
          item.id === product.id
            ? { ...item, ...product, stock: availableStock, quantity: cartQuantity }
            : item
        ),
        addedQuantity,
        cartQuantity,
        availableStock
      };
    }

    return {
      items: [...items, { ...product, stock: availableStock, quantity: cartQuantity }],
      addedQuantity,
      cartQuantity,
      availableStock
    };
  }

  private getAvailableStock(product: Pick<Product, 'id' | 'name' | 'stock'>): number {
    const currentProduct = this.products().find((entry) => entry.id === product.id);
    return Math.max(0, currentProduct?.stock ?? product.stock);
  }

  private getStockLimitMessage(productName: string, availableStock: number): string {
    if (availableStock <= 0) {
      return `${productName} is currently out of stock.`;
    }

    return `Only ${availableStock} ${availableStock === 1 ? 'item is' : 'items are'} available for ${productName}.`;
  }

  private getCartQuantityMessage(
    productName: string,
    cartQuantity: number,
    availableStock: number
  ): string {
    return `${productName}: ${cartQuantity} of ${availableStock} ${availableStock === 1 ? 'item' : 'items'} in cart.`;
  }

  private syncCartItemsWithCatalog(items: CartItem[], products: Product[]): CartItem[] {
    return items.flatMap((item) => {
      const currentProduct = products.find((product) => product.id === item.id);

      if (!currentProduct) {
        return [item];
      }

      if (currentProduct.stock <= 0) {
        return [];
      }

      return [
        {
          ...item,
          ...currentProduct,
          quantity: Math.min(item.quantity, currentProduct.stock)
        }
      ];
    });
  }

  private loadCustomerSupportTickets(): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount?.email) {
      this.customerSupportTickets.set([]);
      this.customerSupportLoading.set(false);
      return;
    }

    this.customerSupportLoading.set(true);
    this.supportHistoryError = '';

    this.storeService.getCustomerSupportTickets(registeredAccount.email).subscribe({
      next: (tickets) => {
        this.customerSupportTickets.set(tickets);
        this.customerSupportLoading.set(false);
      },
      error: (error: Error) => {
        this.customerSupportTickets.set([]);
        this.customerSupportLoading.set(false);
        this.supportHistoryError = error.message;
      }
    });
  }

  private loadCustomerLatestOrder(): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount?.email) {
      this.customerLatestOrder.set(null);
      this.customerLatestOrderLoading.set(false);
      this.customerSelectedOrderId.set(null);
      this.customerLatestOrderError = '';
      return;
    }

    this.customerLatestOrderLoading.set(true);
    this.customerLatestOrderError = '';

    this.storeService.getCustomerLatestOrder(registeredAccount.email).subscribe({
      next: (order) => {
        this.customerLatestOrder.set(order);
        this.customerLatestOrderLoading.set(false);
        this.customerSelectedOrderId.set(order?.orderId ?? null);
      },
      error: (error: Error) => {
        this.customerLatestOrder.set(null);
        this.customerLatestOrderLoading.set(false);
        this.customerSelectedOrderId.set(null);
        this.customerLatestOrderError = error.message;
      }
    });
  }

  private loadCustomerOrders(): void {
    const registeredAccount = this.registeredAccount();

    if (!registeredAccount?.email) {
      this.customerOrders.set([]);
      this.customerOrdersLoading.set(false);
      this.customerOrdersError = '';
      return;
    }

    this.customerOrdersLoading.set(true);
    this.customerOrdersError = '';

    this.storeService.getCustomerOrders(registeredAccount.email).subscribe({
      next: (orders) => {
        this.customerOrders.set(orders);
        this.customerOrdersLoading.set(false);
      },
      error: (error: Error) => {
        this.customerOrders.set([]);
        this.customerOrdersLoading.set(false);
        this.customerOrdersError = error.message;
      }
    });
  }

  private loadCustomerOrderDetail(orderId: number, syncRoute = true): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount?.email) {
      this.clearCustomerOrderDetail();
      return;
    }

    this.customerSelectedOrderId.set(orderId);
    this.customerLatestOrder.set(null);
    this.customerLatestOrderLoading.set(true);
    this.customerLatestOrderError = '';
    if (syncRoute) {
      this.syncCurrentRoute();
    }

    this.storeService.getCustomerOrderDetail(orderId, registeredAccount.email).subscribe({
      next: (order) => {
        this.customerLatestOrder.set(order);
        this.customerLatestOrderLoading.set(false);
      },
      error: (error: Error) => {
        this.customerLatestOrderLoading.set(false);
        this.customerLatestOrderError = error.message;
      }
    });
  }

  private clearCustomerOrderDetail(syncRoute = true): void {
    this.customerLatestOrder.set(null);
    this.customerLatestOrderLoading.set(false);
    this.customerSelectedOrderId.set(null);
    this.customerLatestOrderError = '';
    if (syncRoute) {
      this.syncCurrentRoute();
    }
  }

  private loadCustomerRecentOrderedProducts(): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount?.email) {
      this.customerRecentOrderedProducts.set([]);
      this.customerRecentOrderedProductsLoading.set(false);
      this.customerRecentOrderedProductsError = '';
      return;
    }

    this.customerRecentOrderedProductsLoading.set(true);
    this.customerRecentOrderedProductsError = '';

    this.storeService.getCustomerRecentOrderedProducts(registeredAccount.email).subscribe({
      next: (products) => {
        this.customerRecentOrderedProducts.set(products);
        this.customerRecentOrderedProductsLoading.set(false);
      },
      error: (error: Error) => {
        this.customerRecentOrderedProducts.set([]);
        this.customerRecentOrderedProductsLoading.set(false);
        this.customerRecentOrderedProductsError = error.message;
      }
    });
  }

  private mergeUpdatedSupportTicket(
    tickets: AdminSupportTicket[],
    updatedTicket: AdminSupportTicket
  ): AdminSupportTicket[] {
    const existingIndex = tickets.findIndex((ticket) => ticket.id === updatedTicket.id);

    if (existingIndex === -1) {
      return [updatedTicket, ...tickets].slice(0, 6);
    }

    return tickets.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket));
  }

  private mergeAdminAccount(accounts: AdminUser[], updatedAccount: AdminUser): AdminUser[] {
    const remainingAccounts = accounts.filter((account) => account.id !== updatedAccount.id);
    const nextAccounts = [...remainingAccounts, this.normalizeAdminUser(updatedAccount)];

    return nextAccounts.sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'main_admin' ? -1 : 1;
      }

      return left.email.localeCompare(right.email);
    });
  }

  private mergeCustomerSupportTicket(
    tickets: CustomerSupportTicket[],
    updatedTicket: CustomerSupportTicket
  ): CustomerSupportTicket[] {
    const existingIndex = tickets.findIndex((ticket) => ticket.id === updatedTicket.id);

    if (existingIndex === -1) {
      return [updatedTicket, ...tickets].slice(0, 10);
    }

    return tickets.map((ticket) => (ticket.id === updatedTicket.id ? updatedTicket : ticket));
  }

  private toCustomerSupportTicket(ticket: AdminSupportTicket): CustomerSupportTicket {
    return {
      ...ticket
    };
  }

  private handleAdminError(error: Error): void {
    const message = error.message || 'We could not complete that admin request right now.';

    if (message.toLowerCase().includes('sign in again')) {
      this.clearAdminSessionState(this.currentView === 'admin');
      this.adminError = message;
      this.adminSuccess = '';
      return;
    }

    this.adminError = message;
    this.adminSuccess = '';
  }

  private rotateProducts<T>(items: T[], offset: number): T[] {
    if (items.length < 2) {
      return items;
    }

    const normalizedOffset = ((offset % items.length) + items.length) % items.length;

    if (!normalizedOffset) {
      return [...items];
    }

    return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)];
  }

  private shuffleProducts<T>(items: T[], seed: number): T[] {
    if (items.length < 2) {
      return [...items];
    }

    return [...items]
      .map((item, index) => ({
        item,
        weight: this.seededWeight(seed, index)
      }))
      .sort((left, right) => left.weight - right.weight)
      .map((entry) => entry.item);
  }

  private seededWeight(seed: number, index: number): number {
    const raw = Math.sin((seed + 1) * (index + 1) * 0.0001 + index * 12.9898) * 10000;
    return raw - Math.floor(raw);
  }

  private updateBackToTopVisibility(): void {
    this.showBackToTop.set(window.scrollY > 320);
  }

  private getSupportTicketToastMessage(
    ticket: AdminSupportTicket,
    action: SupportTicketUpdateAction
  ): string {
    const messages: Record<SupportTicketUpdateAction, string> = {
      save_reply: `Reply saved for support ticket #${ticket.id}.`,
      mark_in_progress: `Support ticket #${ticket.id} marked as In progress.`,
      resolve_ticket: `Support ticket #${ticket.id} marked as Resolved.`,
      close_ticket: `Support ticket #${ticket.id} was closed.`,
      reopen_ticket: `Support ticket #${ticket.id} was reopened.`
    };

    return messages[action];
  }

  private openCatalog(
    category: string = 'All',
    resetSearch = true,
    activateCategoryNav = true
  ): void {
    this.isCatalogNavigationActive = activateCategoryNav;
    this.isWishlistSectionVisible.set(false);
    this.selectedCategory = category;
    this.resetProductSectionCounts();

    if (resetSearch) {
      this.searchTerm = '';
    }

    this.currentView = 'home';
    this.selectedProduct.set(null);
    this.pendingProductRouteId = null;
    this.syncCurrentRoute();
    this.scrollHomeSectionIntoView('catalog');
  }

  private openCheckoutView(): void {
    this.clearCheckoutError();
    this.populateCheckoutIdentity();
    this.syncCurrentCustomerSavedPaymentCards();
    this.currentView = 'checkout';
    this.syncCurrentRoute();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private syncCurrentCustomerSavedPaymentCards(): void {
    const accountEmail = this.registeredAccount()?.email?.trim().toLowerCase() || '';

    if (!this.accountName() || !this.isValidEmail(accountEmail)) {
      this.selectedPaymentCardId.set(null);
      return;
    }

    this.loadCustomerSavedPaymentCards(accountEmail);
  }

  private loadCustomerSavedPaymentCards(email: string): void {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!this.accountName() || !this.isValidEmail(normalizedEmail)) {
      return;
    }

    const requestId = ++this.customerSavedPaymentCardsRequestId;

    this.storeService.getCustomerSavedPaymentCards(normalizedEmail).subscribe({
      next: (cards) => {
        const activeEmail = this.registeredAccount()?.email?.trim().toLowerCase() || '';

        if (
          requestId !== this.customerSavedPaymentCardsRequestId ||
          activeEmail !== normalizedEmail
        ) {
          return;
        }

        this.mergeSavedPaymentCardsFromBackend(normalizedEmail, cards);
      },
      error: () => {
        // Keep the local saved cards if the backend sync is unavailable.
      }
    });
  }

  private mergeSavedPaymentCardsFromBackend(
    accountEmail: string,
    backendCards: SavedPaymentCard[]
  ): void {
    const syncedCards = [...backendCards].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
    const currentSelectedCardId = this.selectedPaymentCardId();

    this.savedPaymentCards.update((cards) => {
      const otherAccounts = cards.filter((card) => card.accountEmail !== accountEmail);
      return [...otherAccounts, ...syncedCards];
    });

    if (currentSelectedCardId && !syncedCards.some((card) => card.id === currentSelectedCardId)) {
      const nextSelectedCard = syncedCards[0] ?? null;

      this.selectedPaymentCardId.set(nextSelectedCard?.id ?? null);

      if (nextSelectedCard) {
        this.patchCheckoutFormWithSavedPaymentCard(nextSelectedCard);
      } else {
        this.checkoutForm = {
          ...this.checkoutForm,
          cardHolderName: '',
          cardNumber: '',
          cardExpiry: '',
          cardCvv: ''
        };
      }

      return;
    }

    this.populateCheckoutIdentity();
  }

  private parseBackendSavedPaymentCardId(cardId: string): number | null {
    const backendCardMatch = String(cardId || '').trim().match(/^db-card-(\d+)$/);

    if (!backendCardMatch) {
      return null;
    }

    const parsedId = Number(backendCardMatch[1]);
    return Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null;
  }

  private finalizeSavedPaymentCardRemoval(cardId: string, accountEmail: string): void {
    let remainingCardsForAccount: SavedPaymentCard[] = [];

    this.savedPaymentCards.update((cards) => {
      const filteredCards = cards.filter((entry) => entry.id !== cardId);
      remainingCardsForAccount = filteredCards.filter((entry) => entry.accountEmail === accountEmail);
      return filteredCards;
    });

    if (this.selectedPaymentCardId() === cardId) {
      const nextSelectedCard = remainingCardsForAccount[0] ?? null;

      this.selectedPaymentCardId.set(nextSelectedCard?.id ?? null);

      if (nextSelectedCard) {
        this.patchCheckoutFormWithSavedPaymentCard(nextSelectedCard);
      } else {
        this.checkoutForm = {
          ...this.checkoutForm,
          cardHolderName: '',
          cardNumber: '',
          cardExpiry: '',
          cardCvv: ''
        };
      }
    }
  }

  private ensureSignedInForCheckout(): boolean {
    if (!this.checkoutItems.length || this.accountName()) {
      return true;
    }

    this.protectedViewAfterAuth = 'checkout';
    this.openAuthView('signin', 'Sign in or create an account to continue to checkout.', true);
    return false;
  }

  private openAuthView(
    view: Extract<ViewMode, 'signin' | 'signup'>,
    notice = '',
    preserveProtectedView = false,
    syncRoute = true,
    scrollBehavior: ScrollBehavior = 'smooth'
  ): void {
    if (!preserveProtectedView) {
      this.protectedViewAfterAuth = null;
      this.authNotice = '';
    } else {
      this.authNotice = notice;
    }

    this.closeSignInPasswordReset();
    this.authError = '';
    this.authSuccess = '';
    this.currentView = view;
    if (syncRoute) {
      this.syncCurrentRoute();
    }
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  }

  private applyRouteFromLocation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const path = this.getCurrentRoutePath();
    this.persistRoute(path);
    this.isApplyingRoute = true;

    try {
      if (path.startsWith('/admin')) {
        if (this.currentView === 'admin') {
          window.scrollTo({ top: 0, behavior: 'auto' });
          this.updateBackToTopVisibility();
        } else {
          this.openAdmin({ syncRoute: false, scrollBehavior: 'auto' });
        }
        return;
      }

      const customerOrderMatch = path.match(/^\/orders\/(\d+)$/);

      if (customerOrderMatch) {
        this.setView('orders', { syncRoute: false, scrollBehavior: 'auto' });

        if (this.accountName()) {
          this.loadCustomerOrderDetail(Number.parseInt(customerOrderMatch[1], 10), false);
        }

        return;
      }

      const productMatch = path.match(/^\/product\/(\d+)$/);

      if (productMatch) {
        this.clearAdminDetails();
        this.currentView = 'product';
        this.pendingProductRouteId = Number.parseInt(productMatch[1], 10);
        this.selectedProduct.set(null);
        this.resolvePendingProductRoute();
        window.scrollTo({ top: 0, behavior: 'auto' });
        this.updateBackToTopVisibility();
        return;
      }

      switch (path) {
        case '/discover':
          this.setView('discover', { syncRoute: false, scrollBehavior: 'auto' });
          return;
        case '/support':
          this.setView('support', { syncRoute: false, scrollBehavior: 'auto' });
          return;
        case '/account':
          this.setView('account', { syncRoute: false, scrollBehavior: 'auto' });
          return;
        case '/orders':
          this.setView('orders', { syncRoute: false, scrollBehavior: 'auto' });
          return;
        case '/checkout':
          this.checkoutStage = 'cart';
          this.openCheckoutView();
          return;
        case '/checkout/details':
          this.checkoutStage = 'details';
          this.openCheckoutView();
          return;
        case '/confirmation':
          this.currentView = 'confirmation';
          window.scrollTo({ top: 0, behavior: 'auto' });
          this.updateBackToTopVisibility();
          return;
        case '/signin':
          this.openAuthView('signin', '', false, false, 'auto');
          return;
        case '/signup':
          this.openAuthView('signup', '', false, false, 'auto');
          return;
        default:
          this.setView('home', { syncRoute: false, scrollBehavior: 'auto' });
      }
    } finally {
      this.isApplyingRoute = false;
    }
  }

  private resolvePendingProductRoute(): void {
    if (this.currentView !== 'product' || this.pendingProductRouteId === null) {
      return;
    }

    const routeProduct = this.products().find((product) => product.id === this.pendingProductRouteId) ?? null;

    if (!routeProduct) {
      return;
    }

    this.selectedProduct.set(routeProduct);
    this.pendingProductRouteId = null;
  }

  private syncCurrentRoute(replace = false): void {
    if (this.isApplyingRoute || typeof window === 'undefined') {
      return;
    }

    const nextPath = this.buildCurrentRoutePath();
    const currentPath = this.normalizePath(window.location.pathname);
    this.persistRoute(nextPath);

    if (currentPath === nextPath) {
      return;
    }

    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath);
  }

  private buildCurrentRoutePath(): string {
    if (this.currentView === 'admin') {
      const currentPath = typeof window !== 'undefined' ? this.normalizePath(window.location.pathname) : '/admin';
      return currentPath.startsWith('/admin') ? currentPath : this.getPersistedAdminRoute() ?? '/admin';
    }

    if (this.currentView === 'product') {
      const productId = this.selectedProduct()?.id ?? this.pendingProductRouteId;
      return productId ? `/product/${productId}` : '/';
    }

    if (this.currentView === 'orders') {
      return this.customerSelectedOrderId() ? `/orders/${this.customerSelectedOrderId()}` : '/orders';
    }

    if (this.currentView === 'checkout') {
      return this.checkoutStage === 'details' ? '/checkout/details' : '/checkout';
    }

    switch (this.currentView) {
      case 'discover':
        return '/discover';
      case 'support':
        return '/support';
      case 'account':
        return '/account';
      case 'confirmation':
        return '/confirmation';
      case 'signin':
        return '/signin';
      case 'signup':
        return '/signup';
      case 'home':
      default:
        return '/';
    }
  }

  private normalizePath(pathname: string): string {
    const normalized = pathname.replace(/\/+$/, '');
    return normalized || '/';
  }

  private getInitialViewFromLocation(): ViewMode {
    const path = this.getCurrentRoutePath();

    if (path.startsWith('/admin')) {
      return 'admin';
    }

    if (path.startsWith('/product/')) {
      return 'product';
    }

    if (path.startsWith('/orders')) {
      return 'orders';
    }

    if (path.startsWith('/checkout')) {
      return 'checkout';
    }

    switch (path) {
      case '/discover':
        return 'discover';
      case '/support':
        return 'support';
      case '/account':
        return 'account';
      case '/confirmation':
        return 'confirmation';
      case '/signin':
        return 'signin';
      case '/signup':
        return 'signup';
      case '/':
      default:
        return 'home';
    }
  }

  private getCurrentRoutePath(): string {
    if (typeof window === 'undefined') {
      return '/';
    }

    return this.normalizePath(window.location.pathname);
  }

  private getPersistedAdminRoute(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const persistedRoute = this.normalizePath(localStorage.getItem(this.routeStorageKey) || '/');
    return persistedRoute.startsWith('/admin') ? persistedRoute : null;
  }

  private restorePersistedAdminRoute(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }

    const currentPath = this.getCurrentRoutePath();

    if (currentPath !== '/' || !this.isAdminAuthenticated()) {
      return;
    }

    const persistedRoute = this.getPersistedAdminRoute();

    if (!persistedRoute) {
      return;
    }

    window.history.replaceState({}, '', persistedRoute);
    this.currentView = 'admin';
  }

  private persistRoute(path: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(this.routeStorageKey, this.normalizePath(path));
  }

  private switchCustomerCollectionContext(updateCollections: () => void): void {
    this.customerCollectionSyncPaused.set(true);

    try {
      updateCollections();
    } finally {
      this.customerCollectionSyncPaused.set(false);
    }
  }

  private restoreCustomerCollectionsForCurrentSession(): void {
    const signedInCustomerStorageId = this.getSignedInCustomerStorageId();

    if (!signedInCustomerStorageId) {
      this.cart.set(this.readStoredCartCollection(this.storageKey));
      this.savedItems.set(this.readStoredCartCollection(this.savedItemsStorageKey));
      return;
    }

    const guestCart = this.readStoredCartCollection(this.storageKey);
    const guestSavedItems = this.readStoredCartCollection(this.savedItemsStorageKey);
    const mergedCart = this.mergeCartCollections(
      this.getStoredCustomerCart(signedInCustomerStorageId),
      guestCart
    );
    const mergedSavedItems = this.mergeSavedItemCollections(
      this.getStoredCustomerSavedItems(signedInCustomerStorageId),
      guestSavedItems,
      mergedCart
    );

    this.cart.set(mergedCart);
    this.savedItems.set(mergedSavedItems);

    if (guestCart.length || guestSavedItems.length) {
      this.clearGuestCustomerCollections();
    }
  }

  private getSignedInCustomerStorageId(): string | null {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount?.email) {
      return null;
    }

    return registeredAccount.email.trim().toLowerCase();
  }

  private persistCartCollection(
    signedInCustomerStorageId: string | null,
    items: CartItem[]
  ): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (signedInCustomerStorageId) {
      this.persistStoredCustomerCollection(
        this.customerCartStorageKey,
        signedInCustomerStorageId,
        items
      );
      return;
    }

    localStorage.setItem(this.storageKey, JSON.stringify(items));
  }

  private persistSavedItemsCollection(
    signedInCustomerStorageId: string | null,
    items: CartItem[]
  ): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    if (signedInCustomerStorageId) {
      this.persistStoredCustomerCollection(
        this.customerSavedItemsStorageKey,
        signedInCustomerStorageId,
        items
      );
      return;
    }

    localStorage.setItem(this.savedItemsStorageKey, JSON.stringify(items));
  }

  private getStoredCustomerCart(customerEmail: string): CartItem[] {
    return this.getStoredCustomerCollection(this.customerCartStorageKey, customerEmail);
  }

  private getStoredCustomerSavedItems(customerEmail: string): CartItem[] {
    return this.getStoredCustomerCollection(this.customerSavedItemsStorageKey, customerEmail);
  }

  private getStoredCustomerCollection(storageKey: string, customerEmail: string): CartItem[] {
    const normalizedEmail = customerEmail.trim().toLowerCase();
    const collections = this.readStoredCustomerCollectionMap(storageKey);

    return collections[normalizedEmail] ?? [];
  }

  private persistStoredCustomerCollection(
    storageKey: string,
    customerEmail: string,
    items: CartItem[]
  ): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const normalizedEmail = customerEmail.trim().toLowerCase();
    const collections = this.readStoredCustomerCollectionMap(storageKey);

    if (items.length) {
      collections[normalizedEmail] = items;
    } else {
      delete collections[normalizedEmail];
    }

    localStorage.setItem(storageKey, JSON.stringify(collections));
  }

  private readStoredCartCollection(storageKey: string): CartItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
      return [];
    }

    try {
      const parsedValue = JSON.parse(storedValue) as CartItem[];
      return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
      localStorage.removeItem(storageKey);
      return [];
    }
  }

  private readStoredCustomerCollectionMap(storageKey: string): StoredCartCollectionMap {
    if (typeof localStorage === 'undefined') {
      return {};
    }

    const storedValue = localStorage.getItem(storageKey);

    if (!storedValue) {
      return {};
    }

    try {
      const parsedValue = JSON.parse(storedValue) as Record<string, CartItem[]>;

      if (!parsedValue || typeof parsedValue !== 'object' || Array.isArray(parsedValue)) {
        return {};
      }

      return Object.entries(parsedValue).reduce<StoredCartCollectionMap>((collections, entry) => {
        const [customerEmail, items] = entry;
        collections[customerEmail.trim().toLowerCase()] = Array.isArray(items) ? items : [];
        return collections;
      }, {});
    } catch {
      localStorage.removeItem(storageKey);
      return {};
    }
  }

  private clearGuestCustomerCollections(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.savedItemsStorageKey);
  }

  private mergeCartCollections(existingItems: CartItem[], incomingItems: CartItem[]): CartItem[] {
    let mergedItems = [...existingItems];

    for (const incomingItem of incomingItems) {
      const availableStock = this.getAvailableStock(incomingItem);
      const requestedQuantity = Math.max(1, Number(incomingItem.quantity || 0));
      const nextCartState = this.addOrIncreaseCartItem(
        mergedItems,
        incomingItem,
        requestedQuantity,
        availableStock
      );

      mergedItems = nextCartState.items;
    }

    return mergedItems;
  }

  private mergeSavedItemCollections(
    existingItems: CartItem[],
    incomingItems: CartItem[],
    cartItems: CartItem[]
  ): CartItem[] {
    const cartProductIds = new Set(cartItems.map((item) => item.id));
    const mergedItems = [...existingItems];

    for (const incomingItem of incomingItems) {
      if (cartProductIds.has(incomingItem.id) || mergedItems.some((item) => item.id === incomingItem.id)) {
        continue;
      }

      const availableStock = this.getAvailableStock(incomingItem);

      if (availableStock <= 0) {
        continue;
      }

      mergedItems.push({
        ...incomingItem,
        quantity: Math.min(Math.max(1, Number(incomingItem.quantity || 0)), availableStock)
      });
    }

    return mergedItems;
  }

  private scrollHomeSectionIntoView(
    targetId: 'catalog' | 'wishlist' | 'best-sellers',
    behavior: ScrollBehavior = 'smooth',
    remainingAttempts = 10
  ): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      const headerElement = document.querySelector('.store-header') as HTMLElement | null;
      const headerHeight = headerElement?.getBoundingClientRect().height ?? 0;
      const extraGap = window.innerWidth <= 768 ? 18 : 20;
      const desiredViewportTop = headerHeight + extraGap;
      const targetViewportTop = targetElement.getBoundingClientRect().top;
      const targetScrollTop = Math.max(
        0,
        Math.round(window.scrollY + targetViewportTop - desiredViewportTop)
      );

      window.scrollTo({
        top: targetScrollTop,
        behavior
      });
      this.updateBackToTopVisibility();

      if (remainingAttempts > 0) {
        setTimeout(() => {
          const latestViewportTop = targetElement.getBoundingClientRect().top;
          const latestOffset = Math.abs(latestViewportTop - desiredViewportTop);

          if (latestOffset > 8) {
            this.scrollHomeSectionIntoView(targetId, 'auto', remainingAttempts - 1);
          }
        }, behavior === 'smooth' ? 220 : 90);
      }

      return;
    }

    if (remainingAttempts <= 0) {
      return;
    }

    if (typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() =>
        this.scrollHomeSectionIntoView(targetId, behavior, remainingAttempts - 1)
      );
      return;
    }

    setTimeout(() => this.scrollHomeSectionIntoView(targetId, behavior, remainingAttempts - 1), 40);
  }

  private readStoredLanguage(): HeaderLanguage {
    const savedLanguage = localStorage.getItem(this.languageStorageKey) as HeaderLanguage | null;

    if (savedLanguage === 'EN') {
      return savedLanguage;
    }

    return 'EN';
  }

  private populateCheckoutIdentity(): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount) {
      this.selectedDeliveryAddressId.set(null);
      this.selectedPaymentCardId.set(null);
      return;
    }

    this.checkoutForm = {
      ...this.checkoutForm,
      customerName: this.checkoutForm.customerName || registeredAccount.name,
      email: this.checkoutForm.email || registeredAccount.email,
      phone: this.checkoutForm.phone || registeredAccount.phone
    };

    const availableAddresses = this.savedDeliveryAddressesForCurrentAccount;

    if (!availableAddresses.length) {
      this.selectedDeliveryAddressId.set(null);
    } else {
      const selectedAddress =
        availableAddresses.find((address) => address.id === this.selectedDeliveryAddressId()) ||
        availableAddresses[0];

      this.selectedDeliveryAddressId.set(selectedAddress.id);

      if (!this.checkoutForm.addressLine.trim()) {
        this.patchCheckoutFormWithSavedAddress(selectedAddress);
      }
    }

    const availableCards = this.savedPaymentCardsForCurrentAccount;

    if (!availableCards.length) {
      this.selectedPaymentCardId.set(null);
      return;
    }

    const selectedCard =
      availableCards.find((card) => card.id === this.selectedPaymentCardId()) || availableCards[0];

    this.selectedPaymentCardId.set(selectedCard.id);

    if (
      this.checkoutForm.paymentMethod === 'Card payment' &&
      !this.checkoutForm.cardHolderName.trim() &&
      !this.checkoutForm.cardExpiry.trim()
    ) {
      this.patchCheckoutFormWithSavedPaymentCard(selectedCard);
    }
  }

  private findSavedDeliveryAddressForCurrentAccount(addressId: string): SavedDeliveryAddress | null {
    return (
      this.savedDeliveryAddressesForCurrentAccount.find((address) => address.id === addressId) ||
      null
    );
  }

  private patchCheckoutFormWithSavedAddress(address: SavedDeliveryAddress): void {
    this.checkoutForm = {
      ...this.checkoutForm,
      customerName: address.customerName,
      email: address.email,
      phone: address.phone,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode
    };
  }

  private findSavedPaymentCardForCurrentAccount(cardId: string): SavedPaymentCard | null {
    return this.savedPaymentCardsForCurrentAccount.find((card) => card.id === cardId) || null;
  }

  private getCheckoutSelectedSavedPaymentCard(
    cardHolderName = this.checkoutForm.cardHolderName,
    cardExpiry = this.checkoutForm.cardExpiry,
    cardNumber = this.checkoutForm.cardNumber
  ): SavedPaymentCard | null {
    const selectedPaymentCardId = this.selectedPaymentCardId();

    if (!selectedPaymentCardId || this.checkoutForm.paymentMethod !== 'Card payment') {
      return null;
    }

    const selectedCard = this.findSavedPaymentCardForCurrentAccount(selectedPaymentCardId);
    const normalizedCardHolderName = String(cardHolderName || '').trim().toLowerCase();
    const normalizedCardExpiry = String(cardExpiry || '')
      .replace(/\s+/g, '')
      .replace(/[^0-9/]/g, '')
      .slice(0, 5);
    const normalizedCardNumber = String(cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);
    const normalizedSelectedCardNumber = String(selectedCard?.cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);

    if (
      !selectedCard ||
      !/^\d{16}$/.test(normalizedSelectedCardNumber) ||
      !normalizedCardHolderName ||
      !normalizedCardExpiry ||
      normalizedCardNumber !== normalizedSelectedCardNumber ||
      selectedCard.cardHolderName.trim().toLowerCase() !== normalizedCardHolderName ||
      selectedCard.expiry.trim() !== normalizedCardExpiry
    ) {
      return null;
    }

    return selectedCard;
  }

  private patchCheckoutFormWithSavedPaymentCard(card: SavedPaymentCard): void {
    this.checkoutForm = {
      ...this.checkoutForm,
      paymentMethod: 'Card payment',
      cardHolderName: card.cardHolderName,
      cardNumber: String(card.cardNumber || '')
        .replace(/\D/g, '')
        .slice(0, 16),
      cardExpiry: card.expiry,
      cardCvv: ''
    };
  }

  private saveCheckoutDeliveryAddress(): void {
    const registeredAccount = this.registeredAccount();
    const accountEmail = (registeredAccount?.email || this.checkoutForm.email).trim().toLowerCase();

    if (!this.accountName() || !accountEmail) {
      return;
    }

    const snapshot = {
      customerName: this.checkoutForm.customerName.trim(),
      email: this.checkoutForm.email.trim().toLowerCase(),
      phone: this.normalizePhone(this.checkoutForm.phone),
      addressLine: this.checkoutForm.addressLine.trim(),
      city: this.checkoutForm.city.trim(),
      state: this.checkoutForm.state.trim(),
      postalCode: this.checkoutForm.postalCode.trim()
    };

    if (
      !/^[A-Za-z][A-Za-z\s'.-]{2,}$/.test(snapshot.customerName) ||
      !this.isValidEmail(snapshot.email) ||
      !this.isValidPhone(snapshot.phone) ||
      snapshot.addressLine.length < 10 ||
      !/^[A-Za-z][A-Za-z\s.-]{2,}$/.test(snapshot.city) ||
      !/^[A-Za-z][A-Za-z\s.-]{2,}$/.test(snapshot.state) ||
      !/^\d{6}$/.test(snapshot.postalCode)
    ) {
      return;
    }

    const addressSignature = this.getDeliveryAddressSignature(snapshot);
    const selectedAddress = this.savedDeliveryAddresses().find(
      (address) => address.id === this.selectedDeliveryAddressId() && address.accountEmail === accountEmail
    );
    const matchingAddress = this.savedDeliveryAddresses().find(
      (address) =>
        address.accountEmail === accountEmail &&
        this.getDeliveryAddressSignature(address) === addressSignature
    );
    const now = new Date().toISOString();
    const addressId =
      selectedAddress?.id ||
      matchingAddress?.id ||
      `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextAddress: SavedDeliveryAddress = {
      id: addressId,
      accountEmail,
      ...snapshot,
      createdAt: selectedAddress?.createdAt || matchingAddress?.createdAt || now,
      updatedAt: now
    };
    const replacedAddressIds = new Set([addressId, matchingAddress?.id].filter(Boolean) as string[]);

    this.savedDeliveryAddresses.update((addresses) => {
      const filteredAddresses = addresses.filter((address) => !replacedAddressIds.has(address.id));
      return [nextAddress, ...filteredAddresses];
    });
    this.selectedDeliveryAddressId.set(addressId);
  }

  private saveCheckoutPaymentCard(paymentCard: PaymentCardSnapshot | null): void {
    const registeredAccount = this.registeredAccount();
    const accountEmail = (registeredAccount?.email || this.checkoutForm.email).trim().toLowerCase();

    if (!this.accountName() || !accountEmail || !paymentCard) {
      return;
    }

    const snapshot = {
      cardHolderName: paymentCard.cardHolderName.trim(),
      cardNumber: String(paymentCard.cardNumber || '')
        .replace(/\D/g, '')
        .slice(0, 16),
      last4: String(paymentCard.last4 || '').replace(/\D/g, '').slice(-4),
      expiry: paymentCard.expiry.trim(),
      brand: paymentCard.brand.trim() || 'Card'
    };

    if (
      snapshot.cardHolderName.length < 2 ||
      !/^\d{16}$/.test(snapshot.cardNumber) ||
      !/^\d{4}$/.test(snapshot.last4) ||
      !/^(0[1-9]|1[0-2])\/\d{2}$/.test(snapshot.expiry)
    ) {
      return;
    }

    const cardSignature = this.getPaymentCardSignature(snapshot);
    const selectedCard = this.savedPaymentCards().find(
      (card) => card.id === this.selectedPaymentCardId() && card.accountEmail === accountEmail
    );
    const matchingCard = this.savedPaymentCards().find(
      (card) =>
        card.accountEmail === accountEmail &&
        this.getPaymentCardSignature(card) === cardSignature
    );
    const now = new Date().toISOString();
    const cardId =
      selectedCard?.id ||
      matchingCard?.id ||
      `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const nextCard: SavedPaymentCard = {
      id: cardId,
      accountEmail,
      ...snapshot,
      createdAt: selectedCard?.createdAt || matchingCard?.createdAt || now,
      updatedAt: now
    };
    const replacedCardIds = new Set([cardId, matchingCard?.id].filter(Boolean) as string[]);

    this.savedPaymentCards.update((cards) => {
      const filteredCards = cards.filter((card) => !replacedCardIds.has(card.id));
      return [nextCard, ...filteredCards];
    });
    this.selectedPaymentCardId.set(cardId);
  }

  private getDeliveryAddressSignature(
    address: Pick<
      SavedDeliveryAddress,
      'customerName' | 'phone' | 'addressLine' | 'city' | 'state' | 'postalCode'
    >
  ): string {
    return [
      address.customerName,
      address.phone,
      address.addressLine,
      address.city,
      address.state,
      address.postalCode
    ]
      .map((value) => this.normalizeStoreSectionName(value).toLowerCase())
      .join('|');
  }

  private getPaymentCardSignature(
    card: Pick<SavedPaymentCard, 'cardHolderName' | 'cardNumber' | 'expiry' | 'brand'>
  ): string {
    return [card.cardHolderName, card.cardNumber, card.expiry, card.brand]
      .map((value) => this.normalizeStoreSectionName(value).toLowerCase())
      .join('|');
  }

  private populateSupportIdentity(): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount) {
      return;
    }

    this.supportForm = {
      ...this.supportForm,
      customerName: registeredAccount.name,
      email: registeredAccount.email
    };
  }

  private populateAccountForms(): void {
    const registeredAccount = this.registeredAccount();
    this.clearAccountFeedback();

    if (!this.accountName() || !registeredAccount) {
      this.accountProfileForm = this.createAccountProfileForm();
      this.accountPasswordForm = this.createAccountPasswordForm();
      this.accountPasswordHintMode = false;
      this.accountPasswordHintMismatch = false;
      return;
    }

    this.accountProfileForm = {
      name: registeredAccount.name,
      phone: registeredAccount.phone,
      email: registeredAccount.email,
      currentPassword: ''
    };

    this.accountPasswordForm = this.createAccountPasswordForm();
    this.accountPasswordHintMode = false;
    this.accountPasswordHintMismatch = false;
  }

  saveAccountProfile(): void {
    const registeredAccount = this.registeredAccount();
    const accountName = this.accountName();
    const name = this.accountProfileForm.name.trim();
    const phone = this.normalizePhone(this.accountProfileForm.phone);
    const currentPassword = this.accountProfileForm.currentPassword.trim();

    if (!accountName || !registeredAccount) {
      this.openAccountSignIn();
      return;
    }

    if (!/^[A-Za-z][A-Za-z\s'.-]{2,}$/.test(name)) {
      this.setAccountProfileError('Full name must be at least 3 letters.');
      return;
    }

    if (!this.isValidPhone(phone)) {
      this.setAccountProfileError('Mobile number must be exactly 10 digits.');
      return;
    }

    if (!currentPassword) {
      this.setAccountProfileError('Enter your current password before saving account details.');
      return;
    }

    if (registeredAccount.password !== currentPassword) {
      this.setAccountProfileError('Current password is incorrect. Profile details were not updated.');
      return;
    }

    this.storeService
      .updateCustomerAccountProfile({
        email: registeredAccount.email,
        currentPassword,
        name,
        phone
      })
      .subscribe({
        next: (account) => {
          const nextAccount = this.buildRegisteredAccountFromRecord(account, registeredAccount.password);

          this.registeredAccount.set(nextAccount);
          this.accountName.set(nextAccount.name);
          this.checkoutForm = {
            ...this.checkoutForm,
            customerName: nextAccount.name,
            email: nextAccount.email,
            phone: nextAccount.phone
          };
          this.supportForm = {
            ...this.supportForm,
            customerName: nextAccount.name,
            email: nextAccount.email
          };
          this.accountProfileForm = {
            ...this.accountProfileForm,
            name: nextAccount.name,
            phone: nextAccount.phone,
            email: nextAccount.email,
            currentPassword: ''
          };
          if (this.isAdminAuthenticated()) {
            this.loadAdminUsers();
          }
          this.setAccountSuccessMessage('Account details updated successfully.');
        },
        error: (error: Error) => {
          this.setAccountProfileError(error.message);
        }
      });
  }

  updateAccountPassword(): void {
    const registeredAccount = this.registeredAccount();
    const currentPassword = this.accountPasswordForm.currentPassword.trim();
    const newPassword = this.accountPasswordForm.newPassword.trim();
    const confirmPassword = this.accountPasswordForm.confirmPassword.trim();

    if (!this.accountName() || !registeredAccount) {
      this.openAccountSignIn();
      return;
    }

    this.accountPasswordHintMismatch = false;

    if (!currentPassword) {
      this.setAccountPasswordError('Enter your current password first.');
      return;
    }

    if (registeredAccount.password !== currentPassword) {
      this.accountPasswordHintMismatch = true;
      if (!registeredAccount.passwordHint.trim()) {
        this.setAccountPasswordError(
          'Current password is incorrect, and no password hint is saved for this account.'
        );
      } else {
        this.setAccountPasswordError(
          'Current password is incorrect. Click "Reset with password hint" if you want to reset it instead.'
        );
      }
      return;
    }

    if (newPassword.length < 6) {
      this.setAccountPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === currentPassword) {
      this.setAccountPasswordError('New password must be different from the current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.setAccountPasswordError('Confirm password must match the new password.');
      return;
    }

    this.storeService
      .updateCustomerAccountPassword({
        identifier: registeredAccount.email,
        currentPassword,
        newPassword
      })
      .subscribe({
        next: (account) => {
          this.registeredAccount.set(this.buildRegisteredAccountFromRecord(account, newPassword));
          this.accountPasswordForm = this.createAccountPasswordForm();
          this.accountPasswordHintMode = false;
          this.accountPasswordHintMismatch = false;
          this.setAccountSuccessMessage('Password updated successfully.');
        },
        error: (error: Error) => {
          this.setAccountPasswordError(error.message);
        }
      });
  }

  openAccountPasswordHintReset(): void {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount) {
      this.openAccountSignIn();
      return;
    }

    if (!registeredAccount.passwordHint.trim()) {
      this.setAccountPasswordError('No password hint is saved for this account yet.');
      return;
    }

    this.accountPasswordHintMode = true;
    this.accountPasswordForm = {
      ...this.accountPasswordForm,
      currentPassword: '',
      passwordHint: ''
    };
    this.clearAccountFeedback();
  }

  resetAccountPasswordWithHint(): void {
    const registeredAccount = this.registeredAccount();
    const passwordHint = this.accountPasswordForm.passwordHint.trim();
    const newPassword = this.accountPasswordForm.newPassword.trim();
    const confirmPassword = this.accountPasswordForm.confirmPassword.trim();

    if (!this.accountName() || !registeredAccount) {
      this.openAccountSignIn();
      return;
    }

    if (!registeredAccount.passwordHint.trim()) {
      this.setAccountPasswordError('No password hint is saved for this account yet.');
      return;
    }

    if (passwordHint.length < 3) {
      this.setAccountPasswordError('Enter the password hint saved for this account.');
      return;
    }

    if (registeredAccount.passwordHint.trim().toLowerCase() !== passwordHint.toLowerCase()) {
      this.setAccountPasswordError('The password hint is incorrect for this account.');
      return;
    }

    if (newPassword.length < 6) {
      this.setAccountPasswordError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword === registeredAccount.password) {
      this.setAccountPasswordError('New password must be different from the current password.');
      return;
    }

    if (newPassword !== confirmPassword) {
      this.setAccountPasswordError('Confirm password must match the new password.');
      return;
    }

    this.storeService
      .resetCustomerAccountPassword({
        identifier: registeredAccount.email,
        passwordHint,
        newPassword
      })
      .subscribe({
        next: (account) => {
          this.registeredAccount.set(this.buildRegisteredAccountFromRecord(account, newPassword));
          this.accountPasswordForm = this.createAccountPasswordForm();
          this.accountPasswordHintMode = false;
          this.accountPasswordHintMismatch = false;
          this.setAccountSuccessMessage('Password reset successfully with the saved hint.');
        },
        error: (error: Error) => {
          this.setAccountPasswordError(error.message);
        }
      });
  }

  cancelAccountPasswordHintReset(): void {
    this.accountPasswordHintMode = false;
    this.accountPasswordForm = {
      ...this.accountPasswordForm,
      currentPassword: '',
      passwordHint: ''
    };
    this.accountPasswordHintMismatch = false;
    this.clearAccountFeedback();
  }

  private useCartCheckout(): void {
    this.checkoutSource = 'cart';
    this.instantCheckoutItems.set([]);
  }

  private useInstantCheckout(product: Product): void {
    this.checkoutSource = 'instant';
    this.instantCheckoutItems.set([{ ...product, quantity: 1 }]);
  }

  private resetProductSectionCounts(): void {
    this.catalogVisibleCount = this.initialCatalogVisibleCount;
    this.bestSellerVisibleCount = this.initialBestSellerVisibleCount;
  }

  private getHomeReturnScrollTarget(): 'catalog' | 'wishlist' | 'best-sellers' | null {
    if (this.isWishlistSectionVisible()) {
      return 'wishlist';
    }

    if (this.isCatalogNavigationActive || this.selectedCategory !== 'All' || this.searchTerm.trim()) {
      return 'catalog';
    }

    return null;
  }

  private resetHomeLandingState(): void {
    this.selectedCategory = 'All';
    this.searchTerm = '';
    this.isCatalogNavigationActive = false;
    this.isWishlistSectionVisible.set(false);
    this.pendingProductRouteId = null;
    this.activeHeroIndex = 0;
    this.resetProductSectionCounts();
  }

  private validateCheckoutForm(): string | null {
    const customerName = this.checkoutForm.customerName.trim();
    const email = this.checkoutForm.email.trim().toLowerCase();
    const phone = this.normalizePhone(this.checkoutForm.phone);
    const addressLine = this.checkoutForm.addressLine.trim();
    const city = this.checkoutForm.city.trim();
    const state = this.checkoutForm.state.trim();
    const postalCode = this.checkoutForm.postalCode.trim();
    const paymentMethod = this.checkoutForm.paymentMethod.trim();
    const cardHolderName = this.checkoutForm.cardHolderName.trim();
    const cardNumber = this.checkoutForm.cardNumber.replace(/\D/g, '').slice(0, 16);
    const cardExpiry = this.checkoutForm.cardExpiry
      .replace(/\s+/g, '')
      .replace(/[^0-9/]/g, '')
      .slice(0, 5);
    const cardCvv = this.checkoutForm.cardCvv.replace(/\D/g, '').slice(0, 4);
    const requiresCardDetails = paymentMethod === 'Card payment';
    const selectedSavedPaymentCard = this.getCheckoutSelectedSavedPaymentCard(
      cardHolderName,
      cardExpiry
    );

    if (!/^[A-Za-z][A-Za-z\s'.-]{2,}$/.test(customerName)) {
      return 'Full name must be at least 3 letters.';
    }

    if (!this.isValidEmail(email)) {
      return 'Enter a valid email address like name@example.com.';
    }

    if (!this.isValidPhone(phone)) {
      return 'Phone number must be exactly 10 digits.';
    }

    if (addressLine.length < 10) {
      return 'Address must be at least 10 characters.';
    }

    if (!/^[A-Za-z][A-Za-z\s.-]{2,}$/.test(city)) {
      return 'City must be at least 3 letters.';
    }

    if (!/^[A-Za-z][A-Za-z\s.-]{2,}$/.test(state)) {
      return 'State must be at least 3 letters.';
    }

    if (!/^\d{6}$/.test(postalCode)) {
      return 'Postal code must be exactly 6 digits.';
    }

    if (!paymentMethod) {
      return 'Select a payment method before placing the order.';
    }

    if (requiresCardDetails && cardHolderName.length < 2) {
      return 'Card holder name must be at least 2 letters.';
    }

    if (requiresCardDetails && !selectedSavedPaymentCard && !/^\d{16}$/.test(cardNumber)) {
      return 'Card number must be exactly 16 digits.';
    }

    if (requiresCardDetails && !/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) {
      return 'Expiry must use MM/YY format.';
    }

    if (requiresCardDetails && !this.isFutureCardExpiry(cardExpiry)) {
      return 'Card expiry date has already passed.';
    }

    if (requiresCardDetails && !selectedSavedPaymentCard && !/^\d{3,4}$/.test(cardCvv)) {
      return 'CVV must be 3 or 4 digits.';
    }

    this.checkoutForm = {
      ...this.checkoutForm,
      customerName,
      email,
      phone,
      addressLine,
      city,
      state,
      postalCode,
      paymentMethod,
      cardHolderName: requiresCardDetails ? cardHolderName : '',
      cardNumber: requiresCardDetails ? cardNumber : '',
      cardExpiry: requiresCardDetails ? cardExpiry : '',
      cardCvv: requiresCardDetails && !selectedSavedPaymentCard ? cardCvv : ''
    };

    return null;
  }

  private buildCheckoutPaymentCard(): PaymentCardSnapshot | null {
    if (this.checkoutForm.paymentMethod !== 'Card payment') {
      return null;
    }

    const cardNumber = this.checkoutForm.cardNumber.replace(/\D/g, '').slice(0, 16);
    const cardExpiry = this.checkoutForm.cardExpiry
      .replace(/\s+/g, '')
      .replace(/[^0-9/]/g, '')
      .slice(0, 5);
    const selectedSavedPaymentCard = this.getCheckoutSelectedSavedPaymentCard(
      this.checkoutForm.cardHolderName,
      cardExpiry,
      cardNumber
    );

    if (selectedSavedPaymentCard) {
      return {
        cardHolderName: selectedSavedPaymentCard.cardHolderName,
        cardNumber: selectedSavedPaymentCard.cardNumber,
        last4: selectedSavedPaymentCard.last4,
        expiry: selectedSavedPaymentCard.expiry,
        brand: selectedSavedPaymentCard.brand
      };
    }

    return {
      cardHolderName: this.checkoutForm.cardHolderName.trim(),
      cardNumber,
      last4: cardNumber.slice(-4),
      expiry: cardExpiry,
      brand: this.detectCardBrand(cardNumber)
    };
  }

  private buildCheckoutNotes(paymentCard: PaymentCardSnapshot | null): string {
    const customerNotes = this.checkoutForm.notes.trim();

    if (this.checkoutForm.paymentMethod !== 'Card payment' || !paymentCard) {
      return customerNotes;
    }

    const cardSummary = `Card payment selected${paymentCard.cardHolderName ? ` for ${paymentCard.cardHolderName}` : ''} - ${paymentCard.brand} ending ${paymentCard.last4}.`;

    return customerNotes ? `${customerNotes}\n${cardSummary}` : cardSummary;
  }

  private detectCardBrand(cardNumber: string): string {
    if (/^4\d{15}$/.test(cardNumber)) {
      return 'Visa';
    }

    if (/^(5[1-5]\d{14}|2(?:2[2-9]\d|[3-6]\d{2}|7(?:0\d|1\d|20))\d{12})$/.test(cardNumber)) {
      return 'Mastercard';
    }

    if (/^3[47]\d{13}$/.test(cardNumber)) {
      return 'American Express';
    }

    if (/^6(?:011|5\d{2})\d{12}$/.test(cardNumber)) {
      return 'Discover';
    }

    return 'Card';
  }

  private isValidCardNumber(cardNumber: string): boolean {
    if (!/^\d{16}$/.test(cardNumber)) {
      return false;
    }

    let checksum = 0;
    let shouldDouble = false;

    for (let index = cardNumber.length - 1; index >= 0; index -= 1) {
      let digit = Number(cardNumber[index]);

      if (shouldDouble) {
        digit *= 2;

        if (digit > 9) {
          digit -= 9;
        }
      }

      checksum += digit;
      shouldDouble = !shouldDouble;
    }

    return checksum % 10 === 0;
  }

  private isFutureCardExpiry(cardExpiry: string): boolean {
    const expiryMatch = cardExpiry.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);

    if (!expiryMatch) {
      return false;
    }

    const month = Number(expiryMatch[1]);
    const year = 2000 + Number(expiryMatch[2]);
    const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);

    return expiryDate.getTime() >= Date.now();
  }

  loadAdminOverview(showSessionError = true): void {
    if (!this.isAdminAuthenticated()) {
      return;
    }

    this.adminOverviewLoading.set(true);
    this.adminError = '';

    this.storeService.getAdminOverview().subscribe({
      next: (overview) => {
        this.adminOverview.set(overview);
        this.adminOverviewLoading.set(false);
      },
      error: (error: Error) => {
        this.adminOverviewLoading.set(false);
        if (!showSessionError && error.message.toLowerCase().includes('sign in again')) {
          this.clearAdminSessionState(false);
          return;
        }

        this.handleAdminError(error);
      }
    });
  }

  loadAdminAccounts(showSessionError = true): void {
    if (!this.isAdminAuthenticated()) {
      return;
    }

    this.adminAccountsLoading.set(true);

    this.storeService.getAdminAccounts().subscribe({
      next: (accounts) => {
        this.adminAccounts.set(accounts.map((account) => this.normalizeAdminUser(account)));
        this.adminAccountsLoading.set(false);
      },
      error: (error: Error) => {
        this.adminAccountsLoading.set(false);
        if (!showSessionError && error.message.toLowerCase().includes('sign in again')) {
          this.clearAdminSessionState(false);
          return;
        }

        this.handleAdminError(error);
      }
    });
  }

  loadAdminUsers(showSessionError = true): void {
    if (!this.isAdminAuthenticated()) {
      return;
    }

    this.adminUsersLoading.set(true);

    this.storeService.getAdminUsers().subscribe({
      next: (users) => {
        this.adminUsers.set(users);
        this.adminUsersLoading.set(false);
      },
      error: (error: Error) => {
        this.adminUsersLoading.set(false);
        if (!showSessionError && error.message.toLowerCase().includes('sign in again')) {
          this.clearAdminSessionState(false);
          return;
        }

        this.handleAdminError(error);
      }
    });
  }

  private showToast(
    message: string,
    tone: 'success' | 'error' = 'success',
    playSound = true
  ): void {
    this.toastTone.set(tone);
    this.toastMessage.set(message);

    if (playSound) {
      this.playToastNotificationTone(tone);
    }

    if (this.toastTimeoutId) {
      clearTimeout(this.toastTimeoutId);
    }

    this.toastTimeoutId = setTimeout(() => {
      this.toastMessage.set('');
      this.toastTimeoutId = null;
    }, 3000);
  }

  private playToastNotificationTone(tone: 'success' | 'error'): void {
    if (typeof window === 'undefined') {
      return;
    }

    const audioWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = window.AudioContext || audioWindow.webkitAudioContext;

    if (!AudioContextCtor) {
      return;
    }

    try {
      this.toastAudioContext ??= new AudioContextCtor();
      const context = this.toastAudioContext;
      const now = context.currentTime;
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();

      if (context.state === 'suspended') {
        void context.resume().catch(() => undefined);
      }

      oscillator.type = tone === 'success' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(tone === 'success' ? 880 : 440, now);
      oscillator.frequency.exponentialRampToValueAtTime(
        tone === 'success' ? 1174 : 320,
        now + 0.18
      );

      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.26);
    } catch {
      this.toastAudioContext = null;
    }
  }

  private buildSupportPayload(): SupportRequestPayload | null {
    const registeredAccount = this.registeredAccount();

    if (!this.accountName() || !registeredAccount) {
      return null;
    }

    const customerName = registeredAccount.name.trim();
    const email = registeredAccount.email.trim().toLowerCase();
    const orderReference = this.normalizeOrderReference(this.supportForm.orderReference);
    const issueType = this.supportForm.issueType.trim();
    const subject = this.supportForm.subject.trim();
    const message = this.supportForm.message.trim();
    const matchingOrder = this.customerOrders().find(
      (order) => this.normalizeOrderReference(order.orderReference) === orderReference
    );

    if (
      customerName.length < 2 ||
      !this.isValidEmail(email) ||
      !this.isValidOrderReference(orderReference) ||
      !matchingOrder ||
      !issueType ||
      subject.length < 4 ||
      message.length < 15
    ) {
      return null;
    }

    return {
      customerName,
      email,
      orderReference,
      issueType,
      subject,
      message
    };
  }

  private buildAdminProductPayload(): ProductCreatePayload | null {
    const name = this.adminProductForm.name.trim();
    const category = this.normalizeStoreSectionName(this.adminProductForm.category);
    const description = this.adminProductForm.description.trim();
    const imageUrl = this.adminProductForm.imageUrl.trim();
    const badge = this.adminProductForm.badge.trim();
    const priceValue = String(this.adminProductForm.price ?? '').trim();
    const ratingValue = String(this.adminProductForm.rating ?? '').trim();
    const stockValue = String(this.adminProductForm.stock ?? '').trim();
    const price = Number(priceValue);
    const rating = Number(ratingValue);
    const stock = Number(stockValue);

    if (
      name.length < 3 ||
      !category ||
      description.length < 15 ||
      !imageUrl ||
      badge.length < 2 ||
      !priceValue ||
      !ratingValue ||
      !stockValue ||
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(rating) ||
      rating < 1 ||
      rating > 5 ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      return null;
    }

    return {
      name,
      category,
      description,
      imageUrl,
      price,
      rating,
      stock,
      badge,
      featured: this.adminProductForm.featured
    };
  }

  private get defaultAdminSection(): string {
    return this.storeSectionNames[0] || this.defaultStoreSectionNames[0] || 'General';
  }

  private normalizeStoreSectionName(name: string): string {
    return String(name || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private upsertStoreSection(section: StoreSection): void {
    const normalizedName = this.normalizeStoreSectionName(section.name);

    if (!normalizedName) {
      return;
    }

    const existingSections = this.storeSections().filter(
      (existingSection) =>
        this.normalizeStoreSectionName(existingSection.name).toLowerCase() !==
        normalizedName.toLowerCase()
    );

    existingSections.push({
      ...section,
      name: normalizedName,
      sortOrder:
        Number.isFinite(section.sortOrder) && section.sortOrder > 0
          ? section.sortOrder
          : existingSections.length + 1
    });

    existingSections.sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    );

    this.storeSections.set(existingSections);
  }

  private removeStoreSection(sectionId: number): void {
    this.storeSections.set(this.storeSections().filter((section) => section.id !== sectionId));
  }

  private applyAdminProductForm(product: Product): void {
    this.adminEditingProductId = product.id;
    this.adminProductForm = {
      name: product.name,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      imageName: 'New product image',
      price: String(product.price),
      rating: String(product.rating),
      stock: String(product.stock),
      badge: product.badge || 'Featured pick',
      featured: product.featured
    };
    this.adminError = '';
    this.adminSuccess = `Editing ${product.name}. Update the fields you want to change.`;
  }

  private startHeroAutoSlide(): void {
    if (this.heroAutoSlideId) {
      clearInterval(this.heroAutoSlideId);
    }

      this.heroAutoSlideId = setInterval(() => {
        if (this.currentView === 'home') {
          this.nextHero();
        }
    }, 3000);
  }
}
