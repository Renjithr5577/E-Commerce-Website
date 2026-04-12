import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
  CartItem,
  CheckoutForm,
  CheckoutStage,
  SavedDeliveryAddress
} from '../../models/storefront.model';

@Component({
  selector: 'app-checkout-page',
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './checkout-page.component.html'
})
export class CheckoutPageComponent {
  @Input({ required: true }) stage!: CheckoutStage;
  @Input({ required: true }) checkoutForm!: CheckoutForm;
  @Input({ required: true }) paymentOptions!: string[];
  @Input({ required: true }) checkoutError!: string;
  @Input({ required: true }) orderSubmitting!: boolean;
  @Input({ required: true }) isCheckoutDisabled!: boolean;
  @Input({ required: true }) cart!: CartItem[];
  @Input({ required: true }) savedItems!: CartItem[];
  @Input() savedAddresses: SavedDeliveryAddress[] = [];
  @Input() selectedAddressId: string | null = null;
  @Input({ required: true }) checkoutItemCount!: number;
  @Input({ required: true }) cartSubtotal!: number;
  @Input({ required: true }) deliveryFee!: number;
  @Input({ required: true }) cartTotal!: number;

  @Output() submitOrder = new EventEmitter<void>();
  @Output() proceedCheckout = new EventEmitter<void>();
  @Output() backHome = new EventEmitter<void>();
  @Output() backToCart = new EventEmitter<void>();
  @Output() openProduct = new EventEmitter<CartItem>();
  @Output() increaseQuantity = new EventEmitter<number>();
  @Output() decreaseQuantity = new EventEmitter<number>();
  @Output() deleteItem = new EventEmitter<number>();
  @Output() saveForLater = new EventEmitter<number>();
  @Output() moveToCart = new EventEmitter<number>();
  @Output() deleteSavedItem = new EventEmitter<number>();
  @Output() chooseSavedAddress = new EventEmitter<string>();
  @Output() confirmSavedAddress = new EventEmitter<string>();
  @Output() editSavedAddress = new EventEmitter<string>();
  @Output() deleteSavedAddress = new EventEmitter<string>();
  @Output() startNewAddress = new EventEmitter<void>();

  get requiresCardDetails(): boolean {
    return this.checkoutForm.paymentMethod === 'Card payment';
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.submitOrder.emit();
  }

  trackById(index: number, item: CartItem): number {
    return item.id;
  }

  getCartStockMessage(item: CartItem): string {
    const totalStock = Math.max(0, item.stock);
    const remainingStock = Math.max(0, totalStock - item.quantity);

    if (totalStock <= 0) {
      return 'Out of stock';
    }

    if (item.quantity >= totalStock) {
      return `All ${totalStock} available ${totalStock === 1 ? 'item is' : 'items are'} in your cart.`;
    }

    if (remainingStock <= 5) {
      return `Only ${remainingStock} ${remainingStock === 1 ? 'item is' : 'items are'} left in stock - order soon.`;
    }

    return 'In stock';
  }

  isCartStockWarning(item: CartItem): boolean {
    const remainingStock = Math.max(0, item.stock - item.quantity);
    return item.stock > 0 && item.quantity < item.stock && remainingStock <= 5;
  }

  selectPaymentMethod(option: string): void {
    this.checkoutForm.paymentMethod = option;

    if (option === 'Card payment') {
      return;
    }

    this.checkoutForm.cardHolderName = '';
    this.checkoutForm.cardNumber = '';
    this.checkoutForm.cardExpiry = '';
    this.checkoutForm.cardCvv = '';
  }
}
