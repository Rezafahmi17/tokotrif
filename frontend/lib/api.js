export const API=process.env.NEXT_PUBLIC_API_URL||'http://localhost:5000/api';
export const SERVER=API.replace(/\/api\/?$/,'');
export function imageSrc(path){if(!path)return null;if(/^https?:\/\//.test(path))return path;if(path.startsWith('/uploads/'))return SERVER+path;return path;}
export async function api(path,{method='GET',body,headers={},...opts}={}){
 const isForm=typeof FormData!=='undefined'&&body instanceof FormData;
 let response;
 try{response=await fetch(`${API}${path}`,{method,credentials:'include',headers:{...(!isForm&&body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:isForm?body:JSON.stringify(body)}:{}),cache:'no-store',...opts});}
 catch{throw new Error('Tidak dapat terhubung ke backend. Pastikan server Express berjalan di port 5000.');}
 const text=await response.text();let result;
 try{result=text?JSON.parse(text):{};}catch{throw new Error('Respons server tidak sesuai format JSON');}
 if(!response.ok){const error=new Error(result.message||'Permintaan gagal');error.status=response.status;error.errors=result.errors;throw error;}
 return result.data;
}
export const rp=(n)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0));
export const dateID=(s)=>s?new Date(String(s).replace(' ','T')+'+07:00').toLocaleString('id-ID',{dateStyle:'medium',timeStyle:'short'}):'-';
export const statuses={pending:'Menunggu toko',confirmed:'Disepakati',paid:'Lunas',completed:'Selesai',cancelled:'Dibatalkan',approved:'Disetujui',rejected:'Ditolak',suspended:'Ditangguhkan',active:'Aktif',draft:'Draf',archived:'Diarsipkan'};
