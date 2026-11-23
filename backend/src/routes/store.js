import {Router} from 'express';
import {z} from 'zod';
import {db} from '../config/db.js';
import {validate} from '../middlewares/validate.js';
import {storeScope,storeScopeAllowSuspended} from '../middlewares/auth.js';
import {wrap,ok} from '../utils/common.js';
import * as s from '../services/financeService.js';
import * as comm from '../services/commissionService.js';
import {upload,saveImage} from '../utils/upload.js';

const r=Router();

// Endpoint yang tetap dapat diakses meskipun toko sedang terkena sanksi penangguhan (suspended) agar penjual bisa membayar & melunasi tunggakan komisi QRIS
r.get('/profile',storeScopeAllowSuspended,(req,res)=>ok(res,req.store));
r.get('/commissions',storeScopeAllowSuspended,wrap(async(req,res)=>ok(res,await comm.getStoreCommissions(req.store.id))));
r.post('/commissions/upload-proof',storeScopeAllowSuspended,upload.single('image'),wrap(async(req,res)=>{
 const url=await saveImage(req.file);
 ok(res,{url},'Bukti transfer QRIS berhasil diunggah');
}));
r.post('/commissions/pay',storeScopeAllowSuspended,validate(z.object({
 commission_ids:z.array(z.coerce.number().int().positive()).optional(),
 proof_url:z.string().min(5)
})),wrap(async(req,res)=>ok(res,await comm.submitCommissionPayment(req.store.id,req.user.id,req.body.commission_ids,req.body.proof_url),'Bukti pembayaran komisi QRIS berhasil dikirim ke Super Admin')));

// Endpoint operasional toko (wajib berstatus approved)
r.patch('/profile',storeScope,validate(z.object({name:z.string().min(3).optional(),description:z.string().max(2000).optional(),city:z.string().min(2).optional(),address:z.string().min(5).optional(),phone:z.string().min(8).optional(),cod_area_note:z.string().optional(),logo_url:z.string().optional(),ktm_url:z.string().optional(),face_url:z.string().optional()})),wrap(async(req,res)=>{const entries=Object.entries(req.body);if(!entries.length)return ok(res);await db.query(`UPDATE stores SET ${entries.map(([k])=>`${k}=?`).join(',')},last_active_at=NOW() WHERE id=?`,[...entries.map(([,v])=>v),req.store.id]);if(req.body.ktm_url||req.body.face_url){await db.query('UPDATE users SET ktm_url=COALESCE(?,ktm_url),face_url=COALESCE(?,face_url) WHERE id=?',[req.body.ktm_url||null,req.body.face_url||null,req.user.id]);}ok(res,null,'Profil diperbarui');}));
r.post('/profile/logo',storeScope,upload.single('image'),wrap(async(req,res)=>{const url=await saveImage(req.file);await db.query('UPDATE stores SET logo_url=? WHERE id=?',[url,req.store.id]);ok(res,{url});}));
r.get('/dashboard',storeScope,wrap(async(req,res)=>ok(res,await s.dashboard(req.store.id))));
const expense=z.object({category:z.string().min(2).max(100),amount:z.coerce.number().positive(),description:z.string().max(500).optional(),trx_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/)});
r.get('/finance/summary',storeScope,wrap(async(req,res)=>ok(res,await s.summary(req.store.id,req.query))));
r.get('/finance/transactions',storeScope,wrap(async(req,res)=>ok(res,await s.transactions(req.store.id,req.query))));
r.post('/finance/transactions',storeScope,validate(expense),wrap(async(req,res)=>ok(res,await s.addExpense(req.store.id,req.user.id,req.body),'Pengeluaran tercatat',201)));
r.patch('/finance/transactions/:id',storeScope,validate(expense),wrap(async(req,res)=>{await s.updateExpense(req.store.id,req.params.id,req.body);ok(res);}));
r.delete('/finance/transactions/:id',storeScope,wrap(async(req,res)=>{await s.deleteExpense(req.store.id,req.params.id);ok(res);}));
r.get('/finance/export',storeScope,wrap(async(req,res)=>{const {buffer,filename}=await s.exportExcel(req.store,req.query);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="${filename}"`);res.send(Buffer.from(buffer));}));

export default r;
