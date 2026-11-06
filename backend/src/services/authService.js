import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {z} from 'zod';
import {db,one,tx} from '../config/db.js';
import {env} from '../config/env.js';
import {fail,uniqSlug} from '../utils/common.js';
import {sendReset} from '../utils/mailer.js';
export const regSchema=z.object({name:z.string().min(2).max(120),email:z.string().email().max(191),password:z.string().min(8),phone:z.string().min(8).max(32)});
export const regStoreSchema=regSchema.extend({storeName:z.string().min(3).max(150),city:z.string().min(2).max(100),address:z.string().min(5).max(255),storePhone:z.string().min(8).max(32),description:z.string().max(2000).optional()});
export const openStoreSchema=z.object({storeName:z.string().min(3).max(150),city:z.string().min(2).max(100),address:z.string().min(5).max(255),storePhone:z.string().min(8).max(32),description:z.string().max(2000).optional()});
export const loginSchema=z.object({email:z.string().email(),password:z.string().min(1)});
export const credentialsSchema=z.object({oldPassword:z.string().min(1),newPassword:z.string().min(8)});
export const emailSchema=z.object({oldPassword:z.string().min(1),email:z.string().email()});
export async function register(body,isStore=false){
 const email=body.email.trim().toLowerCase();
 const existing=await one('SELECT id,role,password_hash FROM users WHERE email=?',[email]);
 if(existing){
  if(isStore&&existing.role==='customer'){
   if(!await bcrypt.compare(body.password,existing.password_hash))fail(409,'Email sudah terdaftar sebagai pembeli. Masukkan kata sandi yang sesuai untuk mengaktifkan toko pada akun ini.');
   const existingStore=await one('SELECT id FROM stores WHERE owner_user_id=? AND deleted_at IS NULL',[existing.id]);
   if(existingStore)fail(409,'Akun ini sudah memiliki toko');
   await tx(async c=>{
    await c.query("UPDATE users SET role='admin_toko' WHERE id=?",[existing.id]);
    await c.query('INSERT INTO stores(owner_user_id,name,slug,city,address,phone,description,status,verified_at,last_active_at) VALUES(?,?,?,?,?,?,?,?,NULL,NOW())',[existing.id,body.storeName,uniqSlug(body.storeName),body.city,body.address,body.storePhone,body.description||null,'pending']);
   });
   return {id:existing.id,role:'admin_toko',storeStatus:'pending'};
  }
  fail(409,existing.role==='admin_toko'?'Email sudah terdaftar sebagai penjual. Silakan langsung masuk.':'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.');
 }
 const hash=await bcrypt.hash(body.password,12);
 const id=await tx(async c=>{
  const [r]=await c.query('INSERT INTO users (role,name,email,password_hash,phone) VALUES (?,?,?,?,?)',[isStore?'admin_toko':'customer',body.name,email,hash,body.phone]);
  if(isStore)await c.query('INSERT INTO stores(owner_user_id,name,slug,city,address,phone,description,status,verified_at,last_active_at) VALUES(?,?,?,?,?,?,?,?,NULL,NOW())',[r.insertId,body.storeName,uniqSlug(body.storeName),body.city,body.address,body.storePhone,body.description||null,'pending']);
  return r.insertId;
 });return {id,role:isStore?'admin_toko':'customer',storeStatus:isStore?'pending':undefined};
}
export async function openStore(userId,body){
 return await tx(async c=>{
  const user=await one('SELECT id,role,phone FROM users WHERE id=?',[userId],c);
  if(!user)fail(404,'Pengguna tidak ditemukan');
  const existingStore=await one('SELECT id FROM stores WHERE owner_user_id=? AND deleted_at IS NULL',[userId],c);
  if(existingStore)fail(409,'Akun ini sudah memiliki toko');
  await c.query("UPDATE users SET role='admin_toko' WHERE id=?",[userId]);
  const [r]=await c.query('INSERT INTO stores(owner_user_id,name,slug,city,address,phone,description,status,verified_at,last_active_at) VALUES(?,?,?,?,?,?,?,?,NULL,NOW())',[userId,body.storeName,uniqSlug(body.storeName),body.city,body.address,body.storePhone||user.phone,body.description||null,'pending']);
  return {storeId:r.insertId,status:'pending'};
 });
}
export async function login(body){
 const user=await one('SELECT * FROM users WHERE email=?',[body.email.trim().toLowerCase()]);
 if(!user||user.status!=='active'||!await bcrypt.compare(body.password,user.password_hash))fail(401,'Email atau sandi salah');
 await db.query('UPDATE users SET last_login_at=NOW() WHERE id=?',[user.id]);
 if(user.role==='admin_toko'){
  await db.query('UPDATE stores SET last_active_at=NOW() WHERE owner_user_id=? AND deleted_at IS NULL',[user.id]);
 }
 return jwt.sign({sub:user.id,role:user.role},env.JWT_SECRET,{expiresIn:'7d'});
}
export async function profile(id){
 const user=await one('SELECT id,role,name,email,phone,status,created_at FROM users WHERE id=?',[id]);
 if(user?.role==='admin_toko'){
  user.store=await one('SELECT id,name,slug,status,rejection_reason,city FROM stores WHERE owner_user_id=? AND deleted_at IS NULL',[id]);
 }
 return user;
}
export async function updatePassword(id,body){
 const user=await one('SELECT password_hash FROM users WHERE id=?',[id]);
 if(!await bcrypt.compare(body.oldPassword,user.password_hash))fail(422,'Sandi lama tidak sesuai');
 await db.query('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(body.newPassword,12),id]);
}
export async function updateEmail(id,body){
 const user=await one('SELECT password_hash FROM users WHERE id=?',[id]);
 if(!await bcrypt.compare(body.oldPassword,user.password_hash))fail(422,'Sandi lama tidak sesuai');
 await db.query('UPDATE users SET email=? WHERE id=?',[body.email.toLowerCase(),id]);
}
export async function forgot(email){
 const user=await one('SELECT id FROM users WHERE email=? AND status=?',[email.toLowerCase(),'active']);
 if(!user)return;
 const token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex');
 await db.query('INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 1 HOUR))',[user.id,hash]);
 await sendReset(email,`${env.CLIENT_ORIGIN}/reset-sandi?token=${encodeURIComponent(token)}`);
}
export async function reset(token,password){
 const hash=crypto.createHash('sha256').update(token).digest('hex');
 await tx(async c=>{
 const row=await one('SELECT * FROM password_resets WHERE token_hash=? FOR UPDATE',[hash],c);
 if(!row||row.used_at||new Date(row.expires_at.replace(' ','T')+'+07:00')<new Date())fail(422,'Tautan reset tidak valid atau kedaluwarsa');
 await c.query('UPDATE users SET password_hash=? WHERE id=?',[await bcrypt.hash(password,12),row.user_id]);
 await c.query('UPDATE password_resets SET used_at=NOW() WHERE id=?',[row.id]);
 });
}
