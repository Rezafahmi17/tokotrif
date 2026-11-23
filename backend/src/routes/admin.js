import {Router} from 'express';
import {z} from 'zod';
import * as a from '../services/adminService.js';
import * as comm from '../services/commissionService.js';
import {ok,wrap} from '../utils/common.js';
import {validate} from '../middlewares/validate.js';
import {upload,saveImage} from '../utils/upload.js';
const r=Router();
const reason=z.object({reason:z.string().trim().min(3)});
const catSchema=z.object({name:z.string().min(2),icon:z.string().optional(),parent_id:z.coerce.number().int().positive().nullable().optional(),sort_order:z.coerce.number().int().optional(),is_active:z.boolean().optional()});
const bannerSchema=z.object({title:z.string().min(2),subtitle:z.string().optional(),cta_label:z.string().optional(),cta_link:z.string().startsWith('/').optional(),image_url:z.string().optional(),placement:z.enum(['hero','promo']).optional(),sort_order:z.coerce.number().int().optional(),is_active:z.boolean().optional()});
r.get('/stats',wrap(async(req,res)=>ok(res,await a.stats())));
r.get('/stores',wrap(async(req,res)=>ok(res,await a.listStores(req.query))));
for(const action of ['approve','reactivate'])r.patch(`/stores/:id/${action}`,wrap(async(req,res)=>ok(res,await a.transitionStore(req.params.id,action,req.user.id,null,req.ip))));
for(const action of ['reject','suspend'])r.patch(`/stores/:id/${action}`,validate(reason),wrap(async(req,res)=>ok(res,await a.transitionStore(req.params.id,action,req.user.id,req.body.reason,req.ip))));
r.delete('/stores/:id',validate(z.object({confirm:z.literal(true),reason:z.string().min(3)})),wrap(async(req,res)=>{await a.deleteStore(req.params.id,req.user.id,req.body.reason,req.body.confirm,req.ip);ok(res,null,'Toko dihapus secara aman');}));

r.get('/ktm-users',wrap(async(req,res)=>ok(res,await a.listCustomerKtm(req.query))));
r.patch('/ktm-users/:id/approve',wrap(async(req,res)=>ok(res,await a.verifyCustomerKtm(req.params.id,'approve',req.user.id,null,req.ip))));
r.patch('/ktm-users/:id/reject',validate(reason),wrap(async(req,res)=>ok(res,await a.verifyCustomerKtm(req.params.id,'reject',req.user.id,req.body.reason,req.ip))));

// QRIS & Komisi Super Admin
r.get('/commissions',wrap(async(req,res)=>ok(res,await comm.adminListCommissions(req.query))));
r.get('/commissions/config',wrap(async(req,res)=>ok(res,await comm.getQrisConfig())));
r.patch('/commissions/config',validate(z.object({
 commission_per_item:z.coerce.number().min(0).optional(),
 qris_image_url:z.string().optional().nullable(),
 qris_merchant_name:z.string().max(150).optional()
})),wrap(async(req,res)=>ok(res,await comm.updateQrisConfig(req.body),'Pengaturan QRIS & Komisi disimpan')));
r.post('/commissions/qris-upload',upload.single('image'),wrap(async(req,res)=>{
 const url=await saveImage(req.file);
 const cfg=await comm.updateQrisConfig({qris_image_url:url});
 ok(res,{url,config:cfg},'Gambar QRIS Super Admin berhasil diunggah');
}));
r.patch('/commissions/:id/approve',wrap(async(req,res)=>ok(res,await comm.adminVerifyCommission(req.params.id,'approve',req.user.id,null,req.ip),'Pembayaran komisi QRIS disetujui')));
r.patch('/commissions/:id/reject',validate(reason),wrap(async(req,res)=>ok(res,await comm.adminVerifyCommission(req.params.id,'reject',req.user.id,req.body.reason,req.ip),'Bukti pembayaran komisi ditolak')));
r.post('/commissions/stores/:storeId/sanction',validate(z.object({
 type:z.enum(['suspend','delete']),
 reason:z.string().min(3).optional()
})),wrap(async(req,res)=>ok(res,await comm.adminSanctionStore(req.params.storeId,req.body.type,req.user.id,req.body.reason,req.ip),'Sanksi toko berhasil diterapkan')));

r.get('/categories',wrap(async(req,res)=>ok(res,await a.getCategories())));
r.post('/categories',validate(catSchema),wrap(async(req,res)=>ok(res,await a.saveCategory(req.body),'Kategori dibuat',201)));
r.patch('/categories/:id',validate(catSchema),wrap(async(req,res)=>ok(res,await a.saveCategory(req.body,req.params.id))));
r.delete('/categories/:id',wrap(async(req,res)=>{await a.deleteCategory(req.params.id);ok(res);}));
r.get('/banners',wrap(async(req,res)=>ok(res,await a.getBanners())));
r.post('/banners',validate(bannerSchema),wrap(async(req,res)=>ok(res,await a.saveBanner(req.body), 'Banner dibuat',201)));
r.patch('/banners/:id',validate(bannerSchema),wrap(async(req,res)=>ok(res,await a.saveBanner(req.body,req.params.id))));
r.delete('/banners/:id',wrap(async(req,res)=>{await (await import('../config/db.js')).db.query('DELETE FROM banners WHERE id=?',[req.params.id]);ok(res);}));
r.post('/banners/upload',upload.single('image'),wrap(async(req,res)=>ok(res,{url:await saveImage(req.file)})));
r.get('/audit-logs',wrap(async(req,res)=>ok(res,await a.audit(req.query))));
r.get('/settings',wrap(async(req,res)=>ok(res,await a.settings())));
r.patch('/settings',validate(z.object({inactive_days:z.coerce.number().int().min(1).max(365)})),wrap(async(req,res)=>ok(res,await a.updateSettings(req.body))));
export default r;
