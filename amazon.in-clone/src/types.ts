export interface Product {
  id: string;
  name: string;
  category: string;
  categoryKey: string; // e.g., 'appliances', 'revamp', 'essentials', 'brands'
  subCategoryKey: string; // e.g., 'ac', 'fridge', 'microwave', 'wm'
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  imageUrl: string;
  description: string;
  features: string[];
  inStock: boolean;
  brand: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface UserSession {
  isLoggedIn: boolean;
  name: string;
  email: string;
  pincode: string;
  city: string;
  isVerifiedSeller?: boolean;
  verifiedPhone?: string;
  verifiedIdType?: string;
  verifiedIdNum?: string;
}

export interface CarouselBanner {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  bgColor: string;
  textPosition: 'left' | 'right';
  textColor: string;
  linkText: string;
  tagline?: string;
  accentText?: string;
}

export interface Order {
  id: string; // e.g. AMZN-IN-123456
  orderDate: string;
  items: CartItem[];
  subtotal: number;
  paymentMethod: string;
  shippingAddress: string;
  status: 'Preparing' | 'Shipped' | 'Out for Delivery' | 'Delivered' | 'Returned' | 'Return Requested' | 'Replacement In-Transit';
  expectedDelivery: string;
}

