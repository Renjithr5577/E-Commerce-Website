import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';

import {
  AdminCustomerOrderSummary,
  AdminCustomerUser,
  AdminCreateSubAdminPayload,
  AdminDeletedAccount,
  AdminDeletedCustomerUser,
  AdminOrderDetail,
  AdminOverview,
  AdminSession,
  AdminSupportTicket,
  AdminSupportTicketUpdatePayload,
  AdminSupportTicketUpdateResponse,
  AdminUser
} from '../models/admin.model';
import {
  CheckoutPayload,
  CustomerOrderDetail,
  CustomerOrderSummary,
  CustomerRecentOrderedProduct,
  OrderResponse,
  PaymentCardSnapshot
} from '../models/order.model';
import { Product, ProductCreatePayload } from '../models/product.model';
import {
  AccountRecoveryProfile,
  CustomerAccountRecord,
  SavedPaymentCard,
  StoreSection
} from '../models/storefront.model';
import {
  CustomerSupportTicket,
  SupportRequestPayload,
  SupportResponse
} from '../models/support.model';

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl =
    (
      globalThis as typeof globalThis & {
        __LUXECART_API_URL__?: string;
      }
    ).__LUXECART_API_URL__ || 'http://localhost:3000/api';
  private readonly curatedImages: Record<string, string> = {
    'Heritage Leather Tote':
      'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1200&q=80',
    'Sienna Lounge Chair':
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    'Studio Ceramic Set':
      'https://images.unsplash.com/photo-1612196808214-b40fba4f3358?auto=format&fit=crop&w=1200&q=80',
    'Aurora Table Lamp':
      'https://images.unsplash.com/photo-1540932239986-30128078f3c5?auto=format&fit=crop&w=1200&q=80',
    'Motion Running Sneakers':
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=80',
    'Sunday Knit Throw':
      'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=1200&q=80',
    'Northwind Jacket':
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80',
    'Foundry Desk Organizer':
      'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80'
  };
  private adminSessionToken: string | null = null;

  setAdminSession(token: string | null): void {
    this.adminSessionToken = token?.trim() || null;
  }

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`).pipe(
      map((products) => products.map((product) => this.hydrateProduct(product))),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not running yet. Start the Express server on port 3000 and check your MySQL connection.'
            : error.error?.message || 'Something went wrong while loading the store data.';

        return throwError(() => new Error(message));
      })
    );
  }

  getStoreSections(): Observable<StoreSection[]> {
    return this.http.get<StoreSection[]>(`${this.apiUrl}/store-sections`).pipe(
      map((sections) =>
        sections
          .map((section) => ({
            id: Number(section.id),
            name: String(section.name || '').trim(),
            sortOrder: Number(section.sortOrder || 0)
          }))
          .filter((section) => section.name.length > 0)
      ),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the backend before loading store sections.'
            : error.error?.message || 'We could not load the store sections right now.';

        return throwError(() => new Error(message));
      })
    );
  }

  createStoreSection(name: string): Observable<StoreSection> {
    return this.http
      .post<StoreSection>(
        `${this.apiUrl}/store-sections`,
        { name },
        this.getAdminRequestOptions()
      )
      .pipe(
      map((section) => ({
        id: Number(section.id),
        name: String(section.name || '').trim(),
        sortOrder: Number(section.sortOrder || 0)
      })),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the backend before adding a store section.'
            : error.status === 401
              ? error.error?.message || 'Admin session expired. Please sign in again.'
            : error.error?.message || 'We could not add the store section right now.';

        return throwError(() => new Error(message));
      })
    );
  }

  updateStoreSection(sectionId: number, name: string): Observable<StoreSection> {
    return this.http
      .put<StoreSection>(
        `${this.apiUrl}/store-sections/${sectionId}`,
        { name },
        this.getAdminRequestOptions()
      )
      .pipe(
      map((section) => ({
        id: Number(section.id),
        name: String(section.name || '').trim(),
        sortOrder: Number(section.sortOrder || 0)
      })),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the backend before updating a store section.'
            : error.status === 401
              ? error.error?.message || 'Admin session expired. Please sign in again.'
            : error.error?.message || 'We could not update the store section right now.';

        return throwError(() => new Error(message));
      })
    );
  }

  deleteStoreSection(
    sectionId: number
  ): Observable<{ sectionId: number; name: string; deletedProductCount: number }> {
    return this.http
      .delete<{ sectionId: number; name: string; deletedProductCount: number }>(
        `${this.apiUrl}/store-sections/${sectionId}`,
        this.getAdminRequestOptions()
      )
      .pipe(
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the backend before deleting a store section.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
              : error.error?.message || 'We could not delete the store section right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  createProduct(payload: ProductCreatePayload): Observable<Product> {
    return this.http
      .post<Product>(`${this.apiUrl}/products`, payload, this.getAdminRequestOptions())
      .pipe(
      map((product) => this.hydrateProduct(product)),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server before adding products.'
            : error.status === 401
              ? error.error?.message || 'Admin session expired. Please sign in again.'
            : error.error?.message || 'We could not add the product. Please review the admin form and try again.';

        return throwError(() => new Error(message));
      })
    );
  }

  updateProduct(productId: number, payload: ProductCreatePayload): Observable<Product> {
    return this.http
      .put<Product>(`${this.apiUrl}/products/${productId}`, payload, this.getAdminRequestOptions())
      .pipe(
      map((product) => this.hydrateProduct(product)),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server before updating products.'
            : error.status === 401
              ? error.error?.message || 'Admin session expired. Please sign in again.'
            : error.error?.message || 'We could not update the product. Please review the form and try again.';

        return throwError(() => new Error(message));
      })
    );
  }

  deleteProduct(
    productId: number
  ): Observable<{ productId: number; name: string; category: string }> {
    return this.http
      .delete<{ productId: number; name: string; category: string }>(
        `${this.apiUrl}/products/${productId}`,
        this.getAdminRequestOptions()
      )
      .pipe(
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server before deleting products.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
              : error.error?.message || 'We could not delete the product right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  placeOrder(payload: CheckoutPayload): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(`${this.apiUrl}/orders`, payload).pipe(
      map((receipt) => this.hydrateOrderResponse(receipt)),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server and try the checkout again.'
            : error.error?.message || 'We could not place the order. Please review the checkout details and try again.';

        return throwError(() => new Error(message));
      })
    );
  }

  loginAdmin(identifier: string, password: string): Observable<AdminSession> {
    return this.http
      .post<AdminSession>(`${this.apiUrl}/admin/login`, {
        identifier,
        password
      })
      .pipe(
        map((session) => ({
          token: String(session.token || '').trim(),
          admin: this.hydrateAdminUser(session.admin)
        })),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to sign in as admin.'
              : error.error?.message || 'We could not sign in as admin right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  registerCustomerAccount(payload: {
    name: string;
    email: string;
    phone: string;
    password: string;
    passwordHint: string;
  }): Observable<CustomerAccountRecord> {
    return this.http
      .post<CustomerAccountRecord>(`${this.apiUrl}/auth/register`, payload)
      .pipe(
        map((account) => this.hydrateCustomerAccountRecord(account)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server before creating a customer account.'
              : error.error?.message || 'We could not create the customer account right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  loginCustomerAccount(
    identifier: string,
    password: string
  ): Observable<CustomerAccountRecord> {
    return this.http
      .post<CustomerAccountRecord>(`${this.apiUrl}/auth/login`, {
        identifier,
        password
      })
      .pipe(
        map((account) => this.hydrateCustomerAccountRecord(account)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server before signing in.'
              : error.error?.message || 'We could not sign in to that customer account right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  updateCustomerAccountProfile(payload: {
    email: string;
    currentPassword: string;
    name: string;
    phone: string;
  }): Observable<CustomerAccountRecord> {
    return this.http
      .patch<CustomerAccountRecord>(`${this.apiUrl}/auth/profile`, payload)
      .pipe(
        map((account) => this.hydrateCustomerAccountRecord(account)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server before saving account details.'
              : error.error?.message || 'We could not save the customer account details right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  updateCustomerAccountPassword(payload: {
    identifier: string;
    currentPassword: string;
    newPassword: string;
  }): Observable<CustomerAccountRecord> {
    return this.http
      .patch<CustomerAccountRecord>(`${this.apiUrl}/auth/password`, payload)
      .pipe(
        map((account) => this.hydrateCustomerAccountRecord(account)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server before updating the customer password.'
              : error.error?.message || 'We could not update the customer password right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  resetCustomerAccountPassword(payload: {
    identifier: string;
    passwordHint: string;
    newPassword: string;
  }): Observable<CustomerAccountRecord> {
    return this.http
      .patch<CustomerAccountRecord>(`${this.apiUrl}/auth/password-reset`, payload)
      .pipe(
        map((account) => this.hydrateCustomerAccountRecord(account)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server before resetting the customer password.'
              : error.error?.message || 'We could not reset the customer password right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  logoutAdmin(): Observable<{ signedOut: boolean }> {
    return this.http
      .post<{ signedOut: boolean }>(
        `${this.apiUrl}/admin/logout`,
        {},
        this.getAdminRequestOptions()
      )
      .pipe(
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to end the admin session.'
              : error.error?.message || 'We could not sign out the admin session right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getAdminOverview(): Observable<AdminOverview> {
    return this.http
      .get<AdminOverview>(`${this.apiUrl}/admin/overview`, this.getAdminRequestOptions())
      .pipe(
      map((overview) => this.hydrateAdminOverview(overview)),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server to load admin insights.'
            : error.status === 401
              ? error.error?.message || 'Admin session expired. Please sign in again.'
            : error.error?.message || 'We could not load the admin dashboard right now.';

        return throwError(() => new Error(message));
      })
    );
  }

  getAdminOrderDetail(orderId: number): Observable<AdminOrderDetail> {
    return this.http
      .get<AdminOrderDetail>(
        `${this.apiUrl}/admin/orders/${orderId}`,
        this.getAdminRequestOptions()
      )
      .pipe(
      map((order) => this.hydrateAdminOrderDetail(order)),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server to load full order details.'
            : error.status === 401
              ? error.error?.message || 'Admin session expired. Please sign in again.'
            : error.error?.message || 'We could not load the full order details right now.';

        return throwError(() => new Error(message));
      })
    );
  }

  getAdminAccounts(): Observable<AdminUser[]> {
    return this.http
      .get<AdminUser[]>(`${this.apiUrl}/admin/accounts`, this.getAdminRequestOptions())
      .pipe(
        map((accounts) => accounts.map((account) => this.hydrateAdminUser(account))),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to load admin accounts.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
                : error.error?.message || 'We could not load the admin accounts right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getAdminUsers(): Observable<AdminCustomerUser[]> {
    return this.http
      .get<AdminCustomerUser[]>(`${this.apiUrl}/admin/users`, this.getAdminRequestOptions())
      .pipe(
        map((users) =>
          users.map((user) => ({
            accountId:
              user.accountId === null || user.accountId === undefined
                ? null
                : Number(user.accountId),
            hasAccount: Boolean(user.hasAccount),
            name: String(user.name || '').trim(),
            email: String(user.email || '').trim().toLowerCase(),
            phone: String(user.phone || '').replace(/\D/g, ''),
            latestOrderReference: String(user.latestOrderReference || '').trim().toUpperCase(),
            orderCount: Number(user.orderCount || 0),
            ticketCount: Number(user.ticketCount || 0),
            openTicketCount: Number(user.openTicketCount || 0),
            totalSpent: Number(user.totalSpent || 0),
            accountCreatedAt: user.accountCreatedAt || null,
            accountUpdatedAt: user.accountUpdatedAt || null,
            lastOrderAt: user.lastOrderAt || null,
            lastTicketAt: user.lastTicketAt || null,
            lastActivityAt: user.lastActivityAt || null
          }))
        ),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to load store users.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
                : error.error?.message || 'We could not load the store users right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  deleteAdminCustomerUser(email: string): Observable<AdminDeletedCustomerUser> {
    return this.http
      .delete<AdminDeletedCustomerUser>(`${this.apiUrl}/admin/users`, {
        ...this.getAdminRequestOptions(),
        params: {
          email: String(email || '').trim().toLowerCase()
        }
      })
      .pipe(
        map((result) => ({
          name: String(result.name || '').trim(),
          email: String(result.email || '').trim().toLowerCase(),
          deletedAccountCount: Number(result.deletedAccountCount || 0),
          deletedOrderCount: Number(result.deletedOrderCount || 0),
          deletedTicketCount: Number(result.deletedTicketCount || 0)
        })),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to delete a store user.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
                : error.status === 403
                  ? error.error?.message || 'Only the main admin can delete store users.'
                  : error.error?.message || 'We could not delete the store user right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getAdminCustomerUserOrders(
    email: string
  ): Observable<AdminCustomerOrderSummary[]> {
    return this.http
      .get<AdminCustomerOrderSummary[] | { orders?: AdminCustomerOrderSummary[]; items?: AdminCustomerOrderSummary[]; data?: AdminCustomerOrderSummary[] }>(`${this.apiUrl}/admin/users/orders`, {
        ...this.getAdminRequestOptions(),
        params: {
          email: String(email || '').trim().toLowerCase()
        }
      })
      .pipe(
        map((response) => this.normalizeAdminCustomerOrderSummaryCollection(response)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to load the user order history.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
                : error.error?.message || 'We could not load that user order history right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  createSubAdmin(payload: AdminCreateSubAdminPayload): Observable<AdminUser> {
    return this.http
      .post<AdminUser>(`${this.apiUrl}/admin/sub-admins`, payload, this.getAdminRequestOptions())
      .pipe(
        map((admin) => this.hydrateAdminUser(admin)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to create a sub-admin.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
                : error.status === 403
                  ? error.error?.message || 'Only the main admin can create sub-admin accounts.'
                  : error.error?.message || 'We could not create the sub-admin account right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  deleteSubAdmin(adminId: number): Observable<AdminDeletedAccount> {
    return this.http
      .delete<AdminDeletedAccount>(
        `${this.apiUrl}/admin/sub-admins/${adminId}`,
        this.getAdminRequestOptions()
      )
      .pipe(
        map((result) => ({
          adminId: Number(result.adminId || 0),
          name: String(result.name || '').trim(),
          email: String(result.email || '').trim().toLowerCase(),
          phone: String(result.phone || '').replace(/\D/g, ''),
          role: (result.role === 'main_admin' ? 'main_admin' : 'sub_admin') as
            | 'main_admin'
            | 'sub_admin'
        })),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to delete a sub-admin.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
                : error.status === 403
                  ? error.error?.message || 'Only the main admin can delete sub-admin accounts.'
                  : error.error?.message || 'We could not delete the sub-admin account right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getCustomerOrders(email: string): Observable<CustomerOrderSummary[]> {
    return this.http
      .get<CustomerOrderSummary[]>(`${this.apiUrl}/orders`, {
        params: { email }
      })
      .pipe(
        map((orders) => orders.map((order) => this.hydrateCustomerOrderSummary(order))),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to load your orders.'
              : error.error?.message || 'We could not load your orders right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getCustomerSavedPaymentCards(email: string): Observable<SavedPaymentCard[]> {
    return this.http
      .get<SavedPaymentCard[]>(`${this.apiUrl}/payment-cards`, {
        params: { email }
      })
      .pipe(
        map((cards) => cards.map((card) => this.hydrateSavedPaymentCard(card))),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to load your saved payment cards.'
              : error.error?.message || 'We could not load your saved payment cards right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  deleteCustomerSavedPaymentCard(cardId: number, email: string): Observable<{ deleted: boolean }> {
    return this.http
      .delete<{ deleted: boolean }>(`${this.apiUrl}/payment-cards/${cardId}`, {
        params: { email }
      })
      .pipe(
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to delete your saved payment card.'
              : error.error?.message || 'We could not delete that saved payment card right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getCustomerLatestOrder(email: string): Observable<CustomerOrderDetail | null> {
    return this.http
      .get<CustomerOrderDetail | null>(`${this.apiUrl}/orders/latest`, {
        params: { email }
      })
      .pipe(
        map((order) => (order ? this.hydrateCustomerOrderDetail(order) : null)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to load your latest order.'
              : error.error?.message || 'We could not load your latest order right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getCustomerOrderDetail(orderId: number, email: string): Observable<CustomerOrderDetail> {
    return this.http
      .get<CustomerOrderDetail>(`${this.apiUrl}/orders/${orderId}`, {
        params: { email }
      })
      .pipe(
        map((order) => this.hydrateCustomerOrderDetail(order)),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to load your full order detail.'
              : error.error?.message || 'We could not load that order detail right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getCustomerRecentOrderedProducts(email: string): Observable<CustomerRecentOrderedProduct[]> {
    return this.http
      .get<CustomerRecentOrderedProduct[]>(`${this.apiUrl}/orders/recent-products`, {
        params: { email }
      })
      .pipe(
        map((products) => products.map((product) => this.hydrateCustomerRecentOrderedProduct(product))),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to load your ordered products.'
              : error.error?.message || 'We could not load your ordered products right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  getCustomerRecoveryProfile(identifier: string): Observable<AccountRecoveryProfile> {
    return this.http
      .get<AccountRecoveryProfile>(`${this.apiUrl}/auth/recovery-profile`, {
        params: { identifier }
      })
      .pipe(
        map((profile) => ({
          ...profile,
          latestOrderId:
            profile.latestOrderId === null || profile.latestOrderId === undefined
              ? null
              : Number(profile.latestOrderId),
          phone: String(profile.phone || '').replace(/\D/g, ''),
          email: String(profile.email || '').trim().toLowerCase(),
          name: String(profile.name || '').trim()
        })),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the server to restore your account details.'
              : error.error?.message ||
                'We could not find an account or previous order for that email or mobile number.';

          return throwError(() => new Error(message));
        })
      );
  }

  getProductById(productId: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${productId}`).pipe(
      map((product) => this.hydrateProduct(product)),
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server to load the product details.'
            : error.error?.message || 'We could not load that product right now.';

        return throwError(() => new Error(message));
      })
    );
  }

  submitSupport(payload: SupportRequestPayload): Observable<SupportResponse> {
    return this.http.post<SupportResponse>(`${this.apiUrl}/support`, payload).pipe(
      catchError((error) => {
        const message =
          error.status === 0
            ? 'The backend API is not reachable right now. Start the Express server before sending a support request.'
            : error.error?.message || 'We could not send the support request. Please review the form and try again.';

        return throwError(() => new Error(message));
      })
    );
  }

  getCustomerSupportTickets(email: string): Observable<CustomerSupportTicket[]> {
    return this.http
      .get<CustomerSupportTicket[]>(`${this.apiUrl}/support`, {
        params: { email }
      })
      .pipe(
        map((tickets) => tickets.map((ticket) => this.hydrateCustomerSupportTicket(ticket))),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to load support updates.'
              : error.error?.message || 'We could not load your support updates right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  updateAdminSupportTicket(
    ticketId: number,
    payload: AdminSupportTicketUpdatePayload
  ): Observable<AdminSupportTicketUpdateResponse> {
    return this.http
      .patch<AdminSupportTicketUpdateResponse>(
        `${this.apiUrl}/admin/support/${ticketId}`,
        payload,
        this.getAdminRequestOptions()
      )
      .pipe(
        map((response) => ({
          ...response,
          ticket: this.hydrateAdminSupportTicket(response.ticket),
          openTicketCount: Number(response.openTicketCount || 0)
        })),
        catchError((error) => {
          const message =
            error.status === 0
              ? 'The backend API is not reachable right now. Start the Express server to update support tickets.'
              : error.status === 401
                ? error.error?.message || 'Admin session expired. Please sign in again.'
              : error.error?.message || 'We could not update that support ticket right now.';

          return throwError(() => new Error(message));
        })
      );
  }

  private resolveProductImageByName(productName: string, imageUrl: string): string {
    const curatedImage = this.curatedImages[String(productName || '').trim()];

    if (curatedImage) {
      return curatedImage;
    }

    return String(imageUrl || '').trim();
  }

  private resolveProductImage(product: Product): string {
    return this.resolveProductImageByName(product.name, product.imageUrl);
  }

  private hydrateProduct(product: Product): Product {
    return {
      ...product,
      imageUrl: this.resolveProductImage(product),
      price: Number(product.price),
      rating: Number(product.rating),
      stock: Number(product.stock),
      featured: Boolean(product.featured)
    };
  }

  private hydrateAdminUser(admin: AdminUser): AdminUser {
    return {
      ...admin,
      id: Number(admin.id || 0),
      name: String(admin.name || '').trim(),
      email: String(admin.email || '').trim().toLowerCase(),
      phone: String(admin.phone || '').replace(/\D/g, ''),
      role: admin.role === 'main_admin' ? 'main_admin' : 'sub_admin',
      createdByAdminId:
        admin.createdByAdminId === null || admin.createdByAdminId === undefined
          ? null
          : Number(admin.createdByAdminId),
      createdByEmail: admin.createdByEmail
        ? String(admin.createdByEmail).trim().toLowerCase()
        : null
    };
  }

  private hydrateAdminSupportTicket(ticket: AdminSupportTicket): AdminSupportTicket {
    return {
      ...ticket,
      adminResponse: ticket.adminResponse || ''
    };
  }

  private hydrateCustomerAccountRecord(account: CustomerAccountRecord): CustomerAccountRecord {
    return {
      name: String(account.name || '').trim(),
      email: String(account.email || '').trim().toLowerCase(),
      phone: String(account.phone || '').replace(/\D/g, ''),
      passwordHint: String(account.passwordHint || '').trim(),
      createdAt: String(account.createdAt || ''),
      updatedAt: String(account.updatedAt || '')
    };
  }

  private hydrateAdminCustomerOrderSummary(
    order: AdminCustomerOrderSummary
  ): AdminCustomerOrderSummary {
    return {
      ...order,
      orderId: Number(order.orderId || 0),
      orderReference: String(order.orderReference || '').trim().toUpperCase(),
      itemCount: Number(order.itemCount || 0),
      totalAmount: Number(order.totalAmount || 0),
      status: String(order.status || '').trim(),
      createdAt: String(order.createdAt || ''),
      leadProductName: String(order.leadProductName || '').trim(),
      leadCategory: String(order.leadCategory || '').trim(),
      leadImageUrl: this.resolveProductImageByName(order.leadProductName, order.leadImageUrl)
    };
  }

  private normalizeAdminCustomerOrderSummaryCollection(
    response:
      | AdminCustomerOrderSummary[]
      | {
          orders?: AdminCustomerOrderSummary[];
          items?: AdminCustomerOrderSummary[];
          data?: AdminCustomerOrderSummary[];
        }
  ): AdminCustomerOrderSummary[] {
    const rawOrders = Array.isArray(response)
      ? response
      : Array.isArray(response?.orders)
        ? response.orders
        : Array.isArray(response?.items)
          ? response.items
          : Array.isArray(response?.data)
            ? response.data
            : [];

    return rawOrders.map((order) => this.hydrateAdminCustomerOrderSummary(order));
  }

  private hydrateAdminOverview(overview: AdminOverview): AdminOverview {
    return {
      ...overview,
      productCount: Number(overview.productCount || 0),
      inventoryUnits: Number(overview.inventoryUnits || 0),
      lowStockCount: Number(overview.lowStockCount || 0),
      orderCount: Number(overview.orderCount || 0),
      soldUnits: Number(overview.soldUnits || 0),
      revenue: Number(overview.revenue || 0),
      openTicketCount: Number(overview.openTicketCount || 0),
      recentOrders: (overview.recentOrders || []).map((order) => ({
        ...order,
        orderId: Number(order.orderId || 0),
        itemCount: Number(order.itemCount || 0),
        totalAmount: Number(order.totalAmount || 0),
        customerName: String(order.customerName || '').trim(),
        email: String(order.email || '').trim().toLowerCase(),
        status: String(order.status || '').trim(),
        createdAt: String(order.createdAt || '')
      })),
      recentOrderedProducts: (overview.recentOrderedProducts || []).map((product) => ({
        ...product,
        orderId: Number(product.orderId || 0),
        productId: Number(product.productId || 0),
        productName: String(product.productName || '').trim(),
        customerName: String(product.customerName || '').trim(),
        category: String(product.category || '').trim(),
        imageUrl: this.resolveProductImageByName(product.productName, product.imageUrl),
        quantity: Number(product.quantity || 0),
        lineTotal: Number(product.lineTotal || 0),
        createdAt: String(product.createdAt || ''),
        badge: String(product.badge || '').trim()
      })),
      topProducts: (overview.topProducts || []).map((product) => ({
        ...product,
        productId: Number(product.productId || 0),
        productName: String(product.productName || '').trim(),
        unitsSold: Number(product.unitsSold || 0),
        revenue: Number(product.revenue || 0),
        currentStock: Number(product.currentStock || 0)
      })),
      outOfStockProducts: (overview.outOfStockProducts || []).map((product) => ({
        ...product,
        id: Number(product.id || 0),
        name: String(product.name || '').trim(),
        category: String(product.category || '').trim(),
        imageUrl: this.resolveProductImageByName(product.name, product.imageUrl),
        price: Number(product.price || 0),
        rating: Number(product.rating || 0),
        stock: Number(product.stock || 0),
        badge: String(product.badge || '').trim()
      })),
      recentTickets: (overview.recentTickets || []).map((ticket) =>
        this.hydrateAdminSupportTicket(ticket)
      )
    };
  }

  private hydrateAdminOrderDetail(order: AdminOrderDetail): AdminOrderDetail {
    return {
      ...order,
      orderId: Number(order.orderId || 0),
      orderReference: String(order.orderReference || '').trim().toUpperCase(),
      customerName: String(order.customerName || '').trim(),
      email: String(order.email || '').trim().toLowerCase(),
      phone: String(order.phone || '').replace(/\D/g, ''),
      paymentCard: this.hydratePaymentCardSnapshot(order.paymentCard),
      itemCount: Number(order.itemCount || 0),
      subtotal: Number(order.subtotal || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      totalAmount: Number(order.totalAmount || 0),
      items: (order.items || []).map((item) => ({
        ...item,
        productId: Number(item.productId || 0),
        productName: String(item.productName || '').trim(),
        category: String(item.category || '').trim(),
        imageUrl: this.resolveProductImageByName(item.productName, item.imageUrl),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || 0)
      }))
    };
  }

  private hydrateCustomerOrderSummary(order: CustomerOrderSummary): CustomerOrderSummary {
    return {
      ...order,
      orderId: Number(order.orderId || 0),
      orderReference: String(order.orderReference || '').trim().toUpperCase(),
      itemCount: Number(order.itemCount || 0),
      subtotal: Number(order.subtotal || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      totalAmount: Number(order.totalAmount || 0),
      leadProductName: String(order.leadProductName || '').trim(),
      leadCategory: String(order.leadCategory || '').trim(),
      leadImageUrl: this.resolveProductImageByName(order.leadProductName, order.leadImageUrl),
      leadBadge: String(order.leadBadge || '').trim()
    };
  }

  private hydrateCustomerOrderDetail(order: CustomerOrderDetail): CustomerOrderDetail {
    return {
      ...order,
      orderId: Number(order.orderId || 0),
      orderReference: String(order.orderReference || '').trim().toUpperCase(),
      itemCount: Number(order.itemCount || 0),
      subtotal: Number(order.subtotal || 0),
      deliveryFee: Number(order.deliveryFee || 0),
      totalAmount: Number(order.totalAmount || 0),
      customerName: String(order.customerName || '').trim(),
      email: String(order.email || '').trim().toLowerCase(),
      phone: String(order.phone || '').replace(/\D/g, ''),
      paymentCard: this.hydratePaymentCardSnapshot(order.paymentCard),
      items: (order.items || []).map((item) => ({
        ...item,
        productId: Number(item.productId || 0),
        productName: String(item.productName || '').trim(),
        category: String(item.category || '').trim(),
        imageUrl: this.resolveProductImageByName(item.productName, item.imageUrl),
        quantity: Number(item.quantity || 0),
        unitPrice: Number(item.unitPrice || 0),
        lineTotal: Number(item.lineTotal || 0)
      }))
    };
  }

  private hydratePaymentCardSnapshot(
    paymentCard: PaymentCardSnapshot | null | undefined
  ): PaymentCardSnapshot | null {
    if (!paymentCard) {
      return null;
    }

    const cardNumber = String(paymentCard.cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);
    const last4 = (cardNumber || String(paymentCard.last4 || ''))
      .replace(/\D/g, '')
      .slice(-4);
    const expiry = String(paymentCard.expiry || '').trim();

    if (!last4 || !expiry) {
      return null;
    }

    return {
      cardHolderName: String(paymentCard.cardHolderName || '').trim(),
      cardNumber,
      last4,
      expiry,
      brand: String(paymentCard.brand || '').trim() || 'Card'
    };
  }

  private hydrateSavedPaymentCard(card: SavedPaymentCard): SavedPaymentCard {
    const cardNumber = String(card.cardNumber || '')
      .replace(/\D/g, '')
      .slice(0, 16);

    return {
      ...card,
      id: String(card.id || '').trim(),
      accountEmail: String(card.accountEmail || '').trim().toLowerCase(),
      cardHolderName: String(card.cardHolderName || '').trim(),
      cardNumber,
      last4: (cardNumber || String(card.last4 || ''))
        .replace(/\D/g, '')
        .slice(-4),
      expiry: String(card.expiry || '').trim(),
      brand: String(card.brand || '').trim() || 'Card',
      createdAt: String(card.createdAt || ''),
      updatedAt: String(card.updatedAt || '')
    };
  }

  private hydrateCustomerRecentOrderedProduct(
    product: CustomerRecentOrderedProduct
  ): CustomerRecentOrderedProduct {
    return {
      ...product,
      orderId: Number(product.orderId || 0),
      productId: Number(product.productId || 0),
      productName: String(product.productName || '').trim(),
      category: String(product.category || '').trim(),
      imageUrl: this.resolveProductImageByName(product.productName, product.imageUrl),
      quantity: Number(product.quantity || 0),
      unitPrice: Number(product.unitPrice || 0),
      lineTotal: Number(product.lineTotal || 0),
      status: String(product.status || '').trim(),
      createdAt: String(product.createdAt || ''),
      badge: String(product.badge || '').trim()
    };
  }

  private hydrateOrderResponse(receipt: OrderResponse): OrderResponse {
    return {
      ...receipt,
      orderId: Number(receipt.orderId || 0),
      orderReference: String(receipt.orderReference || '').trim().toUpperCase(),
      itemCount: Number(receipt.itemCount || 0),
      totalAmount: Number(receipt.totalAmount || 0),
      customerName: String(receipt.customerName || '').trim(),
      email: String(receipt.email || '').trim().toLowerCase(),
      estimatedDelivery: String(receipt.estimatedDelivery || '').trim()
    };
  }

  private getAdminRequestOptions(): { headers?: HttpHeaders } {
    const token = this.adminSessionToken;

    if (!token) {
      return {};
    }

    return {
      headers: new HttpHeaders({
        Authorization: `Bearer ${token}`
      })
    };
  }

  private hydrateCustomerSupportTicket(ticket: CustomerSupportTicket): CustomerSupportTicket {
    return {
      ...ticket,
      adminResponse: ticket.adminResponse || ''
    };
  }
}
