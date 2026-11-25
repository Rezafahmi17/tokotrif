'use client';
import {useEffect,useState} from 'react';
import {Wallet,ArrowDownCircle,ArrowUpCircle,ChartNoAxesCombined,Download,Trash2} from 'lucide-react';
import {ResponsiveContainer,BarChart,CartesianGrid,XAxis,YAxis,Tooltip,Bar,Legend} from 'recharts';
import DashboardShell from '@/components/layout/DashboardShell';
import {StatCards,Table} from '@/components/ui/AdminBits';
import {Button} from '@/components/ui/Elements';
import {useToast} from '@/components/ui/Toast';
import {api,API,rp,dateID} from '@/lib/api';

export default function Page(){
 const {show}=useToast();
 const [from,setFrom]=useState(new Date().toISOString().slice(0,7)+'-01');
 const [to,setTo]=useState(new Date().toISOString().slice(0,10));
 const [summary,setSummary]=useState(null);
 const [transactions,setTransactions]=useState([]);
 const [form,setForm]=useState({category:'Operasional',amount:'',description:'',trx_date:new Date().toISOString().slice(0,10)});
 const [busy,setBusy]=useState(false);

 const load=()=>{
  const q=`from=${from}&to=${to}`;
  api(`/store/finance/summary?${q}`).then(setSummary).catch(e=>show(e.message,'error'));
  api(`/store/finance/transactions?${q}&limit=60`).then(d=>setTransactions(d.items||[])).catch(()=>{});
 };
 useEffect(()=>{load();},[from,to]);

 const expense=async e=>{
  e.preventDefault();
  setBusy(true);
  try{
   await api('/store/finance/transactions',{method:'POST',body:{...form,amount:Number(form.amount)}});
   show('Pengeluaran tersimpan');
   setForm({...form,amount:'',description:''});
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const removeExpense=async t=>{
  if(!window.confirm(`Hapus catatan pengeluaran "${t.category}" sebesar ${rp(t.amount)}?`))return;
  setBusy(true);
  try{
   await api(`/store/finance/transactions/${t.id}`,{method:'DELETE'});
   show('Catatan pengeluaran dihapus');
   load();
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 const download=async()=>{
  setBusy(true);
  try{
   const headers={};
   if(typeof window!=='undefined'){
    const token=localStorage.getItem('kb_token');
    if(token)headers['Authorization']=`Bearer ${token}`;
   }
   const res=await fetch(`${API}/store/finance/export?from=${from}&to=${to}`,{credentials:'include',headers});
   if(!res.ok)throw new Error('Gagal mengunduh laporan');
   const disposition=res.headers.get('content-disposition');
   let filename=`laporan-keuangan-${from}-${to}.xlsx`;
   if(disposition){
    const m=disposition.match(/filename="?([^"]+)"?/);
    if(m?.[1])filename=m[1];
   }
   const blob=await res.blob();
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');
   a.href=url;
   a.download=filename;
   a.click();
   URL.revokeObjectURL(url);
   show('Laporan keuangan Excel berhasil diunduh');
  }catch(e){
   show(e.message,'error');
  }finally{
   setBusy(false);
  }
 };

 return (
  <DashboardShell kind="store">
   <h1>Keuangan Toko</h1>
   <p className="dashboard-subtitle">Pemasukan tercatat otomatis dari pesanan COD yang lunas, dan pengeluaran operasional dapat dicatat manual.</p>

   <div className="admin-toolbar">
    <div className="flex items-center gap-2 flex-wrap">
     <input className="field" style={{width:'auto'}} aria-label="Dari tanggal" type="date" value={from} onChange={e=>setFrom(e.target.value)}/>
     <span className="muted text-xs">s.d.</span>
     <input className="field" style={{width:'auto'}} aria-label="Sampai tanggal" type="date" value={to} onChange={e=>setTo(e.target.value)}/>
    </div>
    <Button onClick={download} loading={busy} variant="outline"><Download size={16}/> Unduh Laporan Excel</Button>
   </div>

   {summary&&(
    <>
     <StatCards items={[
      ['Total Pemasukan',rp(summary.income),ArrowDownCircle],
      ['Total Pengeluaran',rp(summary.expense),ArrowUpCircle],
      ['Laba Bersih',rp(summary.profit),Wallet],
      ['Pesanan Lunas',summary.paid_orders,ChartNoAxesCombined]
     ]}/>
     <div className="chart-card">
      <h3>Grafik Arus Kas Masuk & Keluar</h3>
      {summary.series?.length?(
       <div style={{width:'100%',height:250}}>
        <ResponsiveContainer>
         <BarChart data={summary.series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
          <XAxis dataKey="date" fontSize={11}/>
          <YAxis fontSize={11}/>
          <Tooltip formatter={v=>rp(v)}/>
          <Legend/>
          <Bar name="Pemasukan" dataKey="income" fill="#1669e8" radius={[6,6,0,0]}/>
          <Bar name="Pengeluaran" dataKey="expense" fill="#f59e0b" radius={[6,6,0,0]}/>
         </BarChart>
        </ResponsiveContainer>
       </div>
      ):(
       <div className="chart-empty">Belum ada aktivitas keuangan pada rentang tanggal ini.</div>
      )}
     </div>
    </>
   )}

   <form className="admin-form" onSubmit={expense}>
    <h3 style={{marginBottom:12}}>Catat Pengeluaran Operasional</h3>
    <div className="form-row">
     <div className="form-field">
      <label>Kategori</label>
      <input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Contoh: Operasional, Kemasan, Transport"/>
     </div>
     <div className="form-field">
      <label>Nominal (Rp)</label>
      <input type="number" min={1} required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Contoh: 15000"/>
     </div>
     <div className="form-field">
      <label>Tanggal Transaksi</label>
      <input type="date" required value={form.trx_date} onChange={e=>setForm({...form,trx_date:e.target.value})}/>
     </div>
     <div className="form-field">
      <label>Catatan / Keterangan</label>
      <input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Keterangan tambahan (opsional)"/>
     </div>
    </div>
    <Button loading={busy}>Simpan Pengeluaran</Button>
   </form>

   <div className="panel">
    <h3 style={{marginBottom:14}}>Riwayat Transaksi Keuangan</h3>
    <Table
     headers={['Tanggal','Jenis','Kategori','Keterangan','Nominal','Aksi']}
     items={transactions}
     empty="Belum ada catatan transaksi keuangan pada periode ini."
     render={t=>(
      <>
       <td>{dateID(t.trx_date)}</td>
       <td>
        <span className={`badge ${t.type==='income'?'status-approved':'status-pending'}`}>
         {t.type==='income'?'Pemasukan':'Pengeluaran'}
        </span>
       </td>
       <td><b>{t.category}</b></td>
       <td>{t.description||'-'}</td>
       <td>
        <b style={{color:t.type==='income'?'#15803d':'#b45309'}}>
         {t.type==='income'?'+':'-'} {rp(t.amount)}
        </b>
       </td>
       <td>
        {t.type==='expense'&&t.category!=='Komisi QRIS Super Admin'?(
         <button
          type="button"
          className="btn btn-outline"
          style={{minHeight:28,padding:'3px 9px',fontSize:11.5,color:'#dc2626',borderColor:'#fecaca'}}
          disabled={busy}
          onClick={()=>removeExpense(t)}
         >
          <Trash2 size={13}/> Hapus
         </button>
        ):(
         <span className="muted text-xs">Otomatis</span>
        )}
       </td>
      </>
     )}
    />
   </div>
  </DashboardShell>
 );
}
