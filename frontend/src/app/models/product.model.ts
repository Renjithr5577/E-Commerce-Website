export interface Product {
  id: number;
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  stock: number;
  featured: boolean;
  badge: string;
}

export interface ProductCreatePayload {
  name: string;
  category: string;
  description: string;
  imageUrl: string;
  price: number;
  rating: number;
  stock: number;
  featured: boolean;
  badge: string;
}
