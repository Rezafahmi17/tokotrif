import {Router} from 'express';import {z} from 'zod';import {validate} from '../middlewares/validate.js';import {wrap,ok} from '../utils/common.js';import * as s from '../services/orderService.js';
const r=Router();r.get('/',wrap(async(req,res)=>ok(res,await s.listStoreOrders(req.store.id,req.query))));r.get('/:id',wrap(async(req,res)=>ok(res,await s.storeOrder(req.store.id,req.params.id))));
r.patch('/:id/confirm',validate(z.object({meeting_location:z.string().trim().min(5),meeting_at:z.string().min(10)})),wrap(async(req,res)=>ok(res,await s.confirm(req.store.id,req.params.id,req.user.id,req.body.meeting_location,req.body.meeting_at))));
r.patch('/:id/paid',wrap(async(req,res)=>ok(res,await s.paid(req.store.id,req.params.id,req.user.id))));
r.patch('/:id/cancel',validate(z.object({reason:z.string().min(3)})),wrap(async(req,res)=>ok(res,await s.cancel(req.params.id,'admin_toko',req.user.id,req.body.reason,req.store.id))));export default r;
