'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Wallet,ShoppingCart,Package,AlertTriangle,ArrowRight,QrCode} from 'lucide-react';
import {ResponsiveContainer,LineChart,CartesianGrid,XAxis,YAxis,Tooltip,Line,Legend} from 'recharts';
import DashboardShell from '@/components/layout/DashboardShell';
import {StatCards,Table} from '@/components/ui/AdminBits';
import {api,rp} from '@/lib/api';

export default function Page(){
 const [d,setD]=useState(null);
 const [comm,setComm]=useState(null);
 const [error,setError]=useState('');

 useEffect(()=>{
  api('/store/dashboard').then(setD).catch(e=>setError(e.message));
  api('/store/commissions').then(setComm).catch(()=>{});
 },[]);

 const unpaidCount=Number(comm?.summary?.unpaid_count||0);
 const unpaidAmount=Number(comm?.summary?.unpaid_amount||0);

 return (
  <DashboardShell kind="store">
   <h1>Ringkasan Toko</h1>
   <p className="dashboard-subtitle">Pantau produk, pesanan COD, komisi QRIS, dan pemasukan dari toko Anda.</p>
   {error&&<div className="notice notice-warning" style={{marginBottom:16}}>{error}</div>}

   {unpaidCount>0&&(
    <div className="panel" style={{marginBottom:20,border:unpaidCount>=2?'1.5px solid #fecaca':'1.5px solid #fde68a',background:unpaidCount>=2?'#fff5f5':'#fffbeb',display:'flex',alignItems:'center',justifyContent:'space-between',gap:14,flexWrap:'wrap'}}>
     <div style={{display:'flex',alignItems:'center',gap:12}}>
      <QrCode size={24} color={unpaidCount>=2?'#dc2626':'#d97706'} style={{flexShrink:0}}/>
      <div>
       <b style={{color:unpaidCount>=2?'#991b1b':'#92400e',fontSize:14}}>
        {unpaidCount>=2?'Peringatan Sanksi: Anda Memiliki ':'Tagihan Komisi Penjualan: '}
        {unpaidCount} Komisi Belum Dibayar ({rp(unpaidAmount)})
       </b>
       <p style={{margin:'2px 0 0',fontSize:12,color:unpaidCount>=2?'#7f1d1d':'#78350f'}}>
        {unpaidCount>=2
         ?'Segera lunasi seluruh tunggakan komisi via QRIS Super Admin untuk mengaktifkan kembali akun toko Anda.'
         :'Setorkan komisi penjualan per barang laku melalui QRIS Super Admin agar akun toko tetap aktif.'}
       </p>
      </div>
     </div>
     <Link href="/admin-toko/komisi" className="btn btn-primary" style={{minHeight:36,fontSize:12.5}}>
      Bayar Komisi via QRIS <ArrowRight size={14}/>
     </Link>
    </div>
   )}

   {!d?'Memuat dashboard...':(
    <>
     <StatCards items={[
      ['Pemasukan Hari Ini',rp(d.income_today),Wallet],
      ['Pemasukan Bulan Ini',rp(d.income_month),Wallet],
      ['Pesanan Aktif',d.pending_orders,ShoppingCart],
      ['Total Produk',d.products,Package]
     ]}/>
     <div className="chart-card">
      <h3>Pemasukan dan Pengeluaran (30 Hari Terakhir)</h3>
      {d.series?.length?(
       <div style={{width:'100%',height:290}}>
        <ResponsiveContainer>
         <LineChart data={d.series}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
          <XAxis dataKey="date" fontSize={11}/>
          <YAxis fontSize={11}/>
          <Tooltip formatter={v=>rp(v)}/>
          <Legend/>
          <Line dataKey="income" name="Pemasukan" stroke="#1669e8" strokeWidth={2.5}/>
          <Line dataKey="expense" name="Pengeluaran" stroke="#f59e0b" strokeWidth={2.5}/>
         </LineChart>
        </ResponsiveContainer>
       </div>
      ):(
       <div className="chart-empty">Belum ada transaksi keuangan pada periode ini.</div>
      )}
     </div>
     <div className="panel">
      <div className="between" style={{marginBottom:14}}>
       <h3 style={{margin:0,display:'flex',alignItems:'center',gap:8}}>
        <AlertTriangle size={18} color="#d97706"/> Peringatan Stok Menipis
       </h3>
       <Link href="/admin-toko/stok" className="text-link">
        Kelola stok <ArrowRight size={13} style={{display:'inline'}}/>
       </Link>
      </div>
      <Table
       headers={['Produk','Total Stok','Terkonfirmasi COD','Ambang Minimum']}
       items={d.low_stock}
       empty="Semua stok produk berada di atas batas minimum."
       render={p=>(
        <>
         <td><b>{p.name}</b></td>
         <td><b style={{color:p.stock<=p.low_stock_threshold?'#dc2626':'inherit'}}>{p.stock}</b></td>
         <td>{p.reserved}</td>
         <td>{p.low_stock_threshold}</td>
        </>
       )}
      />
     </div>
    </>
   )}
  </DashboardShell>
 );
}
