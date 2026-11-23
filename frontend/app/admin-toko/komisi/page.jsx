'use client';
import {useEffect,useState} from 'react';
import {QrCode,AlertTriangle,CheckCircle2,Clock,Wallet,ShoppingBag,Upload,Eye,X,ShieldAlert} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {StatCards,Table} from '@/components/ui/AdminBits';
import {Button} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {useAuth} from '@/context/AuthContext';
import {api,rp,dateID,imageSrc} from '@/lib/api';

const commStatusLabel={
 unpaid:{text:'Belum Dibayar',cls:'status-rejected'},
 waiting_verification:{text:'Menunggu Verifikasi',cls:'status-pending'},
 paid:{text:'Lunas',cls:'status-approved'},
 rejected:{text:'Bukti Ditolak (Wajib Bayar Ulang)',cls:'status-rejected'}
};

export default function Page(){
 const {show}=useToast();
 const {refresh}=useAuth();
 const [data,setData]=useState(null);
 const [selectedIds,setSelectedIds]=useState([]);
 const [proofUrl,setProofUrl]=useState('');
 const [uploading,setUploading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [previewModal,setPreviewModal]=useState(null);

 const load=async()=>{
  try{
   const res=await api('/store/commissions');
   setData(res);
   const unpaidIds=(res.items||[]).filter(i=>['unpaid','rejected'].includes(i.status)).map(i=>i.id);
   setSelectedIds(unpaidIds);
  }catch(e){
   show(e.message,'error');
  }
 };

 useEffect(()=>{load();},[]);

 const uploadProof=async file=>{
  if(!file)return;
  setUploading(true);
  try{
   const fd=new FormData();
   fd.append('image',file);
   const res=await api('/store/commissions/upload-proof',{method:'POST',body:fd});
   setProofUrl(res.url);
   show('Bukti transfer QRIS berhasil diunggah');
  }catch(e){
   show(e.message,'error');
  }finally{
   setUploading(false);
  }
 };

 const toggleSelect=id=>{
  setSelectedIds(prev=>prev.includes(id)?prev.filter(x=>x!==id):[...prev,id]);
 };

 const submitPayment=async e=>{
  e.preventDefault();
  if(!proofUrl)return show('Silakan unggah foto bukti pembayaran QRIS terlebih dahulu','error');
  if(!selectedIds.length)return show('Pilih minimal 1 tagihan komisi untuk dibayar','error');
  setBusy(true);
  try{
   const res=await api('/store/commissions/pay',{
    method:'POST',
    body:{commission_ids:selectedIds,proof_url:proofUrl}
   });
   show(`Berhasil mengirim bukti pembayaran untuk ${res.count} tagihan komisi (Rp ${Number(res.totalPaid).toLocaleString('id-ID')})!`);
   setProofUrl('');
   await load();
   await refresh();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const unpaidItems=(data?.items||[]).filter(i=>['unpaid','rejected'].includes(i.status));
 const selectedTotal=unpaidItems.filter(i=>selectedIds.includes(i.id)).reduce((acc,x)=>acc+Number(x.total_commission),0);
 const isSuspended=data?.store?.status==='suspended';
 const unpaidCount=Number(data?.summary?.unpaid_count||0);

 return (
  <DashboardShell kind="store">
   <h1>Komisi Penjualan & Pembayaran QRIS</h1>
   <p className="dashboard-subtitle">
    Setiap barang yang laku terjual dikenakan komisi platform untuk Super Admin yang dibayarkan melalui QRIS.
   </p>

   {/* Peringatan Sanksi / Penangguhan Toko */}
   {isSuspended&&(
    <div style={{background:'#fef2f2',border:'2px solid #dc2626',borderRadius:14,padding:20,marginBottom:22}}>
     <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
      <ShieldAlert size={32} color="#dc2626" style={{flexShrink:0,marginTop:2}}/>
      <div>
       <h3 style={{margin:0,color:'#991b1b',fontSize:17}}>
        AKUN TOKO ANDA SEDANG DITANGGUHKAN (SANKSI KOMISI)
       </h3>
       <p style={{margin:'6px 0 10px',color:'#7f1d1d',fontSize:13,lineHeight:1.55}}>
        {data?.store?.rejection_reason||'Toko Anda tidak membayar komisi penjualan sebanyak 2 kali atau lebih.'}
       </p>
       <div style={{background:'#ffffff',padding:'10px 14px',borderRadius:8,border:'1px solid #fecaca',fontSize:12.5,color:'#991b1b',fontWeight:600}}>
        Cara Mengaktifkan Kembali Akun Toko: Scan kode QRIS Super Admin di bawah ini, bayar seluruh tunggakan komisi sebesar <b>{rp(data?.summary?.unpaid_amount||0)}</b>, lalu unggah bukti pembayarannya. Setelah diverifikasi lunas oleh Super Admin, akun toko Anda akan <b>otomatis aktif kembali</b>.
       </div>
      </div>
     </div>
    </div>
   )}

   {!isSuspended&&unpaidCount===1&&(
    <div className="notice notice-warning" style={{marginBottom:20,borderLeft:'4px solid #d97706',display:'flex',alignItems:'center',gap:10}}>
     <AlertTriangle size={18} color="#d97706" style={{flexShrink:0}}/>
     <span><b>Peringatan Tunggakan Komisi (1/2):</b> Anda memiliki <b>1 tagihan komisi</b> yang belum dibayar. Harap segera lunasi via QRIS di bawah ini. Jika mencapai <b>2 kali tidak membayar komisi</b>, akun toko akan otomatis dikenakan <b>sanksi penangguhan atau penghapusan akun</b>.</span>
    </div>
   )}

   {!data?'Memuat data komisi...':(
    <>
     <StatCards items={[
      ['Tunggakan Komisi (Wajib Bayar)',rp(data.summary?.unpaid_amount||0),AlertTriangle],
      ['Menunggu Verifikasi Admin',rp(data.summary?.waiting_amount||0),Clock],
      ['Total Komisi Lunas',rp(data.summary?.paid_amount||0),CheckCircle2],
      ['Total Barang Laku Terjual',`${data.summary?.total_items_sold||0} barang`,ShoppingBag]
     ]}/>

     {/* Panel QRIS Super Admin & Form Pembayaran */}
     <div className="form-row" style={{alignItems:'stretch',marginBottom:24}}>
      <div className="panel" style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'linear-gradient(180deg,#ffffff 0%,#f8fafc 100%)'}}>
       <span className="badge status-approved" style={{marginBottom:10}}>QRIS RESMI SUPER ADMIN</span>
       <h3 style={{margin:0,fontSize:17}}>{data.config?.qris_merchant_name||'KampusBalik Official'}</h3>
       <p className="muted text-xs" style={{margin:'4px 0 16px'}}>
        Tarif Komisi: <b>{rp(data.config?.commission_per_item||2000)} / barang laku</b>
       </p>

       {data.config?.qris_image_url?(
        <div style={{background:'#ffffff',padding:14,borderRadius:14,border:'2px solid #e2e8f0',boxShadow:'0 8px 24px rgba(15,23,42,0.06)',maxWidth:260,width:'100%'}}>
         <img
          src={imageSrc(data.config.qris_image_url)}
          alt="QRIS Super Admin"
          onClick={()=>setPreviewModal(imageSrc(data.config.qris_image_url))}
          style={{width:'100%',height:'auto',borderRadius:8,cursor:'zoom-in'}}
         />
         <small className="muted" style={{display:'block',marginTop:8,fontSize:11}}>
          Klik gambar QRIS untuk memperbesar
         </small>
        </div>
       ):(
        <div className="notice" style={{maxWidth:300}}>
         <QrCode size={42} color="#64748b" style={{margin:'0 auto 8px'}}/>
         Super Admin belum mengunggah gambar kode QRIS. Hubungi Super Admin untuk informasi pembayaran.
        </div>
       )}
      </div>

      <div className="panel">
       <h3 style={{marginBottom:6}}>Bayar & Lunasi Komisi via QRIS</h3>
       <p className="muted text-xs" style={{marginBottom:16}}>
        Scan QRIS di samping menggunakan aplikasi m-Banking / e-Wallet (GoPay, OVO, DANA, ShopeePay, BCA, Mandiri, dll), lalu unggah tangkapan layar (screenshot) bukti pembayarannya.
       </p>

       {unpaidItems.length===0?(
        <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:12,padding:22,textAlign:'center'}}>
         <CheckCircle2 size={38} color="#16a34a" style={{margin:'0 auto 8px'}}/>
         <b style={{color:'#166534',display:'block',fontSize:15}}>Tidak Ada Tunggakan Komisi!</b>
         <p style={{color:'#15803d',fontSize:12.5,marginTop:4}}>
          Seluruh kewajiban komisi penjualan toko Anda sudah dibayar atau sedang diverifikasi oleh Super Admin.
         </p>
        </div>
       ):(
        <form onSubmit={submitPayment}>
         <div style={{background:'#f8fafc',padding:14,borderRadius:10,border:'1px solid #e2e8f0',marginBottom:16}}>
          <div className="between" style={{marginBottom:8}}>
           <span style={{fontSize:12.5,fontWeight:700}}>Tagihan yang Dipilih ({selectedIds.length} transaksi):</span>
           <button
            type="button"
            className="text-link"
            style={{fontSize:12}}
            onClick={()=>setSelectedIds(selectedIds.length===unpaidItems.length?[]:unpaidItems.map(i=>i.id))}
           >
            {selectedIds.length===unpaidItems.length?'Batalkan pilihan':'Pilih semua tunggakan'}
           </button>
          </div>
          <div style={{maxHeight:150,overflowY:'auto',display:'grid',gap:6}}>
           {unpaidItems.map(item=>(
            <label key={item.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 10px',background:'#ffffff',borderRadius:8,border:'1px solid #cbd5e1',cursor:'pointer',fontSize:12.5}}>
             <span style={{display:'flex',alignItems:'center',gap:8}}>
              <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={()=>toggleSelect(item.id)}/>
              <b>{item.order_code}</b> ({item.items_sold} barang × {rp(item.commission_per_item)})
             </span>
             <b style={{color:'#dc2626'}}>{rp(item.total_commission)}</b>
            </label>
           ))}
          </div>
          <div className="between" style={{marginTop:12,paddingTop:10,borderTop:'1px dashed #cbd5e1'}}>
           <span style={{fontWeight:700,fontSize:13.5}}>Total Transfer QRIS:</span>
           <strong style={{fontSize:18,color:'#1669e8'}}>{rp(selectedTotal)}</strong>
          </div>
         </div>

         <div className="form-field">
          <label>Unggah Foto / Screenshot Bukti Pembayaran QRIS *</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadProof(e.target.files?.[0])}/>
          {uploading&&<small className="muted">Mengunggah bukti transfer...</small>}
          {proofUrl&&(
           <div style={{marginTop:10,display:'flex',alignItems:'center',gap:12,background:'#f0fdf4',padding:10,borderRadius:8,border:'1px solid #bbf7d0'}}>
            <img src={imageSrc(proofUrl)} alt="Bukti QRIS" style={{width:56,height:56,objectFit:'cover',borderRadius:6,cursor:'pointer'}} onClick={()=>setPreviewModal(imageSrc(proofUrl))}/>
            <div>
             <b style={{fontSize:12,color:'#15803d',display:'flex',alignItems:'center',gap:4}}><CheckCircle2 size={14}/> Bukti transfer siap dikirim</b>
             <small className="muted text-xs">Klik tombol di bawah untuk mengirim ke Super Admin</small>
            </div>
           </div>
          )}
         </div>

         <Button className="w-full" loading={busy||uploading} disabled={!selectedIds.length||!proofUrl}>
          <Upload size={16}/> Kirim Bukti Pembayaran QRIS ({rp(selectedTotal)})
         </Button>
        </form>
       )}
      </div>
     </div>

     {/* Tabel Riwayat Komisi Per Penjualan */}
     <div className="panel">
      <h3 style={{marginBottom:4}}>Rincian Komisi Per Barang Terjual</h3>
      <p className="muted text-xs" style={{marginBottom:14}}>
       Daftar otomatis komisi Super Admin dari setiap pesanan yang telah lunas.
      </p>
      <Table
       headers={['Kode Pesanan','Tanggal Laku','Barang Terjual','Komisi / Barang','Total Komisi','Status','Bukti QRIS']}
       items={data.items||[]}
       empty="Belum ada tagihan komisi penjualan."
       render={c=>{
        const st=commStatusLabel[c.status]||{text:c.status,cls:''};
        return (
         <>
          <td><b>{c.order_code}</b></td>
          <td><small className="muted">{dateID(c.created_at)}</small></td>
          <td><b>{c.items_sold}</b> unit</td>
          <td>{rp(c.commission_per_item)}</td>
          <td><b style={{color:'#0f172a'}}>{rp(c.total_commission)}</b></td>
          <td>
           <span className={`badge ${st.cls}`}>{st.text}</span>
           {c.rejection_reason&&<div style={{fontSize:11,color:'#dc2626',marginTop:3}}>Alasan: {c.rejection_reason}</div>}
          </td>
          <td>
           {c.proof_url?(
            <button type="button" className="text-link" style={{fontSize:12,display:'inline-flex',alignItems:'center',gap:4}} onClick={()=>setPreviewModal(imageSrc(c.proof_url))}>
             <Eye size={14}/> Lihat Bukti
            </button>
           ):(
            <span className="muted text-xs">Belum ada</span>
           )}
          </td>
         </>
        );
       }}
      />
     </div>
    </>
   )}

   {previewModal&&(
    <div className="lightbox-overlay" onClick={()=>setPreviewModal(null)}>
     <div className="lightbox-content" onClick={e=>e.stopPropagation()}>
      <button className="lightbox-close" onClick={()=>setPreviewModal(null)}><X size={20}/></button>
      <img src={previewModal} alt="Pratinjau QRIS / Bukti Bayar"/>
     </div>
    </div>
   )}
  </DashboardShell>
 );
}
