'use client';
import {LoaderCircle,PackageOpen,ChevronLeft,ChevronRight} from 'lucide-react';
export function Button({children,loading,variant='primary',className='',...props}){return <button className={`btn btn-${variant} ${className}`} disabled={loading||props.disabled} {...props}>{loading&&<LoaderCircle className="animate-spin" size={16}/>} {children}</button>;}
export function Empty({title='Belum ada data',description='Data akan muncul di sini ketika tersedia.'}){return <div className="empty"><PackageOpen size={38} strokeWidth={1.3}/><h3>{title}</h3><p>{description}</p></div>;}
export function Skeleton({count=4}){return <div className="product-grid">{Array.from({length:count},(_,i)=><div key={i} className="skeleton skeleton-card"/>)}</div>;}
export function Badge({status,children}){return <span className={`badge status-${status||'default'}`}>{children||status}</span>;}
export function Pagination({pagination,onPage}){if(!pagination||pagination.pages<=1)return null;return <div className="pagination"><button disabled={pagination.page<=1} onClick={()=>onPage(pagination.page-1)}><ChevronLeft size={16}/></button><span>Halaman {pagination.page} / {pagination.pages}</span><button disabled={pagination.page>=pagination.pages} onClick={()=>onPage(pagination.page+1)}><ChevronRight size={16}/></button></div>;}
