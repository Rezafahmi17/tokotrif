'use client';
import {useEffect,useState} from 'react';
import {Store,Clock,ShieldCheck,Users,ShoppingBag,Plus,IdCard,Eye,X,Activity,CheckCircle2,XCircle} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {StatCards,Table,Status} from '@/components/ui/AdminBits';
import {Button,Pagination} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,dateID,imageSrc} from '@/lib/api';

function formatLastActive(minutesAgo,dateStr){
 if(minutesAgo===null||minutesAgo===undefined)return{badge:'Belum tercatat',color:'#64748b',bg:'#f1f5f9',exact:dateID(dateStr)};
 const mins=Number(minutesAgo);
 if(mins<=10)return{badge:'🟢 Sedang Aktif (Baru saja)',color:'#15803d',bg:'#dcfce7',exact:dateID(dateStr)};
 if(mins<60)return{badge:`🟢 ${mins} menit yang lalu`,color:'#15803d',bg:'#dcfce7',exact:dateID(dateStr)};
 const hours=Math.floor(mins/60);
 if(hours<24)return{badge:`⏱️ ${hours} jam yang lalu`,color:'#1d4ed8',bg:'#dbeafe',exact:dateID(dateStr)};
 const days=Math.floor(hours/24);
 if(days<=7)return{badge:`📅 ${days} hari yang lalu`,color:'#b45309',bg:'#fef3c7',exact:dateID(dateStr)};
 return{badge:`⚠️ ${days} hari yang lalu`,color:'#b91c1c',bg:'#fee2e2',exact:dateID(dateStr)};
}

export default function SuperPages({kind}){
 const {show}=useToast();
 const [stats,setStats]=useState(null);
 const [stores,setStores]=useState(null);
 const [ktmUsers,setKtmUsers]=useState(null);
 const [verifTab,setVerifTab]=useState('stores'); // 'stores' | 'buyers'
 const [cats,setCats]=useState([]);
 const [banners,setBanners]=useState([]);
 const [audits,setAudits]=useState(null);
 const [settings,setSettings]=useState([]);
 const [q,setQ]=useState('');
 const [status,setStatus]=useState(kind==='verification'?'pending':'');
 const [editing,setEditing]=useState(null);
 const [form,setForm]=useState({});
 const [busy,setBusy]=useState(false);
 const [showForm,setShowForm]=useState(false);
 const [file,setFile]=useState(null);
 const [inspectModal,setInspectModal]=useState(null); // { type: 'store'|'buyer', item }

 const load=()=>{
  if(kind==='dashboard')api('/admin/stats').then(setStats).catch(e=>show(e.message,'error'));
  if(['verification','stores'].includes(kind)){
   api(`/admin/stores?status=${status}&q=${encodeURIComponent(q)}`).then(setStores).catch(e=>show(e.message,'error'));
   if(kind==='verification'){
    api(`/admin/ktm-users?status=${status==='approved'?'verified':status}&q=${encodeURIComponent(q)}`).then(setKtmUsers).catch(()=>{});
   }
  }
  if(kind==='categories')api('/admin/categories').then(setCats).catch(e=>show(e.message,'error'));
  if(kind==='banners')api('/admin/banners').then(setBanners).catch(e=>show(e.message,'error'));
  if(kind==='audit')api('/admin/audit-logs').then(setAudits).catch(e=>show(e.message,'error'));
  if(kind==='settings')api('/admin/settings').then(setSettings).catch(e=>show(e.message,'error'));
 };

 useEffect(()=>{load();},[kind,status,q]);

 const act=async(s,action)=>{
  let body=undefined;
  if(['reject','suspend'].includes(action)){
   const reason=window.prompt(`Masukkan alasan ${action==='reject'?'penolakan':'penangguhan'}:`);
   if(!reason)return;
   body={reason};
  }
  if(action==='delete'){
   const match=window.prompt(`Untuk menghapus toko, ketik tepat nama: ${s.name}`);
   if(match!==s.name)return show('Nama toko tidak cocok','error');
   const reason=window.prompt('Alasan penghapusan:');
   if(!reason)return;
   body={confirm:true,reason};
  }
  setBusy(true);
  try{
   await api(`/admin/stores/${s.id}${action==='delete'?'':`/${action}`}`,{method:action==='delete'?'DELETE':'PATCH',body});
   show('Status toko diperbarui');
   setInspectModal(null);
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const actBuyerKtm=async(u,action)=>{
  let body=undefined;
  if(action==='reject'){
   const reason=window.prompt('Masukkan alasan penolakan KTM Pembeli:');
   if(!reason)return;
   body={reason};
  }
  setBusy(true);
  try{
   await api(`/admin/ktm-users/${u.id}/${action}`,{method:'PATCH',body});
   show(action==='approve'?'KTM Pembeli disetujui':'KTM Pembeli ditolak');
   setInspectModal(null);
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const edit=(item=null)=>{setEditing(item?.id||null);setForm(item||{});setFile(null);setShowForm(true);};
 const save=async e=>{
  e.preventDefault();setBusy(true);
  try{
   if(kind==='categories'){
    const b={name:form.name,icon:form.icon||'',parent_id:form.parent_id?Number(form.parent_id):null,sort_order:Number(form.sort_order||0),is_active:form.is_active!==false};
    await api(`/admin/categories${editing?`/${editing}`:''}`,{method:editing?'PATCH':'POST',body:b});
   }
   if(kind==='banners'){
    let url=form.image_url||'';
    if(file){const fd=new FormData();fd.append('image',file);url=(await api('/admin/banners/upload',{method:'POST',body:fd})).url;}
    const b={title:form.title,subtitle:form.subtitle||'',cta_label:form.cta_label||'',cta_link:form.cta_link||'/cari',image_url:url,placement:form.placement||'hero',sort_order:Number(form.sort_order||0),is_active:form.is_active!==false};
    await api(`/admin/banners${editing?`/${editing}`:''}`,{method:editing?'PATCH':'POST',body:b});
   }
   show('Perubahan tersimpan');setShowForm(false);load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const remove=async(id,collection)=>{
  if(!window.confirm('Hapus data ini?'))return;
  try{await api(`/admin/${collection}/${id}`,{method:'DELETE'});show('Data dihapus');load();}catch(e){show(e.message,'error');}
 };

 const title={
  dashboard:'Dashboard Super Admin',
  verification:'Verifikasi KTM Mahasiswa & Toko',
  stores:'Manajemen Semua Toko & Aktivitas',
  categories:'Kelola Kategori',
  banners:'Kelola Banner',
  audit:'Audit Log Aktivitas',
  settings:'Pengaturan Platform'
 }[kind];

 const subtitle={
  dashboard:'Pantau seluruh aktivitas marketplace COD, verifikasi KTM, dan kapan terakhir toko aktif.',
  verification:'Tinjau Foto KTM Mahasiswa dan Foto Muka Penjual/Pembeli sebelum menyetujui verifikasi.',
  stores:'Kelola status toko, pantau kapan terakhir toko aktif, dan moderasi dokumen penjual.',
  categories:'Kategori produk maksimal dua tingkat.',
  banners:'Banner beranda ditarik langsung dari database.',
  audit:'Jejak keputusan dan aktivitas administrasi.',
  settings:'Atur batas hari toko tidak aktif.'
 }[kind];

 return (
  <DashboardShell kind="super">
   <h1>{title}</h1>
   <p className="dashboard-subtitle">{subtitle}</p>

   {kind==='dashboard'&&(
    stats?(
     <>
      <StatCards items={[
       ['Toko terverifikasi',stats.stores.find(s=>s.status==='approved')?.count||0,Store],
       ['Toko menunggu verifikasi',stats.stores.find(s=>s.status==='pending')?.count||0,Clock],
       ['KTM Pembeli menunggu',stats.pendingKtmBuyers||0,IdCard],
       ['Jumlah pesanan',stats.orders,ShoppingBag]
      ]}/>

      <div className="panel" style={{marginBottom:20}}>
       <h3>Ringkasan Operasional Platform</h3>
       <div className="price-row"><span>Total Pembeli Aktif</span><b>{stats.customers}</b></div>
       <div className="price-row"><span>Toko tidak aktif (&gt; batas hari)</span><b>{stats.inactive}</b></div>
       <div className="price-row"><span>Pesanan selesai 30 hari terakhir</span><b>{stats.completed30d}</b></div>
      </div>

      {/* Pantauan Kapan Terakhir Toko Aktif */}
      <div className="panel">
       <div className="between" style={{marginBottom:14}}>
        <div>
         <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8}}>
          <Activity size={19} color="#1669e8"/> Pantauan Kapan Terakhir Toko Aktif
         </h3>
         <p className="muted text-xs" style={{marginTop:3}}>
          Waktu nyata kapan penjual terakhir kali login, membalas chat, atau mengelola pesanan/produk.
         </p>
        </div>
        <a className="text-link" href="/super-admin/toko">Lihat semua toko →</a>
       </div>
       <Table
        headers={['Nama Toko','Pemilik','Kota','Status','Kapan Terakhir Aktif']}
        items={stats.recentStores||[]}
        render={s=>{
         const actInfo=formatLastActive(s.minutes_ago,s.last_active_at);
         return (
          <>
           <td><b>{s.name}</b></td>
           <td>{s.owner_name}<br/><small className="muted">{s.owner_email}</small></td>
           <td>{s.city}</td>
           <td><Status status={s.status}/></td>
           <td>
            <span style={{display:'inline-block',background:actInfo.bg,color:actInfo.color,fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:99,marginBottom:3}}>
             {actInfo.badge}
            </span>
            <br/>
            <small className="muted">{actInfo.exact}</small>
           </td>
          </>
         );
        }}
       />
      </div>

      <div className="notice" style={{marginTop:20}}>
       Lanjutkan ke <a className="text-link" href="/super-admin/verifikasi">Verifikasi KTM & Toko</a> untuk meninjau pendaftaran penjual dan KTM pembeli.
      </div>
     </>
    ):'Memuat statistik...'
   )}

   {['stores','verification'].includes(kind)&&(
    <>
     {kind==='verification'&&(
      <div className="tabs" style={{marginBottom:16}}>
       <button className={verifTab==='stores'?'active':''} onClick={()=>setVerifTab('stores')}>
        🏪 Verifikasi Toko & Penjual ({stores?.items?.length||0})
       </button>
       <button className={verifTab==='buyers'?'active':''} onClick={()=>setVerifTab('buyers')}>
        🪪 Verifikasi KTM Pembeli ({ktmUsers?.items?.length||0})
       </button>
      </div>
     )}

     <div className="admin-toolbar">
      <input className="field" placeholder="Cari nama toko, mahasiswa, NIM, atau email..." value={q} onChange={e=>setQ(e.target.value)}/>
      <select className="field" style={{maxWidth:210}} value={status} onChange={e=>setStatus(e.target.value)}>
       <option value="">Semua status</option>
       {['pending','approved','rejected','suspended'].map(s=><option key={s} value={s}>{s}</option>)}
      </select>
     </div>

     {(kind==='stores'||verifTab==='stores')&&(
      !stores?'Memuat daftar toko...':(
       <>
        <Table
         headers={['Toko','Pemilik & NIM','Dokumen KTM & Wajah','Status','Terakhir Aktif','Aksi']}
         items={stores.items}
         render={s=>{
          const actInfo=formatLastActive(s.minutes_ago,s.last_active_at);
          return (
           <>
            <td>
             <b>{s.name}</b><br/>
             <small className="muted">{s.city} · {s.product_count} produk · {s.order_count} pesanan</small>
            </td>
            <td>
             <b>{s.owner_name}</b><br/>
             <small className="muted">{s.owner_email}</small>
             {s.owner_nim&&<div style={{fontSize:11,color:'#1669e8',fontWeight:700,marginTop:2}}>NIM: {s.owner_nim}</div>}
            </td>
            <td>
             <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
              {s.ktm_url?(
               <img
                src={imageSrc(s.ktm_url)}
                alt="KTM"
                onClick={()=>setInspectModal({type:'store',item:s})}
                style={{width:56,height:38,objectFit:'cover',borderRadius:6,border:'1px solid #cbd5e1',cursor:'pointer'}}
                title="Klik untuk memperbesar KTM"
               />
              ):(
               <span className="badge status-cancelled" style={{fontSize:10}}>KTM Kosong</span>
              )}
              {s.face_url?(
               <img
                src={imageSrc(s.face_url)}
                alt="Wajah Penjual"
                onClick={()=>setInspectModal({type:'store',item:s})}
                style={{width:38,height:38,objectFit:'cover',borderRadius:'50%',border:'1px solid #cbd5e1',cursor:'pointer'}}
                title="Klik untuk memperbesar Foto Wajah"
               />
              ):(
               <span className="badge status-cancelled" style={{fontSize:10}}>Foto Wajah Kosong</span>
              )}
              <button
               type="button"
               onClick={()=>setInspectModal({type:'store',item:s})}
               style={{fontSize:11,color:'#1669e8',fontWeight:700,display:'inline-flex',alignItems:'center',gap:3}}
              >
               <Eye size={13}/> Tinjau
              </button>
             </div>
            </td>
            <td>
             <Status status={s.status}/>
             {s.isInactive?<span className="badge status-rejected" style={{marginLeft:4}}>Tidak aktif</span>:null}
            </td>
            <td>
             <span style={{display:'inline-block',background:actInfo.bg,color:actInfo.color,fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:99,marginBottom:2}}>
              {actInfo.badge}
             </span>
             <br/>
             <small className="muted" style={{fontSize:11}}>{actInfo.exact}</small>
            </td>
            <td>
             <div className="flex gap-2 flex-wrap">
              {['pending','rejected','suspended'].includes(s.status)&&(
               <button className="btn btn-primary" style={{minHeight:30,padding:'4px 10px',fontSize:12}} disabled={busy} onClick={()=>act(s,s.status==='suspended'?'reactivate':'approve')}>
                Setujui
               </button>
              )}
              {s.status==='pending'&&(
               <button className="btn btn-outline" style={{minHeight:30,padding:'4px 10px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}} disabled={busy} onClick={()=>act(s,'reject')}>
                Tolak
               </button>
              )}
              {s.status==='approved'&&(
               <button className="btn btn-outline" style={{minHeight:30,padding:'4px 10px',fontSize:12}} disabled={busy} onClick={()=>act(s,'suspend')}>
                Tangguhkan
               </button>
              )}
              {kind==='stores'&&(
               <button className="btn btn-outline" style={{minHeight:30,padding:'4px 10px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}} disabled={busy} onClick={()=>act(s,'delete')}>
                Hapus
               </button>
              )}
             </div>
            </td>
           </>
          );
         }}
        />
        <Pagination pagination={stores.pagination} onPage={()=>{}}/>
       </>
      )
     )}

     {kind==='verification'&&verifTab==='buyers'&&(
      !ktmUsers?'Memuat data KTM pembeli...':(
       <Table
        headers={['Nama Pembeli','NIM / Email','Foto KTM Mahasiswa','Status KTM','Terakhir Login','Aksi']}
        items={ktmUsers.items}
        render={u=>(
         <>
          <td><b>{u.name}</b><br/><small className="muted">{u.phone||'-'}</small></td>
          <td>
           {u.nim?<b style={{color:'#1669e8'}}>NIM: {u.nim}</b>:<span className="muted">NIM belum diisi</span>}
           <br/><small className="muted">{u.email}</small>
          </td>
          <td>
           {u.ktm_url?(
            <div style={{display:'flex',alignItems:'center',gap:8}}>
             <img
              src={imageSrc(u.ktm_url)}
              alt="KTM Pembeli"
              onClick={()=>setInspectModal({type:'buyer',item:u})}
              style={{width:64,height:42,objectFit:'cover',borderRadius:6,border:'1px solid #cbd5e1',cursor:'pointer'}}
             />
             <button type="button" onClick={()=>setInspectModal({type:'buyer',item:u})} style={{fontSize:11,color:'#1669e8',fontWeight:700}}>
              <Eye size={13} style={{display:'inline'}}/> Lihat KTM
             </button>
            </div>
           ):(
            <span className="muted text-xs">Belum diunggah</span>
           )}
          </td>
          <td>
           <span className={`badge ${u.ktm_status==='verified'?'status-approved':u.ktm_status==='pending'?'status-pending':'status-rejected'}`}>
            {u.ktm_status==='verified'?'Terverifikasi':u.ktm_status==='pending'?'Menunggu':'Ditolak'}
           </span>
          </td>
          <td><small className="muted">{dateID(u.last_login_at||u.created_at)}</small></td>
          <td>
           <div className="flex gap-2">
            {u.ktm_status!=='verified'&&(
             <button className="btn btn-primary" style={{minHeight:30,padding:'4px 10px',fontSize:12}} disabled={busy} onClick={()=>actBuyerKtm(u,'approve')}>
              Setujui KTM
             </button>
            )}
            {u.ktm_status==='pending'&&(
             <button className="btn btn-outline" style={{minHeight:30,padding:'4px 10px',fontSize:12,color:'#dc2626'}} disabled={busy} onClick={()=>actBuyerKtm(u,'reject')}>
              Tolak
             </button>
            )}
           </div>
          </td>
         </>
        )}
       />
      )
     )}
    </>
   )}

   {['categories','banners'].includes(kind)&&(
    <>
     <div className="admin-toolbar">
      <span className="muted">{kind==='categories'?cats.length:banners.length} data</span>
      <Button onClick={()=>edit()}><Plus size={15}/> Tambah {kind==='categories'?'kategori':'banner'}</Button>
     </div>
     {showForm&&(
      <form className="admin-form" onSubmit={save}>
       <h3>{editing?'Ubah':'Tambah'} {kind==='categories'?'kategori':'banner'}</h3>
       {(kind==='categories'?[['name','Nama kategori'],['icon','Nama ikon (Lucide)'],['sort_order','Urutan']]:[['title','Judul banner'],['subtitle','Subjudul'],['cta_label','Teks tombol'],['cta_link','Tautan tombol (/cari)'],['sort_order','Urutan']]).map(([key,label])=>(
        <div className="form-field" key={key}>
         <label>{label}</label>
         <input required={['name','title'].includes(key)} value={form[key]||''} onChange={e=>setForm({...form,[key]:e.target.value})}/>
        </div>
       ))}
       {kind==='categories'?(
        <div className="form-field">
         <label>Kategori induk (opsional)</label>
         <select value={form.parent_id||''} onChange={e=>setForm({...form,parent_id:e.target.value})}>
          <option value="">Kategori utama</option>
          {cats.filter(c=>!c.parent_id&&c.id!==editing).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
         </select>
        </div>
       ):(
        <>
         <div className="form-field">
          <label>Posisi</label>
          <select value={form.placement||'hero'} onChange={e=>setForm({...form,placement:e.target.value})}>
           <option value="hero">Hero</option>
           <option value="promo">Promo</option>
          </select>
         </div>
         <div className="form-field">
          <label>Foto banner (opsional)</label>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0])}/>
         </div>
        </>
       )}
       <div className="flex gap-2">
        <Button loading={busy}>Simpan</Button>
        <Button type="button" variant="outline" onClick={()=>setShowForm(false)}>Batal</Button>
       </div>
      </form>
     )}
     <Table
      headers={kind==='categories'?['Nama','Slug','Level','Aktif','Aksi']:['Judul','Posisi','Tautan','Aktif','Aksi']}
      items={kind==='categories'?cats:banners}
      render={r=>(
       <>
        <td><b>{r.name||r.title}</b></td>
        <td>{r.slug||r.placement}</td>
        <td>{kind==='categories'?(r.parent_name||'Utama'):r.cta_link}</td>
        <td>{r.is_active?'Ya':'Tidak'}</td>
        <td>
         <button onClick={()=>edit(r)}>Ubah</button> &nbsp;
         <button onClick={()=>remove(r.id,kind==='categories'?'categories':'banners')} style={{color:'#dc2626'}}>Hapus</button>
        </td>
       </>
      )}
     />
    </>
   )}

   {kind==='audit'&&(
    audits?(
     <Table
      headers={['Waktu','Admin','Aksi','Objek','ID']}
      items={audits.items}
      render={a=>(
       <>
        <td>{dateID(a.created_at)}</td>
        <td>{a.actor_name||'-'}</td>
        <td>{a.action}</td>
        <td>{a.target_type}</td>
        <td>{a.target_id}</td>
       </>
      )}
     />
    ):<p>Memuat...</p>
   )}

   {kind==='settings'&&(
    <div className="panel" style={{maxWidth:550}}>
     <h3>Batas toko tidak aktif</h3>
     <p className="muted text-xs" style={{margin:'8px 0 16px'}}>
      Toko ditandai tidak aktif jika tidak ada aktivitas login, chat, atau pesanan selama batas hari ini.
     </p>
     <form onSubmit={async e=>{
      e.preventDefault();setBusy(true);
      try{
       await api('/admin/settings',{method:'PATCH',body:{inactive_days:Number(form.inactive_days||settings.find(s=>s.key==='inactive_days')?.value||30)}});
       show('Pengaturan disimpan');load();
      }catch(e){show(e.message,'error');}finally{setBusy(false);}
     }}>
      <div className="form-field">
       <label>Jumlah hari (1–365)</label>
       <input type="number" min={1} max={365} value={form.inactive_days??settings.find(s=>s.key==='inactive_days')?.value??30} onChange={e=>setForm({...form,inactive_days:e.target.value})}/>
      </div>
      <Button loading={busy}>Simpan pengaturan</Button>
     </form>
    </div>
   )}

   {/* Modal Tinjau Verifikasi KTM & Foto Muka Penjual/Pembeli */}
   {inspectModal&&(
    <div className="lightbox-overlay" onClick={()=>setInspectModal(null)}>
     <div className="panel" onClick={e=>e.stopPropagation()} style={{maxWidth:740,width:'95%',maxHeight:'90vh',overflowY:'auto',position:'relative',padding:24}}>
      <div className="between" style={{marginBottom:16}}>
       <div>
        <h3 style={{margin:0,fontSize:18}}>
         {inspectModal.type==='store'?`Verifikasi Identitas Penjual: ${inspectModal.item.name}`:`Verifikasi KTM Pembeli: ${inspectModal.item.name}`}
        </h3>
        <p className="muted text-xs" style={{marginTop:4}}>
         Pemilik: <b>{inspectModal.item.owner_name||inspectModal.item.name}</b> · Email: {inspectModal.item.owner_email||inspectModal.item.email}
         {(inspectModal.item.owner_nim||inspectModal.item.nim)&&` · NIM: ${inspectModal.item.owner_nim||inspectModal.item.nim}`}
        </p>
       </div>
       <button onClick={()=>setInspectModal(null)} style={{padding:6,borderRadius:8,background:'#f1f5f9'}}><X size={18}/></button>
      </div>

      <div className="form-row" style={{gap:16,marginBottom:20}}>
       <div style={{background:'#f8fafc',padding:14,borderRadius:12,border:'1px solid #e2e8f0'}}>
        <b style={{fontSize:13,display:'block',marginBottom:8}}>1. Foto KTM Mahasiswa</b>
        {inspectModal.item.ktm_url?(
         <a href={imageSrc(inspectModal.item.ktm_url)} target="_blank" rel="noreferrer">
          <img src={imageSrc(inspectModal.item.ktm_url)} alt="Foto KTM" style={{width:'100%',maxHeight:260,objectFit:'contain',borderRadius:8,background:'#0f172a'}}/>
         </a>
        ):(
         <div className="notice notice-warning">Foto KTM belum diunggah oleh pengguna ini.</div>
        )}
       </div>

       {inspectModal.type==='store'&&(
        <div style={{background:'#f8fafc',padding:14,borderRadius:12,border:'1px solid #e2e8f0'}}>
         <b style={{fontSize:13,display:'block',marginBottom:8}}>2. Foto Muka / Wajah Penjual</b>
         {inspectModal.item.face_url?(
          <a href={imageSrc(inspectModal.item.face_url)} target="_blank" rel="noreferrer">
           <img src={imageSrc(inspectModal.item.face_url)} alt="Foto Muka Penjual" style={{width:'100%',maxHeight:260,objectFit:'contain',borderRadius:8,background:'#0f172a'}}/>
          </a>
         ):(
          <div className="notice notice-warning">Foto wajah penjual belum diunggah.</div>
         )}
        </div>
       )}
      </div>

      {inspectModal.type==='store'?(
       <div className="between" style={{borderTop:'1px solid #e2e8f0',paddingTop:16}}>
        <div className="muted text-xs">
         Terakhir aktif: <b>{dateID(inspectModal.item.last_active_at)}</b>
        </div>
        <div className="flex gap-2">
         {['pending','rejected','suspended'].includes(inspectModal.item.status)&&(
          <Button loading={busy} onClick={()=>act(inspectModal.item,inspectModal.item.status==='suspended'?'reactivate':'approve')}>
           <CheckCircle2 size={16}/> Setujui & Verifikasi Toko
          </Button>
         )}
         {inspectModal.item.status==='pending'&&(
          <Button variant="danger" loading={busy} onClick={()=>act(inspectModal.item,'reject')}>
           <XCircle size={16}/> Tolak Verifikasi
          </Button>
         )}
        </div>
       </div>
      ):(
       <div className="between" style={{borderTop:'1px solid #e2e8f0',paddingTop:16}}>
        <span className="muted text-xs">Pastikan nama dan NIM sesuai dengan kartu KTM.</span>
        <div className="flex gap-2">
         <Button loading={busy} onClick={()=>actBuyerKtm(inspectModal.item,'approve')}>
          <CheckCircle2 size={16}/> Setujui KTM Pembeli
         </Button>
         <Button variant="danger" loading={busy} onClick={()=>actBuyerKtm(inspectModal.item,'reject')}>
          <XCircle size={16}/> Tolak KTM
         </Button>
        </div>
       </div>
      )}
     </div>
    </div>
   )}
  </DashboardShell>
 );
}
