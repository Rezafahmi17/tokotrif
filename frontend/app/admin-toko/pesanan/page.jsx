'use client';
import {useEffect,useState} from 'react';
import {MapPin,Calendar,User,Phone,X,CheckCircle2,XCircle,Clock,FileText} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {Table,Status} from '@/components/ui/AdminBits';
import {Button} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,dateID,rp,statuses} from '@/lib/api';

export default function Page(){
 const {show}=useToast();
 const [data,setData]=useState(null);
 const [status,setStatus]=useState('');
 const [detail,setDetail]=useState(null);
 const [location,setLocation]=useState('');
 const [meeting,setMeeting]=useState('');
 const [busy,setBusy]=useState(false);

 const load=()=>api(`/store/orders${status?'?status='+status:''}`).then(setData).catch(e=>show(e.message,'error'));
 useEffect(()=>{load();},[status]);

 const open=async id=>{
  try{
   setDetail(await api(`/store/orders/${id}`));
  }catch(e){
   show(e.message,'error');
  }
 };

 const act=async(action,body)=>{
  setBusy(true);
  try{
   await api(`/store/orders/${detail.id}/${action}`,{method:'PATCH',body});
   show('Pesanan berhasil diperbarui');
   await open(detail.id);
   await load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const confirmOrder=()=>{
  if(!location||!meeting)return show('Isi lokasi dan waktu bertemu COD','error');
  act('confirm',{meeting_location:location,meeting_at:meeting.replace('T',' ')+':00'});
 };
 const paid=()=>{
  if(window.confirm(`Pastikan uang tunai sebesar ${rp(detail.total)} sudah diterima. Konfirmasi lunas?`))act('paid');
 };
 const cancel=()=>{
  const reason=window.prompt('Alasan pembatalan wajib diisi:');
  if(reason)act('cancel',{reason});
 };

 return (
  <DashboardShell kind="store">
   <h1>Pesanan COD</h1>
   <p className="dashboard-subtitle">Setujui jadwal pertemuan, serahkan barang, lalu konfirmasi uang tunai diterima.</p>

   <div className="tabs">
    {['','pending','confirmed','paid','completed','cancelled'].map(s=>(
     <button key={s} className={s===status?'active':''} onClick={()=>{setStatus(s);setDetail(null);}}>
      {s?statuses[s]:'Semua Pesanan'}
     </button>
    ))}
   </div>

   {!data?'Memuat daftar pesanan...':(
    <Table
     headers={['Kode Pesanan','Pembeli','Tanggal','Total Tunai','Status','Aksi']}
     items={data.items}
     empty="Belum ada pesanan pada kategori status ini."
     render={o=>(
      <>
       <td><b>{o.code}</b></td>
       <td>
        <b>{o.customer_name}</b>
        {o.customer_phone&&<><br/><small className="muted">{o.customer_phone}</small></>}
       </td>
       <td><small className="muted">{dateID(o.created_at)}</small></td>
       <td><b>{rp(o.total)}</b></td>
       <td><Status status={o.status}/></td>
       <td>
        <button
         type="button"
         className="btn btn-outline"
         style={{minHeight:32,padding:'5px 12px',fontSize:12}}
         onClick={()=>open(o.id)}
        >
         <FileText size={13}/> Buka Detail
        </button>
       </td>
      </>
     )}
    />
   )}

   {detail&&(
    <div className="panel" style={{marginTop:22,border:'1.5px solid #cbd5e1'}}>
     <div className="between" style={{paddingBottom:14,marginBottom:16,borderBottom:'1px solid #e2e8f0'}}>
      <div>
       <div style={{display:'flex',alignItems:'center',gap:10}}>
        <h3 style={{margin:0,fontSize:19}}>Detail Pesanan {detail.code}</h3>
        <Status status={detail.status}/>
       </div>
       <div style={{display:'flex',alignItems:'center',gap:16,marginTop:6,fontSize:12.5,color:'#64748b',flexWrap:'wrap'}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
         <User size={14}/> Pembeli: <b style={{color:'#0f172a'}}>{detail.customer_name}</b>
        </span>
        {detail.customer_phone&&(
         <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
          <Phone size={14}/> {detail.customer_phone}
         </span>
        )}
       </div>
      </div>
      <button
       type="button"
       onClick={()=>setDetail(null)}
       style={{padding:'6px 12px',borderRadius:8,background:'#f1f5f9',color:'#475569',fontWeight:700,fontSize:12,display:'inline-flex',alignItems:'center',gap:5}}
      >
       Tutup <X size={15}/>
      </button>
     </div>

     <div style={{background:'#f8fafc',padding:'12px 18px',borderRadius:12,border:'1px solid #e2e8f0',marginBottom:18}}>
      {detail.items.map(it=>(
       <div key={it.id} className="price-row">
        <span><b>{it.product_name}</b> <span className="muted">× {it.qty}</span></span>
        <b>{rp(it.line_total)}</b>
       </div>
      ))}
      <div className="price-row total">
       <span>Total Pembayaran Tunai (COD)</span>
       <span>{rp(detail.total)}</span>
      </div>
     </div>

     <div className="info-panel" style={{margin:'18px 0',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
      <div>
       <b style={{fontSize:13.5,display:'block',marginBottom:4}}>Status Transaksi: {statuses[detail.status]}</b>
       <div style={{display:'flex',alignItems:'center',gap:14,flexWrap:'wrap',fontSize:12.5}}>
        <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
         <MapPin size={14}/> Lokasi COD: <b>{detail.meeting_location||'Belum disepakati'}</b>
        </span>
        {detail.meeting_at&&(
         <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
          <Calendar size={14}/> Waktu: <b>{dateID(detail.meeting_at)}</b>
         </span>
        )}
       </div>
      </div>
     </div>

     {detail.status==='pending'&&(
      <div style={{background:'#f8fafc',padding:18,borderRadius:12,border:'1px solid #cbd5e1',marginBottom:18}}>
       <h4 style={{marginBottom:12,fontSize:14}}>Tentukan Lokasi & Waktu Pertemuan COD</h4>
       <div className="form-row">
        <div className="form-field">
         <label>Titik Temu / Lokasi COD</label>
         <input value={location} onChange={e=>setLocation(e.target.value)} placeholder="Contoh: Gerbang Utama Kampus / Perpustakaan"/>
        </div>
        <div className="form-field">
         <label>Tanggal dan Jam Pertemuan</label>
         <input type="datetime-local" value={meeting} onChange={e=>setMeeting(e.target.value)}/>
        </div>
       </div>
       <div className="flex gap-3 flex-wrap">
        <Button loading={busy} onClick={confirmOrder}>
         <CheckCircle2 size={16}/> Terima & Sepakati COD
        </Button>
        <Button variant="danger" loading={busy} onClick={cancel}>
         <XCircle size={16}/> Batalkan Pesanan
        </Button>
       </div>
      </div>
     )}

     {detail.status==='confirmed'&&(
      <div className="flex gap-3 flex-wrap" style={{marginBottom:18}}>
       <Button loading={busy} onClick={paid}>
        <CheckCircle2 size={16}/> Konfirmasi Lunas ({rp(detail.total)})
       </Button>
       <Button variant="danger" loading={busy} onClick={cancel}>
        <XCircle size={16}/> Batalkan Pesanan
       </Button>
      </div>
     )}

     {detail.history?.length>0&&(
      <div style={{marginTop:20}}>
       <h4 style={{fontSize:14,color:'#334155',display:'flex',alignItems:'center',gap:6}}>
        <Clock size={15}/> Riwayat Status Pesanan
       </h4>
       <div className="timeline">
        {detail.history.map(h=>(
         <div key={h.id} className="timeline-item">
          <b>{statuses[h.to_status]}</b>
          <p>{h.note}</p>
          <small>{dateID(h.created_at)}</small>
         </div>
        ))}
       </div>
      </div>
     )}
    </div>
   )}
  </DashboardShell>
 );
}
