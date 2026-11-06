import {db,one,rows} from '../config/db.js';import {fail,pageOptions,pagination} from '../utils/common.js';
export async function canAccess(user,id){
 const thread=await one('SELECT t.*,s.owner_user_id,s.name store_name,u.name customer_name FROM chat_threads t JOIN stores s ON s.id=t.store_id JOIN users u ON u.id=t.customer_id WHERE t.id=?',[id]);
 if(!thread)fail(404,'Percakapan tidak ditemukan');
 if(user.role==='customer'&&Number(thread.customer_id)!==Number(user.id))fail(403,'Akses percakapan ditolak');
 else if(user.role==='admin_toko'&&Number(thread.owner_user_id)!==Number(user.id))fail(403,'Akses percakapan ditolak');
 else if(!['customer','admin_toko'].includes(user.role))fail(403,'Akses percakapan ditolak');
 return thread;
}
export async function getThreads(user){const isCustomer=user.role==='customer';return rows(`SELECT t.*,s.name store_name,u.name customer_name, (SELECT body FROM chat_messages m WHERE m.thread_id=t.id ORDER BY m.id DESC LIMIT 1) last_message FROM chat_threads t JOIN stores s ON s.id=t.store_id JOIN users u ON u.id=t.customer_id WHERE ${isCustomer?'t.customer_id=?':'s.owner_user_id=?'} ORDER BY t.last_message_at DESC`,[user.id]);}
export async function getThread(user,storeId){
 if(user.role!=='customer')fail(403,'Hanya pembeli yang membuka chat toko');
 const s=await one('SELECT id FROM stores WHERE id=? AND status=? AND deleted_at IS NULL',[storeId,'approved']);if(!s)fail(404,'Toko tidak tersedia');
 const [result]=await db.query('INSERT INTO chat_threads(store_id,customer_id) VALUES(?,?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',[storeId,user.id]);
 return one('SELECT * FROM chat_threads WHERE id=?',[result.insertId]);
}
export async function messages(user,threadId,q){await canAccess(user,threadId);const p=pageOptions(q);const items=await rows('SELECT m.*,u.name sender_name FROM chat_messages m LEFT JOIN users u ON u.id=m.sender_id WHERE thread_id=? ORDER BY m.id DESC LIMIT ? OFFSET ?',[threadId,p.limit,p.offset]);const count=await one('SELECT COUNT(*) total FROM chat_messages WHERE thread_id=?',[threadId]);return {items:items.reverse(),pagination:pagination(count.total,p)};}
export async function sendMessage(user,threadId,body,type='text',orderId=null){
 const t=await canAccess(user,threadId);if(typeof body!=='string'||!body.trim()||body.length>1000)fail(422,'Pesan harus berisi 1 sampai 1000 karakter');
 if(!['text','product'].includes(type))fail(422,'Tipe pesan tidak valid');
 if(orderId){const order=await one('SELECT id FROM orders WHERE id=? AND store_id=? AND customer_id=?',[orderId,t.store_id,t.customer_id]);if(!order)fail(403,'Pesanan bukan milik percakapan ini');}
 const isCustomer=user.role==='customer';
 const [r]=await db.query(`INSERT INTO chat_messages(thread_id,sender_id,order_id,type,body) VALUES(?,?,?,?,?)`,[threadId,user.id,orderId,type,body.trim()]);
 await db.query(`UPDATE chat_threads SET last_message_at=NOW(),${isCustomer?'store_unread':'customer_unread'}=${isCustomer?'store_unread':'customer_unread'}+1 WHERE id=?`,[threadId]);
 return one('SELECT m.*,u.name sender_name FROM chat_messages m LEFT JOIN users u ON u.id=m.sender_id WHERE m.id=?',[r.insertId]);
}
export async function markRead(user,threadId){await canAccess(user,threadId);await db.query(`UPDATE chat_threads SET ${user.role==='customer'?'customer_unread':'store_unread'}=0 WHERE id=?`,[threadId]);await db.query('UPDATE chat_messages SET read_at=NOW() WHERE thread_id=? AND sender_id<>? AND read_at IS NULL',[threadId,user.id]);}
