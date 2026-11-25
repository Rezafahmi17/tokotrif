'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {Store,MapPin,ShieldCheck} from 'lucide-react';
import ProductCard from '@/components/product/ProductCard';
import {api,imageSrc} from '@/lib/api';
import {Empty,Skeleton} from '@/components/ui/Elements';

export default function Page(){
 const {slug}=useParams();
 const [data,setData]=useState(null);
 const [error,setError]=useState('');
 const [logoBroken,setLogoBroken]=useState(false);

 useEffect(()=>{
  setLogoBroken(false);
  api(`/catalog/stores/${slug}`).then(setData).catch(e=>setError(e.message));
 },[slug]);

 const logo=imageSrc(data?.logo_url);

 return (
  <div className="container page-space">
   {error?(
    <Empty title="Toko tidak ditemukan" description={error}/>
   ):!data?(
    <Skeleton/>
   ):(
    <>
     <div className="panel" style={{display:'flex',gap:20,alignItems:'center',marginBottom:32,flexWrap:'wrap'}}>
      <div className="stat-icon" style={{width:82,height:82,borderRadius:16,overflow:'hidden',border:'2px solid #dbeafe',background:'#eff6ff',flexShrink:0}}>
       {logo&&!logoBroken?(
        <img
         src={logo}
         alt={data.name}
         style={{width:'100%',height:'100%',objectFit:'cover'}}
         onError={()=>setLogoBroken(true)}
        />
       ):(
        <Store size={36}/>
       )}
      </div>
      <div style={{flex:1,minWidth:220}}>
       <div className="badge status-approved" style={{marginBottom:6}}>
        <ShieldCheck size={12} style={{marginRight:4}}/> Toko Mahasiswa Terverifikasi
       </div>
       <h1 style={{fontSize:26,margin:'4px 0'}}>{data.name}</h1>
       <p className="muted" style={{fontSize:13}}>
        <MapPin size={13} style={{display:'inline',marginRight:3}}/> {data.city} · {data.address}
       </p>
       {data.cod_area_note&&(
        <p style={{fontSize:12,color:'#1669e8',fontWeight:700,marginTop:4}}>
         Titik Temu COD: {data.cod_area_note}
        </p>
       )}
       {data.description&&(
        <p style={{fontSize:13,marginTop:8,color:'#334155'}}>{data.description}</p>
       )}
      </div>
     </div>
     <div className="section-head">
      <h2>Katalog Produk dari {data.name}</h2>
     </div>
     {data.products?.items?.length?(
      <div className="product-grid">
       {data.products.items.map(p=><ProductCard key={p.id} product={p}/>)}
      </div>
     ):(
      <Empty title="Belum ada produk di toko ini"/>
     )}
    </>
   )}
  </div>
 );
}
