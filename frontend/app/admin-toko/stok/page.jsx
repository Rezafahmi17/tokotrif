'use client';
import {useEffect,useState} from 'react';
import DashboardShell from '@/components/layout/DashboardShell';
import {Table} from '@/components/ui/AdminBits';
import {Button} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,dateID} from '@/lib/api';

const moveTypes={
 masuk:{label:'Stok Masuk',cls:'status-approved',sign:'+'},
 kurang:{label:'Stok Keluar',cls:'status-rejected',sign:'-'},
 koreksi:{label:'Koreksi Stok',cls:'status-confirmed',sign:''},
 penjualan:{label:'Terjual (COD Lunas)',cls:'status-completed',sign:'-'},
 batal:{label:'Pengembalian Batal',cls:'status-pending',sign:'+'}
};

export default function Page(){
 const {show}=useToast();
 const [products,setProducts]=useState([]);
 const [selected,setSelected]=useState('');
 const [history,setHistory]=useState([]);
 const [form,setForm]=useState({type:'masuk',qty:1,note:''});
 const [busy,setBusy]=useState(false);

 const load=()=>api('/store/products?limit=60').then(d=>setProducts(d.items||[])).catch(e=>show(e.message,'error'));
 useEffect(()=>{load();},[]);
 useEffect(()=>{
  if(selected)api(`/store/products/${selected}/stock-history`).then(d=>setHistory(d.items||[])).catch(()=>{});
 },[selected]);

 const submit=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   await api(`/store/products/${selected}/stock`,{method:'POST',body:form});
   show('Stok berhasil diperbarui');
   setForm({...form,qty:1,note:''});
   await load();
   const h=await api(`/store/products/${selected}/stock-history`);
   setHistory(h.items||[]);
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 return (
  <DashboardShell kind="store">
   <h1>Manajemen Stok</h1>
   <p className="dashboard-subtitle">Setiap penyesuaian stok tercatat di riwayat. Stok tidak boleh di bawah jumlah yang sedang terkonfirmasi COD.</p>
   <div className="panel">
    <div className="form-field">
     <label>Pilih Produk</label>
     <select value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="">-- Pilih produk untuk melihat atau mengubah stok --</option>
      {products.map(p=>(
       <option value={p.id} key={p.id}>
        {p.name} (Stok Total: {p.stock} · Terkonfirmasi COD: {p.reserved} · Tersedia: {Math.max(0,p.stock-p.reserved)})
       </option>
      ))}
     </select>
    </div>

    {selected&&(
     <form onSubmit={submit} style={{marginTop:12,paddingTop:14,borderTop:'1px solid #e2e8f0'}}>
      <div className="form-row">
       <div className="form-field">
        <label>Jenis Perubahan Stok</label>
        <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
         <option value="masuk">Tambah Stok (+)</option>
         <option value="kurang">Kurangi Stok (-)</option>
         <option value="koreksi">Koreksi (Tetapkan Jumlah Akhir)</option>
        </select>
       </div>
       <div className="form-field">
        <label>{form.type==='koreksi'?'Jumlah Stok Akhir':'Jumlah Stok'}</label>
        <input type="number" min={0} required value={form.qty} onChange={e=>setForm({...form,qty:Number(e.target.value)})}/>
       </div>
      </div>
      <div className="form-field">
       <label>Alasan Penyesuaian</label>
       <input required minLength={3} value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Contoh: Barang baru datang / Penyesuaian fisik"/>
      </div>
      <Button loading={busy}>Simpan Perubahan Stok</Button>
     </form>
    )}
   </div>

   {selected&&(
    <div className="panel" style={{marginTop:18}}>
     <h3 style={{marginBottom:14}}>Riwayat Pergerakan Stok</h3>
     <Table
      headers={['Waktu','Jenis Pergerakan','Perubahan','Stok Akhir','Keterangan']}
      items={history}
      empty="Belum ada riwayat pergerakan stok untuk produk ini."
      render={h=>{
       const m=moveTypes[h.type]||{label:h.type,cls:'status-pending',sign:''};
       return (
        <>
         <td>{dateID(h.created_at)}</td>
         <td><span className={`badge ${m.cls}`}>{m.label}</span></td>
         <td><b>{m.sign}{h.qty}</b></td>
         <td><b>{h.balance_after}</b></td>
         <td>{h.note||'-'}</td>
        </>
       );
      }}
     />
    </div>
   )}
  </DashboardShell>
 );
}
