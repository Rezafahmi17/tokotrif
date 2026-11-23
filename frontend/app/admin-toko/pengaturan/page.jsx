'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {IdCard,Camera} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {Button} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,imageSrc} from '@/lib/api';

export default function Page(){
 const {show}=useToast(),[form,setForm]=useState(null),[busy,setBusy]=useState(false),[file,setFile]=useState(null);
 useEffect(()=>{api('/store/profile').then(setForm).catch(e=>show(e.message,'error'));},[]);

 const uploadDoc=async(type,f)=>{
  if(!f)return;
  setBusy(true);
  try{
   const fd=new FormData();
   fd.append('file',f);
   const res=await api('/auth/upload-doc',{method:'POST',body:fd});
   setForm(prev=>({...prev,[type==='ktm'?'ktm_url':'face_url']:res.url}));
   show('Dokumen berhasil diunggah, klik Simpan profil untuk menyimpan.');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const submit=async e=>{
  e.preventDefault();setBusy(true);
  try{
   const {name,city,address,phone,description,cod_area_note,ktm_url,face_url}=form;
   await api('/store/profile',{
    method:'PATCH',
    body:{name,city,address,phone,description:description||'',cod_area_note:cod_area_note||'',ktm_url:ktm_url||undefined,face_url:face_url||undefined}
   });
   if(file){
    const fd=new FormData();
    fd.append('image',file);
    await api('/store/profile/logo',{method:'POST',body:fd});
   }
   show('Profil & dokumen verifikasi toko diperbarui');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 return (
  <DashboardShell kind="store">
   <h1>Pengaturan Toko & Identitas Penjual</h1>
   <p className="dashboard-subtitle">Perbarui informasi toko, area pertemuan COD, serta dokumen KTM & foto wajah penjual.</p>
   {form&&(
    <form className="panel" onSubmit={submit}>
     {[['name','Nama toko'],['city','Kota'],['address','Alamat lengkap'],['phone','Nomor HP toko'],['cod_area_note','Area COD'],['description','Deskripsi']].map(([key,label])=>(
      <div className="form-field" key={key}>
       <label>{label}</label>
       <input value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/>
      </div>
     ))}
     <div className="form-field">
      <label>Logo toko (opsional)</label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0])}/>
     </div>

     <div style={{background:'#f8fafc',padding:16,borderRadius:10,border:'1px solid #e2e8f0',margin:'18px 0'}}>
      <h3 style={{fontSize:14,marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
       <IdCard size={18} color="#1669e8"/> Dokumen Verifikasi Penjual (KTM & Foto Muka)
      </h3>
      <div className="form-row">
       <div className="form-field">
        <label>Foto KTM Mahasiswa</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadDoc('ktm',e.target.files?.[0])}/>
        {form.ktm_url&&<img src={imageSrc(form.ktm_url)} alt="KTM Penjual" style={{marginTop:8,height:100,objectFit:'cover',borderRadius:8,border:'1px solid #cbd5e1'}}/>}
       </div>
       <div className="form-field">
        <label>Foto Muka Penjual</label>
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>uploadDoc('face',e.target.files?.[0])}/>
        {form.face_url&&<img src={imageSrc(form.face_url)} alt="Wajah Penjual" style={{marginTop:8,height:100,width:100,objectFit:'cover',borderRadius:8,border:'1px solid #cbd5e1'}}/>}
       </div>
      </div>
     </div>

     <Button loading={busy}>Simpan profil</Button>
    </form>
   )}
   <p style={{marginTop:17}}>Untuk mengubah email atau sandi, buka <Link className="text-link" href="/akun">Pengaturan akun</Link>.</p>
  </DashboardShell>
 );
}
