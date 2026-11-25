'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {IdCard,Upload,Store,CheckCircle2,Eye} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {Button} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {useAuth} from '@/context/AuthContext';
import {api,imageSrc,storeStatuses} from '@/lib/api';

export default function Page(){
 const {show}=useToast();
 const {refresh}=useAuth();
 const [form,setForm]=useState(null);
 const [busy,setBusy]=useState(false);
 const [uploadingLogo,setUploadingLogo]=useState(false);
 const [uploadingDoc,setUploadingDoc]=useState({ktm:false,face:false});
 const [logoBroken,setLogoBroken]=useState(false);

 useEffect(()=>{
  api('/store/profile').then(setForm).catch(e=>show(e.message,'error'));
 },[]);

 const handleLogoUpload=async f=>{
  if(!f)return;
  setUploadingLogo(true);
  try{
   const fd=new FormData();
   fd.append('image',f);
   const res=await api('/store/profile/logo',{method:'POST',body:fd});
   setLogoBroken(false);
   setForm(prev=>({...prev,logo_url:res.url}));
   await refresh();
   show('Logo toko berhasil diunggah & diperbarui!');
  }catch(e){
   show(e.message,'error');
  }finally{
   setUploadingLogo(false);
  }
 };

 const uploadDoc=async(type,f)=>{
  if(!f)return;
  setUploadingDoc(prev=>({...prev,[type]:true}));
  try{
   const fd=new FormData();
   fd.append('file',f);
   const res=await api('/auth/upload-doc',{method:'POST',body:fd});
   const field=type==='ktm'?'ktm_url':'face_url';
   setForm(prev=>({...prev,[field]:res.url}));
   await api('/store/profile',{method:'PATCH',body:{[field]:res.url}});
   await refresh();
   show(type==='ktm'?'Foto KTM Mahasiswa berhasil diperbarui':'Foto Muka Penjual berhasil diperbarui');
  }catch(e){
   show(e.message,'error');
  }finally{
   setUploadingDoc(prev=>({...prev,[type]:false}));
  }
 };

 const submit=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   const {name,city,address,phone,description,cod_area_note,ktm_url,face_url}=form;
   const updated=await api('/store/profile',{
    method:'PATCH',
    body:{
     name,
     city,
     address,
     phone,
     description:description||'',
     cod_area_note:cod_area_note||'',
     ktm_url:ktm_url||undefined,
     face_url:face_url||undefined
    }
   });
   if(updated)setForm(prev=>({...prev,...updated}));
   await refresh();
   show('Profil & dokumen verifikasi toko berhasil disimpan');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const logoUrl=imageSrc(form?.logo_url);

 return (
  <DashboardShell kind="store">
   <h1>Pengaturan Toko & Identitas Penjual</h1>
   <p className="dashboard-subtitle">Perbarui logo toko, informasi lokasi COD, serta dokumen KTM & foto wajah penjual.</p>
   {form&&(
    <form className="panel" onSubmit={submit}>
     {/* Bagian Logo Toko dengan Pratinjau Langsung */}
     <div style={{background:'#f8fafc',padding:18,borderRadius:12,border:'1px solid #e2e8f0',marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,flexWrap:'wrap'}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
       <div style={{width:80,height:80,borderRadius:16,border:'2px solid #cbd5e1',background:'#ffffff',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,boxShadow:'0 2px 8px rgba(15,23,42,0.06)'}}>
        {logoUrl&&!logoBroken?(
         <img
          src={logoUrl}
          alt={form.name||'Logo Toko'}
          style={{width:'100%',height:'100%',objectFit:'cover'}}
          onError={()=>setLogoBroken(true)}
         />
        ):(
         <Store size={34} color="#1669e8"/>
        )}
       </div>
       <div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
         <b style={{fontSize:16,color:'#0f172a'}}>{form.name||'Nama Toko'}</b>
         <span className={`badge status-${form.status||'pending'}`}>
          {storeStatuses[form.status]||form.status}
         </span>
        </div>
        <p className="muted text-xs" style={{margin:'4px 0 10px'}}>
         Logo toko ditampilkan pada halaman publik toko, detail produk, dan panel verifikasi Super Admin.
        </p>
        <label className="btn btn-outline" style={{cursor:'pointer',minHeight:36,padding:'6px 14px',fontSize:12.5}}>
         <Upload size={15}/> {uploadingLogo?'Mengunggah Logo...':logoUrl?'Ganti Logo Toko':'Unggah Logo Toko'}
         <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{display:'none'}}
          disabled={uploadingLogo}
          onChange={e=>handleLogoUpload(e.target.files?.[0])}
         />
        </label>
       </div>
      </div>
      {form.slug&&(
       <Link href={`/toko/${form.slug}`} className="text-link" style={{fontSize:12.5,display:'inline-flex',alignItems:'center',gap:5}}>
        <Eye size={14}/> Lihat Halaman Publik Toko
       </Link>
      )}
     </div>

     <div className="form-row">
      <div className="form-field">
       <label>Nama Toko</label>
       <input required value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/>
      </div>
      <div className="form-field">
       <label>Kota / Kampus</label>
       <input required value={form.city||''} onChange={e=>setForm({...form,city:e.target.value})}/>
      </div>
      <div className="form-field">
       <label>Nomor HP / WhatsApp Toko</label>
       <input required value={form.phone||''} onChange={e=>setForm({...form,phone:e.target.value})}/>
      </div>
      <div className="form-field">
       <label>Area Titik Temu COD Kampus</label>
       <input value={form.cod_area_note||''} onChange={e=>setForm({...form,cod_area_note:e.target.value})} placeholder="Contoh: Gedung A, Perpustakaan, Gerbang Utama Polinela"/>
      </div>
     </div>

     <div className="form-field">
      <label>Alamat Lengkap Toko</label>
      <input required value={form.address||''} onChange={e=>setForm({...form,address:e.target.value})}/>
     </div>

     <div className="form-field">
      <label>Deskripsi Singkat Toko</label>
      <textarea rows={3} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Jelaskan produk yang dijual oleh toko Anda..."/>
     </div>

     {/* Bagian Dokumen Verifikasi Penjual */}
     <div style={{background:'#f8fafc',padding:18,borderRadius:12,border:'1px solid #e2e8f0',margin:'18px 0'}}>
      <div className="between" style={{flexWrap:'wrap',gap:8,marginBottom:12}}>
       <h3 style={{fontSize:14.5,margin:0,display:'flex',alignItems:'center',gap:7}}>
        <IdCard size={18} color="#1669e8"/> Dokumen Verifikasi Penjual (KTM Mahasiswa & Foto Muka)
       </h3>
       <span className={`badge status-${form.status==='approved'?'approved':'pending'}`}>
        {form.status==='approved'?'Identitas Terverifikasi':'Menunggu Verifikasi Super Admin'}
       </span>
      </div>

      <div className="form-row">
       <div className="form-field" style={{marginBottom:0}}>
        <label>Foto KTM Mahasiswa</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingDoc.ktm} onChange={e=>uploadDoc('ktm',e.target.files?.[0])}/>
        {uploadingDoc.ktm&&<small className="muted">Mengunggah Foto KTM...</small>}
        {form.ktm_url&&(
         <div style={{marginTop:10,background:'#ffffff',padding:10,borderRadius:10,border:'1px solid #cbd5e1',display:'inline-block',maxWidth:240}}>
          <a href={imageSrc(form.ktm_url)} target="_blank" rel="noreferrer" title="Klik untuk melihat ukuran penuh">
           <img
            src={imageSrc(form.ktm_url)}
            alt="KTM Penjual"
            style={{width:220,height:135,objectFit:'contain',borderRadius:6,background:'#0f172a'}}
           />
          </a>
          <small className="muted" style={{display:'block',marginTop:4,fontSize:11,textAlign:'center'}}>Klik gambar untuk memperbesar</small>
         </div>
        )}
       </div>

       <div className="form-field" style={{marginBottom:0}}>
        <label>Foto Muka / Wajah Penjual</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadingDoc.face} onChange={e=>uploadDoc('face',e.target.files?.[0])}/>
        {uploadingDoc.face&&<small className="muted">Mengunggah Foto Wajah...</small>}
        {form.face_url&&(
         <div style={{marginTop:10,background:'#ffffff',padding:10,borderRadius:10,border:'1px solid #cbd5e1',display:'inline-block'}}>
          <a href={imageSrc(form.face_url)} target="_blank" rel="noreferrer" title="Klik untuk melihat ukuran penuh">
           <img
            src={imageSrc(form.face_url)}
            alt="Wajah Penjual"
            style={{width:135,height:135,objectFit:'cover',borderRadius:8,background:'#0f172a'}}
           />
          </a>
          <small className="muted" style={{display:'block',marginTop:4,fontSize:11,textAlign:'center'}}>Klik gambar untuk memperbesar</small>
         </div>
        )}
       </div>
      </div>
     </div>

     <Button loading={busy||uploadingLogo||uploadingDoc.ktm||uploadingDoc.face}>
      <CheckCircle2 size={16}/> Simpan Profil Toko
     </Button>
    </form>
   )}
   <p style={{marginTop:17}}>Untuk mengubah email atau kata sandi akun, buka <Link className="text-link" href="/akun">Pengaturan Akun</Link>.</p>
  </DashboardShell>
 );
}
