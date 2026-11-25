'use client';
import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import Link from 'next/link';
import {ShoppingCart,MessageCircle,MapPin,Star,PackageOpen,Minus,Plus,Store} from 'lucide-react';
import {api,imageSrc,rp} from '@/lib/api';
import {useToast} from '@/components/ui/Toast';
import {useAuth} from '@/context/AuthContext';
import {useCart} from '@/context/CartContext';
import {Button,Empty} from '@/components/ui/Elements';

export default function Page(){
 const {slug}=useParams();
 const router=useRouter();
 const {user}=useAuth();
 const {refresh}=useCart();
 const {show}=useToast();
 const [p,setP]=useState(null);
 const [error,setError]=useState('');
 const [qty,setQty]=useState(1);
 const [photo,setPhoto]=useState(0);
 const [busy,setBusy]=useState(false);
 const [brokenPhotos,setBrokenPhotos]=useState({});

 useEffect(()=>{
  setBrokenPhotos({});
  api(`/catalog/products/${slug}`).then(setP).catch(e=>setError(e.message));
 },[slug]);

 const add=async()=>{
  if(user?.role!=='customer'){router.push('/masuk');return;}
  setBusy(true);
  try{
   await api('/cart',{method:'POST',body:{product_id:p.id,qty}});
   await refresh();
   show('Berhasil ditambahkan ke keranjang');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const chat=async()=>{
  if(user?.role!=='customer'){router.push('/masuk');return;}
  try{
   const t=await api('/chat/threads',{method:'POST',body:{store_id:p.store_id}});
   router.push(`/chat?thread=${t.id}`);
  }catch(e){
   show(e.message,'error');
  }
 };

 if(error)return <div className="container page-space"><Empty title="Produk tidak ditemukan" description={error}/></div>;
 if(!p)return <div className="container page-space">Memuat detail produk...</div>;

 const photos=p.images?.length?p.images.map(i=>imageSrc(i.url)):[null];

 return (
  <div className="container page-space">
   <div className="breadcrumbs"><Link href="/">Beranda</Link> / <Link href="/cari">Produk</Link> / {p.name}</div>
   <div className="detail-layout">
    <div>
     <div className="detail-photo">
      {photos[photo]&&!brokenPhotos[photo]?(
       <img
        alt={p.name}
        src={photos[photo]}
        onError={()=>setBrokenPhotos(prev=>({...prev,[photo]:true}))}
       />
      ):(
       <div className="photo-fallback"><PackageOpen size={84} strokeWidth={1}/><span>Foto produk belum diunggah</span></div>
      )}
     </div>
     <div className="thumbs">
      {p.images?.map((img,i)=>(
       <button key={img.id} className={photo===i?'active':''} onClick={()=>setPhoto(i)}>
        {!brokenPhotos[i]?(
         <img
          src={imageSrc(img.url)}
          alt={`${p.name} foto ${i+1}`}
          onError={()=>setBrokenPhotos(prev=>({...prev,[i]:true}))}
         />
        ):(
         <PackageOpen size={20}/>
        )}
       </button>
      ))}
     </div>
    </div>
    <div className="detail-info">
     <span className="badge">{p.category_name}</span>
     <h1>{p.name}</h1>
     <div className="product-rating"><Star size={16} fill="currentColor"/> {Number(p.rating_avg).toFixed(1)} ({p.rating_count} ulasan)</div>
     <div style={{margin:'22px 0'}}>
      <div className="price-big">{rp(p.price)}</div>
      {p.compare_price>p.price&&<span className="strikethrough">{rp(p.compare_price)}</span>}
     </div>
     <p className="muted text-sm">{p.description||'Belum ada deskripsi produk.'}</p>

     <div className="detail-qty-box">
      <div className="detail-qty-head">
       <span className="detail-qty-label">Atur Jumlah Barang</span>
       <span className="detail-stock-badge">
        Stok tersedia: <b>{p.available>0?`${p.available} barang`:'Habis'}</b>
       </span>
      </div>
      <div className="detail-qty-row">
       <div className="qty-stepper" aria-label="Pengatur jumlah barang">
        <button
         type="button"
         className="qty-btn"
         aria-label="Kurangi jumlah barang"
         disabled={qty<=1||p.available<=0}
         onClick={()=>setQty(q=>Math.max(1,q-1))}
        >
         <Minus size={16} strokeWidth={2.5}/>
        </button>
        <input
         className="qty-value"
         type="number"
         inputMode="numeric"
         min={1}
         max={Math.max(1,p.available)}
         value={qty}
         aria-label="Jumlah barang"
         onChange={e=>{
          const val=Number(e.target.value);
          if(!val||val<1)setQty(1);
          else setQty(Math.min(Math.max(1,p.available),val));
         }}
        />
        <button
         type="button"
         className="qty-btn"
         aria-label="Tambah jumlah barang"
         disabled={p.available<=0||qty>=p.available}
         onClick={()=>setQty(q=>Math.min(p.available,q+1))}
        >
         <Plus size={16} strokeWidth={2.5}/>
        </button>
       </div>
       <div className="detail-subtotal">
        <small className="muted">Subtotal</small>
        <b>{rp(Number(p.price||0)*qty)}</b>
       </div>
      </div>
     </div>

     <div className="detail-actions">
      <Button disabled={p.available<=0||qty>p.available} loading={busy} onClick={add}>
       <ShoppingCart size={17}/> + Tambah ke Keranjang
      </Button>
      <Button variant="outline" onClick={chat}>
       <MessageCircle size={17}/> Chat Penjual
      </Button>
     </div>
     <div className="info-panel">
      <b>COD tunai, tanpa kurir</b>
      <p>Sepakati titik temu dan waktu lewat chat. Bayar kepada penjual setelah bertemu dan memeriksa barang.</p>
     </div>
     <div className="detail-seller">
      <div style={{display:'flex',alignItems:'center',gap:12}}>
       <div style={{width:44,height:44,borderRadius:10,background:'#eff6ff',border:'1px solid #dbeafe',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
        {p.store_logo?(
         <img
          src={imageSrc(p.store_logo)}
          alt={p.store_name}
          style={{width:'100%',height:'100%',objectFit:'cover'}}
          onError={e=>{e.currentTarget.style.display='none';}}
         />
        ):(
         <Store size={20} color="#1669e8"/>
        )}
       </div>
       <div>
        <b>{p.store_name}</b>
        <small><MapPin size={12} style={{display:'inline'}}/> {p.city}</small>
       </div>
      </div>
      <Link className="text-link" href={`/toko/${p.store_slug}`}>Lihat toko</Link>
     </div>
    </div>
   </div>
   <section className="section">
    <div className="section-head"><div><h2>Ulasan pembeli</h2><p>Ulasan dari transaksi yang telah selesai.</p></div></div>
    {p.reviews?.length?p.reviews.map((r,i)=>(
     <div className="panel" key={i} style={{marginBottom:10}}>
      <b>{r.customer_name} · {'★'.repeat(r.rating)}</b>
      <p className="muted">{r.comment||'Tanpa komentar.'}</p>
     </div>
    )):<Empty title="Belum ada ulasan"/>}
   </section>
  </div>
 );
}
