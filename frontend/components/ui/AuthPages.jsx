'use client';
import {useState,useEffect} from 'react';import Link from 'next/link';import {useRouter} from 'next/navigation';import {ShoppingBag,ShieldCheck,Store,CheckCircle2} from 'lucide-react';import {useAuth} from '@/context/AuthContext';import {useToast} from './Toast';import {Button} from './Elements';import {api} from '@/lib/api';
function Field({label,name,type='text',value,onChange,placeholder,required=true}){return <div className="form-field"><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} value={value||''} onChange={onChange} placeholder={placeholder} required={required} minLength={type==='password'?8:undefined}/></div>;}
export default function AuthPages({kind}){
 const {user,login,refresh}=useAuth(),router=useRouter(),{show}=useToast();
 const [roleChoice,setRoleChoice]=useState(kind==='store'?'store':'buyer');
 const [form,setForm]=useState({name:'',email:'',password:'',phone:'',storeName:'',city:'',address:'',storePhone:'',description:'',token:''});
 const [loading,setLoading]=useState(false),[error,setError]=useState('');
 const change=e=>setForm(x=>({...x,[e.target.name]:e.target.value}));

 useEffect(()=>{
  if(user&&user.role==='customer'){
   setForm(x=>({...x,storePhone:x.storePhone||user.phone||''}));
  }
 },[user]);

 const isExistingCustomerOpeningStore=Boolean(user&&user.role==='customer'&&kind==='store');
 const isStoreForm=kind==='store'||(kind==='register'&&roleChoice==='store');
 const isRegister=kind==='register'||kind==='store';
 const isForgot=kind==='forgot',isReset=kind==='reset';

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
    await api('/auth/open-store',{method:'POST',body:{storeName:form.storeName,city:form.city,address:form.address,storePhone:form.storePhone||user.phone,description:form.description||''}});
    await refresh();
    show('Pendaftaran toko berhasil! Menunggu verifikasi dari Super Admin.');
    router.replace('/admin-toko');
    return;
   }
   if(isRegister){
    if(isStoreForm){
     await api('/auth/register-store',{method:'POST',body:form});
     show('Pendaftaran toko berhasil! Akun Anda sedang menunggu verifikasi dari Super Admin.');
    }else{
     await api('/auth/register',{method:'POST',body:form});
     show('Akun berhasil didaftarkan. Silakan masuk.');
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
  register:roleChoice==='store'?'Daftar akun penjual & buka toko':'Buat akun pembeli',
  store:isExistingCustomerOpeningStore?'Buka toko Anda sekarang':'Mulai berjualan di KampusBalik',
  forgot:'Lupa kata sandi?',
  reset:'Atur ulang kata sandi'
 }[kind];

 return (
  <div className="container">
   <div className="auth-wrap">
    <div className="auth-side">
     <div className="auth-bubble">{isStoreForm?<Store size={35}/>:<ShoppingBag size={36}/>}</div>
     <h2>{isStoreForm?'Buka toko lokalmu, raih pembeli terdekat.':'Belanja lokal, terasa lebih dekat.'}</h2>
     <p>{isStoreForm?'Tambah produk, atur stok, dan terima pesanan COD tunai tanpa biaya tersembunyi. Toko langsung aktif dan siap digunakan.':'Temukan barang favorit, chat langsung dengan penjual, dan bayar tunai saat bertemu.'}</p>
     <p style={{marginTop:28,fontSize:12}}><ShieldCheck size={15} style={{display:'inline'}}/> Toko terverifikasi • COD tunai • Langsung aktif</p>
    </div>
    <div className="auth-main">
     <h1>{title}</h1>
     <p>
      {isExistingCustomerOpeningStore
       ? `Halo ${user?.name}! Lengkapi data toko berikut untuk langsung mengaktifkan toko Anda.`
       : isStoreForm
       ? 'Daftarkan tokomu sekarang. Toko langsung aktif dan siap untuk menambah produk.'
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

     {error&&<div className="notice notice-warning">{error}</div>}

     <form onSubmit={submit}>
      {!isExistingCustomerOpeningStore&&(
       <>
        {isRegister&&<Field label="Nama lengkap" name="name" value={form.name} onChange={change}/>}
        <Field label="Alamat email" name="email" type="email" value={form.email} onChange={change}/>
        {!isForgot&&<Field label={isReset?'Sandi baru':'Kata sandi'} name="password" type="password" value={form.password} onChange={change}/>}
        {isRegister&&<Field label="Nomor HP" name="phone" type="tel" value={form.phone} onChange={change}/>}
       </>
      )}

      {isStoreForm&&(
       <>
        <div className="info-panel" style={{margin:'15px 0'}}>
         <h3><Store size={15} style={{display:'inline',verticalAlign:'middle',marginRight:5}}/> Informasi toko (Langsung Aktif)</h3>
         Toko Anda akan langsung aktif sehingga Anda bisa segera menambah produk.
        </div>
        <Field label="Nama toko" name="storeName" value={form.storeName} onChange={change} placeholder="Contoh: Toko Keren Jaya"/>
        <Field label="Kota" name="city" value={form.city} onChange={change} placeholder="Contoh: Bandar Lampung"/>
        <Field label="Alamat lengkap toko" name="address" value={form.address} onChange={change} placeholder="Jl. Contoh No. 123"/>
        <Field label="Nomor HP toko" name="storePhone" type="tel" value={form.storePhone} onChange={change} placeholder="08xxxxxxxxxx"/>
        <Field label="Deskripsi toko (opsional)" name="description" value={form.description} onChange={change} required={false} placeholder="Deskripsikan produk yang Anda jual..."/>
       </>
      )}

      {isReset&&<Field label="Token reset (otomatis dari tautan email)" name="token" value={form.token} onChange={change} required={false}/>}

      <Button loading={loading}>
       {isExistingCustomerOpeningStore
        ? 'Aktifkan Toko Sekarang'
        : isStoreForm
        ? 'Daftar & Buka Toko Sekarang'
        : isRegister
        ? 'Daftar sekarang'
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
        <p style={{marginTop:12}}>Belum punya akun? <Link href="/daftar">Daftar akun</Link></p>
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
