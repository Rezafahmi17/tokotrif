'use client';
import {useState,useEffect} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {ShoppingBag,ShieldCheck,Store,IdCard,Camera,CheckCircle2,Upload} from 'lucide-react';
import {useAuth} from '@/context/AuthContext';
import {useToast} from './Toast';
import {Button} from './Elements';
import {api,imageSrc} from '@/lib/api';

function Field({label,name,type='text',value,onChange,placeholder,required=true}){
 return (
  <div className="form-field">
   <label htmlFor={name}>{label}</label>
   <input id={name} name={name} type={type} value={value||''} onChange={onChange} placeholder={placeholder} required={required} minLength={type==='password'?8:undefined}/>
  </div>
 );
}

export default function AuthPages({kind}){
 const {user,login,refresh}=useAuth(),router=useRouter(),{show}=useToast();
 const [roleChoice,setRoleChoice]=useState(kind==='store'?'store':'buyer');
 const [form,setForm]=useState({name:'',email:'',password:'',phone:'',nim:'',storeName:'',city:'',address:'',storePhone:'',description:'',token:''});
 const [ktmUrl,setKtmUrl]=useState('');
 const [faceUrl,setFaceUrl]=useState('');
 const [uploadingDoc,setUploadingDoc]=useState({ktm:false,face:false});
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const change=e=>setForm(x=>({...x,[e.target.name]:e.target.value}));

 useEffect(()=>{
  if(user){
   setForm(x=>({...x,storePhone:x.storePhone||user.phone||'',nim:x.nim||user.nim||''}));
   if(user.ktm_url)setKtmUrl(user.ktm_url);
   if(user.face_url)setFaceUrl(user.face_url);
  }
 },[user]);

 const isExistingCustomerOpeningStore=Boolean(user&&user.role==='customer'&&kind==='store');
 const isStoreForm=kind==='store'||(kind==='register'&&roleChoice==='store');
 const isRegister=kind==='register'||kind==='store';
 const isForgot=kind==='forgot',isReset=kind==='reset';

 const uploadDoc=async(type,file)=>{
  if(!file)return;
  setUploadingDoc(u=>({...u,[type]:true}));
  setError('');
  try{
   const fd=new FormData();
   fd.append('file',file);
   const res=await api('/auth/upload-doc',{method:'POST',body:fd});
   if(type==='ktm')setKtmUrl(res.url);
   if(type==='face')setFaceUrl(res.url);
   show(type==='ktm'?'Foto KTM berhasil diunggah':'Foto wajah penjual berhasil diunggah');
  }catch(e){
   show(e.message||'Gagal mengunggah foto','error');
  }finally{
   setUploadingDoc(u=>({...u,[type]:false}));
  }
 };

 const submit=async e=>{
  e.preventDefault();setLoading(true);setError('');
  const email=form.email.trim();
  try{
   if(kind==='login'){
    const loggedUser=await login(email,form.password);
    const me=loggedUser||(await api('/auth/me'));
    const next=new URLSearchParams(window.location.search).get('next');
    router.replace(next?.startsWith('/')?next:me?.role==='super_admin'?'/super-admin':me?.role==='admin_toko'?'/admin-toko':'/');
    return;
   }
   if(isExistingCustomerOpeningStore){
    if(!ktmUrl||!faceUrl){
     throw new Error('Wajib mengunggah Foto KTM Mahasiswa dan Foto Muka Penjual untuk verifikasi toko.');
    }
    await api('/auth/open-store',{
     method:'POST',
     body:{
      storeName:form.storeName,
      city:form.city,
      address:form.address,
      storePhone:form.storePhone||user.phone,
      description:form.description||'',
      nim:form.nim||null,
      ktm_url:ktmUrl,
      face_url:faceUrl
     }
    });
    await refresh();
    show('Pendaftaran toko & dokumen KTM berhasil dikirim! Menunggu verifikasi Super Admin.');
    router.replace('/menunggu-verifikasi');
    return;
   }
   if(isRegister){
    if(isStoreForm){
     if(!ktmUrl||!faceUrl){
      throw new Error('Penjual wajib mengunggah Foto KTM Mahasiswa dan Foto Muka Penjual.');
     }
     await api('/auth/register-store',{
      method:'POST',
      body:{...form,email,ktm_url:ktmUrl,face_url:faceUrl}
     });
     show('Pendaftaran toko berhasil! Menunggu verifikasi KTM & Identitas oleh Super Admin.');
    }else{
     if(!ktmUrl){
      throw new Error('Pembeli wajib mengunggah Foto KTM Mahasiswa untuk verifikasi akun kampus.');
     }
     await api('/auth/register',{
      method:'POST',
      body:{...form,email,ktm_url:ktmUrl}
     });
     show('Akun pembeli berhasil didaftarkan! Silakan masuk.');
    }
    router.push('/masuk');
    return;
   }
   if(isForgot){
    await api('/auth/forgot-password',{method:'POST',body:{email:form.email}});
    show('Jika email terdaftar, instruksi reset telah dikirim.');
   }
   if(isReset){
    const token=new URLSearchParams(window.location.search).get('token')||form.token;
    await api('/auth/reset-password',{method:'POST',body:{token,password:form.password}});
    show('Sandi berhasil diubah');
    router.push('/masuk');
   }
  }catch(err){
   setError(err.message);
  }finally{
   setLoading(false);
  }
 };

 const title={
  login:'Selamat datang kembali',
  register:roleChoice==='store'?'Daftar Penjual & Verifikasi KTM':'Buat Akun Pembeli Mahasiswa',
  store:isExistingCustomerOpeningStore?'Buka Toko Mahasiswa':'Mulai Berjualan di KampusBalik',
  forgot:'Lupa kata sandi?',
  reset:'Atur ulang kata sandi'
 }[kind];

 return (
  <div className="container">
   <div className="auth-wrap">
    <div className="auth-side">
     <div className="auth-bubble">{isStoreForm?<Store size={35}/>:<ShoppingBag size={36}/>}</div>
     <h2>{isStoreForm?'Jualan aman di lingkungan kampus dengan verifikasi KTM.':'Belanja aman dari sesama mahasiswa terverifikasi.'}</h2>
     <p>{isStoreForm?'Unggah KTM Mahasiswa dan foto wajah penjual untuk ditinjau oleh Super Admin. Kepercayaan pembeli meningkat, transaksi COD jadi lebih aman.':'Semua penjual dan pembeli terverifikasi menggunakan Kartu Tanda Mahasiswa (KTM). Chat dengan foto/video dan bayar tunai saat bertemu.'}</p>
     <p style={{marginTop:28,fontSize:12}}><ShieldCheck size={15} style={{display:'inline'}}/> Verifikasi KTM Mahasiswa • Chat Foto & Video • COD Tunai</p>
    </div>
    <div className="auth-main">
     <h1>{title}</h1>
     <p>
      {isExistingCustomerOpeningStore
       ? `Halo ${user?.name}! Lengkapi profil toko serta unggah KTM Mahasiswa & Foto Muka Penjual untuk verifikasi Super Admin.`
       : isStoreForm
       ? 'Lengkapi identitas mahasiswa dan informasi tokomu. Super Admin akan memverifikasi KTM & foto wajahmu.'
       : isRegister
       ? 'Daftarkan akun pembeli mahasiswa dengan mengunggah foto KTM aktifmu.'
       : 'Masukkan data akunmu untuk melanjutkan.'}
     </p>

     {kind==='register'&&!isExistingCustomerOpeningStore&&(
      <div style={{display:'flex',gap:10,marginBottom:20}}>
       <button
        type="button"
        onClick={()=>setRoleChoice('buyer')}
        className={`btn ${roleChoice==='buyer'?'btn-primary':'btn-outline'}`}
        style={{flex:1,fontSize:12,padding:'9px 12px',minHeight:38}}
       >
        <ShoppingBag size={14}/> Akun Pembeli
       </button>
       <button
        type="button"
        onClick={()=>setRoleChoice('store')}
        className={`btn ${roleChoice==='store'?'btn-primary':'btn-outline'}`}
        style={{flex:1,fontSize:12,padding:'9px 12px',minHeight:38}}
       >
        <Store size={14}/> Akun Penjual (Buka Toko)
       </button>
      </div>
     )}

     {error&&<div className="notice notice-warning" style={{marginBottom:16}}>{error}</div>}

     <form onSubmit={submit}>
      {!isExistingCustomerOpeningStore&&(
       <>
        {isRegister&&<Field label="Nama lengkap sesuai KTM" name="name" value={form.name} onChange={change} placeholder="Contoh: Reza Fahmi Alkhamdani"/>}
        <Field label="Alamat email" name="email" type="email" value={form.email} onChange={change} placeholder="nama@mahasiswa.ac.id / gmail.com"/>
        {!isForgot&&<Field label={isReset?'Sandi baru':'Kata sandi'} name="password" type="password" value={form.password} onChange={change}/>}
        {isRegister&&<Field label="Nomor WhatsApp / HP aktif" name="phone" type="tel" value={form.phone} onChange={change} placeholder="08xxxxxxxxxx"/>}
       </>
      )}

      {isRegister&&(
       <div className="verif-upload-box" style={{background:'#f8fafc',border:'1px solid #cbd5e1',borderRadius:12,padding:16,margin:'16px 0'}}>
        <h3 style={{fontSize:14,fontWeight:800,color:'#0f172a',marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
         <IdCard size={18} color="#1669e8"/> Verifikasi Identitas Mahasiswa (Wajib)
        </h3>
        <p className="muted text-xs" style={{marginBottom:14}}>
         Unggah foto Kartu Tanda Mahasiswa (KTM) yang jelas{isStoreForm?' beserta foto wajah (selfie) penjual':''}.
        </p>

        <Field label="NIM / NPM Mahasiswa" name="nim" value={form.nim} onChange={change} placeholder="Masukkan Nomor Induk Mahasiswa"/>

        <div className="form-field">
         <label>1. Foto KTM Mahasiswa (JPG/PNG/WebP) *</label>
         <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={e=>uploadDoc('ktm',e.target.files?.[0])}
         />
         {uploadingDoc.ktm&&<small className="muted">Mengunggah foto KTM...</small>}
         {ktmUrl&&(
          <div style={{marginTop:8,display:'flex',alignItems:'center',gap:12,background:'#fff',padding:8,borderRadius:8,border:'1px solid #e2e8f0'}}>
           <img src={imageSrc(ktmUrl)} alt="Preview KTM" style={{width:72,height:48,objectFit:'cover',borderRadius:6}}/>
           <span style={{fontSize:12,color:'#16a34a',fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
            <CheckCircle2 size={15}/> Foto KTM siap dikirim
           </span>
          </div>
         )}
        </div>

        {isStoreForm&&(
         <div className="form-field" style={{marginTop:12}}>
          <label>2. Foto Muka / Wajah Penjual (Selfie Jelas) *</label>
          <input
           type="file"
           accept="image/jpeg,image/png,image/webp"
           onChange={e=>uploadDoc('face',e.target.files?.[0])}
          />
          {uploadingDoc.face&&<small className="muted">Mengunggah foto wajah penjual...</small>}
          {faceUrl&&(
           <div style={{marginTop:8,display:'flex',alignItems:'center',gap:12,background:'#fff',padding:8,borderRadius:8,border:'1px solid #e2e8f0'}}>
            <img src={imageSrc(faceUrl)} alt="Preview Wajah Penjual" style={{width:56,height:56,objectFit:'cover',borderRadius:'50%'}}/>
            <span style={{fontSize:12,color:'#16a34a',fontWeight:700,display:'flex',alignItems:'center',gap:4}}>
             <CheckCircle2 size={15}/> Foto wajah penjual siap dikirim
            </span>
           </div>
          )}
         </div>
        )}
       </div>
      )}

      {isStoreForm&&(
       <>
        <div className="info-panel" style={{margin:'15px 0'}}>
         <h3><Store size={15} style={{display:'inline',verticalAlign:'middle',marginRight:5}}/> Informasi Toko Kampus</h3>
         Toko akan diverifikasi oleh Super Admin berdasarkan KTM dan foto wajah yang diunggah.
        </div>
        <Field label="Nama toko" name="storeName" value={form.storeName} onChange={change} placeholder="Contoh: Kampus Thrift & Preloved"/>
        <Field label="Kota / Area Kampus" name="city" value={form.city} onChange={change} placeholder="Contoh: Bandar Lampung"/>
        <Field label="Alamat / Titik COD Utama" name="address" value={form.address} onChange={change} placeholder="Contoh: Gerbang Utama Kampus / Gedung A"/>
        <Field label="Nomor HP / WhatsApp Toko" name="storePhone" type="tel" value={form.storePhone} onChange={change} placeholder="08xxxxxxxxxx"/>
        <Field label="Deskripsi toko (opsional)" name="description" value={form.description} onChange={change} required={false} placeholder="Deskripsikan produk yang Anda jual..."/>
       </>
      )}

      {isReset&&<Field label="Token reset (otomatis dari tautan email)" name="token" value={form.token} onChange={change} required={false}/>}

      <Button loading={loading||uploadingDoc.ktm||uploadingDoc.face}>
       {isExistingCustomerOpeningStore
        ? 'Kirim Pendaftaran & Verifikasi Toko'
        : isStoreForm
        ? 'Daftar & Ajukan Verifikasi Toko'
        : isRegister
        ? 'Daftar Akun Pembeli'
        : isForgot
        ? 'Kirim tautan reset'
        : isReset
        ? 'Simpan sandi'
        : 'Masuk'}
      </Button>
     </form>

     <div className="auth-bottom">
      {kind==='login'?(
       <>
        <Link href="/lupa-sandi">Lupa sandi?</Link>
        <p style={{marginTop:12}}>Belum punya akun? <Link href="/daftar">Daftar akun mahasiswa</Link></p>
        <p style={{marginTop:7}}><Link href="/daftar-toko">Daftar sebagai penjual (Buka Toko)</Link></p>
       </>
      ):(
       <Link href="/masuk">Sudah punya akun? Masuk</Link>
      )}
     </div>
    </div>
   </div>
  </div>
 );
}
