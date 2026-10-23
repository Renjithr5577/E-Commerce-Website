import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';

import {
  CartItem,
  CheckoutForm,
  CheckoutStage,
  SavedDeliveryAddress,
  SavedPaymentCard
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
  @Input() savedPaymentCards: SavedPaymentCard[] = [];
  @Input() selectedPaymentCardId: string | null = null;
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
  @Output() chooseSavedPaymentCard = new EventEmitter<string>();
  @Output() confirmSavedPaymentCard = new EventEmitter<string>();
  @Output() deleteSavedPaymentCard = new EventEmitter<string>();
  @Output() startNewPaymentCard = new EventEmitter<void>();
  @Output() invalidSubmitOrder = new EventEmitter<void>();

  get requiresCardDetails(): boolean {
    return this.checkoutForm.paymentMethod === 'Card payment';
  }

  get selectedSavedPaymentCard(): SavedPaymentCard | null {
    return this.savedPaymentCards.find((card) => card.id === this.selectedPaymentCardId) || null;
  }

  get usingSavedPaymentCard(): boolean {
    const selectedSavedCard = this.selectedSavedPaymentCard;
    const savedCardNumber = String(selectedSavedCard?.cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);
    const formCardNumber = String(this.checkoutForm.cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);

    return Boolean(
      this.requiresCardDetails &&
        selectedSavedCard &&
        /^\d{16}$/.test(savedCardNumber) &&
        String(this.checkoutForm.cardHolderName || '').trim() &&
        String(this.checkoutForm.cardExpiry || '').trim() &&
        formCardNumber === savedCardNumber
    );
  }

  handleSubmit(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      this.invalidSubmitOrder.emit();
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
      const selectedSavedCard = this.selectedSavedPaymentCard;

      if (selectedSavedCard) {
        this.checkoutForm.cardHolderName = selectedSavedCard.cardHolderName;
        this.checkoutForm.cardNumber = String(selectedSavedCard.cardNumber || '')
          .replace(/\D/g, '')
          .slice(0, 16);
        this.checkoutForm.cardExpiry = selectedSavedCard.expiry;
        this.checkoutForm.cardCvv = '';
      }

      return;
    }

    this.checkoutForm.cardHolderName = '';
    this.checkoutForm.cardNumber = '';
    this.checkoutForm.cardExpiry = '';
    this.checkoutForm.cardCvv = '';
  }

  sanitizeCardNumber(): void {
    this.checkoutForm.cardNumber = String(this.checkoutForm.cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);
  }

  sanitizeCardExpiry(): void {
    const digits = String(this.checkoutForm.cardExpiry || '')
      .replace(/\D/g, '')
      .slice(0, 4);

    this.checkoutForm.cardExpiry =
      digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  sanitizeCardCvv(): void {
    this.checkoutForm.cardCvv = String(this.checkoutForm.cardCvv || '')
      .replace(/\D/g, '')
      .slice(0, 4);
  }
}
