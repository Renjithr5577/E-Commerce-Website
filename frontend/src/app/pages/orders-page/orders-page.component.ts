import { CommonModule, DOCUMENT } from '@angular/common';
import {
  Component,
  EventEmitter,
  HostListener,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  RendererFactory2,
  SimpleChanges
} from '@angular/core';

import {
  CustomerOrderDetail,
  CustomerOrderSummary
} from '../../models/order.model';

@Component({
  selector: 'app-orders-page',
  imports: [CommonModule],
  templateUrl: './orders-page.component.html',
  styleUrl: './orders-page.component.css'
})
export class OrdersPageComponent implements OnChanges, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly renderer = inject(RendererFactory2).createRenderer(null, null);

  @Input() accountName: string | null = null;
  @Input() orders: CustomerOrderSummary[] = [];
  @Input() ordersLoading = false;
  @Input() ordersError = '';
  @Input() selectedOrder: CustomerOrderDetail | null = null;
  @Input() selectedOrderLoading = false;
  @Input() selectedOrderError = '';
  @Input() activeOrderId: number | null = null;

  @Output() backHome = new EventEmitter<void>();
  @Output() continueShopping = new EventEmitter<void>();
  @Output() requestSignIn = new EventEmitter<void>();
  @Output() showOrderDetail = new EventEmitter<number>();
  @Output() closeOrderDetail = new EventEmitter<void>();

  ngOnChanges(_: SimpleChanges): void {
    this.syncPageScrollLock();
  }

  ngOnDestroy(): void {
    this.unlockPageScroll();
  }

  get isOrderDialogOpen(): boolean {
    return (
      this.activeOrderId !== null ||
      this.selectedOrder !== null ||
      this.selectedOrderLoading ||
      !!this.selectedOrderError
    );
  }

  openOrderDetail(orderId: number): void {
    this.showOrderDetail.emit(orderId);
  }

  closeSelectedOrderDetail(): void {
    this.closeOrderDetail.emit();
  }

  handleOrderCardKeydown(event: KeyboardEvent, orderId: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.openOrderDetail(orderId);
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    if (this.isOrderDialogOpen) {
      this.closeSelectedOrderDetail();
    }
  }

  getOrderStatusLabel(status: string): string {
    return status
      .split('_')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  getOrderPreviewLabel(order: CustomerOrderSummary): string {
    if (order.itemCount <= 1) {
      return order.leadProductName;
    }

    return `${order.leadProductName} + ${order.itemCount - 1} more ${
      order.itemCount - 1 === 1 ? 'item' : 'items'
    }`;
  }

  private syncPageScrollLock(): void {
    if (this.isOrderDialogOpen) {
      this.lockPageScroll();
      return;
    }

    this.unlockPageScroll();
  }

  private lockPageScroll(): void {
    this.renderer.setStyle(this.document.documentElement, 'overflow', 'hidden');
    this.renderer.setStyle(this.document.body, 'overflow', 'hidden');
  }

  private unlockPageScroll(): void {
    this.renderer.removeStyle(this.document.documentElement, 'overflow');
    this.renderer.removeStyle(this.document.body, 'overflow');
  }
}
