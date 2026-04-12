export type AdminRole = 'main_admin' | 'sub_admin';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
  createdByAdminId: number | null;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCustomerUser {
  accountId: number | null;
  hasAccount: boolean;
  name: string;
  email: string;
  phone: string;
  latestOrderReference: string;
  orderCount: number;
  ticketCount: number;
  openTicketCount: number;
  totalSpent: number;
  accountCreatedAt: string | null;
  accountUpdatedAt: string | null;
  lastOrderAt: string | null;
  lastTicketAt: string | null;
  lastActivityAt: string | null;
}

export interface AdminCustomerOrderSummary {
  orderId: number;
  orderReference: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  leadProductName: string;
  leadCategory: string;
  leadImageUrl: string;
}

export interface AdminSession {
  token: string;
  admin: AdminUser;
}

export interface AdminCreateSubAdminPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AdminDeletedAccount {
  adminId: number;
  name: string;
  email: string;
  phone: string;
  role: AdminRole;
}

export interface AdminDeletedCustomerUser {
  name: string;
  email: string;
  deletedAccountCount: number;
  deletedOrderCount: number;
  deletedTicketCount: number;
}

export interface AdminRecentOrder {
  orderId: number;
  customerName: string;
  email: string;
  itemCount: number;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface AdminTopProduct {
  productId: number;
  productName: string;
  unitsSold: number;
  revenue: number;
  currentStock: number;
}

export interface AdminRecentOrderedProduct {
  orderId: number;
  productId: number;
  productName: string;
  customerName: string;
  category: string;
  imageUrl: string;
  quantity: number;
  lineTotal: number;
  createdAt: string;
  badge: string;
}

export interface AdminStockProduct {
  id: number;
  name: string;
  category: string;
  imageUrl: string;
  price: number;
  rating: number;
  stock: number;
  badge: string;
}

export interface AdminOrderDetailItem {
  productId: number;
  productName: string;
  category: string;
  imageUrl: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface AdminOrderDetail {
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
  notes: string;
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  items: AdminOrderDetailItem[];
}

export interface AdminSupportTicket {
  id: number;
  customerName: string;
  email: string;
  orderReference: string;
  issueType: string;
  subject: string;
  message: string;
  status: AdminSupportTicketStatus;
  adminResponse: string;
  createdAt: string;
  updatedAt: string;
}

export type AdminSupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface AdminSupportTicketUpdatePayload {
  status: AdminSupportTicketStatus;
  adminResponse: string;
}

export interface AdminSupportTicketUpdateResponse {
  ticket: AdminSupportTicket;
  openTicketCount: number;
}

export interface AdminOverview {
  productCount: number;
  inventoryUnits: number;
  lowStockCount: number;
  orderCount: number;
  soldUnits: number;
  revenue: number;
  openTicketCount: number;
  recentOrders: AdminRecentOrder[];
  recentOrderedProducts: AdminRecentOrderedProduct[];
  topProducts: AdminTopProduct[];
  outOfStockProducts: AdminStockProduct[];
  recentTickets: AdminSupportTicket[];
}
