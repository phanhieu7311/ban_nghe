import { Product } from './supabase';

export interface CartItem {
  product: Product;
  quantity: number;
}

const CART_KEY = 'ban_nghe_cart';

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(CART_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveCart(cart: CartItem[]): void {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export function addToCart(product: Product, quantity: number = 1): CartItem[] {
  const cart = getCart();
  const existingIndex = cart.findIndex(item => item.product.id === product.id);

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({ product, quantity });
  }

  saveCart(cart);
  return cart;
}

export function updateCartItemQuantity(productId: string, quantity: number): CartItem[] {
  const cart = getCart();
  const index = cart.findIndex(item => item.product.id === productId);

  if (index >= 0) {
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
  }

  saveCart(cart);
  return cart;
}

export function removeFromCart(productId: string): CartItem[] {
  const cart = getCart().filter(item => item.product.id !== productId);
  saveCart(cart);
  return cart;
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
}

export function getItemPrice(product: Product): number {
  return product.sale_price && product.sale_price < product.price
    ? product.sale_price
    : product.price;
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + getItemPrice(item.product) * item.quantity, 0);
}
