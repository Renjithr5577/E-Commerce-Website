import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
  AdminCustomerOrderSummary,
  AdminCustomerUser,
  AdminCreateSubAdminPayload,
  AdminOrderDetail,
  AdminOrderDetailItem,
  AdminOverview,
  AdminRecentOrder,
  AdminRecentOrderedProduct,
  AdminSupportTicket,
  AdminSupportTicketStatus,
  AdminUser
} from '../../models/admin.model';
import { Product } from '../../models/product.model';
import { StoreService } from '../../services/store.service';
import {
  AdminLoginForm,
  AdminProductForm,
  AdminTab,
  StoreSection
} from '../../models/storefront.model';

type AdminDetailOrigin = 'overview' | 'orders' | 'recent' | 'stock' | 'support' | null;
type SupportTicketFilter = 'all' | AdminSupportTicketStatus;
type CustomerUserFilter =
  | 'all'
  | 'account_only'
  | 'orders_only'
  | 'support_only'
  | 'mixed'
  | 'open_tickets';
type SupportTicketAction =
  | 'save_reply'
  | 'mark_in_progress'
  | 'resolve_ticket'
  | 'close_ticket'
  | 'reopen_ticket';
type AdminCatalogGroup = {
  category: string;
  products: Product[];
};

@Component({
  selector: 'app-admin-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-page.component.html'
})
export class AdminPageComponent implements OnChanges, OnInit, OnDestroy {
  private readonly storeService = inject(StoreService);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);
  private readonly routeStorageKey = 'luxe-last-route';
  @Input({ required: true }) loginForm!: AdminLoginForm;
  @Input({ required: true }) productForm!: AdminProductForm;
  @Input() products: Product[] = [];
  @Input() sections: StoreSection[] = [];
  @Input({ required: true }) categories!: string[];
  @Input() isAuthenticated = false;
  @Input() currentAdmin: AdminUser | null = null;
  @Input() adminAccounts: AdminUser[] = [];
  @Input() adminUsers: AdminCustomerUser[] = [];
  @Input() overview: AdminOverview | null = null;
  @Input() adminAccountsLoading = false;
  @Input() adminUsersLoading = false;
  @Input() overviewLoading = false;
  @Input() detailLoading = false;
  @Input() selectedOrderDetail: AdminOrderDetail | null = null;
  @Input() selectedProductDetail: Product | null = null;
  @Input() editingProductId: number | null = null;
  @Input() submitting = false;
  @Input() sectionSubmitting = false;
  @Input() subAdminSubmitting = false;
  @Input() deletingCustomerUserEmail: string | null = null;
  @Input() supportUpdatingTicketId: number | null = null;
  @Input() errorMessage = '';
  @Input() successMessage = '';
  @Input() maxImageSizeMb = 2;

  @Output() submitLogin = new EventEmitter<void>();
  @Output() submitProduct = new EventEmitter<void>();
  @Output() createSection = new EventEmitter<string>();
  @Output() createSubAdmin = new EventEmitter<AdminCreateSubAdminPayload>();
  @Output() deleteSubAdmin = new EventEmitter<number>();
  @Output() deleteCustomerUser = new EventEmitter<string>();
  @Output() updateSection = new EventEmitter<{ sectionId: number; name: string }>();
  @Output() deleteSection = new EventEmitter<number>();
  @Output() deleteProduct = new EventEmitter<number>();
  @Output() signOut = new EventEmitter<void>();
  @Output() openCustomerAccess = new EventEmitter<void>();
  @Output() backHome = new EventEmitter<void>();
  @Output() imageSelected = new EventEmitter<File | null>();
  @Output() refreshInsights = new EventEmitter<void>();
  @Output() orderSelect = new EventEmitter<number>();
  @Output() productSelect = new EventEmitter<number>();
  @Output() productEditSelect = new EventEmitter<number>();
  @Output() clearProductEditor = new EventEmitter<void>();
  @Output() supportTicketUpdate = new EventEmitter<{
    ticketId: number;
    status: AdminSupportTicketStatus;
    adminResponse: string;
    action: SupportTicketAction;
  }>();
  @Output() clearDetails = new EventEmitter<void>();
  @Output() reloadCustomerUsers = new EventEmitter<void>();

  readonly supportStatusFilters: Array<{ value: SupportTicketFilter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' }
  ];
  readonly customerUserFilters: Array<{ value: CustomerUserFilter; label: string }> = [
    { value: 'all', label: 'All users' },
    { value: 'account_only', label: 'Account only' },
    { value: 'orders_only', label: 'Orders only' },
    { value: 'support_only', label: 'Support only' },
    { value: 'mixed', label: 'Mixed activity' },
    { value: 'open_tickets', label: 'Open tickets' }
  ];
  activeTab: AdminTab = 'overview';
  activeSupportFilter: SupportTicketFilter = 'all';
  activeCustomerUserFilter: CustomerUserFilter = 'all';
  catalogSectionFilter = 'all';
  customerUserSearchQuery = '';
  catalogSearchQuery = '';
  sectionSearchQuery = '';
  customerUsersPageIndex = 0;
  readonly customerUsersPageSize = 6;
  detailOrigin: AdminDetailOrigin = null;
  selectedRecentOrderedProduct: AdminRecentOrderedProduct | null = null;
  selectedCustomerUserEmail: string | null = null;
  selectedCustomerUserOrderId: number | null = null;
  selectedSupportTicketId: number | null = null;
  customerUserOrders: AdminCustomerOrderSummary[] = [];
  customerUserOrdersLoading = false;
  customerUserOrdersError = '';
  private customerUserOrdersRequestId = 0;
  supportReplyDrafts: Record<number, string> = {};
  isProductModalOpen = false;
  isSectionModalOpen = false;
  isSubAdminModalOpen = false;
  showAdminLoginPassword = false;
  showSubAdminPassword = false;
  editingSectionId: number | null = null;
  newSectionName = '';
  private isApplyingAdminRoute = false;
  private requestedOrderDetailId: number | null = null;
  private requestedProductDetailId: number | null = null;
  newSubAdmin = {
    name: '',
    email: '',
    phone: '',
    password: ''
  };
  @ViewChild('productFormRef') productFormRef?: NgForm;
  @ViewChild('subAdminFormRef') subAdminFormRef?: NgForm;
  @ViewChild('adminWorkspace') adminWorkspace?: ElementRef<HTMLElement>;
  @ViewChild('catalogToolbar') catalogToolbar?: ElementRef<HTMLElement>;
  @ViewChild('catalogSectionStart') catalogSectionStart?: ElementRef<HTMLElement>;

  get isMainAdmin(): boolean {
    return this.currentAdmin?.role === 'main_admin';
  }

  get canDeleteCatalog(): boolean {
    return this.isMainAdmin;
  }

  get visibleAdminAccounts(): AdminUser[] {
    return [...this.adminAccounts].sort((left, right) => {
      if (left.role !== right.role) {
        return left.role === 'main_admin' ? -1 : 1;
      }

      return left.email.localeCompare(right.email);
    });
  }

  get mainAdminCount(): number {
    return this.visibleAdminAccounts.filter((account) => account.role === 'main_admin').length;
  }

  get subAdminCount(): number {
    return this.visibleAdminAccounts.filter((account) => account.role === 'sub_admin').length;
  }

  get visibleCustomerUsers(): AdminCustomerUser[] {
    return [...this.adminUsers].sort((left, right) => {
      const rightTime = Date.parse(right.lastActivityAt || right.lastOrderAt || right.lastTicketAt || '');
      const leftTime = Date.parse(left.lastActivityAt || left.lastOrderAt || left.lastTicketAt || '');

      if (!Number.isNaN(rightTime) || !Number.isNaN(leftTime)) {
        const safeRightTime = Number.isNaN(rightTime) ? 0 : rightTime;
        const safeLeftTime = Number.isNaN(leftTime) ? 0 : leftTime;

        if (safeRightTime !== safeLeftTime) {
          return safeRightTime - safeLeftTime;
        }
      }

      if (right.orderCount !== left.orderCount) {
        return right.orderCount - left.orderCount;
      }

      return left.email.localeCompare(right.email);
    });
  }

  get customerUserCount(): number {
    return this.visibleCustomerUsers.length;
  }

  get selectedCustomerUser(): AdminCustomerUser | null {
    if (!this.selectedCustomerUserEmail) {
      return null;
    }

    return (
      this.adminUsers.find(
        (user) => String(user.email || '').trim().toLowerCase() === this.selectedCustomerUserEmail
      ) ?? null
    );
  }

  get selectedCustomerUserOrderDetail(): AdminOrderDetail | null {
    const selectedUser = this.selectedCustomerUser;

    if (
      !selectedUser ||
      !this.selectedCustomerUserOrderId ||
      !this.selectedOrderDetail ||
      this.selectedOrderDetail.orderId !== this.selectedCustomerUserOrderId ||
      String(this.selectedOrderDetail.email || '').trim().toLowerCase() !==
        String(selectedUser.email || '').trim().toLowerCase()
    ) {
      return null;
    }

    return this.selectedOrderDetail;
  }

  get filteredCustomerUsers(): AdminCustomerUser[] {
    const normalizedQuery = this.customerUserSearchQuery.trim().toLowerCase();

    return this.visibleCustomerUsers.filter((user) => {
      if (!this.matchesCustomerUserFilter(user, this.activeCustomerUserFilter)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [
        user.name,
        user.email,
        user.phone,
        user.latestOrderReference
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }

  get customerUserPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredCustomerUsers.length / this.customerUsersPageSize));
  }

  get activeCustomerUsersPageIndex(): number {
    return Math.min(this.customerUsersPageIndex, Math.max(0, this.customerUserPageCount - 1));
  }

  get paginatedCustomerUsers(): AdminCustomerUser[] {
    const start = this.activeCustomerUsersPageIndex * this.customerUsersPageSize;
    return this.filteredCustomerUsers.slice(start, start + this.customerUsersPageSize);
  }

  get customerUserPaginationStart(): number {
    if (!this.filteredCustomerUsers.length) {
      return 0;
    }

    return this.activeCustomerUsersPageIndex * this.customerUsersPageSize + 1;
  }

  get customerUserPaginationEnd(): number {
    if (!this.filteredCustomerUsers.length) {
      return 0;
    }

    return Math.min(
      this.filteredCustomerUsers.length,
      this.customerUserPaginationStart + this.paginatedCustomerUsers.length - 1
    );
  }

  get customerUserPageNumbers(): number[] {
    const pageCount = this.customerUserPageCount;
    const currentPage = this.activeCustomerUsersPageIndex;
    const maxVisiblePages = 5;
    const start = Math.max(0, Math.min(currentPage - 2, pageCount - maxVisiblePages));
    const safeStart = Math.max(0, start);
    const end = Math.min(pageCount, safeStart + maxVisiblePages);

    return Array.from({ length: end - safeStart }, (_, index) => safeStart + index);
  }

  get hasCustomerUserSearchQuery(): boolean {
    return this.customerUserSearchQuery.trim().length > 0;
  }

  get customerUsersWithOrdersCount(): number {
    return this.visibleCustomerUsers.filter((user) => user.orderCount > 0).length;
  }

  get customerUsersWithOpenTicketsCount(): number {
    return this.visibleCustomerUsers.filter((user) => user.openTicketCount > 0).length;
  }

  get returningCustomerCount(): number {
    return this.visibleCustomerUsers.filter((user) => user.orderCount > 1).length;
  }

  get categoryOptions(): string[] {
    const sectionNames = this.managedSections.map((section) => section.name);
    const existingSectionNames = new Set(sectionNames.map((section) => section.toLowerCase()));
    const fallbackCategories = this.categories
      .filter((category) => category !== 'All' && !existingSectionNames.has(category.toLowerCase()))
      .sort((left, right) => left.localeCompare(right));

    return [...sectionNames, ...fallbackCategories];
  }

  get managedSections(): StoreSection[] {
    return [...this.sections]
      .map((section) => ({
        ...section,
        id: Number(section.id || 0),
        name: String(section.name || '').trim(),
        sortOrder: Number(section.sortOrder || 0)
      }))
      .filter((section) => section.name.length > 0)
      .sort(
        (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
      );
  }

  get filteredManagedSections(): StoreSection[] {
    const normalizedQuery = this.sectionSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return this.managedSections;
    }

    return this.managedSections.filter((section) =>
      section.name.toLowerCase().includes(normalizedQuery)
    );
  }

  get isEditingSection(): boolean {
    return this.editingSectionId !== null;
  }

  get catalogProducts(): Product[] {
    return [...this.products]
      .filter((product) => Number(product.stock || 0) > 0)
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  get groupedCatalogProducts(): AdminCatalogGroup[] {
    const productsByCategory = new Map<string, Product[]>();

    for (const product of this.catalogProducts) {
      const category = product.category || 'Other';
      const currentProducts = productsByCategory.get(category) ?? [];
      currentProducts.push(product);
      productsByCategory.set(category, currentProducts);
    }

    const orderedCategories = [
      ...this.categoryOptions,
      ...[...productsByCategory.keys()]
        .filter((category) => !this.categoryOptions.includes(category))
        .sort((left, right) => left.localeCompare(right))
    ];

    return orderedCategories.map((category) => ({
      category,
      products: productsByCategory.get(category) ?? []
    }));
  }

  get visibleCatalogGroups(): AdminCatalogGroup[] {
    const sectionGroups =
      this.catalogSectionFilter === 'all'
        ? this.groupedCatalogProducts
        : this.groupedCatalogProducts.filter((group) => group.category === this.catalogSectionFilter);
    const normalizedQuery = this.catalogSearchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return sectionGroups;
    }

    return sectionGroups
      .map((group) => ({
        category: group.category,
        products: group.products.filter((product) => this.matchesCatalogSearch(product, normalizedQuery))
      }))
      .filter((group) => group.products.length > 0);
  }

  get visibleCatalogProductCount(): number {
    return this.visibleCatalogGroups.reduce((count, group) => count + group.products.length, 0);
  }

  get expandedRecentOrderItems(): Array<{
    rowNumber: number;
    unitIndex: number;
    item: AdminOrderDetailItem;
  }> {
    const expandedItems: Array<{
      rowNumber: number;
      unitIndex: number;
      item: AdminOrderDetailItem;
    }> = [];
    let rowNumber = 0;

    for (const item of this.selectedOrderDetail?.items ?? []) {
      const itemQuantity = Math.max(1, Number(item.quantity || 0));

      for (let unitIndex = 1; unitIndex <= itemQuantity; unitIndex += 1) {
        rowNumber += 1;
        expandedItems.push({
          rowNumber,
          unitIndex,
          item
        });
      }
    }

    return expandedItems;
  }

  get isEditingProduct(): boolean {
    return this.editingProductId !== null;
  }

  get selectedOrderId(): number | null {
    return this.selectedOrderDetail?.orderId ?? this.requestedOrderDetailId;
  }

  get selectedProductId(): number | null {
    return this.selectedProductDetail?.id ?? this.requestedProductDetailId;
  }

  get hasDetailSelection(): boolean {
    return this.detailLoading || !!this.selectedOrderDetail || !!this.selectedProductDetail;
  }

  get showOverviewProductDetail(): boolean {
    return (
      this.activeTab === 'overview' &&
      this.detailOrigin === 'overview' &&
      (this.detailLoading || !!this.selectedProductDetail)
    );
  }

  get supportTickets(): AdminSupportTicket[] {
    return this.overview?.recentTickets ?? [];
  }

  get recentOrderedProducts(): AdminRecentOrderedProduct[] {
    return this.overview?.recentOrderedProducts ?? [];
  }

  get latestRecentOrder(): AdminRecentOrder | null {
    return this.overview?.recentOrders?.[0] ?? null;
  }

  get latestRecentOrderedProduct(): AdminRecentOrderedProduct | null {
    return this.recentOrderedProducts[0] ?? null;
  }

  get activeRecentOrderedProduct(): AdminRecentOrderedProduct | null {
    return this.selectedRecentOrderedProduct ?? this.latestRecentOrderedProduct;
  }

  get activeRecentOrderSummary(): AdminRecentOrder | null {
    const orderId =
      this.selectedOrderDetail?.orderId ??
      this.activeRecentOrderedProduct?.orderId ??
      this.latestRecentOrder?.orderId;

    if (!orderId) {
      return this.latestRecentOrder;
    }

    return this.overview?.recentOrders?.find((order) => order.orderId === orderId) ?? this.latestRecentOrder;
  }

  get showRecentBackButton(): boolean {
    const latestOrderId = this.latestRecentOrderedProduct?.orderId ?? null;

    if (!latestOrderId) {
      return false;
    }

    if (this.selectedProductDetail) {
      return true;
    }

    return (
      (this.selectedOrderDetail?.orderId ?? latestOrderId) !== latestOrderId ||
      (this.selectedRecentOrderedProduct?.orderId ?? latestOrderId) !== latestOrderId
    );
  }

  get filteredSupportTickets(): AdminSupportTicket[] {
    if (this.activeSupportFilter === 'all') {
      return this.supportTickets;
    }

    return this.supportTickets.filter((ticket) => ticket.status === this.activeSupportFilter);
  }

  get selectedSupportTicket(): AdminSupportTicket | null {
    return this.supportTickets.find((ticket) => ticket.id === this.selectedSupportTicketId) ?? null;
  }

  get hasCatalogSearchQuery(): boolean {
    return this.catalogSearchQuery.trim().length > 0;
  }

  get hasSectionSearchQuery(): boolean {
    return this.sectionSearchQuery.trim().length > 0;
  }

  ngOnInit(): void {
    this.applyAdminRouteFromLocation();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productForm']?.currentValue && this.productFormRef) {
      queueMicrotask(() => this.productFormRef?.resetForm(this.productForm));
    }

    if (
      changes['submitting']?.previousValue &&
      !changes['submitting'].currentValue &&
      this.successMessage &&
      this.isProductModalOpen
    ) {
      this.closeProductModal(false);
    }

    if (changes['overview']?.currentValue) {
      this.syncSupportReplyDrafts(this.supportTickets);

      if (
        this.activeTab === 'recent' &&
        !this.selectedOrderDetail &&
        !this.selectedProductDetail &&
        this.latestRecentOrderedProduct
      ) {
        queueMicrotask(() => this.openRecentOrder(this.latestRecentOrderedProduct!));
      }
    }

    if (
      changes['sectionSubmitting']?.previousValue &&
      !changes['sectionSubmitting'].currentValue &&
      this.successMessage &&
      this.isSectionModalOpen
    ) {
      this.closeSectionModal();
    }

    if (
      changes['subAdminSubmitting']?.previousValue &&
      !changes['subAdminSubmitting'].currentValue &&
      this.successMessage
    ) {
      this.closeSubAdminModal();
    }

    if (
      (changes['sections']?.currentValue || changes['categories']?.currentValue) &&
      this.catalogSectionFilter !== 'all' &&
      !this.categoryOptions.includes(this.catalogSectionFilter)
    ) {
      this.catalogSectionFilter = 'all';
    }

    if (
      changes['sections']?.currentValue &&
      this.editingSectionId !== null &&
      !this.managedSections.some((section) => section.id === this.editingSectionId)
    ) {
      this.editingSectionId = null;
      this.newSectionName = '';
    }

    if (changes['selectedOrderDetail']?.currentValue) {
      this.requestedOrderDetailId = this.selectedOrderDetail?.orderId ?? this.requestedOrderDetailId;
      this.requestedProductDetailId = null;
    }

    if (changes['selectedProductDetail']?.currentValue) {
      this.requestedProductDetailId = this.selectedProductDetail?.id ?? this.requestedProductDetailId;
      this.requestedOrderDetailId = null;
    }

    if (
      changes['isAuthenticated']?.currentValue &&
      typeof window !== 'undefined' &&
      this.normalizePath(window.location.pathname).startsWith('/admin')
    ) {
      this.applyAdminRouteFromLocation();
    }

    if (changes['adminUsers']) {
      this.clampCustomerUserPageIndex();

      if (
        this.selectedCustomerUserEmail &&
        !this.adminUsers.some((user) => user.email === this.selectedCustomerUserEmail)
      ) {
        this.closeCustomerUserModal(false);
      }
    }

    this.syncDocumentScrollLock();
  }

  @HostListener('window:popstate')
  onWindowPopState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.normalizePath(window.location.pathname).startsWith('/admin')) {
      this.applyAdminRouteFromLocation();
    }
  }

  @HostListener('window:focus')
  onWindowFocus(): void {
    if (this.isAuthenticated && this.activeTab === 'users') {
      this.reloadCustomerUsers.emit();
    }
  }

  setActiveTab(tab: AdminTab, syncRoute = true): void {
    this.activeTab = tab;
    this.detailOrigin = null;
    this.selectedRecentOrderedProduct = null;
    this.selectedCustomerUserEmail = null;
    this.selectedCustomerUserOrderId = null;
    this.selectedSupportTicketId = null;
    this.requestedOrderDetailId = null;
    this.requestedProductDetailId = null;

    if (tab !== 'products') {
      this.closeProductModal(true, false);
      this.closeSectionModal(true, false);
    }

    if (tab !== 'accounts') {
      this.closeSubAdminModal(true, false);
    }

    if (tab !== 'users') {
      this.closeCustomerUserModal(false);
    }

    if (tab === 'users' && this.isAuthenticated) {
      this.reloadCustomerUsers.emit();
    }

    if (tab === 'recent' && this.latestRecentOrderedProduct) {
      this.openRecentOrder(this.latestRecentOrderedProduct, syncRoute);
      return;
    }

    this.clearDetails.emit();
    this.syncDocumentScrollLock();
    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  setSupportFilter(filter: SupportTicketFilter): void {
    this.activeSupportFilter = filter;
    this.selectedSupportTicketId = null;
  }

  setCustomerUserFilter(filter: CustomerUserFilter): void {
    this.activeCustomerUserFilter = filter;
    this.customerUsersPageIndex = 0;
  }

  setCustomerUserSearchQuery(query: string): void {
    this.customerUserSearchQuery = query;
    this.customerUsersPageIndex = 0;
  }

  clearCustomerUserSearchQuery(): void {
    this.setCustomerUserSearchQuery('');
  }

  goToCustomerUsersPage(pageIndex: number): void {
    const maxPageIndex = Math.max(0, this.customerUserPageCount - 1);
    this.customerUsersPageIndex = Math.max(0, Math.min(pageIndex, maxPageIndex));
  }

  goToPreviousCustomerUsersPage(): void {
    this.goToCustomerUsersPage(this.activeCustomerUsersPageIndex - 1);
  }

  goToNextCustomerUsersPage(): void {
    this.goToCustomerUsersPage(this.activeCustomerUsersPageIndex + 1);
  }

  setCatalogSectionFilter(category: string): void {
    this.catalogSectionFilter = category;
    this.scheduleCatalogSectionScroll();
  }

  setCatalogSearchQuery(query: string): void {
    this.catalogSearchQuery = query;
    this.scheduleCatalogSectionScroll();
  }

  handleLoginSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitLogin.emit();
  }

  handleProductSubmit(form: NgForm): void {
    if (form.invalid || !this.productForm.imageUrl) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitProduct.emit();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.imageSelected.emit(input.files?.[0] ?? null);
  }

  openOrderDetail(orderId: number, origin: AdminDetailOrigin = null, syncRoute = true): void {
    const resolvedOrigin =
      origin ??
      (this.activeTab === 'overview'
        ? 'overview'
        : this.activeTab === 'recent'
          ? 'recent'
          : this.activeTab === 'support'
            ? 'support'
            : 'orders');

    this.detailOrigin = resolvedOrigin;
    this.requestedOrderDetailId = orderId;
    this.requestedProductDetailId = null;

    if (resolvedOrigin === 'recent') {
      this.selectedRecentOrderedProduct =
        this.selectedRecentOrderedProduct?.orderId === orderId
          ? this.selectedRecentOrderedProduct
          : this.recentOrderedProducts.find((product) => product.orderId === orderId) ?? null;
    } else {
      this.selectedRecentOrderedProduct = null;
    }

    if (resolvedOrigin === 'overview' || resolvedOrigin === 'support') {
      this.activeTab = 'orders';
    }

    if (this.isAuthenticated) {
      this.orderSelect.emit(orderId);
    }

    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  openOrderDetailFromAction(event: Event, orderId: number): void {
    event.stopPropagation();
    this.openOrderDetail(orderId);
  }

  openSupportOrderDetail(event: Event, orderReference: string): void {
    event.stopPropagation();
    const orderId = this.extractOrderIdFromReference(orderReference);

    if (!orderId) {
      return;
    }

    this.closeSupportTicketModal(false);
    this.openOrderDetail(orderId, 'support');
  }

  openProductDetail(productId: number, origin: AdminDetailOrigin = null, syncRoute = true): void {
    const resolvedOrigin =
      origin ??
      (this.activeTab === 'overview'
        ? 'overview'
        : this.activeTab === 'stock'
          ? 'stock'
          : this.activeTab === 'recent'
            ? 'recent'
            : 'orders');

    this.requestedProductDetailId = productId;
    this.requestedOrderDetailId = null;

    if (resolvedOrigin === 'overview') {
      this.detailOrigin = 'overview';
      this.selectedRecentOrderedProduct = null;
    } else if (resolvedOrigin === 'stock') {
      this.detailOrigin = 'stock';
      this.selectedRecentOrderedProduct = null;
    } else if (resolvedOrigin === 'recent') {
      this.detailOrigin = 'recent';
      this.selectedRecentOrderedProduct =
        this.selectedRecentOrderedProduct?.productId === productId
          ? this.selectedRecentOrderedProduct
          : this.recentOrderedProducts.find((product) => product.productId === productId) ?? null;
    } else {
      this.detailOrigin = 'orders';
      this.selectedRecentOrderedProduct = null;
    }

    if (this.isAuthenticated) {
      this.productSelect.emit(productId);
    }

    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  openProductDetailFromAction(event: Event, productId: number): void {
    event.stopPropagation();
    this.openProductDetail(productId);
  }

  beginProductEdit(productId: number, syncRoute = true): void {
    this.activeTab = 'products';
    this.detailOrigin = null;
    this.selectedRecentOrderedProduct = null;
    this.requestedOrderDetailId = null;
    this.requestedProductDetailId = null;
    this.isProductModalOpen = true;
    this.clearDetails.emit();
    if (this.isAuthenticated) {
      this.productEditSelect.emit(productId);
    }
    this.syncDocumentScrollLock();
    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  beginProductEditFromAction(event: Event, productId: number): void {
    event.stopPropagation();
    this.beginProductEdit(productId);
  }

  resetProductEditor(): void {
    this.clearProductEditor.emit();
  }

  openNewProductModal(syncRoute = true): void {
    this.activeTab = 'products';
    this.detailOrigin = null;
    this.selectedRecentOrderedProduct = null;
    this.selectedSupportTicketId = null;
    this.requestedOrderDetailId = null;
    this.requestedProductDetailId = null;
    this.isProductModalOpen = true;
    this.clearDetails.emit();
    this.clearProductEditor.emit();
    this.syncDocumentScrollLock();
    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  openNewSectionModal(syncRoute = true): void {
    this.activeTab = 'products';
    this.detailOrigin = null;
    this.selectedRecentOrderedProduct = null;
    this.selectedSupportTicketId = null;
    this.requestedOrderDetailId = null;
    this.requestedProductDetailId = null;
    this.editingSectionId = null;
    this.newSectionName = '';
    this.sectionSearchQuery = '';
    this.isSectionModalOpen = true;
    this.syncDocumentScrollLock();
    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  beginSectionEdit(sectionId: number, syncRoute = true): void {
    const section = this.managedSections.find((item) => item.id === sectionId);

    if (!section) {
      return;
    }

    this.activeTab = 'products';
    this.detailOrigin = null;
    this.selectedRecentOrderedProduct = null;
    this.selectedSupportTicketId = null;
    this.requestedOrderDetailId = null;
    this.requestedProductDetailId = null;
    this.editingSectionId = section.id;
    this.newSectionName = section.name;
    this.sectionSearchQuery = '';
    this.isSectionModalOpen = true;
    this.syncDocumentScrollLock();
    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  closeProductModal(resetEditor = true, syncRoute = true): void {
    if (this.submitting) {
      return;
    }

    this.isProductModalOpen = false;
    this.syncDocumentScrollLock();

    if (resetEditor) {
      this.clearProductEditor.emit();
    }

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  closeSectionModal(resetDraft = true, syncRoute = true): void {
    if (this.sectionSubmitting) {
      return;
    }

    this.isSectionModalOpen = false;
    this.editingSectionId = null;
    this.sectionSearchQuery = '';
    this.syncDocumentScrollLock();

    if (resetDraft) {
      this.newSectionName = '';
    }

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  createNewProductFromModal(): void {
    this.clearProductEditor.emit();
    this.syncAdminRoute();
  }

  openSubAdminModal(syncRoute = true): void {
    if (!this.isMainAdmin) {
      return;
    }

    this.isSubAdminModalOpen = true;
    this.syncDocumentScrollLock();
    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  closeSubAdminModal(resetDraft = true, syncRoute = true): void {
    if (this.subAdminSubmitting) {
      return;
    }

    this.isSubAdminModalOpen = false;
    this.syncDocumentScrollLock();

    if (resetDraft) {
      this.resetSubAdminForm();
    }

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  submitNewSection(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    const sectionName = this.newSectionName.trim();

    if (this.editingSectionId !== null) {
      this.updateSection.emit({
        sectionId: this.editingSectionId,
        name: sectionName
      });
      return;
    }

    this.createSection.emit(sectionName);
  }

  submitNewSubAdmin(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.createSubAdmin.emit({
      name: this.newSubAdmin.name.trim(),
      email: this.newSubAdmin.email.trim().toLowerCase(),
      phone: this.normalizePhone(this.newSubAdmin.phone),
      password: this.newSubAdmin.password.trim()
    });
  }

  cancelSectionEdit(): void {
    if (this.sectionSubmitting) {
      return;
    }

    this.editingSectionId = null;
    this.newSectionName = '';
    this.syncAdminRoute();
  }

  requestSectionDelete(sectionId: number): void {
    if (!this.canDeleteCatalog || this.sectionSubmitting) {
      return;
    }

    const section = this.managedSections.find((item) => item.id === sectionId);

    if (!section) {
      return;
    }

    const productCount = this.getSectionAvailableProductCount(section.name);
    const confirmationMessage =
      productCount > 0
        ? `Delete the "${section.name}" section and ${productCount} ${
            productCount === 1 ? 'product' : 'products'
          } inside it?`
        : `Delete the "${section.name}" section?`;

    if (
      typeof window !== 'undefined' &&
      !window.confirm(confirmationMessage)
    ) {
      return;
    }

    this.deleteSection.emit(sectionId);
  }

  requestProductDelete(productId: number): void {
    if (!this.canDeleteCatalog || this.submitting) {
      return;
    }

    const product =
      this.products.find((item) => item.id === productId) ??
      (this.selectedProductDetail?.id === productId ? this.selectedProductDetail : null);
    const productName = product?.name || 'this product';

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete "${productName}" from the catalog?`)
    ) {
      return;
    }

    this.deleteProduct.emit(productId);
  }

  requestProductDeleteFromAction(event: Event, productId: number): void {
    event.stopPropagation();
    this.requestProductDelete(productId);
  }

  requestAdminAccountDelete(adminId: number): void {
    if (!this.isMainAdmin || this.subAdminSubmitting) {
      return;
    }

    const account = this.visibleAdminAccounts.find((item) => item.id === adminId);

    if (!account || account.role !== 'sub_admin') {
      return;
    }

    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Delete sub-admin "${account.email}"?`)
    ) {
      return;
    }

    this.deleteSubAdmin.emit(adminId);
  }

  requestCustomerUserDelete(user: AdminCustomerUser): void {
    if (!this.isMainAdmin || this.isDeletingCustomerUser(user.email)) {
      return;
    }

    const activitySummary = [
      user.orderCount ? `${user.orderCount} ${user.orderCount === 1 ? 'order' : 'orders'}` : '',
      user.ticketCount ? `${user.ticketCount} ${user.ticketCount === 1 ? 'support ticket' : 'support tickets'}` : ''
    ]
      .filter(Boolean)
      .join(' and ');
    const displayName = user.name || user.email;
    const confirmationMessage = activitySummary
      ? `Delete "${displayName}" from store users? This removes ${activitySummary} for ${user.email}.`
      : `Delete "${displayName}" from store users?`;

    if (typeof window !== 'undefined' && !window.confirm(confirmationMessage)) {
      return;
    }

    this.deleteCustomerUser.emit(user.email);
  }

  isDeletingCustomerUser(email: string): boolean {
    return this.deletingCustomerUserEmail === String(email || '').trim().toLowerCase();
  }

  openCustomerUserModal(user: AdminCustomerUser): void {
    const normalizedEmail = String(user.email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return;
    }

    const requestId = ++this.customerUserOrdersRequestId;
    this.selectedCustomerUserEmail = normalizedEmail;
    this.selectedCustomerUserOrderId = null;
    this.customerUserOrders = [];
    this.customerUserOrdersLoading = true;
    this.customerUserOrdersError = '';
    this.syncDocumentScrollLock();

    this.storeService.getAdminCustomerUserOrders(normalizedEmail).subscribe({
      next: (orders) => {
        const normalizedOrders = Array.isArray(orders) ? [...orders] : [];

        if (!normalizedOrders.length && user.orderCount > 0) {
          this.loadCustomerUserOrdersFallback(normalizedEmail, requestId);
          return;
        }

        this.applyCustomerUserOrdersState(normalizedEmail, requestId, normalizedOrders);
      },
      error: (error: Error) => {
        if (user.orderCount > 0) {
          this.loadCustomerUserOrdersFallback(normalizedEmail, requestId, error.message);
          return;
        }

        this.applyCustomerUserOrdersState(normalizedEmail, requestId, [], error.message);
      }
    });
  }

  openCustomerUserModalFromAction(event: Event, user: AdminCustomerUser): void {
    event.stopPropagation();
    this.openCustomerUserModal(user);
  }

  closeCustomerUserModal(syncScrollLock = true): void {
    this.customerUserOrdersRequestId += 1;
    this.selectedCustomerUserEmail = null;
    this.selectedCustomerUserOrderId = null;
    this.customerUserOrders = [];
    this.customerUserOrdersLoading = false;
    this.customerUserOrdersError = '';

    if (syncScrollLock) {
      this.syncDocumentScrollLock();
    }
  }

  togglePasswordVisibility(field: 'adminLogin' | 'subAdmin'): void {
    if (field === 'adminLogin') {
      this.showAdminLoginPassword = !this.showAdminLoginPassword;
      return;
    }

    this.showSubAdminPassword = !this.showSubAdminPassword;
  }

  openCustomerUserOrderDetail(event: Event, orderId: number): void {
    event.stopPropagation();

    if (!Number.isInteger(orderId) || orderId <= 0) {
      return;
    }

    this.selectedCustomerUserOrderId = orderId;

    if (this.isAuthenticated) {
      this.orderSelect.emit(orderId);
    }
  }

  isCustomerUserOrderSelected(orderId: number): boolean {
    return this.selectedCustomerUserOrderId === orderId;
  }

  getSectionAvailableProductCount(sectionName: string): number {
    const normalizedSectionName = String(sectionName || '').trim().toLowerCase();

    return this.catalogProducts.filter(
      (product) => String(product.category || '').trim().toLowerCase() === normalizedSectionName
    ).length;
  }

  openRecentOrderedProduct(product: AdminRecentOrderedProduct, syncRoute = true): void {
    this.selectedRecentOrderedProduct = product;
    this.detailOrigin = 'recent';
    this.requestedProductDetailId = product.productId;
    this.requestedOrderDetailId = null;
    if (this.isAuthenticated) {
      this.productSelect.emit(product.productId);
    }
    this.scrollViewportToTop();
    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  openRecentOrderedProductFromAction(event: Event, product: AdminRecentOrderedProduct): void {
    event.stopPropagation();
    this.openRecentOrderedProduct(product);
  }

  openRecentOrder(product: AdminRecentOrderedProduct, syncRoute = true): void {
    this.selectedRecentOrderedProduct = product;
    this.detailOrigin = 'recent';
    this.requestedOrderDetailId = product.orderId;
    this.requestedProductDetailId = null;
    if (this.isAuthenticated) {
      this.orderSelect.emit(product.orderId);
    }
    this.scrollViewportToTop();
    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  openRecentOrderFromAction(event: Event, product: AdminRecentOrderedProduct): void {
    event.stopPropagation();
    this.openRecentOrder(product);
  }

  closeDetailView(syncRoute = true): void {
    const returnTab = this.getReturnTabForCurrentDetail();
    this.detailOrigin = null;
    this.selectedRecentOrderedProduct = null;
    this.requestedOrderDetailId = null;
    this.requestedProductDetailId = null;
    this.clearDetails.emit();

    if (returnTab) {
      this.activeTab = returnTab;
    }

    this.scrollViewportToTop();

    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  openSupportTicketModal(ticketId: number, syncRoute = true): void {
    this.selectedSupportTicketId = ticketId;
    this.syncDocumentScrollLock();
    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  closeSupportTicketModal(syncRoute = true): void {
    this.selectedSupportTicketId = null;
    this.syncDocumentScrollLock();
    if (syncRoute) {
      this.syncAdminRoute();
    }
  }

  private scrollCatalogSectionToStart(): void {
    const sectionElement = this.catalogSectionStart?.nativeElement;

    if (!sectionElement) {
      return;
    }

    const toolbarHeight = this.catalogToolbar?.nativeElement.getBoundingClientRect().height ?? 0;
    const workspaceElement = this.adminWorkspace?.nativeElement;

    if (workspaceElement) {
      const workspaceTop = workspaceElement.getBoundingClientRect().top;
      const sectionTop = sectionElement.getBoundingClientRect().top;
      const targetTop = Math.max(
        0,
        workspaceElement.scrollTop + (sectionTop - workspaceTop) - toolbarHeight - 20
      );

      workspaceElement.scrollTo({ top: targetTop, behavior: 'smooth' });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const sectionTop = window.scrollY + sectionElement.getBoundingClientRect().top;
    const targetTop = Math.max(0, sectionTop - toolbarHeight - 20);
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  }

  private scheduleCatalogSectionScroll(): void {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => this.scrollCatalogSectionToStart());
      return;
    }

    queueMicrotask(() => this.scrollCatalogSectionToStart());
  }

  getSupportFilterCount(filter: SupportTicketFilter): number {
    if (filter === 'all') {
      return this.supportTickets.length;
    }

    return this.supportTickets.filter((ticket) => ticket.status === filter).length;
  }

  getSupportStatusLabel(status: AdminSupportTicketStatus): string {
    const labels: Record<AdminSupportTicketStatus, string> = {
      open: 'Open',
      in_progress: 'In progress',
      resolved: 'Resolved',
      closed: 'Closed'
    };

    return labels[status];
  }

  getSupportReply(ticket: AdminSupportTicket): string {
    return this.supportReplyDrafts[ticket.id] ?? ticket.adminResponse ?? '';
  }

  updateSupportReply(ticketId: number, value: string): void {
    this.supportReplyDrafts = {
      ...this.supportReplyDrafts,
      [ticketId]: value
    };
  }

  submitSupportTicketUpdate(ticketId: number, status: AdminSupportTicketStatus): void {
    this.supportTicketUpdate.emit({
      ticketId,
      status,
      adminResponse: (this.supportReplyDrafts[ticketId] || '').trim(),
      action: 'save_reply'
    });
  }

  handleSupportTicketAction(
    ticketId: number,
    status: AdminSupportTicketStatus,
    action: SupportTicketAction
  ): void {
    this.supportTicketUpdate.emit({
      ticketId,
      status,
      adminResponse: (this.supportReplyDrafts[ticketId] || '').trim(),
      action
    });
    this.closeSupportTicketModal();
  }

  isSupportTicketUpdating(ticketId: number): boolean {
    return this.supportUpdatingTicketId === ticketId;
  }

  canMarkSupportInProgress(status: AdminSupportTicketStatus): boolean {
    return status === 'open';
  }

  canResolveSupportTicket(status: AdminSupportTicketStatus): boolean {
    return status === 'open' || status === 'in_progress';
  }

  canCloseSupportTicket(status: AdminSupportTicketStatus): boolean {
    return status !== 'closed';
  }

  canReopenSupportTicket(status: AdminSupportTicketStatus): boolean {
    return status !== 'open';
  }

  getCatalogProduct(productId: number): Product | null {
    return this.products.find((product) => product.id === productId) ?? null;
  }

  getRecentUnitPrice(product: Pick<AdminRecentOrderedProduct, 'lineTotal' | 'quantity'>): number {
    return product.quantity > 0 ? product.lineTotal / product.quantity : 0;
  }

  getRecentOrderItems(): AdminOrderDetailItem[] {
    return this.selectedOrderDetail?.items ?? [];
  }

  getAdminRoleLabel(role: AdminUser['role']): string {
    return role === 'main_admin' ? 'Main admin' : 'Sub admin';
  }

  getAdminCustomerSourceLabel(user: AdminCustomerUser): string {
    if (user.hasAccount && user.orderCount === 0 && user.ticketCount === 0) {
      return 'Account only';
    }

    if (user.hasAccount && user.orderCount > 0 && user.ticketCount > 0) {
      return 'Account + activity';
    }

    if (user.hasAccount && user.orderCount > 0) {
      return 'Account + orders';
    }

    if (user.hasAccount && user.ticketCount > 0) {
      return 'Account + support';
    }

    if (user.orderCount > 0 && user.ticketCount > 0) {
      return 'Orders + support';
    }

    if (user.ticketCount > 0) {
      return 'Support only';
    }

    return 'Orders only';
  }

  getAdminCustomerLastActivity(user: AdminCustomerUser): string | null {
    return (
      user.lastActivityAt ||
      user.lastOrderAt ||
      user.lastTicketAt ||
      user.accountUpdatedAt ||
      user.accountCreatedAt ||
      null
    );
  }

  getAdminCustomerJoinedAt(user: AdminCustomerUser): string | null {
    return user.accountCreatedAt || user.accountUpdatedAt || this.getAdminCustomerLastActivity(user);
  }

  getCustomerUserFilterCount(filter: CustomerUserFilter): number {
    if (filter === 'all') {
      return this.visibleCustomerUsers.length;
    }

    return this.visibleCustomerUsers.filter((user) =>
      this.matchesCustomerUserFilter(user, filter)
    ).length;
  }

  getDetailBackLabel(): string {
    switch (this.getReturnTabForCurrentDetail()) {
      case 'overview':
        return 'Back to dashboard';
      case 'support':
        return 'Back to support inbox';
      case 'stock':
        return 'Back to out of stock';
      case 'recent':
        return 'Back to recent activity';
      case 'orders':
      default:
        return 'Back to orders and sales';
    }
  }

  private applyAdminRouteFromLocation(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const path = this.normalizePath(window.location.pathname);
    this.persistAdminRoute(path);

    if (!path.startsWith('/admin')) {
      return;
    }

    const segments = path.split('/').filter(Boolean);
    const section = segments[1] ?? 'dashboard';
    this.isApplyingAdminRoute = true;

    try {
      this.requestedOrderDetailId = null;
      this.requestedProductDetailId = null;
      this.detailOrigin = null;
      this.selectedRecentOrderedProduct = null;
      this.closeSupportTicketModal(false);
      this.closeProductModal(false, false);
      this.closeSectionModal(false, false);
      this.closeSubAdminModal(false, false);

      if (section === 'support' && segments[2] === 'ticket') {
        const ticketId = this.extractRouteNumber(segments[3]);

        if (ticketId) {
          this.setActiveTab('support', false);
          this.openSupportTicketModal(ticketId, false);
          return;
        }
      }

      if (section === 'products' && segments[2] === 'section') {
        if (segments[3] === 'new') {
          this.openNewSectionModal(false);
          return;
        }

        const sectionId = this.extractRouteNumber(segments[3]);

        if (sectionId && segments[4] === 'edit') {
          this.beginSectionEdit(sectionId, false);
          return;
        }
      }

      if (section === 'products' && segments[2] === 'product') {
        if (segments[3] === 'new') {
          this.openNewProductModal(false);
          return;
        }

        const productEditorId = this.extractRouteNumber(segments[3]);

        if (productEditorId && segments[4] === 'edit') {
          this.beginProductEdit(productEditorId, false);
          return;
        }
      }

      if (section === 'accounts' && segments[2] === 'sub-admin' && segments[3] === 'new') {
        this.setActiveTab('accounts', false);
        this.openSubAdminModal(false);
        return;
      }

      if (segments[2] === 'order') {
        const orderId = this.extractRouteNumber(segments[3]);
        const origin = this.mapPathSegmentToDetailOrigin(section);

        if (orderId && origin) {
          this.activeTab = this.getDisplayTabForOrderOrigin(origin);
          this.openOrderDetail(orderId, origin, false);
          return;
        }
      }

      if (segments[2] === 'product') {
        const productId = this.extractRouteNumber(segments[3]);
        const origin = this.mapPathSegmentToDetailOrigin(section);

        if (productId && origin) {
          this.activeTab = this.getDisplayTabForProductOrigin(origin);
          this.openProductDetail(productId, origin, false);
          return;
        }
      }

      this.setActiveTab(this.mapPathSegmentToAdminTab(section) ?? 'overview', false);
    } finally {
      this.isApplyingAdminRoute = false;
      this.syncDocumentScrollLock();
    }
  }

  private syncAdminRoute(replace = false): void {
    if (this.isApplyingAdminRoute || typeof window === 'undefined') {
      return;
    }

    const nextPath = this.buildAdminRoutePath();
    const currentPath = this.normalizePath(window.location.pathname);
    this.persistAdminRoute(nextPath);

    if (currentPath === nextPath) {
      return;
    }

    window.history[replace ? 'replaceState' : 'pushState']({}, '', nextPath);
  }

  private buildAdminRoutePath(): string {
    if (this.selectedSupportTicketId !== null) {
      return `/admin/support/ticket/${this.selectedSupportTicketId}`;
    }

    if (this.isProductModalOpen) {
      return this.editingProductId !== null
        ? `/admin/products/product/${this.editingProductId}/edit`
        : '/admin/products/product/new';
    }

    if (this.isSectionModalOpen) {
      return this.editingSectionId !== null
        ? `/admin/products/section/${this.editingSectionId}/edit`
        : '/admin/products/section/new';
    }

    if (this.isSubAdminModalOpen) {
      return '/admin/accounts/sub-admin/new';
    }

    if (this.requestedOrderDetailId !== null) {
      return `/admin/${this.getDetailOriginPathSegment(this.detailOrigin)}/order/${this.requestedOrderDetailId}`;
    }

    if (this.requestedProductDetailId !== null) {
      return `/admin/${this.getDetailOriginPathSegment(this.detailOrigin)}/product/${this.requestedProductDetailId}`;
    }

    return `/admin/${this.getTabPathSegment(this.activeTab)}`;
  }

  private getReturnTabForCurrentDetail(): AdminTab {
    switch (this.detailOrigin) {
      case 'overview':
        return 'overview';
      case 'support':
        return 'support';
      case 'stock':
        return 'stock';
      case 'recent':
        return 'recent';
      case 'orders':
      default:
        return 'orders';
    }
  }

  private getDisplayTabForOrderOrigin(origin: Exclude<AdminDetailOrigin, null>): AdminTab {
    switch (origin) {
      case 'overview':
      case 'support':
      case 'orders':
        return 'orders';
      case 'recent':
        return 'recent';
      case 'stock':
        return 'stock';
    }
  }

  private getDisplayTabForProductOrigin(origin: Exclude<AdminDetailOrigin, null>): AdminTab {
    switch (origin) {
      case 'overview':
        return 'overview';
      case 'stock':
        return 'stock';
      case 'recent':
        return 'recent';
      case 'support':
      case 'orders':
      default:
        return 'orders';
    }
  }

  private getDetailOriginPathSegment(origin: AdminDetailOrigin): string {
    switch (origin) {
      case 'overview':
        return 'dashboard';
      case 'support':
        return 'support';
      case 'recent':
        return 'recent';
      case 'stock':
        return 'stock';
      case 'orders':
      default:
        return 'orders';
    }
  }

  private getTabPathSegment(tab: AdminTab): string {
    switch (tab) {
      case 'overview':
        return 'dashboard';
      case 'products':
        return 'products';
      case 'orders':
        return 'orders';
      case 'recent':
        return 'recent';
      case 'stock':
        return 'stock';
      case 'support':
        return 'support';
      case 'accounts':
        return 'accounts';
      case 'users':
        return 'users';
    }
  }

  private mapPathSegmentToAdminTab(segment: string): AdminTab | null {
    switch (segment) {
      case 'dashboard':
        return 'overview';
      case 'products':
        return 'products';
      case 'orders':
        return 'orders';
      case 'recent':
        return 'recent';
      case 'stock':
        return 'stock';
      case 'support':
        return 'support';
      case 'accounts':
        return 'accounts';
      case 'users':
        return 'users';
      default:
        return null;
    }
  }

  private mapPathSegmentToDetailOrigin(segment: string): Exclude<AdminDetailOrigin, null> | null {
    switch (segment) {
      case 'dashboard':
        return 'overview';
      case 'orders':
        return 'orders';
      case 'recent':
        return 'recent';
      case 'stock':
        return 'stock';
      case 'support':
        return 'support';
      default:
        return null;
    }
  }

  private extractRouteNumber(value: string | undefined): number | null {
    const parsedValue = Number.parseInt(String(value || '').trim(), 10);
    return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
  }

  private normalizePath(pathname: string): string {
    const normalizedPath = pathname.replace(/\/+$/, '');
    return normalizedPath || '/';
  }

  private persistAdminRoute(path: string): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const normalizedPath = this.normalizePath(path);

    if (!normalizedPath.startsWith('/admin')) {
      return;
    }

    localStorage.setItem(this.routeStorageKey, normalizedPath);
  }

  private scrollViewportToTop(): void {
    const workspaceElement = this.adminWorkspace?.nativeElement;

    if (workspaceElement) {
      workspaceElement.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  ngOnDestroy(): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.remove('admin-scroll-lock');
    document.documentElement.classList.remove('admin-scroll-lock');
  }

  private resetSubAdminForm(): void {
    this.newSubAdmin = {
      name: '',
      email: '',
      phone: '',
      password: ''
    };

    queueMicrotask(() => this.subAdminFormRef?.resetForm(this.newSubAdmin));
  }

  private normalizePhone(value: string): string {
    return String(value || '').replace(/\D/g, '');
  }

  private matchesCatalogSearch(product: Product, normalizedQuery: string): boolean {
    const searchableText = [
      product.name,
      product.category,
      product.description,
      product.badge
    ]
      .join(' ')
      .toLowerCase();

    return searchableText.includes(normalizedQuery);
  }

  private matchesCustomerUserFilter(user: AdminCustomerUser, filter: CustomerUserFilter): boolean {
    switch (filter) {
      case 'account_only':
        return user.hasAccount && user.orderCount === 0 && user.ticketCount === 0;
      case 'orders_only':
        return user.orderCount > 0 && user.ticketCount === 0;
      case 'support_only':
        return user.ticketCount > 0 && user.orderCount === 0;
      case 'mixed':
        return user.orderCount > 0 && user.ticketCount > 0;
      case 'open_tickets':
        return user.openTicketCount > 0;
      case 'all':
      default:
        return true;
    }
  }

  private clampCustomerUserPageIndex(): void {
    const maxPageIndex = Math.max(
      0,
      Math.ceil(this.filteredCustomerUsers.length / this.customerUsersPageSize) - 1
    );
    this.customerUsersPageIndex = Math.max(0, Math.min(this.customerUsersPageIndex, maxPageIndex));
  }

  private extractOrderIdFromReference(orderReference: string | null | undefined): number | null {
    const match = String(orderReference ?? '')
      .trim()
      .toUpperCase()
      .match(/(\d+)$/);

    if (!match?.[1]) {
      return null;
    }

    const orderId = Number.parseInt(match[1], 10);
    return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
  }

  private syncSupportReplyDrafts(tickets: AdminSupportTicket[]): void {
    const nextDrafts: Record<number, string> = {};

    for (const ticket of tickets) {
      nextDrafts[ticket.id] = this.supportReplyDrafts[ticket.id] ?? ticket.adminResponse ?? '';
    }

    this.supportReplyDrafts = nextDrafts;
  }

  private syncDocumentScrollLock(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const hasModalOpen =
      this.isProductModalOpen ||
      this.isSectionModalOpen ||
      this.isSubAdminModalOpen ||
      this.selectedCustomerUser !== null ||
      this.selectedSupportTicket !== null;

    document.body.classList.toggle('admin-scroll-lock', hasModalOpen);
    document.documentElement.classList.toggle('admin-scroll-lock', hasModalOpen);
  }

  private loadCustomerUserOrdersFallback(
    normalizedEmail: string,
    requestId: number,
    primaryErrorMessage = ''
  ): void {
    this.storeService.getCustomerOrders(normalizedEmail).subscribe({
      next: (orders) => {
        this.applyCustomerUserOrdersState(
          normalizedEmail,
          requestId,
          orders.map((order) => this.toAdminCustomerOrderSummary(order))
        );
      },
      error: (error: Error) => {
        this.applyCustomerUserOrdersState(
          normalizedEmail,
          requestId,
          [],
          primaryErrorMessage || error.message
        );
      }
    });
  }

  private applyCustomerUserOrdersState(
    normalizedEmail: string,
    requestId: number,
    orders: AdminCustomerOrderSummary[],
    errorMessage = ''
  ): void {
    this.ngZone.run(() => {
      if (
        requestId !== this.customerUserOrdersRequestId ||
        this.selectedCustomerUserEmail !== normalizedEmail
      ) {
        return;
      }

      this.customerUserOrders = orders;
      this.customerUserOrdersError = errorMessage;
      this.customerUserOrdersLoading = false;
      this.changeDetectorRef.detectChanges();
    });
  }

  private toAdminCustomerOrderSummary(order: {
    orderId: number;
    orderReference: string;
    itemCount: number;
    totalAmount: number;
    status: string;
    createdAt: string;
    leadProductName: string;
    leadCategory: string;
    leadImageUrl: string;
  }): AdminCustomerOrderSummary {
    return {
      orderId: Number(order.orderId || 0),
      orderReference: String(order.orderReference || '').trim().toUpperCase(),
      itemCount: Number(order.itemCount || 0),
      totalAmount: Number(order.totalAmount || 0),
      status: String(order.status || '').trim(),
      createdAt: String(order.createdAt || ''),
      leadProductName: String(order.leadProductName || '').trim(),
      leadCategory: String(order.leadCategory || '').trim(),
      leadImageUrl: String(order.leadImageUrl || '').trim()
    };
  }
}
