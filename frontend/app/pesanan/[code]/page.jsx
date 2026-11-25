'use client';
import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import Link from 'next/link';
import {MessageCircle,MapPin,Clock,Star,CheckCircle2} from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';
import {Button,Badge,Empty} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,rp,dateID,statuses,imageSrc} from '@/lib/api';

export default function Page(){
 const {code}=useParams();
 const router=useRouter();
 const {show}=useToast();
 const [o,setO]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const [ratings,setRatings]=useState({});
 const [comments,setComments]=useState({});

 const load=()=>api(`/orders/${code}`).then(setO).catch(e=>setError(e.message));
 useEffect(()=>{load();},[code]);

 const action=async(name,body)=>{
  setBusy(true);
  try{
   await api(`/orders/${code}/${name}`,{method:'PATCH',body});
   show('Status pesanan diperbarui');
   await load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const cancel=()=>{
  const reason=window.prompt('Masukkan alasan pembatalan (hanya sebelum disepakati):');
  if(reason)action('cancel',{reason});
 };

 const chat=async()=>{
  try{
   const t=await api('/chat/threads',{method:'POST',body:{store_id:o.store_id}});
   router.push(`/chat?thread=${t.id}`);
  }catch(e){
   show(e.message,'error');
  }
 };

 const review=async productId=>{
  setBusy(true);
  try{
   await api(`/orders/${code}/reviews`,{
    method:'POST',
    body:{product_id:productId,rating:Number(ratings[productId]||5),comment:comments[productId]||''}
   });
   show('Ulasan berhasil disimpan');
   await load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 return (
  <RouteGuard roles={['customer']}>
   <div className="container page-space" style={{maxWidth:980}}>
    {error?(
     <Empty title={error}/>
    ):!o?(
     'Memuat pesanan...'
    ):(
     <>
      <div className="page-heading">
       <Link className="text-link" href="/pesanan">← Kembali ke daftar pesanan</Link>
       <h1 style={{marginTop:10}}>Detail Pesanan COD</h1>
       <p><b>{o.code}</b> · Dibuat pada {dateID(o.created_at)}</p>
      </div>

      <div className="form-row" style={{alignItems:'start'}}>
       <div>
        <div className="panel">
         <div className="between" style={{marginBottom:12}}>
          <h3 style={{margin:0}}>{o.store_name}</h3>
          <Badge status={o.status}>{statuses[o.status]}</Badge>
         </div>
         {o.items.map(it=>(
          <div key={it.id} className="price-row">
           <div style={{display:'flex',alignItems:'center',gap:10}}>
            {it.product_image&&(
             <img src={imageSrc(it.product_image)} alt={it.product_name} style={{width:40,height:40,borderRadius:8,objectFit:'cover',border:'1px solid #e2e8f0'}}/>
            )}
            <span><b>{it.product_name}</b> × {it.qty}</span>
           </div>
           <b>{rp(it.line_total)}</b>
          </div>
         ))}
         <div className="price-row total">
          <span>Total Tunai COD</span>
          <span>{rp(o.total)}</span>
         </div>
        </div>

        <div className="panel" style={{marginTop:16}}>
         <h3>Jadwal & Lokasi Pertemuan COD</h3>
         {o.meeting_location?(
          <div style={{marginTop:10,display:'grid',gap:6}}>
           <p style={{margin:0,display:'flex',alignItems:'center',gap:8}}><MapPin size={16} color="#1669e8"/> <b>Lokasi:</b> {o.meeting_location}</p>
           <p style={{margin:0,display:'flex',alignItems:'center',gap:8}}><Clock size={16} color="#1669e8"/> <b>Waktu:</b> {dateID(o.meeting_at)}</p>
          </div>
         ):(
          <p className="muted" style={{marginTop:8}}>Belum disepakati. Hubungi toko melalui fitur Chat untuk menentukan lokasi & jadwal COD di kampus.</p>
         )}
        </div>

        <div className="panel" style={{marginTop:16}}>
         <h3>Riwayat Status Pesanan</h3>
         <div className="timeline">
          {o.history.map(h=>(
           <div className="timeline-item" key={h.id}>
            <b>{statuses[h.to_status]}</b>
            <p>{h.note}</p>
            <span>{dateID(h.created_at)}</span>
           </div>
          ))}
         </div>
        </div>
       </div>

       <aside className="panel">
        <h3>Aksi Pesanan</h3>
        <p className="muted text-xs" style={{margin:'8px 0 18px'}}>
         Periksa kondisi fisik barang secara langsung saat bertemu dengan penjual sebelum menyerahkan uang tunai.
        </p>
        <Button className="w-full" onClick={chat}><MessageCircle size={16}/> Chat Penjual</Button>
        {o.status==='pending'&&(
         <Button variant="danger" className="w-full mt-3" onClick={cancel} loading={busy}>Batalkan Pesanan</Button>
        )}
        {o.status==='paid'&&(
         <Button className="w-full mt-3" onClick={()=>action('received')} loading={busy}>
          <CheckCircle2 size={16}/> Konfirmasi Barang Diterima
         </Button>
        )}
        {o.status==='completed'&&(
         <div style={{marginTop:22,paddingTop:18,borderTop:'1px solid #e2e8f0'}}>
          <h3>Beri Ulasan Produk</h3>
          {o.items.map(it=>(
           <div key={it.id} className="form-field" style={{marginTop:14,background:'#f8fafc',padding:12,borderRadius:10,border:'1px solid #e2e8f0'}}>
            <label style={{fontWeight:700}}>{it.product_name}</label>
            <select value={ratings[it.product_id]||5} onChange={e=>setRatings({...ratings,[it.product_id]:e.target.value})}>
             {[5,4,3,2,1].map(i=><option key={i} value={i}>{i} Bintang</option>)}
            </select>
            <textarea
             rows={2}
             value={comments[it.product_id]||''}
             onChange={e=>setComments({...comments,[it.product_id]:e.target.value})}
             placeholder="Ceritakan pengalaman transaksi COD Anda..."
            />
            <Button onClick={()=>review(it.product_id)} loading={busy} style={{marginTop:4}}>
             <Star size={14}/> Kirim Ulasan
            </Button>
           </div>
          ))}
         </div>
        )}
       </aside>
      </div>
     </>
    )}
   </div>
  </RouteGuard>
 );
}
