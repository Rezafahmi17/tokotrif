'use client';
import {useState,useEffect} from 'react';
import RouteGuard from '@/components/ui/RouteGuard';
import {useAuth} from '@/context/AuthContext';
import {useToast} from '@/components/ui/Toast';
import {Clock,ShieldCheck,IdCard,CheckCircle2} from 'lucide-react';
import {Button} from '@/components/ui/Elements';
import {api,imageSrc} from '@/lib/api';

export default function Page(){
 const {user,refresh}=useAuth(),{show}=useToast();
 const [ktmUrl,setKtmUrl]=useState('');
 const [faceUrl,setFaceUrl]=useState('');
 const [nim,setNim]=useState('');
 const [busy,setBusy]=useState(false);

 useEffect(()=>{
  if(!user)return;
  setNim(user.nim||'');
  setKtmUrl(user.store?.ktm_url||user.ktm_url||'');
  setFaceUrl(user.store?.face_url||user.face_url||'');
 },[user]);

 const uploadDoc=async(type,file)=>{
  if(!file)return;
  setBusy(true);
  try{
   const fd=new FormData();
   fd.append('file',file);
   const res=await api('/auth/upload-doc',{method:'POST',body:fd});
   if(type==='ktm')setKtmUrl(res.url);
   if(type==='face')setFaceUrl(res.url);
   show('Foto berhasil diunggah');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const saveDocs=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   await api('/auth/verification',{method:'PATCH',body:{nim,ktm_url:ktmUrl,face_url:faceUrl}});
   await refresh();
   show('Dokumen verifikasi penjual berhasil diperbarui!');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 return (
  <RouteGuard roles={['admin_toko']}>
   <div className="container page-space" style={{maxWidth:720}}>
    <div className="panel" style={{textAlign:'center',padding:36}}>
     <Clock size={52} color="#d97706" style={{margin:'0 auto 14px'}}/>
     <h1 style={{fontSize:26}}>Verifikasi Toko & KTM Penjual</h1>
     <p className="muted" style={{margin:'10px 0 20px'}}>
      Status tokomu: <b style={{textTransform:'uppercase'}}>{user?.store?.status}</b>.{' '}
      {user?.store?.status==='rejected'
       ? `Alasan penolakan: ${user.store.rejection_reason||'-'}`
       : 'Super Admin sedang meninjau KTM Mahasiswa dan Foto Muka Penjual sebelum mengaktifkan akses toko.'}
     </p>

     {user?.store?.status==='approved'?(
      <a className="btn btn-primary" href="/admin-toko">Masuk Dashboard Toko</a>
     ):(
      <>
       <form onSubmit={saveDocs} style={{textAlign:'left',background:'#f8fafc',padding:20,borderRadius:12,border:'1px solid #e2e8f0',marginTop:16}}>
        <h3 style={{fontSize:15,marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
         <IdCard size={18} color="#1669e8"/> Kelengkapan Dokumen Verifikasi Penjual
        </h3>
        <div className="form-field">
         <label>NIM / NPM Mahasiswa</label>
         <input value={nim} onChange={e=>setNim(e.target.value)} placeholder="Masukkan NIM Mahasiswa"/>
        </div>
        <div className="form-row">
         <div className="form-field">
          <label>1. Foto KTM Mahasiswa</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadDoc('ktm',e.target.files?.[0])}/>
          {ktmUrl&&<img src={imageSrc(ktmUrl)} alt="KTM" style={{marginTop:8,height:95,objectFit:'cover',borderRadius:8,border:'1px solid #cbd5e1'}}/>}
         </div>
         <div className="form-field">
          <label>2. Foto Muka Penjual (Selfie)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadDoc('face',e.target.files?.[0])}/>
          {faceUrl&&<img src={imageSrc(faceUrl)} alt="Wajah Penjual" style={{marginTop:8,height:95,width:95,objectFit:'cover',borderRadius:8,border:'1px solid #cbd5e1'}}/>}
         </div>
        </div>
        <div className="flex gap-3" style={{marginTop:12}}>
         <Button loading={busy}><CheckCircle2 size={15}/> Simpan Dokumen</Button>
         <Button type="button" variant="outline" onClick={refresh}>Periksa Status Verifikasi</Button>
        </div>
       </form>
      </>
     )}
    </div>
   </div>
  </RouteGuard>
 );
}
