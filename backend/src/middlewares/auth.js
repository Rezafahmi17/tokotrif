import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {db,one} from '../config/db.js';
import {fail,wrap} from '../utils/common.js';
export const cookieName='marketplace_session';
export const cookieOpts={
 httpOnly:true,
 sameSite:env.NODE_ENV==='production'?'none':'lax',
 secure:env.NODE_ENV==='production',
 maxAge:7*24*60*60*1000,
 path:'/'
};
export const authenticate=wrap(async(req,res,next)=>{
 const token=req.cookies?.[cookieName]||req.headers.authorization?.replace(/^Bearer\s+/i,'');
 if(!token)fail(401,'Silakan masuk terlebih dahulu');
 let payload;try{payload=jwt.verify(token,env.JWT_SECRET);}catch{fail(401,'Sesi kedaluwarsa, silakan masuk kembali');}
 const user=await one('SELECT id,role,name,email,phone,status FROM users WHERE id=?',[payload.sub]);
 if(!user||user.status!=='active')fail(401,'Akun tidak aktif');req.user=user;next();
});
export const authorize=(...roles)=>(req,res,next)=>{
 if(roles.includes(req.user?.role))return next();
 if(req.user?.role==='customer'&&roles.includes('admin_toko')){
  return next(new ErrorWithStatus(403,'Akses ditolak: Akun Anda terdaftar sebagai Pembeli. Silakan buat toko terlebih dahulu di menu "Buka Toko" untuk mulai menjual produk.'));
 }
 return next(new ErrorWithStatus(403,'Akses ditolak untuk peran ini'));
};
class ErrorWithStatus extends Error{constructor(status,message){super(message);this.status=status;}}
export const storeScope=wrap(async(req,res,next)=>{
 const store=await one('SELECT * FROM stores WHERE owner_user_id=? AND deleted_at IS NULL',[req.user.id]);
 if(!store)fail(403,'Akun tidak memiliki toko. Silakan buat toko terlebih dahulu.');
 if(store.status==='pending')fail(403,'Toko Anda sedang menunggu verifikasi oleh Super Admin. Anda dapat mulai mengelola produk setelah toko disetujui.');
 if(store.status==='rejected')fail(403,`Pendaftaran toko ditolak: ${store.rejection_reason||'Tidak memenuhi kriteria'}`);
 if(store.status==='suspended')fail(403,`Toko sedang ditangguhkan: ${store.rejection_reason||'Silakan hubungi admin'}`);
 if(store.status!=='approved')fail(403,`Toko belum dapat digunakan (status: ${store.status})`);
 req.store=store;next();
});
