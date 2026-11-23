import {Router} from 'express';
import {z} from 'zod';
import {validate} from '../middlewares/validate.js';
import {wrap,ok} from '../utils/common.js';
import {uploadMedia,saveChatMedia} from '../utils/upload.js';
import * as s from '../services/chatService.js';

const r=Router();

r.get('/threads',wrap(async(req,res)=>ok(res,await s.getThreads(req.user))));
r.post('/threads',validate(z.object({store_id:z.coerce.number().int().positive()})),wrap(async(req,res)=>ok(res,await s.getThread(req.user,req.body.store_id))));
r.get('/threads/:id/messages',wrap(async(req,res)=>ok(res,await s.messages(req.user,req.params.id,req.query))));
r.patch('/threads/:id/read',wrap(async(req,res)=>{await s.markRead(req.user,req.params.id);ok(res);}));

r.post('/upload',uploadMedia.single('file'),wrap(async(req,res)=>{
 const media=await saveChatMedia(req.file);
 ok(res,media,'Media berhasil diunggah',201);
}));

r.post('/threads/:id/messages',validate(z.object({
 body:z.string().max(1000).optional().default(''),
 type:z.enum(['text','product','image','video']).optional(),
 order_id:z.coerce.number().int().positive().nullable().optional(),
 media_url:z.string().max(500).nullable().optional(),
 media_type:z.enum(['image','video']).nullable().optional()
})),wrap(async(req,res)=>ok(res,await s.sendMessage(req.user,req.params.id,req.body.body,req.body.type,req.body.order_id,req.body.media_url,req.body.media_type),'Pesan terkirim',201)));

export default r;
