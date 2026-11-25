'use client';
import {statuses,storeStatuses} from '@/lib/api';
import {Badge} from './Elements';

export function StatCards({items}){
 return (
  <div className="stats-grid">
   {items.map(([title,value,Icon])=>(
    <div className="stat-card" key={title}>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
      <span>{title}</span>
      <span className="stat-icon"><Icon size={19}/></span>
     </div>
     <b>{value}</b>
    </div>
   ))}
  </div>
 );
}

export function Table({headers,items,render,empty='Belum ada data'}){
 return (
  <div className="data-table-wrap">
   <table className="data-table">
    <thead>
     <tr>{headers.map(x=><th key={x}>{x}</th>)}</tr>
    </thead>
    <tbody>
     {items?.length?items.map((v,i)=><tr key={v.id||i}>{render(v)}</tr>):(
      <tr>
       <td colSpan={headers.length} className="muted" style={{padding:32,textAlign:'center'}}>{empty}</td>
      </tr>
     )}
    </tbody>
   </table>
  </div>
 );
}

export function Status({status,type='default'}){
 const label=type==='store'?(storeStatuses[status]||statuses[status]||status):(statuses[status]||status);
 return <Badge status={status}>{label}</Badge>;
}
