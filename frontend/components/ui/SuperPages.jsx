'use client';
import {useEffect,useState} from 'react';
import {Store,Clock,Users,ShoppingBag,Plus,IdCard,Eye,X,Activity,CheckCircle2,XCircle,QrCode,Wallet,AlertTriangle,Upload,ShieldAlert,RefreshCw,UserRound,Mail,KeyRound,Settings,ShieldCheck} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {StatCards,Table,Status} from '@/components/ui/AdminBits';
import {Button,Pagination} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {useAuth} from '@/context/AuthContext';
import {api,dateID,imageSrc,rp} from '@/lib/api';

function formatLastActive(minutesAgo,dateStr){
 if(minutesAgo===null||minutesAgo===undefined)return{badge:'Belum tercatat',color:'#64748b',bg:'#f1f5f9',dot:'#94a3b8',exact:dateID(dateStr)};
 const mins=Number(minutesAgo);
 if(mins<=10)return{badge:'Sedang Aktif (Baru saja)',color:'#15803d',bg:'#dcfce7',dot:'#16a34a',exact:dateID(dateStr)};
 if(mins<60)return{badge:`Aktif ${mins} menit lalu`,color:'#15803d',bg:'#dcfce7',dot:'#16a34a',exact:dateID(dateStr)};
 const hours=Math.floor(mins/60);
 if(hours<24)return{badge:`Aktif ${hours} jam lalu`,color:'#1d4ed8',bg:'#dbeafe',dot:'#2563eb',exact:dateID(dateStr)};
 const days=Math.floor(hours/24);
 if(days<=7)return{badge:`Aktif ${days} hari lalu`,color:'#b45309',bg:'#fef3c7',dot:'#d97706',exact:dateID(dateStr)};
 return{badge:`Tidak aktif ${days} hari`,color:'#b91c1c',bg:'#fee2e2',dot:'#dc2626',exact:dateID(dateStr)};
}

const commStatusBadge={
 unpaid:{label:'Belum Dibayar',cls:'status-rejected'},
 waiting_verification:{label:'Menunggu Verifikasi QRIS',cls:'status-pending'},
 paid:{label:'Lunas',cls:'status-approved'},
 rejected:{label:'Bukti Ditolak',cls:'status-rejected'}
};

export default function SuperPages({kind}){
 const {show}=useToast();
 const {user,refresh}=useAuth();
 const [stats,setStats]=useState(null);
 const [stores,setStores]=useState(null);
 const [ktmUsers,setKtmUsers]=useState(null);
 const [commData,setCommData]=useState(null);
 const [commError,setCommError]=useState('');
 const [commConfig,setCommConfig]=useState({commission_per_item:2000,qris_merchant_name:'KampusBalik Official (Super Admin)',qris_image_url:''});
 const [verifTab,setVerifTab]=useState('stores');
 const [cats,setCats]=useState([]);
 const [banners,setBanners]=useState([]);
 const [audits,setAudits]=useState(null);
 const [settings,setSettings]=useState([]);
 const [adminProfile,setAdminProfile]=useState({name:'',phone:''});
 const [adminEmail,setAdminEmail]=useState({email:'',oldPassword:''});
 const [adminPwd,setAdminPwd]=useState({oldPassword:'',newPassword:'',confirmPassword:''});
 const [q,setQ]=useState('');
 const [status,setStatus]=useState(kind==='verification'?'pending':'');
 const [page,setPage]=useState(1);
 const [editing,setEditing]=useState(null);
 const [form,setForm]=useState({});
 const [busy,setBusy]=useState(false);
 const [showForm,setShowForm]=useState(false);
 const [file,setFile]=useState(null);
 const [inspectModal,setInspectModal]=useState(null);
 const [previewImage,setPreviewImage]=useState(null);

 useEffect(()=>{
  if(user){
   setAdminProfile({name:user.name||'',phone:user.phone||''});
   setAdminEmail(prev=>({...prev,email:user.email||''}));
  }
 },[user]);

 const load=()=>{
  if(kind==='dashboard')api('/admin/stats').then(setStats).catch(e=>show(e.message,'error'));
  if(['verification','stores'].includes(kind)){
   api(`/admin/stores?page=${page}&status=${status}&q=${encodeURIComponent(q)}`).then(setStores).catch(e=>show(e.message,'error'));
   if(kind==='verification'){
    api(`/admin/ktm-users?status=${status==='approved'?'verified':status}&q=${encodeURIComponent(q)}`).then(setKtmUsers).catch(()=>{});
   }
  }
  if(kind==='commissions'){
   setCommError('');
   api(`/admin/commissions?page=${page}&status=${status}&q=${encodeURIComponent(q)}`).then(res=>{
    setCommData(res);
    if(res?.config)setCommConfig(res.config);
   }).catch(e=>{
    setCommError(e.message||'Gagal memuat data komisi');
    show(e.message,'error');
   });
  }
  if(kind==='categories')api('/admin/categories').then(setCats).catch(e=>show(e.message,'error'));
  if(kind==='banners')api('/admin/banners').then(setBanners).catch(e=>show(e.message,'error'));
  if(kind==='audit')api(`/admin/audit-logs?page=${page}`).then(setAudits).catch(e=>show(e.message,'error'));
  if(kind==='settings')api('/admin/settings').then(setSettings).catch(e=>show(e.message,'error'));
 };

 useEffect(()=>{load();},[kind,status,q,page]);

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

 const uploadQrisImage=async f=>{
  if(!f)return;
  setBusy(true);
  try{
   const fd=new FormData();
   fd.append('image',f);
   const res=await api('/admin/commissions/qris-upload',{method:'POST',body:fd});
   setCommConfig(prev=>({...prev,qris_image_url:res.url}));
   show('Gambar QRIS Super Admin berhasil diperbarui');
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const saveCommConfig=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   await api('/admin/commissions/config',{
    method:'PATCH',
    body:{
     commission_per_item:Number(commConfig.commission_per_item),
     qris_merchant_name:commConfig.qris_merchant_name
    }
   });
   show('Tarif komisi per barang & nama merchant QRIS disimpan');
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const verifyComm=async(item,action)=>{
  let body=undefined;
  if(action==='reject'){
   const reason=window.prompt('Masukkan alasan penolakan bukti bayar QRIS:');
   if(!reason)return;
   body={reason};
  }
  setBusy(true);
  try{
   const res=await api(`/admin/commissions/${item.id}/${action}`,{method:'PATCH',body});
   show(res.reactivated?'Komisi disetujui lunas & Akun Toko otomatis diaktifkan kembali':action==='approve'?'Pembayaran komisi QRIS disetujui lunas':'Bukti pembayaran ditolak');
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const sanctionStore=async(store,type)=>{
  const label=type==='suspend'?'PENANGGUHAN AKUN TOKO':'PENGHAPUSAN AKUN TOKO';
  const defaultMsg=`Sanksi ${label}: Toko ${store.name} tidak membayar komisi penjualan QRIS sebanyak ${store.unpaid_count||2} kali. Wajib melunasi seluruh tunggakan komisi untuk mengaktifkan kembali akun.`;
  const reason=window.prompt(`Konfirmasi ${label} untuk "${store.name}".\nMasukkan alasan sanksi:`,defaultMsg);
  if(!reason)return;
  setBusy(true);
  try{
   await api(`/admin/commissions/stores/${store.id}/sanction`,{method:'POST',body:{type,reason}});
   show(type==='suspend'?`Toko ${store.name} berhasil ditangguhkan`:`Akun toko ${store.name} berhasil dihapus`);
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
  commissions:'Komisi Penjualan, QRIS & Sanksi Toko',
  categories:'Kelola Kategori',
  banners:'Kelola Banner',
  audit:'Audit Log Aktivitas',
  settings:'Pengaturan Platform'
 }[kind];

 const subtitle={
  dashboard:'Pantau seluruh aktivitas marketplace COD, verifikasi KTM, dan kapan terakhir toko aktif.',
  verification:'Tinjau Foto KTM Mahasiswa dan Foto Muka Penjual/Pembeli sebelum menyetujui verifikasi.',
  stores:'Kelola status toko, pantau kapan terakhir toko aktif, dan sanksi tunggakan komisi.',
  commissions:'Unggah QRIS pembayaran Super Admin, atur komisi per barang laku, verifikasi setoran toko, dan tindak toko yang menunggak 2 kali.',
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
        <a className="text-link" href="/super-admin/toko">Lihat semua toko</a>
       </div>
       <Table
        headers={['Nama Toko','Pemilik','Kota','Status','Kapan Terakhir Aktif']}
        items={stats.recentStores||[]}
        render={s=>{
         const actInfo=formatLastActive(s.minutes_ago,s.last_active_at);
         const logo=imageSrc(s.logo_url);
         return (
          <>
           <td>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
             <div style={{width:38,height:38,borderRadius:10,border:'1px solid #e2e8f0',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
              {logo?(
               <img src={logo} alt={s.name} style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.currentTarget.style.display='none';}}/>
              ):(
               <Store size={17} color="#1669e8"/>
              )}
             </div>
             <b>{s.name}</b>
            </div>
           </td>
           <td>{s.owner_name}<br/><small className="muted">{s.owner_email}</small></td>
           <td>{s.city}</td>
           <td><Status status={s.status} type="store"/></td>
           <td>
            <span style={{display:'inline-flex',alignItems:'center',gap:6,background:actInfo.bg,color:actInfo.color,fontSize:11,fontWeight:700,padding:'3px 10px',borderRadius:99,marginBottom:3}}>
             <span style={{width:7,height:7,borderRadius:'50%',background:actInfo.dot}}/>
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
       Kelola setoran komisi penjual di menu <a className="text-link" href="/super-admin/komisi">Komisi & QRIS</a> atau tinjau pendaftaran di <a className="text-link" href="/super-admin/verifikasi">Verifikasi KTM & Toko</a>.
      </div>
     </>
    ):'Memuat statistik...'
   )}

   {kind==='commissions'&&(
    commError?(
     <div className="panel" style={{textAlign:'center',padding:36}}>
      <AlertTriangle size={40} color="#dc2626" style={{margin:'0 auto 12px'}}/>
      <h3 style={{marginBottom:6}}>Belum Dapat Memuat Data Komisi</h3>
      <p className="muted text-sm" style={{marginBottom:18}}>{commError}. Pastikan kode backend terbaru sudah ter-deploy di Vercel.</p>
      <Button onClick={load}><RefreshCw size={15}/> Muat Ulang</Button>
     </div>
    ):!commData?'Memuat data komisi & QRIS...':(
     <>
      <StatCards items={[
       ['Pendapatan Komisi (Lunas)',rp(commData.totals?.total_revenue||0),Wallet],
       ['Menunggu Verifikasi QRIS',`${rp(commData.totals?.waiting_revenue||0)} (${commData.totals?.waiting_count||0})`,Clock],
       ['Tunggakan Komisi Toko',`${rp(commData.totals?.unpaid_revenue||0)} (${commData.totals?.unpaid_count||0})`,AlertTriangle],
       ['Barang Laku (Komisi Lunas)',`${commData.totals?.paid_items_sold||0} barang`,ShoppingBag]
      ]}/>

      <div className="form-row" style={{alignItems:'stretch',marginBottom:24}}>
       <div className="panel" style={{textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
        <span className="badge status-approved" style={{marginBottom:8}}>QRIS PEMBAYARAN KOMISI</span>
        <h3 style={{margin:0}}>{commConfig.qris_merchant_name||'KampusBalik Official'}</h3>
        <p className="muted text-xs" style={{margin:'4px 0 14px'}}>
         Ditampilkan di dashboard setiap Admin Toko untuk menyetor komisi penjualan
        </p>
        {commConfig.qris_image_url?(
         <div style={{background:'#fff',padding:12,borderRadius:12,border:'2px solid #cbd5e1',maxWidth:230,width:'100%',marginBottom:12}}>
          <img
           src={imageSrc(commConfig.qris_image_url)}
           alt="QRIS Super Admin"
           onClick={()=>setPreviewImage(imageSrc(commConfig.qris_image_url))}
           style={{width:'100%',height:'auto',borderRadius:8,cursor:'zoom-in'}}
          />
         </div>
        ):(
         <div className="notice notice-warning" style={{marginBottom:12,maxWidth:280}}>
          Belum ada gambar QRIS. Silakan unggah gambar kode QRIS Anda di bawah ini.
         </div>
        )}
        <label className="btn btn-outline" style={{cursor:'pointer',fontSize:12,minHeight:36}}>
         <Upload size={15}/> {commConfig.qris_image_url?'Ganti Gambar QRIS':'Unggah Gambar QRIS'}
         <input type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={e=>uploadQrisImage(e.target.files?.[0])}/>
        </label>
       </div>

       <form className="panel" onSubmit={saveCommConfig}>
        <h3 style={{marginBottom:6}}>Pengaturan Tarif Komisi Per Barang & QRIS</h3>
        <p className="muted text-xs" style={{marginBottom:16}}>
         Setiap barang yang berhasil dijual oleh toko (status pesanan <b>Lunas</b>), Super Admin otomatis memperoleh komisi per unit barang yang wajib disetor toko melalui QRIS.
        </p>
        <div className="form-field">
         <label>Nama Merchant / Penerima QRIS Super Admin</label>
         <input
          required
          value={commConfig.qris_merchant_name||''}
          onChange={e=>setCommConfig({...commConfig,qris_merchant_name:e.target.value})}
          placeholder="Contoh: KampusBalik Official - Super Admin"
         />
        </div>
        <div className="form-field">
         <label>Nominal Komisi Super Admin Per 1 Barang Terjual (Rp)</label>
         <input
          type="number"
          min={0}
          required
          value={commConfig.commission_per_item}
          onChange={e=>setCommConfig({...commConfig,commission_per_item:e.target.value})}
         />
         <small className="muted">Contoh: Jika diisi 2000 dan toko menjual 3 barang, maka tagihan komisi toko adalah Rp 6.000.</small>
        </div>
        <div className="notice" style={{marginBottom:16,fontSize:12,display:'flex',alignItems:'flex-start',gap:8}}>
         <ShieldAlert size={17} color="#1669e8" style={{flexShrink:0,marginTop:1}}/>
         <span><b>Aturan Sanksi Otomatis:</b> Toko yang tidak membayar komisi sebanyak <b>2 kali penjualan</b> otomatis ditangguhkan (<i>Suspended</i>) dan wajib melunasi seluruh tunggakan komisi via QRIS terlebih dahulu untuk mengaktifkan kembali akunnya.</span>
        </div>
        <Button loading={busy}>Simpan Tarif Komisi & QRIS</Button>
       </form>
      </div>

      {commData.delinquentStores?.length>0&&(
       <div className="panel" style={{marginBottom:24,border:'1.5px solid #fecaca',background:'#fff5f5'}}>
        <h3 style={{color:'#991b1b',display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
         <ShieldAlert size={20} color="#dc2626"/> Daftar Toko Menunggak Komisi & Tindakan Sanksi
        </h3>
        <p style={{fontSize:12.5,color:'#7f1d1d',marginBottom:14}}>
         Toko dengan <b>2 kali atau lebih</b> tagihan komisi belum dibayar dikenakan sanksi berupa <b>Penangguhan Akun</b> atau <b>Penghapusan Akun</b>. Akun hanya dapat aktif kembali setelah melunasi seluruh tunggakan.
        </p>
        <Table
         headers={['Nama Toko','Pemilik','Jumlah Menunggak','Total Tunggakan','Status Akun','Tindakan Sanksi']}
         items={commData.delinquentStores}
         render={ds=>(
          <>
           <td><b>{ds.name}</b><br/><small className="muted">{ds.city}</small></td>
           <td>{ds.owner_name}<br/><small className="muted">{ds.owner_email}</small></td>
           <td>
            <span className={`badge ${ds.unpaid_count>=2?'status-rejected':'status-pending'}`}>
             {ds.unpaid_count}x Belum Bayar {ds.unpaid_count>=2?'(Wajib Sanksi)':''}
            </span>
           </td>
           <td><b style={{color:'#dc2626'}}>{rp(ds.unpaid_total)}</b></td>
           <td><Status status={ds.status} type="store"/></td>
           <td>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'nowrap'}}>
             {ds.status!=='suspended'&&(
              <button
               type="button"
               className="btn btn-outline"
               style={{minHeight:30,padding:'4px 10px',fontSize:11.5,color:'#b45309',borderColor:'#fcd34d',background:'#fffbeb'}}
               disabled={busy}
               onClick={()=>sanctionStore(ds,'suspend')}
              >
               Tangguhkan Akun
              </button>
             )}
             <button
              type="button"
              className="btn btn-outline"
              style={{minHeight:30,padding:'4px 10px',fontSize:11.5,color:'#dc2626',borderColor:'#fecaca',background:'#ffffff'}}
              disabled={busy}
              onClick={()=>sanctionStore(ds,'delete')}
             >
              Hapus Akun Toko
             </button>
            </div>
           </td>
          </>
         )}
        />
       </div>
      )}

      <div className="panel">
       <div className="admin-toolbar" style={{marginBottom:14}}>
        <input className="field" placeholder="Cari nama toko atau kode pesanan..." value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/>
        <select className="field" style={{maxWidth:230}} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
         <option value="">Semua Status Komisi</option>
         <option value="waiting_verification">Menunggu Verifikasi QRIS</option>
         <option value="unpaid">Belum Dibayar</option>
         <option value="paid">Sudah Lunas</option>
         <option value="rejected">Ditolak</option>
        </select>
       </div>

       <Table
        headers={['Kode Pesanan','Toko','Barang Laku','Total Komisi','Status Komisi','Bukti Transfer QRIS','Verifikasi Super Admin']}
        items={commData.items||[]}
        empty="Belum ada data tagihan komisi penjualan."
        render={item=>{
         const st=commStatusBadge[item.status]||{label:item.status,cls:''};
         return (
          <>
           <td><b>{item.order_code}</b><br/><small className="muted">{dateID(item.created_at)}</small></td>
           <td>
            <b>{item.store_name}</b><br/>
            <small className="muted">{item.owner_name}</small>
            {item.store_unpaid_count>=2&&(
             <div><span className="badge status-rejected" style={{fontSize:10,marginTop:2}}>Menunggak {item.store_unpaid_count}x</span></div>
            )}
           </td>
           <td><b>{item.items_sold}</b> barang<br/><small className="muted">@ {rp(item.commission_per_item)}</small></td>
           <td><b style={{color:'#1669e8',fontSize:14}}>{rp(item.total_commission)}</b></td>
           <td>
            <span className={`badge ${st.cls}`}>{st.label}</span>
            {item.rejection_reason&&<div style={{fontSize:11,color:'#dc2626',marginTop:3}}>Alasan: {item.rejection_reason}</div>}
           </td>
           <td>
            {item.proof_url?(
             <div style={{display:'flex',alignItems:'center',gap:8}}>
              <img
               src={imageSrc(item.proof_url)}
               alt="Bukti QRIS"
               onClick={()=>setPreviewImage(imageSrc(item.proof_url))}
               style={{width:44,height:44,objectFit:'cover',borderRadius:6,border:'1px solid #cbd5e1',cursor:'pointer'}}
              />
              <button type="button" className="text-link" style={{fontSize:11.5,display:'inline-flex',alignItems:'center',gap:4}} onClick={()=>setPreviewImage(imageSrc(item.proof_url))}>
               <Eye size={13}/> Perbesar
              </button>
             </div>
            ):(
             <span className="muted text-xs">Belum diunggah</span>
            )}
           </td>
           <td>
            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'nowrap'}}>
             {item.status!=='paid'&&item.proof_url&&(
              <button
               type="button"
               className="btn btn-primary"
               style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#ffffff'}}
               disabled={busy}
               onClick={()=>verifyComm(item,'approve')}
              >
               <CheckCircle2 size={14}/> Setujui Lunas
              </button>
             )}
             {item.status==='waiting_verification'&&(
              <button
               type="button"
               className="btn btn-outline"
               style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}}
               disabled={busy}
               onClick={()=>verifyComm(item,'reject')}
              >
               <XCircle size={14}/> Tolak
              </button>
             )}
             {item.status==='paid'&&(
              <span className="muted text-xs">Terverifikasi</span>
             )}
            </div>
           </td>
          </>
         );
        }}
       />
       <Pagination pagination={commData.pagination} onPage={setPage}/>
      </div>
     </>
    )
   )}

   {['stores','verification'].includes(kind)&&(
    <>
     {kind==='verification'&&(
      <div className="tabs" style={{marginBottom:16}}>
       <button className={verifTab==='stores'?'active':''} onClick={()=>setVerifTab('stores')} style={{display:'inline-flex',alignItems:'center',gap:6}}>
        <Store size={15}/> Verifikasi Toko & Penjual ({stores?.items?.length||0})
       </button>
       <button className={verifTab==='buyers'?'active':''} onClick={()=>setVerifTab('buyers')} style={{display:'inline-flex',alignItems:'center',gap:6}}>
        <IdCard size={15}/> Verifikasi KTM Pembeli ({ktmUsers?.items?.length||0})
       </button>
      </div>
     )}

     <div className="admin-toolbar">
      <input className="field" placeholder="Cari nama toko, mahasiswa, NIM, atau email..." value={q} onChange={e=>{setQ(e.target.value);setPage(1);}}/>
      <select className="field" style={{maxWidth:230}} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}}>
       <option value="">Semua Status</option>
       <option value="pending">Menunggu Verifikasi</option>
       <option value="approved">Terverifikasi</option>
       <option value="rejected">Ditolak</option>
       <option value="suspended">Ditangguhkan</option>
      </select>
     </div>

     {(kind==='stores'||verifTab==='stores')&&(
      !stores?'Memuat daftar toko...':(
       <>
        <Table
         headers={['Toko','Pemilik & NIM','Dokumen KTM & Wajah','Status & Komisi','Terakhir Aktif','Aksi']}
         items={stores.items}
         render={s=>{
          const actInfo=formatLastActive(s.minutes_ago,s.last_active_at);
          const logo=imageSrc(s.logo_url);
          const needsVerify=['pending','rejected','suspended'].includes(s.status)||s.owner_ktm_status==='pending';
          return (
           <>
            <td>
             <div style={{display:'flex',alignItems:'center',gap:11}}>
              <div style={{width:44,height:44,borderRadius:10,border:'1px solid #cbd5e1',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0}}>
               {logo?(
                <img
                 src={logo}
                 alt={s.name}
                 style={{width:'100%',height:'100%',objectFit:'cover',cursor:'pointer'}}
                 onClick={()=>setPreviewImage(logo)}
                 onError={e=>{e.currentTarget.style.display='none';}}
                 title="Klik untuk memperbesar Logo Toko"
                />
               ):(
                <Store size={20} color="#1669e8"/>
               )}
              </div>
              <div>
               <b>{s.name}</b><br/>
               <small className="muted">{s.city} · {s.product_count} produk · {s.order_count} pesanan</small>
              </div>
             </div>
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
               style={{fontSize:11.5,color:'#1669e8',fontWeight:700,display:'inline-flex',alignItems:'center',gap:4}}
              >
               <Eye size={13}/> Tinjau
              </button>
             </div>
            </td>
            <td>
             <Status status={s.status} type="store"/>
             {s.status==='approved'&&s.owner_ktm_status==='pending'&&(
              <div style={{marginTop:4}}>
               <span className="badge status-pending" style={{fontSize:10}}>KTM Baru Menunggu Verifikasi</span>
              </div>
             )}
             {s.isInactive?<span className="badge status-rejected" style={{marginLeft:4}}>Tidak aktif</span>:null}
             {Number(s.unpaid_commissions_count||0)>0&&(
              <div style={{marginTop:4}}>
               <span className="badge status-rejected" style={{fontSize:10}}>
                Tunggakan Komisi: {s.unpaid_commissions_count}x ({rp(s.unpaid_commissions_amount)})
               </span>
              </div>
             )}
            </td>
            <td>
             <span style={{display:'inline-flex',alignItems:'center',gap:6,background:actInfo.bg,color:actInfo.color,fontSize:11,fontWeight:700,padding:'2px 9px',borderRadius:99,marginBottom:2}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:actInfo.dot}}/>
              {actInfo.badge}
             </span>
             <br/>
             <small className="muted" style={{fontSize:11}}>{actInfo.exact}</small>
            </td>
            <td>
             <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'nowrap'}}>
              {needsVerify&&(
               <button
                type="button"
                className="btn btn-primary"
                style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#ffffff'}}
                disabled={busy}
                onClick={()=>act(s,s.status==='suspended'?'reactivate':'approve')}
               >
                <CheckCircle2 size={14}/> {s.status==='suspended'?'Aktifkan':'Setujui'}
               </button>
              )}
              {(s.status==='pending'||s.owner_ktm_status==='pending')&&(
               <button
                type="button"
                className="btn btn-outline"
                style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}}
                disabled={busy}
                onClick={()=>act(s,'reject')}
               >
                <XCircle size={14}/> Tolak
               </button>
              )}
              {s.status==='approved'&&s.owner_ktm_status!=='pending'&&(
               <button
                type="button"
                className="btn btn-outline"
                style={{minHeight:32,padding:'5px 11px',fontSize:12}}
                disabled={busy}
                onClick={()=>act(s,'suspend')}
               >
                Tangguhkan
               </button>
              )}
              {kind==='stores'&&(
               <button
                type="button"
                className="btn btn-outline"
                style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}}
                disabled={busy}
                onClick={()=>act(s,'delete')}
               >
                Hapus
               </button>
              )}
             </div>
            </td>
           </>
          );
         }}
        />
        <Pagination pagination={stores.pagination} onPage={setPage}/>
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
           <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'nowrap'}}>
            {u.ktm_status!=='verified'&&(
             <button type="button" className="btn btn-primary" style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#ffffff'}} disabled={busy} onClick={()=>actBuyerKtm(u,'approve')}>
              <CheckCircle2 size={14}/> Setujui KTM
             </button>
            )}
            {u.ktm_status==='pending'&&(
             <button type="button" className="btn btn-outline" style={{minHeight:32,padding:'5px 11px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}} disabled={busy} onClick={()=>actBuyerKtm(u,'reject')}>
              <XCircle size={14}/> Tolak
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
        <td><span className={`badge ${r.is_active?'status-approved':'status-cancelled'}`}>{r.is_active?'Aktif':'Nonaktif'}</span></td>
        <td>
         <div style={{display:'flex',alignItems:'center',gap:6}}>
          <button type="button" className="btn btn-outline" style={{minHeight:30,padding:'4px 10px',fontSize:12}} onClick={()=>edit(r)}>Ubah</button>
          <button type="button" className="btn btn-outline" style={{minHeight:30,padding:'4px 10px',fontSize:12,color:'#dc2626',borderColor:'#fecaca'}} onClick={()=>remove(r.id,kind==='categories'?'categories':'banners')}>Hapus</button>
         </div>
        </td>
       </>
      )}
     />
    </>
   )}

   {kind==='audit'&&(
    audits?(
     <>
      <Table
       headers={['Waktu','Admin','Aksi','Objek','ID']}
       items={audits.items}
       render={a=>(
        <>
         <td>{dateID(a.created_at)}</td>
         <td><b>{a.actor_name||'-'}</b></td>
         <td><span className="badge status-confirmed">{a.action}</span></td>
         <td>{a.target_type}</td>
         <td>{a.target_id}</td>
        </>
       )}
      />
      <Pagination pagination={audits.pagination} onPage={setPage}/>
     </>
    ):<p>Memuat...</p>
   )}

   {kind==='settings'&&(
    <>
     <div className="form-row" style={{alignItems:'stretch',marginBottom:20}}>
      {/* Panel 1: Profil & Identitas Super Admin */}
      <form
       className="panel"
       onSubmit={async e=>{
        e.preventDefault();
        setBusy(true);
        try{
         await api('/auth/profile',{method:'PATCH',body:adminProfile});
         await refresh();
         show('Profil Super Admin berhasil diperbarui');
        }catch(err){
         show(err.message,'error');
        }finally{
         setBusy(false);
        }
       }}
      >
       <div className="between" style={{marginBottom:12}}>
        <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8}}>
         <UserRound size={19} color="#1669e8"/> Profil Akun Super Admin
        </h3>
        <span className="badge status-approved">
         <ShieldCheck size={12} style={{marginRight:3}}/> Super Admin Utama
        </span>
       </div>
       <p className="muted text-xs" style={{marginBottom:16}}>
        Perbarui nama tampilan dan nomor kontak resmi Super Admin.
       </p>
       <div className="form-field">
        <label>Nama Lengkap Super Admin</label>
        <input
         required
         value={adminProfile.name}
         onChange={e=>setAdminProfile({...adminProfile,name:e.target.value})}
         placeholder="Nama Super Admin"
        />
       </div>
       <div className="form-field">
        <label>Nomor HP / WhatsApp Admin</label>
        <input
         value={adminProfile.phone}
         onChange={e=>setAdminProfile({...adminProfile,phone:e.target.value})}
         placeholder="Contoh: 081234567890"
        />
       </div>
       <Button loading={busy}>Simpan Profil Admin</Button>
      </form>

      {/* Panel 2: Pengaturan Operasional & Kebijakan Platform */}
      <form
       className="panel"
       onSubmit={async e=>{
        e.preventDefault();
        setBusy(true);
        try{
         await api('/admin/settings',{
          method:'PATCH',
          body:{
           inactive_days:Number(form.inactive_days??settings.find(s=>s.key==='inactive_days')?.value??30),
           commission_per_item:Number(form.commission_per_item??settings.find(s=>s.key==='commission_per_item')?.value??2000),
           qris_merchant_name:form.qris_merchant_name??settings.find(s=>s.key==='qris_merchant_name')?.value??'KampusBalik Official (Super Admin)',
           support_phone:form.support_phone??settings.find(s=>s.key==='support_phone')?.value??''
          }
         });
         show('Pengaturan operasional platform berhasil disimpan');
         load();
        }catch(err){
         show(err.message,'error');
        }finally{
         setBusy(false);
        }
       }}
      >
       <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <Settings size={19} color="#1669e8"/> Kebijakan Operasional Platform
       </h3>
       <p className="muted text-xs" style={{marginBottom:16}}>
        Atur batas hari pantauan toko tidak aktif, tarif komisi default, dan kontak bantuan platform.
       </p>
       <div className="form-row">
        <div className="form-field">
         <label>Batas Toko Tidak Aktif (1–365 Hari)</label>
         <input
          type="number"
          min={1}
          max={365}
          required
          value={form.inactive_days??settings.find(s=>s.key==='inactive_days')?.value??30}
          onChange={e=>setForm({...form,inactive_days:e.target.value})}
         />
        </div>
        <div className="form-field">
         <label>Komisi Per Barang Terjual (Rp)</label>
         <input
          type="number"
          min={0}
          required
          value={form.commission_per_item??settings.find(s=>s.key==='commission_per_item')?.value??2000}
          onChange={e=>setForm({...form,commission_per_item:e.target.value})}
         />
        </div>
       </div>
       <div className="form-field">
        <label>Nama Merchant QRIS Super Admin</label>
        <input
         value={form.qris_merchant_name??settings.find(s=>s.key==='qris_merchant_name')?.value??'KampusBalik Official (Super Admin)'}
         onChange={e=>setForm({...form,qris_merchant_name:e.target.value})}
         placeholder="KampusBalik Official (Super Admin)"
        />
       </div>
       <div className="form-field">
        <label>Kontak WhatsApp Pusat Bantuan KampusBalik (Opsional)</label>
        <input
         value={form.support_phone??settings.find(s=>s.key==='support_phone')?.value??''}
         onChange={e=>setForm({...form,support_phone:e.target.value})}
         placeholder="Contoh: 0812-xxxx-xxxx"
        />
       </div>
       <Button loading={busy}>Simpan Pengaturan Platform</Button>
      </form>
     </div>

     <div className="form-row" style={{alignItems:'stretch'}}>
      {/* Panel 3: Ubah Alamat Email Super Admin */}
      <form
       className="panel"
       onSubmit={async e=>{
        e.preventDefault();
        setBusy(true);
        try{
         await api('/auth/email',{method:'PATCH',body:adminEmail});
         await refresh();
         setAdminEmail(prev=>({...prev,oldPassword:''}));
         show('Alamat email Super Admin berhasil diperbarui');
        }catch(err){
         show(err.message,'error');
        }finally{
         setBusy(false);
        }
       }}
      >
       <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <Mail size={19} color="#1669e8"/> Ubah Alamat Email Super Admin
       </h3>
       <p className="muted text-xs" style={{marginBottom:16}}>
        Email aktif saat ini: <b>{user?.email}</b>. Masukkan kata sandi Anda untuk mengonfirmasi perubahan email login.
       </p>
       <div className="form-field">
        <label>Alamat Email Baru</label>
        <input
         type="email"
         required
         value={adminEmail.email}
         onChange={e=>setAdminEmail({...adminEmail,email:e.target.value})}
         placeholder="admin@kampusbalik.id"
        />
       </div>
       <div className="form-field">
        <label>Konfirmasi Kata Sandi Saat Ini</label>
        <input
         type="password"
         required
         value={adminEmail.oldPassword}
         onChange={e=>setAdminEmail({...adminEmail,oldPassword:e.target.value})}
         placeholder="Masukkan kata sandi saat ini"
        />
       </div>
       <Button loading={busy}>Simpan Email Baru</Button>
      </form>

      {/* Panel 4: Ubah Kata Sandi Super Admin */}
      <form
       className="panel"
       onSubmit={async e=>{
        e.preventDefault();
        if(adminPwd.newPassword!==adminPwd.confirmPassword){
         return show('Konfirmasi kata sandi baru tidak cocok','error');
        }
        setBusy(true);
        try{
         await api('/auth/password',{
          method:'PATCH',
          body:{oldPassword:adminPwd.oldPassword,newPassword:adminPwd.newPassword}
         });
         setAdminPwd({oldPassword:'',newPassword:'',confirmPassword:''});
         show('Kata sandi Super Admin berhasil diperbarui');
        }catch(err){
         show(err.message,'error');
        }finally{
         setBusy(false);
        }
       }}
      >
       <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
        <KeyRound size={19} color="#1669e8"/> Ubah Kata Sandi Super Admin
       </h3>
       <p className="muted text-xs" style={{marginBottom:16}}>
        Gunakan minimal 8 karakter kombinasi huruf dan angka untuk menjaga keamanan akun Super Admin.
       </p>
       <div className="form-field">
        <label>Kata Sandi Lama</label>
        <input
         type="password"
         required
         value={adminPwd.oldPassword}
         onChange={e=>setAdminPwd({...adminPwd,oldPassword:e.target.value})}
         placeholder="Masukkan kata sandi lama"
        />
       </div>
       <div className="form-row">
        <div className="form-field">
         <label>Kata Sandi Baru (Min. 8 Karakter)</label>
         <input
          type="password"
          minLength={8}
          required
          value={adminPwd.newPassword}
          onChange={e=>setAdminPwd({...adminPwd,newPassword:e.target.value})}
          placeholder="Minimal 8 karakter"
         />
        </div>
        <div className="form-field">
         <label>Ulangi Kata Sandi Baru</label>
         <input
          type="password"
          minLength={8}
          required
          value={adminPwd.confirmPassword}
          onChange={e=>setAdminPwd({...adminPwd,confirmPassword:e.target.value})}
          placeholder="Ketik ulang sandi baru"
         />
        </div>
       </div>
       <Button loading={busy}>Perbarui Kata Sandi</Button>
      </form>
     </div>
    </>
   )}

   {inspectModal&&(
    <div className="lightbox-overlay" onClick={()=>setInspectModal(null)}>
     <div className="panel" onClick={e=>e.stopPropagation()} style={{maxWidth:740,width:'95%',maxHeight:'90vh',overflowY:'auto',position:'relative',padding:24}}>
      <div className="between" style={{marginBottom:16}}>
       <div style={{display:'flex',alignItems:'center',gap:12}}>
        {inspectModal.type==='store'&&inspectModal.item.logo_url&&(
         <img
          src={imageSrc(inspectModal.item.logo_url)}
          alt={inspectModal.item.name}
          style={{width:48,height:48,borderRadius:12,objectFit:'cover',border:'1px solid #cbd5e1'}}
          onError={e=>{e.currentTarget.style.display='none';}}
         />
        )}
        <div>
         <h3 style={{margin:0,fontSize:18}}>
          {inspectModal.type==='store'?`Verifikasi Identitas Penjual: ${inspectModal.item.name}`:`Verifikasi KTM Pembeli: ${inspectModal.item.name}`}
         </h3>
         <p className="muted text-xs" style={{marginTop:4}}>
          Pemilik: <b>{inspectModal.item.owner_name||inspectModal.item.name}</b> · Email: {inspectModal.item.owner_email||inspectModal.item.email}
          {(inspectModal.item.owner_nim||inspectModal.item.nim)&&` · NIM: ${inspectModal.item.owner_nim||inspectModal.item.nim}`}
         </p>
        </div>
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
       <div className="between" style={{borderTop:'1px solid #e2e8f0',paddingTop:16,flexWrap:'wrap',gap:10}}>
        <div className="muted text-xs">
         Terakhir aktif: <b>{dateID(inspectModal.item.last_active_at)}</b>
        </div>
        <div className="flex gap-2 flex-wrap">
         {(['pending','rejected','suspended'].includes(inspectModal.item.status)||inspectModal.item.owner_ktm_status!=='verified')&&(
          <Button loading={busy} onClick={()=>act(inspectModal.item,inspectModal.item.status==='suspended'?'reactivate':'approve')}>
           <CheckCircle2 size={16}/> Setujui & Verifikasi Toko
          </Button>
         )}
         {(inspectModal.item.status==='pending'||inspectModal.item.owner_ktm_status==='pending')&&(
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

   {previewImage&&(
    <div className="lightbox-overlay" onClick={()=>setPreviewImage(null)}>
     <div className="lightbox-content" onClick={e=>e.stopPropagation()}>
      <button className="lightbox-close" onClick={()=>setPreviewImage(null)}><X size={20}/></button>
      <img src={previewImage} alt="Pratinjau Gambar"/>
     </div>
    </div>
   )}
  </DashboardShell>
 );
}
