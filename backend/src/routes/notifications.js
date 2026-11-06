import {Router} from 'express';
import {db,rows} from '../config/db.js';
import {ok,wrap} from '../utils/common.js';
const r=Router();
r.get('/',wrap(async(req,res)=>ok(res,await rows('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 60',[req.user.id]))));
r.patch('/read-all',wrap(async(req,res)=>{await db.query('UPDATE notifications SET is_read=1 WHERE user_id=?',[req.user.id]);ok(res);}));
r.patch('/:id/read',wrap(async(req,res)=>{await db.query('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?',[req.params.id,req.user.id]);ok(res);}));
export default r;
