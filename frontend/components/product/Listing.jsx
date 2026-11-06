'use client';
import {useEffect,useState} from 'react';
import {Search,SlidersHorizontal,X,RotateCcw,MapPin,Tag,Sparkles,Filter,ChevronDown} from 'lucide-react';
import {api} from '@/lib/api';
import ProductCard from './ProductCard';
import {Button,Empty,Skeleton,Pagination} from '@/components/ui/Elements';

export default function Listing({initialCategory=''}){
 const [filter,setFilter]=useState({q:'',category:initialCategory,city:'',minPrice:'',maxPrice:'',sort:'newest'});
 const [draft,setDraft]=useState({q:'',category:initialCategory,city:'',minPrice:'',maxPrice:'',sort:'newest'});
 const [products,setProducts]=useState(null);
 const [cats,setCats]=useState([]);
 const [page,setPage]=useState(1);
 const [error,setError]=useState('');
 const [showMobileFilter,setShowMobileFilter]=useState(false);

 useEffect(()=>{
  const q=new URLSearchParams(window.location.search);
  const initial={
   q:q.get('q')||'',
   category:initialCategory||q.get('category')||'',
   city:q.get('city')||'',
   minPrice:q.get('minPrice')||'',
   maxPrice:q.get('maxPrice')||'',
   sort:q.get('sort')||'newest'
  };
  setFilter(initial);
  setDraft(initial);
  api('/catalog/categories').then(setCats).catch(()=>{});
 },[initialCategory]);

 useEffect(()=>{
  setProducts(null);
  setError('');
  const query=new URLSearchParams({
   ...Object.fromEntries(Object.entries(filter).filter(([,v])=>v)),
   page:String(page),
   limit:'16'
  });
  api(`/catalog/products?${query.toString()}`)
   .then(setProducts)
   .catch(e=>setError(e.message));
 },[filter,page]);

 const apply=e=>{
  if(e)e.preventDefault();
  setPage(1);
  setFilter(draft);
  setShowMobileFilter(false);
  const q=new URLSearchParams(Object.fromEntries(Object.entries(draft).filter(([,v])=>v)));
  window.history.replaceState(null,'',`${window.location.pathname}${q.toString()?`?${q}`:''}`);
 };

 const resetAll=()=>{
  const empty={q:'',category:'',city:'',minPrice:'',maxPrice:'',sort:'newest'};
  setDraft(empty);
  setFilter(empty);
  setPage(1);
  setShowMobileFilter(false);
  window.history.replaceState(null,'',window.location.pathname);
 };

 const selectCategory=(catSlug)=>{
  const next={...draft,category:catSlug};
  setDraft(next);
  setFilter(next);
  setPage(1);
  const q=new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([,v])=>v)));
  window.history.replaceState(null,'',`${window.location.pathname}${q.toString()?`?${q}`:''}`);
 };

 const handleSort=(newSort)=>{
  const next={...filter,sort:newSort};
  setDraft(next);
  setFilter(next);
  const q=new URLSearchParams(Object.fromEntries(Object.entries(next).filter(([,v])=>v)));
  window.history.replaceState(null,'',`${window.location.pathname}${q.toString()?`?${q}`:''}`);
 };

 const setQuickPrice=(min,max)=>{
  setDraft({...draft,minPrice:min?String(min):'',maxPrice:max?String(max):''});
 };

 const activeCategoryName=cats.find(c=>c.slug===filter.category)?.name;
 const hasFilters=Boolean(filter.q||filter.category||filter.city||filter.minPrice||filter.maxPrice||(filter.sort&&filter.sort!=='newest'));

 return (
  <div className="container page-space">
   {/* Hero Header Banner */}
   <div className="catalog-hero-banner">
    <div className="catalog-hero-eyebrow">
     <Sparkles size={14}/> KATALOG KAMPUS & PRELOVED
    </div>
    <h1>Temukan Produk & Preloved Kampus</h1>
    <p>Jelajahi buku kuliah, gawai, pakaian, dan kebutuhan mahasiswa dengan harga hemat & transaksi COD aman.</p>

    {/* Horizontal Category Quick Filter Chips */}
    <div className="catalog-chips-scroll">
     <button
      type="button"
      className={`cat-chip ${!filter.category?'active':''}`}
      onClick={()=>selectCategory('')}
     >
      Semua Kategori
     </button>
     {cats.map(c=>(
      <button
       key={c.id}
       type="button"
       className={`cat-chip ${filter.category===c.slug?'active':''}`}
       onClick={()=>selectCategory(c.slug)}
      >
       {c.name}
      </button>
     ))}
    </div>
   </div>

   {/* Main Layout: Sidebar Filter + Product Catalog */}
   <div className="catalog-layout">
    {/* Filter Sidebar & Mobile Backdrop */}
    {showMobileFilter && (
     <div className="catalog-backdrop" onClick={() => setShowMobileFilter(false)} />
    )}
    <aside className={`catalog-filter-card ${showMobileFilter ? 'mobile-open' : ''}`}>
     <div className="filter-card-header">
      <div className="filter-card-title">
       <SlidersHorizontal size={17}/>
       <span>Filter Produk</span>
      </div>
      {hasFilters&&(
       <button type="button" className="filter-reset-link" onClick={resetAll}>
        <RotateCcw size={13}/> Reset
       </button>
      )}
      <button className="mobile-close-filter" onClick={()=>setShowMobileFilter(false)}>
       <X size={18}/>
      </button>
     </div>

     <form onSubmit={apply} className="filter-card-form">
      {/* Kata Kunci */}
      <div className="form-field">
       <label>Kata Kunci</label>
       <div className="input-with-icon">
        <Search size={15} className="field-icon"/>
        <input
         value={draft.q||''}
         onChange={e=>setDraft({...draft,q:e.target.value})}
         placeholder="Cari nama produk..."
        />
       </div>
      </div>

      {/* Kategori */}
      <div className="form-field">
       <label>Kategori</label>
       <select
        value={draft.category||''}
        onChange={e=>setDraft({...draft,category:e.target.value})}
       >
        <option value="">Semua Kategori</option>
        {cats.map(c=><option value={c.slug} key={c.id}>{c.name}</option>)}
       </select>
      </div>

      {/* Area COD / Kota */}
      <div className="form-field">
       <label>Area COD / Kampus</label>
       <div className="input-with-icon">
        <MapPin size={15} className="field-icon"/>
        <input
         value={draft.city||''}
         onChange={e=>setDraft({...draft,city:e.target.value})}
         placeholder="Contoh: Kampus Utama, Metro..."
        />
       </div>
      </div>

      {/* Rentang Harga */}
      <div className="form-field">
       <label>Rentang Harga (Rp)</label>
       <div className="price-inputs-row">
        <input
         type="number"
         min="0"
         placeholder="Min"
         value={draft.minPrice||''}
         onChange={e=>setDraft({...draft,minPrice:e.target.value})}
        />
        <span className="price-dash">-</span>
        <input
         type="number"
         min="0"
         placeholder="Maks"
         value={draft.maxPrice||''}
         onChange={e=>setDraft({...draft,maxPrice:e.target.value})}
        />
       </div>
       {/* Quick price pills */}
       <div className="quick-price-chips">
        <button type="button" onClick={()=>setQuickPrice(0,50000)}>&lt; 50rb</button>
        <button type="button" onClick={()=>setQuickPrice(50000,150000)}>50-150rb</button>
        <button type="button" onClick={()=>setQuickPrice(150000,500000)}>150-500rb</button>
       </div>
      </div>

      {/* Urutkan */}
      <div className="form-field">
       <label>Urutkan Berdasarkan</label>
       <select
        value={draft.sort||'newest'}
        onChange={e=>setDraft({...draft,sort:e.target.value})}
       >
        <option value="newest">Terbaru</option>
        <option value="bestseller">Paling Laris</option>
        <option value="price_asc">Harga Terendah</option>
        <option value="price_desc">Harga Tertinggi</option>
        <option value="rating">Rating Tertinggi</option>
       </select>
      </div>

      <div className="filter-actions">
       <Button type="submit" className="w-full">
        Terapkan Filter
       </Button>
       {hasFilters&&(
        <button type="button" className="filter-clear-ghost" onClick={resetAll}>
         Hapus Semua Filter
        </button>
       )}
      </div>
     </form>
    </aside>

    {/* Product Listing Main Section */}
    <section className="catalog-main">
     {/* Control Bar: Result count & Sort dropdown */}
     <div className="catalog-control-bar">
      <div className="control-bar-left">
       <button
        type="button"
        className="mobile-filter-trigger"
        onClick={()=>setShowMobileFilter(true)}
       >
        <Filter size={15}/>
        <span>Filter & Urutkan</span>
       </button>
       <div className="catalog-count-pill">
        {products?`Menampilkan ${products.pagination.total} produk`:'Memuat katalog...'}
       </div>
      </div>

      <div className="control-bar-right">
       <div className="sort-inline-wrap">
        <span>Urutkan:</span>
        <select value={filter.sort||'newest'} onChange={e=>handleSort(e.target.value)}>
         <option value="newest">Terbaru</option>
         <option value="bestseller">Paling Laris</option>
         <option value="price_asc">Harga Terendah</option>
         <option value="price_desc">Harga Tertinggi</option>
         <option value="rating">Rating Tertinggi</option>
        </select>
       </div>
      </div>
     </div>

     {/* Active Filter Tags */}
     {hasFilters&&(
      <div className="active-filter-tags">
       <span className="tags-label">Filter aktif:</span>
       {filter.q&&(
        <span className="filter-tag">
         Cari: &ldquo;{filter.q}&rdquo;
         <button onClick={()=>{const n={...filter,q:''};setFilter(n);setDraft(n);}}><X size={12}/></button>
        </span>
       )}
       {activeCategoryName&&(
        <span className="filter-tag">
         {activeCategoryName}
         <button onClick={()=>selectCategory('')}><X size={12}/></button>
        </span>
       )}
       {filter.city&&(
        <span className="filter-tag">
         Area: {filter.city}
         <button onClick={()=>{const n={...filter,city:''};setFilter(n);setDraft(n);}}><X size={12}/></button>
        </span>
       )}
       {(filter.minPrice||filter.maxPrice)&&(
        <span className="filter-tag">
         Harga: {filter.minPrice?`Rp${Number(filter.minPrice).toLocaleString('id-ID')}`:'0'} - {filter.maxPrice?`Rp${Number(filter.maxPrice).toLocaleString('id-ID')}`:'∞'}
         <button onClick={()=>{const n={...filter,minPrice:'',maxPrice:''};setFilter(n);setDraft(n);}}><X size={12}/></button>
        </span>
       )}
       <button type="button" className="tag-clear-all" onClick={resetAll}>
        Hapus Semua
       </button>
      </div>
     )}

     {/* Product Grid or Skeleton or Empty */}
     {error?(
      <div className="notice notice-warning">{error}</div>
     ):!products?(
      <div className="listing-product-grid">
       {Array.from({length:8},(_,i)=><div key={i} className="skeleton skeleton-card" style={{height:300}}/>)}
      </div>
     ):products.items.length?(
      <>
       <div className="listing-product-grid">
        {products.items.map(p=>(
         <ProductCard key={p.id} product={p}/>
        ))}
       </div>
       <Pagination pagination={products.pagination} onPage={setPage}/>
      </>
     ):(
      <div className="empty-catalog-box">
       <div className="empty-catalog-icon">
        <Tag size={42} strokeWidth={1.2}/>
       </div>
       <h3>Belum Ada Produk yang Sesuai</h3>
       <p>Coba gunakan kata kunci lain, pilih kategori berbeda, atau hapus filter harga dan area COD.</p>
       <Button variant="outline" onClick={resetAll} style={{marginTop:16}}>
        Lihat Semua Produk
       </Button>
      </div>
     )}
    </section>
   </div>
  </div>
 );
}
