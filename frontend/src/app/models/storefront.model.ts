import { Product } from './product.model';

export type CartItem = Product & {
  quantity: number;
};

export type ViewMode =
  | 'home'
  | 'discover'
  | 'account'
  | 'orders'
  | 'support'
  | 'product'
  | 'checkout'
  | 'confirmation'
  | 'admin'
  | 'signin'
  | 'signup';

export type NavigationView = Extract<ViewMode, 'discover' | 'account' | 'orders' | 'support'>;
export type HeaderLanguage = 'EN' | 'TA';
export type HeaderLanguageOption = HeaderLanguage | 'HI';

export type HeroAction = ViewMode | 'catalog';

export interface HeroVisual {
  image: string;
  alt: string;
  category: string;
}

export interface NavLink {
  id: NavigationView;
  label: string;
}

export interface StoreSection {
  id: number;
  name: string;
  sortOrder: number;
}

export interface HeroSlide {
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  secondaryCta: string;
  background: string;
  surface: string;
  accent: string;
  category?: string;
  visuals?: HeroVisual[];
  primaryAction: HeroAction;
  secondaryAction: HeroAction;
}

export interface PromoBoard {
  title: string;
  description: string;
  image: string;
  tags: string[];
  category: string;
}

export interface CollectionCard {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  category: string;
}

export interface SupportCard {
  icon: string;
  title: string;
  text: string;
}

export interface FooterColumn {
  title: string;
  links: string[];
}

export interface HighlightCard {
  icon: string;
  title: string;
  text: string;
}

export interface FaqItem {
  title: string;
  text: string;
}

export interface CheckoutForm {
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  paymentMethod: string;
  cardHolderName: string;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  notes: string;
}

export interface SavedDeliveryAddress {
  id: string;
  accountEmail: string;
  customerName: string;
  email: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthForm {
  name: string;
  phone: string;
  email: string;
  identifier: string;
  password: string;
  passwordHint: string;
  acceptTerms: boolean;
}

export interface AuthPasswordResetPayload {
  identifier: string;
  passwordHint: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RegisteredAccount {
  name: string;
  phone: string;
  email: string;
  password: string;
  passwordHint: string;
}

export interface CustomerAccountRecord {
  name: string;
  phone: string;
  email: string;
  passwordHint: string;
  createdAt: string;
  updatedAt: string;
}

export interface AccountProfileForm {
  name: string;
  phone: string;
  email: string;
  currentPassword: string;
}

export interface AccountPasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  passwordHint: string;
}

export interface AccountRecoveryProfile {
  name: string;
  phone: string;
  email: string;
  latestOrderId: number | null;
}

export type CheckoutStage = 'cart' | 'details';
export type AdminTab =
  | 'overview'
  | 'products'
  | 'orders'
  | 'recent'
  | 'stock'
  | 'support'
  | 'accounts'
  | 'users';

export interface AdminLoginForm {
  identifier: string;
  password: string;
}

export interface AdminProductForm {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  imageName: string;
  price: string;
  rating: string;
  stock: string;
  badge: string;
  featured: boolean;
}
