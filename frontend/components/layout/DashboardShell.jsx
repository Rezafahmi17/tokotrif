'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {LayoutDashboard,Package,Boxes,ShoppingBag,Wallet,MessageCircle,Settings,Store,Tags,Images,ScrollText,Clock,QrCode} from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';

const storeLinks=[
 ['Dashboard','/admin-toko',LayoutDashboard],
 ['Produk','/admin-toko/produk',Package],
 ['Stok','/admin-toko/stok',Boxes],
 ['Pesanan','/admin-toko/pesanan',ShoppingBag],
 ['Komisi & QRIS','/admin-toko/komisi',QrCode],
 ['Keuangan','/admin-toko/keuangan',Wallet],
 ['Chat','/chat',MessageCircle],
 ['Pengaturan','/admin-toko/pengaturan',Settings]
];

const superLinks=[
 ['Dashboard','/super-admin',LayoutDashboard],
 ['Verifikasi Toko','/super-admin/verifikasi',Clock],
 ['Semua Toko','/super-admin/toko',Store],
 ['Komisi & QRIS','/super-admin/komisi',QrCode],
 ['Kategori','/super-admin/kategori',Tags],
 ['Banner','/super-admin/banner',Images],
 ['Audit Log','/super-admin/audit-log',ScrollText],
 ['Pengaturan','/super-admin/pengaturan',Settings]
];

export default function DashboardShell({kind,children}){
 const path=usePathname(),superAdmin=kind==='super',links=superAdmin?superLinks:storeLinks;
 const allowSuspended=!superAdmin&&path==='/admin-toko/komisi';
 return (
  <RouteGuard roles={[superAdmin?'super_admin':'admin_toko']} approved={!superAdmin} allowSuspended={allowSuspended}>
   <div className="container dashboard-shell">
    <aside className="dashboard-sidebar">
     <h3>{superAdmin?'PANEL SUPER ADMIN':'PUSAT PENJUAL'}</h3>
     {links.map(([name,url,Icon])=>(
      <Link href={url} key={name} className={path===url?'active':''}>
       <Icon size={17}/> {name}
      </Link>
     ))}
    </aside>
    <div className="dashboard-content">{children}</div>
   </div>
  </RouteGuard>
 );
}
