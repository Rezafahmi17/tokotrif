'use client';
import {useEffect,useState} from 'react';
import {Plus,Edit3,Trash2,ImagePlus,Star,Check,AlertCircle} from 'lucide-react';
import DashboardShell from '@/components/layout/DashboardShell';
import {Table,Status} from '@/components/ui/AdminBits';
import {Button,Pagination} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,rp,imageSrc} from '@/lib/api';

const blank={name:'',description:'',category_id:'',price:'',compare_price:'',sku:'',stock:'0',low_stock_threshold:'5',status:'active'};

export default function Page(){
 const {show}=useToast();
 const [data,setData]=useState(null);
 const [cats,setCats]=useState([]);
 const [form,setForm]=useState(blank);
 const [editing,setEditing]=useState(null);
 const [images,setImages]=useState([]);
 const [showForm,setShowForm]=useState(false);
 const [files,setFiles]=useState(null);
 const [busy,setBusy]=useState(false);
 const [page,setPage]=useState(1);
 const [q,setQ]=useState('');

 const load=()=>api(`/store/products?page=${page}&q=${encodeURIComponent(q)}`).then(setData).catch(e=>show(e.message,'error'));
 useEffect(()=>{load();},[page,q]);
 useEffect(()=>{api('/catalog/categories').then(setCats).catch(()=>{});},[]);

 const start=async(p=null)=>{
  setEditing(p?.id||null);
  setForm(p?{...p,category_id:String(p.category_id),compare_price:p.compare_price||'',stock:String(p.stock)}:blank);
  setFiles(null);
  setImages([]);
  setShowForm(true);
  if(p?.id){
   try{
    const full=await api(`/store/products/${p.id}`);
    setImages(full.images||[]);
   }catch{
    setImages([]);
   }
  }
 };

 const deleteImage=async(imageId)=>{
  if(!confirm('Hapus foto ini dari produk?'))return;
  setBusy(true);
  try{
   await api(`/store/products/${editing}/images/${imageId}`,{method:'DELETE'});
   show('Foto berhasil dihapus');
   const full=await api(`/store/products/${editing}`);
   setImages(full.images||[]);
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const setPrimaryImage=async(imageId)=>{
  setBusy(true);
  try{
   await api(`/store/products/${editing}/images/${imageId}/primary`,{method:'PATCH'});
   show('Foto sampul berhasil diubah');
   const full=await api(`/store/products/${editing}`);
   setImages(full.images||[]);
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const save=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   const body={...form,category_id:Number(form.category_id),price:Number(form.price),compare_price:form.compare_price?Number(form.compare_price):null,low_stock_threshold:Number(form.low_stock_threshold)};
   if(editing)delete body.stock;else body.stock=Number(form.stock);
   const p=await api(editing?`/store/products/${editing}`:'/store/products',{method:editing?'PATCH':'POST',body});
   const id=editing||p.id;
   if(files?.length){
    const fd=new FormData();
    Array.from(files).forEach(file=>fd.append('images',file));
    await api(`/store/products/${id}/images`,{method:'POST',body:fd});
   }
   show(editing?'Produk berhasil diperbarui':'Produk berhasil ditambahkan');
   setShowForm(false);
   await load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const archive=async p=>{
  if(!confirm(`Arsipkan produk ${p.name}?`))return;
  try{
   await api(`/store/products/${p.id}`,{method:'DELETE'});
   show('Produk diarsipkan');
   await load();
  }catch(e){
   show(e.message,'error');
  }
 };

 const remainingSlots=editing?Math.max(0,5-images.length):5;

 return <DashboardShell kind="store">
  <h1>Produk toko</h1>
  <p className="dashboard-subtitle">Kelola katalog dan foto produk milik toko Anda.</p>
  <div className="admin-toolbar">
   <input className="field" placeholder="Cari produk..." value={q} onChange={e=>setQ(e.target.value)}/>
   <Button onClick={()=>start()}><Plus size={16}/> Tambah produk</Button>
  </div>
  {showForm&&(
   <form className="admin-form" onSubmit={save}>
    <h3>{editing?'Ubah produk':'Tambah produk baru'}</h3>
    <div className="form-row">
     <div className="form-field"><label>Nama produk</label><input required minLength={3} value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></div>
     <div className="form-field"><label>Kategori</label><select required value={form.category_id||''} onChange={e=>setForm({...form,category_id:e.target.value})}><option value="">Pilih kategori</option>{cats.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></div>
     <div className="form-field"><label>Harga jual (Rp)</label><input required type="number" min={0} value={form.price} onChange={e=>setForm({...form,price:e.target.value})}/></div>
     <div className="form-field"><label>Harga coret (opsional)</label><input type="number" min={0} value={form.compare_price||''} onChange={e=>setForm({...form,compare_price:e.target.value})}/></div>
     {!editing&&<div className="form-field"><label>Stok awal</label><input type="number" min={0} value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})}/></div>}
     <div className="form-field"><label>Ambang stok menipis</label><input type="number" min={0} value={form.low_stock_threshold} onChange={e=>setForm({...form,low_stock_threshold:e.target.value})}/></div>
     <div className="form-field"><label>SKU (opsional)</label><input value={form.sku||''} onChange={e=>setForm({...form,sku:e.target.value})}/></div>
     <div className="form-field"><label>Status</label><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option value="active">Aktif</option><option value="draft">Draf</option></select></div>
    </div>
    <div className="form-field">
     <label>Deskripsi</label>
     <textarea rows={4} value={form.description||''} onChange={e=>setForm({...form,description:e.target.value})}/>
    </div>

    {editing&&(
     <div className="form-field" style={{marginBottom:24,background:'#f8fafc',padding:16,borderRadius:8,border:'1px solid #e2e8f0'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
       <label style={{margin:0,fontWeight:700,color:'#0f172a'}}>Foto Produk Tersimpan ({images.length}/5)</label>
       <span className="muted text-xs">Maksimal 5 foto per produk</span>
      </div>
      {images.length===0?(
       <p className="muted text-xs" style={{margin:'6px 0'}}>Belum ada foto tersimpan. Unggah foto produk di bawah.</p>
      ):(
       <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))',gap:12}}>
        {images.map(img=>(
         <div key={img.id} style={{position:'relative',background:'#ffffff',border:img.is_primary?'2px solid #2563eb':'1px solid #cbd5e1',borderRadius:8,overflow:'hidden',display:'flex',flexDirection:'column'}}>
          <div style={{width:'100%',height:120,background:'#0f172a',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
           <img src={imageSrc(img.url)} alt="Foto produk" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{e.target.style.display='none';}}/>
          </div>
          {img.is_primary&&(
           <span style={{position:'absolute',top:6,left:6,background:'#2563eb',color:'#ffffff',fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:4,boxShadow:'0 2px 4px rgba(0,0,0,0.2)'}}>
            ★ Sampul
           </span>
          )}
          <div style={{padding:'6px 4px',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#f1f5f9',gap:4}}>
           {!img.is_primary?(
            <button type="button" disabled={busy} onClick={()=>setPrimaryImage(img.id)} style={{fontSize:11,color:'#2563eb',background:'none',border:'none',cursor:'pointer',fontWeight:600,padding:2}}>
             Jadikan Sampul
            </button>
           ):(
            <span style={{fontSize:11,color:'#16a34a',fontWeight:600,padding:2}}>Utama</span>
           )}
           <button type="button" disabled={busy} onClick={()=>deleteImage(img.id)} title="Hapus foto" style={{fontSize:11,color:'#dc2626',background:'none',border:'none',cursor:'pointer',display:'inline-flex',alignItems:'center',gap:2,padding:2}}>
            <Trash2 size={13}/> Hapus
           </button>
          </div>
         </div>
        ))}
       </div>
      )}
     </div>
    )}

    <div className="form-field">
     <label>{editing?`Tambah Foto Baru (Tersisa ${remainingSlots} slot, maks. 2 MB/foto)`:'Unggah Foto Produk (Maks. 5 foto JPG/PNG/WebP, 2 MB/foto)'}</label>
     <input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={editing&&remainingSlots<=0} onChange={e=>setFiles(e.target.files)}/>
     {editing&&remainingSlots<=0&&<small className="muted" style={{color:'#d97706'}}>Produk sudah memiliki 5 foto (batas maksimal). Hapus salah satu foto terlebih dahulu untuk mengunggah foto baru.</small>}
    </div>
    <div className="flex gap-3">
     <Button loading={busy}>Simpan produk</Button>
     <Button type="button" variant="outline" onClick={()=>setShowForm(false)}>Batal</Button>
    </div>
   </form>
  )}
  {!data?'Memuat...':(
   <>
    <Table headers={['Nama produk','Harga','Stok','Dipesan','Status','Aksi']} items={data.items} render={p=>(
     <>
      <td><b>{p.name}</b><br/><small>{p.category_name}</small></td>
      <td>{rp(p.price)}</td>
      <td>{p.stock}</td>
      <td>{p.reserved}</td>
      <td><Status status={p.status}/></td>
      <td>
       <button onClick={()=>start(p)}><Edit3 size={15} style={{display:'inline'}}/> Ubah</button> &nbsp;
       <button onClick={()=>archive(p)}><Trash2 size={14} style={{display:'inline'}}/> Arsip</button>
      </td>
     </>
    )}/>
    <Pagination pagination={data.pagination} onPage={setPage}/>
   </>
  )}
 </DashboardShell>;
}
