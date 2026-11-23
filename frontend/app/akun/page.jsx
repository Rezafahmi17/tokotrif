'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Store,IdCard,Camera,MessageCircle,ShieldCheck,Clock,AlertCircle,ArrowRight,CheckCircle2} from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';
import {useAuth} from '@/context/AuthContext';
import {useToast} from '@/components/ui/Toast';
import {Button} from '@/components/ui/Elements';
import {api,imageSrc,dateID} from '@/lib/api';

export default function Page(){
 const {user,refresh}=useAuth(),{show}=useToast();
 const [pwd,setPwd]=useState({oldPassword:'',newPassword:''});
 const [email,setEmail]=useState({oldPassword:'',email:''});
 const [nim,setNim]=useState('');
 const [ktmUrl,setKtmUrl]=useState('');
 const [faceUrl,setFaceUrl]=useState('');
 const [threads,setThreads]=useState([]);
 const [uploading,setUploading]=useState({ktm:false,face:false});
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  if(!user)return;
  setNim(user.nim||'');
  setKtmUrl(user.ktm_url||user.store?.ktm_url||'');
  setFaceUrl(user.face_url||user.store?.face_url||'');
  if(['customer','admin_toko'].includes(user.role)){
   api('/chat/threads').then(t=>setThreads(t||[])).catch(()=>{});
  }
 },[user]);

 const save=async(type,data)=>{
  setBusy(true);
  try{
   await api(`/auth/${type}`,{method:'PATCH',body:data});
   show('Pengaturan akun berhasil diperbarui');
   await refresh();
   setPwd({oldPassword:'',newPassword:''});
   setEmail({oldPassword:'',email:''});
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const uploadFile=async(type,file)=>{
  if(!file)return;
  setUploading(u=>({...u,[type]:true}));
  try{
   const fd=new FormData();
   fd.append('file',file);
   const res=await api('/auth/upload-doc',{method:'POST',body:fd});
   if(type==='ktm')setKtmUrl(res.url);
   if(type==='face')setFaceUrl(res.url);
   show('Foto berhasil diunggah, klik Simpan Verifikasi untuk memperbarui.');
  }catch(e){
   show(e.message,'error');
  }finally{
   setUploading(u=>({...u,[type]:false}));
  }
 };

 const saveVerification=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   await api('/auth/verification',{
    method:'PATCH',
    body:{nim:nim||null,ktm_url:ktmUrl||null,face_url:faceUrl||null}
   });
   await refresh();
   show('Dokumen verifikasi KTM berhasil disimpan!');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const ktmBadge={
  verified:{label:'Terverifikasi Mahasiswa',cls:'status-approved'},
  pending:{label:'Menunggu Verifikasi Super Admin',cls:'status-pending'},
  rejected:{label:'Verifikasi Ditolak',cls:'status-rejected'},
  unsubmitted:{label:'Belum Mengunggah KTM',cls:'status-cancelled'}
 }[user?.ktm_status||'unsubmitted'];

 return (
  <RouteGuard roles={['customer','admin_toko','super_admin']}>
   <div className="container page-space" style={{maxWidth:920}}>
    <div className="page-heading">
     <h1>Pengaturan Akun & Verifikasi KTM</h1>
     <p>
      {user?.name} · {user?.email}
      <span className="badge" style={{marginLeft:8,textTransform:'capitalize'}}>{user?.role?.replace('_',' ')}</span>
     </p>
    </div>

    {/* Bagian Verifikasi KTM Mahasiswa (Pembeli & Penjual) */}
    {user?.role!=='super_admin'&&(
     <div className="panel" style={{marginBottom:24,border:'1.5px solid #cbd5e1'}}>
      <div className="between" style={{flexWrap:'wrap',gap:12,marginBottom:16}}>
       <div>
        <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8,color:'#0f172a'}}>
         <IdCard size={22} color="#1669e8"/> Verifikasi KTM Mahasiswa {user?.role==='admin_toko'?'& Foto Penjual':''}
        </h3>
        <p className="muted text-xs" style={{marginTop:4}}>
         Verifikasi identitas mahasiswa memastikan keamanan transaksi COD di lingkungan kampus.
        </p>
       </div>
       <span className={`badge ${ktmBadge.cls}`} style={{fontSize:12,padding:'6px 12px'}}>
        {ktmBadge.label}
       </span>
      </div>

      {user?.ktm_status==='rejected'&&user?.ktm_rejection_reason&&(
       <div className="notice notice-warning" style={{marginBottom:16}}>
        <b>Alasan Penolakan:</b> {user.ktm_rejection_reason}. Silakan unggah ulang foto KTM yang jelas.
       </div>
      )}

      <form onSubmit={saveVerification}>
       <div className="form-row">
        <div className="form-field">
         <label>NIM / NPM Mahasiswa</label>
         <input value={nim} onChange={e=>setNim(e.target.value)} placeholder="Nomor Induk Mahasiswa"/>
        </div>
        <div className="form-field">
         <label>Unggah / Perbarui Foto KTM Mahasiswa</label>
         <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadFile('ktm',e.target.files?.[0])}/>
         {uploading.ktm&&<small className="muted">Mengunggah KTM...</small>}
        </div>
        {user?.role==='admin_toko'&&(
         <div className="form-field">
          <label>Unggah / Perbarui Foto Muka Penjual</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadFile('face',e.target.files?.[0])}/>
          {uploading.face&&<small className="muted">Mengunggah foto wajah...</small>}
         </div>
        )}
       </div>

       <div style={{display:'flex',gap:16,flexWrap:'wrap',margin:'12px 0 18px'}}>
        {ktmUrl&&(
         <div style={{background:'#f8fafc',padding:10,borderRadius:10,border:'1px solid #e2e8f0'}}>
          <small className="muted" style={{display:'block',marginBottom:6,fontWeight:700}}>Foto KTM Mahasiswa:</small>
          <a href={imageSrc(ktmUrl)} target="_blank" rel="noreferrer">
           <img src={imageSrc(ktmUrl)} alt="KTM Mahasiswa" style={{height:110,width:175,objectFit:'cover',borderRadius:6}}/>
          </a>
         </div>
        )}
        {faceUrl&&(
         <div style={{background:'#f8fafc',padding:10,borderRadius:10,border:'1px solid #e2e8f0'}}>
          <small className="muted" style={{display:'block',marginBottom:6,fontWeight:700}}>Foto Muka Penjual:</small>
          <a href={imageSrc(faceUrl)} target="_blank" rel="noreferrer">
           <img src={imageSrc(faceUrl)} alt="Foto Muka Penjual" style={{height:110,width:110,objectFit:'cover',borderRadius:8}}/>
          </a>
         </div>
        )}
       </div>

       <Button loading={busy||uploading.ktm||uploading.face}>
        <CheckCircle2 size={16}/> Simpan Dokumen Verifikasi
       </Button>
      </form>
     </div>
    )}

    {/* Riwayat Chat Pembeli / Penjual */}
    {['customer','admin_toko'].includes(user?.role)&&(
     <div className="panel" style={{marginBottom:24}}>
      <div className="between" style={{marginBottom:14}}>
       <div>
        <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8}}>
         <MessageCircle size={20} color="#1669e8"/> Riwayat Chat & Diskusi COD
        </h3>
        <p className="muted text-xs" style={{marginTop:4}}>
         Daftar percakapan Anda dengan {user?.role==='customer'?'penjual toko':'pembeli'} (mendukung kirim foto & video).
        </p>
       </div>
       <Link href="/chat" className="btn btn-primary" style={{minHeight:36,padding:'6px 14px',fontSize:13}}>
        Buka Semua Chat <ArrowRight size={15}/>
       </Link>
      </div>
      {threads.length?(
       <div style={{display:'grid',gap:8}}>
        {threads.slice(0,5).map(t=>{
         const partner=user?.role==='customer'?t.store_name:t.customer_name;
         const unread=(user?.role==='customer'?t.customer_unread:t.store_unread)>0;
         return (
          <Link
           key={t.id}
           href={`/chat?thread=${t.id}`}
           style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 14px',borderRadius:10,border:'1px solid #e2e8f0',background:unread?'#eff6ff':'#f8fafc'}}
          >
           <div>
            <b style={{color:'#0f172a',fontSize:14}}>{partner}</b>
            {unread&&<span className="badge status-pending" style={{marginLeft:8,fontSize:10}}>Pesan baru</span>}
            <p className="muted text-xs" style={{marginTop:2}}>{t.last_message||'Mulai percakapan COD...'}</p>
           </div>
           <div style={{textAlign:'right'}}>
            <small className="muted text-xs">{dateID(t.last_message_at)}</small>
            <div style={{color:'#1669e8',fontSize:12,fontWeight:700,marginTop:2}}>Lanjut Chat →</div>
           </div>
          </Link>
         );
        })}
       </div>
      ):(
       <p className="muted text-sm">Belum ada riwayat chat. Buka halaman produk dan klik tombol Chat untuk berdiskusi dengan penjual.</p>
      )}
     </div>
    )}

    {user?.role==='customer'&&(
     <div className="panel" style={{marginBottom:24,background:'#f0fdf4',borderColor:'#bbf7d0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
       <div>
        <h3 style={{margin:0,color:'#166534',display:'flex',alignItems:'center',gap:8}}>
         <Store size={20}/> Ingin Mulai Berjualan di KampusBalik?
        </h3>
        <p style={{margin:'6px 0 0',fontSize:13,color:'#15803d'}}>
         Ajukan pembukaan toko mahasiswa dengan verifikasi KTM dan foto wajah penjual.
        </p>
       </div>
       <Link href="/daftar-toko" className="btn btn-primary" style={{background:'#166534',borderColor:'#166534'}}>
        Buka Toko Mahasiswa
       </Link>
      </div>
     </div>
    )}

    {user?.role==='admin_toko'&&(
     <div className="panel" style={{marginBottom:24,background:'#eff6ff',borderColor:'#bfdbfe'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:16}}>
       <div>
        <h3 style={{margin:0,color:'#1e40af',display:'flex',alignItems:'center',gap:8}}>
         <Store size={20}/> Toko Anda: {user.store?.name||'Terdaftar'} ({user.store?.status})
        </h3>
        <p style={{margin:'6px 0 0',fontSize:13,color:'#1d4ed8'}}>
         Kelola katalog produk, stok, pesanan pembeli, dan keuangan toko Anda.
        </p>
       </div>
       <Link href="/admin-toko" className="btn btn-primary">
        Masuk Dashboard Toko
       </Link>
      </div>
     </div>
    )}

    <div className="form-row">
     <form className="panel" onSubmit={e=>{e.preventDefault();save('password',pwd);}}>
      <h3 style={{marginBottom:20}}>Ubah kata sandi</h3>
      <div className="form-field"><label>Sandi lama</label><input type="password" value={pwd.oldPassword} required onChange={e=>setPwd({...pwd,oldPassword:e.target.value})}/></div>
      <div className="form-field"><label>Sandi baru (min. 8 karakter)</label><input type="password" minLength={8} value={pwd.newPassword} required onChange={e=>setPwd({...pwd,newPassword:e.target.value})}/></div>
      <Button loading={busy}>Simpan sandi</Button>
     </form>
     <form className="panel" onSubmit={e=>{e.preventDefault();save('email',email);}}>
      <h3 style={{marginBottom:20}}>Ubah alamat email</h3>
      <div className="form-field"><label>Email baru</label><input type="email" value={email.email} required onChange={e=>setEmail({...email,email:e.target.value})}/></div>
      <div className="form-field"><label>Konfirmasi sandi lama</label><input type="password" value={email.oldPassword} required onChange={e=>setEmail({...email,oldPassword:e.target.value})}/></div>
      <Button loading={busy}>Simpan email</Button>
     </form>
    </div>
   </div>
  </RouteGuard>
 );
}
