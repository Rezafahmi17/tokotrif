'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useRouter,usePathname} from 'next/navigation';
import {Search,ShoppingBag,Bell,Menu,X,UserRound,Store,Package,LogOut,MapPin,MessageCircle,ChevronDown,ShieldCheck} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {useCart} from '@/context/CartContext';
import {api} from '@/lib/api';

export default function Header(){
 const {user,logout}=useAuth(),{count}=useCart(),router=useRouter(),path=usePathname();
 const [query,setQuery]=useState(''),[menu,setMenu]=useState(false),[cats,setCats]=useState([]),[notif,setNotif]=useState([]),[openNot,setOpenNot]=useState(false),[openProfile,setOpenProfile]=useState(false),[city,setCity]=useState(''),[unreadChat,setUnreadChat]=useState(0);

 useEffect(()=>{api('/catalog/categories').then(setCats).catch(()=>{});},[]);
 useEffect(()=>{
  if(!user)return;
  api('/notifications').then(setNotif).catch(()=>{});
  if(['customer','admin_toko'].includes(user.role)){
   api('/chat/threads').then(threads=>{
    const total=(threads||[]).reduce((sum,t)=>sum+Number(user.role==='customer'?t.customer_unread:t.store_unread||0),0);
    setUnreadChat(total);
   }).catch(()=>{});
  }
 },[user?.id,path]);
 useEffect(()=>{setMenu(false);setOpenNot(false);setOpenProfile(false);},[path]);

 const search=e=>{
  e.preventDefault();
  router.push(`/cari?q=${encodeURIComponent(query)}${city?`&city=${encodeURIComponent(city)}`:''}`);
  setMenu(false);
 };

 const nav=[
  ['Semua Produk','/cari'],
  ['Promo Kampus','/cari?sort=price_asc'],
  ['Paling Laris','/cari?sort=bestseller'],
  ...(user&&['customer','admin_toko'].includes(user.role)?[['Riwayat Chat','/chat']]:[]),
  ['Buka Toko','/daftar-toko']
 ];

 const isDashboardPath=path?.startsWith('/super-admin')||path?.startsWith('/admin-toko');

 return (
  <>
   <header className="site-header">
    <div className="container header-main">
     <Link href="/" className="brand" aria-label="Beranda KampusBalik">
      <img src="/logo.png" alt="KampusBalik Logo" className="brand-logo-img"/>
      <span className="brand-text">Kampus<span className="brand-accent">Balik</span></span>
     </Link>

     <form className="searchbar desktop-searchbar" onSubmit={search}>
      <Search size={18}/>
      <input
       value={query}
       onChange={e=>setQuery(e.target.value)}
       placeholder="Cari buku kuliah, gawai, pakaian, atau barang preloved kampus..."
       aria-label="Cari produk"
      />
      <button type="submit">Cari</button>
     </form>

     <div className="header-actions">
      <Link href={user?.role==='admin_toko'?'/admin-toko':user?.role==='super_admin'?'/super-admin':'/pesanan'} title="Pesanan">
       <Package size={20}/>
       <span>Pesanan</span>
      </Link>

      {user&&['customer','admin_toko'].includes(user.role)&&(
       <Link href="/chat" title="Riwayat Chat" className="cart-nav">
        <MessageCircle size={20}/>
        <span>Chat</span>
        {unreadChat>0&&<i className="cart-count">{unreadChat}</i>}
       </Link>
      )}

      {user&&(
       <div className="notif-holder">
        <button title="Notifikasi" onClick={()=>{setOpenNot(!openNot);api('/notifications').then(setNotif).catch(()=>{});}}>
         <Bell size={20}/>
         {notif.some(n=>!n.is_read)&&<i className="dot"/>}
        </button>
        {openNot&&(
         <div className="notif-panel">
          <div className="between">
           <b>Notifikasi</b>
           <button className="small-link" onClick={async()=>{await api('/notifications/read-all',{method:'PATCH'});setNotif(a=>a.map(n=>({...n,is_read:true})));}}>Baca semua</button>
          </div>
          {notif.length?notif.slice(0,8).map(n=>(
           <Link key={n.id} href={n.link||'#'} onClick={()=>{setOpenNot(false);api(`/notifications/${n.id}/read`,{method:'PATCH'}).catch(()=>{});}} className={`notif-item ${!n.is_read?'unread':''}`}>
            <b>{n.title}</b>
            <span>{n.body}</span>
           </Link>
          )):<p className="muted text-sm" style={{padding:'12px 0'}}>Belum ada notifikasi.</p>}
         </div>
        )}
       </div>
      )}

      {user?.role==='customer'&&(
       <Link href="/keranjang" title="Keranjang" className="cart-nav">
        <ShoppingBag size={20}/>
        <span>Keranjang</span>
        {count>0&&<i className="cart-count">{count}</i>}
       </Link>
      )}

      {user?(
       <div className={`profile-menu ${openProfile?'profile-open':''}`}>
        <button type="button" onClick={()=>{setOpenProfile(!openProfile);setOpenNot(false);}}>
         <UserRound size={20}/>
         <span>{user.name.split(' ')[0]}</span>
         <ChevronDown size={13}/>
        </button>
        <div className="profile-dropdown">
         <strong>Halo, {user.name}</strong>
         <small>{user.email}</small>
         {user.role!=='super_admin'&&(
          <div style={{margin:'6px 0 8px'}}>
           <span className={`badge ${user.ktm_status==='verified'?'status-approved':user.ktm_status==='pending'?'status-pending':'status-rejected'}`} style={{fontSize:10}}>
            <ShieldCheck size={11} style={{display:'inline',marginRight:3}}/>
            {user.ktm_status==='verified'?'KTM Terverifikasi':user.ktm_status==='pending'?'KTM Menunggu Verifikasi':'KTM Belum Terverifikasi'}
           </span>
          </div>
         )}
         <Link href="/akun" onClick={()=>setOpenProfile(false)}>Pengaturan & Verifikasi KTM</Link>
         {['customer','admin_toko'].includes(user.role)&&<Link href="/chat" onClick={()=>setOpenProfile(false)}><MessageCircle size={14}/> Riwayat Chat</Link>}
         {user.role==='admin_toko'&&<Link href="/admin-toko" onClick={()=>setOpenProfile(false)}><Store size={14}/> Dashboard Toko</Link>}
         {user.role==='admin_toko'&&<Link href="/admin-toko/produk" onClick={()=>setOpenProfile(false)}><Package size={14}/> + Tambah / Kelola Produk</Link>}
         {user.role==='super_admin'&&<Link href="/super-admin" onClick={()=>setOpenProfile(false)}>Super Admin</Link>}
         <button type="button" onClick={()=>{setOpenProfile(false);logout();}}><LogOut size={14}/> Keluar</button>
        </div>
       </div>
      ):(
       <Link className="login-link" href="/masuk"><UserRound size={18}/> Masuk</Link>
      )}

      <button className="mobile-only icon-button" onClick={()=>setMenu(!menu)} aria-label="Buka menu navigasi">
       {menu?<X size={22}/>:<Menu size={22}/>}
      </button>
     </div>
    </div>

    {!isDashboardPath&&(
     <div className="mobile-search-row">
      <form className="mobile-search-form" onSubmit={search}>
       <Search size={16} className="search-icon"/>
       <input
        value={query}
        onChange={e=>setQuery(e.target.value)}
        placeholder="Cari produk kampus..."
        aria-label="Cari produk di KampusBalik"
       />
       <button type="submit">Cari</button>
      </form>
     </div>
    )}
   </header>

   <nav className={`subnav ${menu?'mobile-open':''} ${isDashboardPath?'subnav-dashboard':''}`}>
    <div className="container nav-content">
     <div className="nav-categories">
      <span><Menu size={16}/> Kategori <ChevronDown size={13}/></span>
      <div className="category-dropdown">
       {cats.map(c=><Link key={c.id} href={`/kategori/${c.slug}`} onClick={()=>setMenu(false)}>{c.name}</Link>)}
      </div>
     </div>
     <div className="nav-links">
      {nav.map(([title,url])=><Link key={title} href={url} onClick={()=>setMenu(false)}>{title}</Link>)}
      <div className="mobile-only-drawer-links">
       {user?(
        <>
         <Link href="/pesanan" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:8}}><Package size={15}/> Pesanan Saya</Link>
         {['customer','admin_toko'].includes(user.role)&&<Link href="/chat" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:8}}><MessageCircle size={15}/> Riwayat Chat {unreadChat>0?`(${unreadChat})`:''}</Link>}
         <Link href="/akun" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:8}}><UserRound size={15}/> Akun & Verifikasi KTM ({user.name.split(' ')[0]})</Link>
         {user.role==='admin_toko'&&<Link href="/admin-toko" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:8}}><Store size={15}/> Dashboard Toko</Link>}
         {user.role==='admin_toko'&&<Link href="/admin-toko/produk" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:8,color:'#38bdf8',fontWeight:700}}><Package size={15}/> + Tambah / Kelola Barang</Link>}
         {user.role==='super_admin'&&<Link href="/super-admin" onClick={()=>setMenu(false)} style={{display:'flex',alignItems:'center',gap:8}}><ShieldCheck size={15}/> Super Admin</Link>}
         <button className="drawer-logout-btn" onClick={logout}><LogOut size={14}/> Keluar</button>
        </>
       ):(
        <>
         <Link href="/masuk" onClick={()=>setMenu(false)} style={{color:'#38bdf8',fontWeight:700}}>
          <UserRound size={15}/> Masuk ke Akun
         </Link>
         <Link href="/daftar" onClick={()=>setMenu(false)}>
          Daftar Akun Mahasiswa
         </Link>
        </>
       )}
      </div>
     </div>
     <form onSubmit={search} className="area-select">
      <MapPin size={14}/>
      <input placeholder="Area Kampus / Kota COD" value={city} onChange={e=>setCity(e.target.value)} aria-label="Area COD"/>
      <button type="submit" aria-label="Cari area"><Search size={14}/></button>
     </form>
    </div>
   </nav>
  </>
 );
}
