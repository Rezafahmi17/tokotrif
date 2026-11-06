import Link from 'next/link';import {ShoppingBag,MapPin,MessageCircle,ShieldCheck} from 'lucide-react';
export default function Footer(){
 return (
  <footer className="footer">
   <div className="container footer-grid">
    <div>
     <Link href="/" className="brand" aria-label="Beranda KampusBalik">
      <img src="/logo.png" alt="KampusBalik Logo" className="brand-logo-img" style={{width:38,height:38}}/>
      <span className="brand-text">Kampus<span className="brand-accent">Balik</span></span>
     </Link>
     <p style={{fontStyle:'italic',color:'#fcd34d',fontWeight:600,margin:'8px 0 6px',fontSize:12}}>
      &ldquo;Find It. Love It. Reuse It.&rdquo;
     </p>
     <p>
      Marketplace jual beli & preloved mahasiswa dan komunitas kampus terpercaya. Temukan barang favorit, sepakati titik temu, dan bayar tunai saat bertemu (COD).
     </p>
     <div className="footer-trust">
      <ShieldCheck size={16}/> Pembayaran Tunai (COD) Kampus
     </div>
    </div>
    <div>
     <h4>Jelajahi Kampus</h4>
     <Link href="/cari">Semua produk</Link>
     <Link href="/cari?sort=bestseller">Paling laris</Link>
     <Link href="/cari?sort=price_asc">Promo hemat</Link>
     <Link href="/#toko-pilihan">Toko pilihan</Link>
    </div>
    <div>
     <h4>Untuk Penjual</h4>
     <Link href="/daftar-toko">Buka toko mahasiswa</Link>
     <Link href="/masuk">Masuk penjual</Link>
     <Link href="/admin-toko">Pusat penjual</Link>
    </div>
    <div>
     <h4>Bantuan & Akun</h4>
     <Link href="/chat"><MessageCircle size={14}/> Chat penjual</Link>
     <Link href="/pesanan">Lacak pesanan</Link>
     <Link href="/akun">Pengaturan akun</Link>
    </div>
   </div>
   <div className="container footer-bottom">
    <span>© {new Date().getFullYear()} KampusBalik. Platform Marketplace COD Kampus & Preloved.</span>
    <span>Dirancang untuk transaksi tatap muka yang aman, ramah kantong, dan transparan.</span>
   </div>
  </footer>
 );
}
