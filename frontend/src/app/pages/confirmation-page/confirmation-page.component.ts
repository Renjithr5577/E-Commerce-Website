import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { OrderResponse } from '../../models/order.model';

@Component({
  selector: 'app-confirmation-page',
  imports: [CommonModule, CurrencyPipe],
  templateUrl: './confirmation-page.component.html'
})
export class ConfirmationPageComponent {
  @Input({ required: true }) receipt!: OrderResponse | null;

  @Output() continueShopping = new EventEmitter<void>();
  @Output() contactSupport = new EventEmitter<void>();
}
