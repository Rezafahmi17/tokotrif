'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Trash2,Box,ArrowRight,Minus,Plus,Store} from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';
import {useCart} from '@/context/CartContext';
import {useToast} from '@/components/ui/Toast';
import {api,rp,imageSrc} from '@/lib/api';
import {Button,Empty} from '@/components/ui/Elements';

export default function Page(){
 const [cart,setCart]=useState(null);
 const [busy,setBusy]=useState(false);
 const {refresh}=useCart();
 const {show}=useToast();

 const load=()=>api('/cart').then(setCart).catch(e=>show(e.message,'error'));
 useEffect(()=>{load();},[]);

 const update=async(id,qty,maxAvail)=>{
  if(qty<1)return;
  if(maxAvail&&qty>maxAvail){
   show(`Stok tersedia maksimal ${maxAvail} barang`,'error');
   return;
  }
  setBusy(true);
  try{
   await api(`/cart/${id}`,{method:'PATCH',body:{qty}});
   await load();
   await refresh();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const remove=async id=>{
  setBusy(true);
  try{
   await api(`/cart/${id}`,{method:'DELETE'});
   await load();
   await refresh();
   show('Barang dihapus dari keranjang');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 return (
  <RouteGuard roles={['customer']}>
   <div className="container page-space">
    <div className="page-heading">
     <h1>Keranjang Belanja</h1>
     <p>Atur jumlah barang dengan tombol <b>-</b> dan <b>+</b>. Pesanan dari toko berbeda akan dipisahkan otomatis saat checkout.</p>
    </div>

    {!cart?(
     'Memuat keranjang...'
    ):!cart.groups.length?(
     <Empty title="Keranjang masih kosong" description="Ayo pilih produk favoritmu terlebih dahulu."/>
    ):(
     <div className="two-column-main">
      <div>
       {cart.groups.map(g=>(
        <div className="cart-group" key={g.store_id}>
         <b><Store size={17} color="#1669e8"/> {g.store_name}</b>
         {g.items.map(item=>(
          <div className="cart-line" key={item.id}>
           <div className="cart-item-main">
            <div className="cart-thumb">
             {item.image_url?(
              <img
               src={imageSrc(item.image_url)}
               alt={item.name}
               onError={e=>{e.currentTarget.style.display='none';}}
              />
             ):(
              <Box size={26} color="#94a3b8"/>
             )}
            </div>
            <div className="cart-item-info">
             <Link href={`/produk/${item.slug}`} className="cart-item-title">{item.name}</Link>
             <p className="cart-item-price">{rp(item.price)}</p>
             <small className="muted">Stok tersedia: <b>{item.available}</b></small>
            </div>
           </div>

           <div className="cart-item-controls">
            <div className="qty-stepper" aria-label={`Pengatur jumlah ${item.name}`}>
             <button
              type="button"
              className="qty-btn"
              aria-label={`Kurangi ${item.name}`}
              disabled={busy||item.qty<=1}
              onClick={()=>update(item.id,item.qty-1,item.available)}
             >
              <Minus size={15} strokeWidth={2.5}/>
             </button>
             <input
              aria-label={`Jumlah ${item.name}`}
              className="qty-value"
              type="number"
              inputMode="numeric"
              min={1}
              max={item.available}
              disabled={busy}
              value={item.qty}
              onChange={e=>{
               const val=Number(e.target.value);
               if(val>=1)update(item.id,Math.min(item.available,val),item.available);
              }}
             />
             <button
              type="button"
              className="qty-btn"
              aria-label={`Tambah ${item.name}`}
              disabled={busy||item.qty>=item.available}
              onClick={()=>update(item.id,item.qty+1,item.available)}
             >
              <Plus size={15} strokeWidth={2.5}/>
             </button>
            </div>

            <button
             type="button"
             className="cart-remove-btn"
             aria-label={`Hapus ${item.name}`}
             title="Hapus barang"
             disabled={busy}
             onClick={()=>remove(item.id)}
            >
             <Trash2 size={16}/>
            </button>
           </div>
          </div>
         ))}
         <p className="price-row" style={{fontWeight:800,paddingTop:14}}>
          <span>Subtotal Toko</span>
          <span style={{color:'#1669e8',fontSize:15}}>{rp(g.subtotal)}</span>
         </p>
        </div>
       ))}
      </div>

      <aside className="summary-box">
       <h3>Ringkasan Belanja</h3>
       <div className="price-row"><span>Total Barang</span><b>{cart.count} barang</b></div>
       <div className="price-row"><span>Jumlah Toko</span><b>{cart.groups.length} toko</b></div>
       <div className="price-row total"><span>Total Pembayaran COD</span><span>{rp(cart.total)}</span></div>
       <p className="muted text-xs" style={{margin:'14px 0 18px',lineHeight:1.6}}>
        Bayar tunai langsung kepada tiap penjual saat bertemu di area kampus. Tidak ada biaya pengiriman.
       </p>
       <Link className="btn btn-primary" href="/checkout" style={{width:'100%'}}>
        Lanjut ke Checkout <ArrowRight size={16}/>
       </Link>
      </aside>
     </div>
    )}
   </div>
  </RouteGuard>
 );
}
