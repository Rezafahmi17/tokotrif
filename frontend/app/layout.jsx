import './globals.css';import {AuthProvider} from '@/context/AuthContext';import {CartProvider} from '@/context/CartContext';import {ToastProvider} from '@/components/ui/Toast';import Header from '@/components/layout/Header';import Footer from '@/components/layout/Footer';
export const metadata={
  title:'KampusBalik — Marketplace COD Kampus & Lokal',
  description:'KampusBalik: Find It. Love It. Reuse It. Marketplace jual beli, preloved kampus, dan produk lokal terpercaya. Bayar tunai saat bertemu (COD).',
  icons:{icon:'/logo.png',shortcut:'/logo.png',apple:'/logo.png'}
};
export default function RootLayout({children}){return <html lang="id"><body><AuthProvider><CartProvider><ToastProvider><Header/><main className="min-h-screen">{children}</main><Footer/></ToastProvider></CartProvider></AuthProvider></body></html>;}
