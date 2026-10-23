export interface CheckoutItemPayload {
  productId: number;
  quantity: number;
}

export interface PaymentCardSnapshot {
  cardHolderName: string;
  cardNumber: string;
  last4: string;
  expiry: string;
  brand: string;
}

export interface CheckoutPayload {
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  paymentMethod: string;
  paymentCard?: PaymentCardSnapshot | null;
  notes: string;
  items: CheckoutItemPayload[];
}

export interface OrderResponse {
  orderId: number;
  orderReference: string;
  itemCount: number;
  totalAmount: number;
  customerName: string;
  email: string;
  estimatedDelivery: string;
}

export interface CustomerOrderDetailItem {
  productId: number;
  productName: string;
  category: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CustomerOrderDetail {
  orderId: number;
  orderReference: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  paymentMethod: string;
  paymentCard: PaymentCardSnapshot | null;
  notes: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: CustomerOrderDetailItem[];
}

export interface CustomerOrderSummary {
  orderId: number;
  orderReference: string;
  customerName: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  leadProductName: string;
  leadCategory: string;
  leadImageUrl: string;
  leadBadge: string;
}

export interface CustomerRecentOrderedProduct {
  orderId: number;
  productId: number;
  productName: string;
  category: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  status: string;
  createdAt: string;
  badge: string;
}
