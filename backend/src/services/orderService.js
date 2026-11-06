import {db,one,rows,tx} from '../config/db.js';
import {fail,pageOptions,pagination} from '../utils/common.js';
import {assertTransition} from './orderStateMachine.js';
import {notify,emitNotification} from './notificationService.js';
const notifyItems=[];
async function history(c,id,from,to,actor,note=''){await c.query('INSERT INTO order_status_history(order_id,from_status,to_status,actor_user_id,note) VALUES(?,?,?,?,?)',[id,from,to,actor,note]);}
async function getWithDetails(order){if(!order)fail(404,'Pesanan tidak ditemukan');
 order.items=await rows('SELECT * FROM order_items WHERE order_id=?',[order.id]);
 order.history=await rows('SELECT h.*,u.name actor_name FROM order_status_history h LEFT JOIN users u ON u.id=h.actor_user_id WHERE h.order_id=? ORDER BY h.id',[order.id]);return order;}
export async function checkout(customerId,customerNote=''){
 const notifications=[];
 const result=await tx(async c=>{
 const items=await rows(`SELECT ci.id cart_id,ci.qty,p.id product_id,p.store_id,p.name,p.price,p.stock,p.reserved,p.status,p.deleted_at,s.status store_status,s.deleted_at store_deleted,s.owner_user_id,
 (SELECT url FROM product_images i WHERE i.product_id=p.id ORDER BY is_primary DESC,sort_order LIMIT 1) image_url
 FROM cart_items ci JOIN products p ON p.id=ci.product_id JOIN stores s ON s.id=p.store_id WHERE ci.user_id=? ORDER BY p.id FOR UPDATE`,[customerId],c);
 if(!items.length)fail(422,'Keranjang masih kosong');
 const groups=new Map();
 for(const item of items){
 if(item.store_status!=='approved'||item.store_deleted||item.status!=='active'||item.deleted_at)fail(409,`${item.name} sudah tidak tersedia`);
 if(item.qty>item.stock-item.reserved)fail(409,`Stok ${item.name} tidak mencukupi`);
 if(!groups.has(item.store_id))groups.set(item.store_id,[]);groups.get(item.store_id).push(item);
 }
 const output=[];
 for(const [storeId,products] of groups){
  const subtotal=Number(products.reduce((sum,p)=>sum+Number(p.price)*p.qty,0).toFixed(2));
  const [r]=await c.query('INSERT INTO orders(customer_id,store_id,subtotal,total,customer_note) VALUES(?,?,?,?,?)',[customerId,storeId,subtotal,subtotal,customerNote||null]);
  const [dateRow]=await c.query("SELECT DATE_FORMAT(NOW(),'%Y%m%d') AS d");
  const code=`INV-${dateRow[0].d}-${String(r.insertId).padStart(4,'0')}`;
  await c.query('UPDATE orders SET code=? WHERE id=?',[code,r.insertId]);
  for(const product of products){
   await c.query('UPDATE products SET reserved=reserved+? WHERE id=?',[product.qty,product.product_id]);
   await c.query('INSERT INTO order_items(order_id,product_id,product_name,unit_price,qty,line_total,image_url) VALUES(?,?,?,?,?,?,?)',[r.insertId,product.product_id,product.name,product.price,product.qty,Number((product.price*product.qty).toFixed(2)),product.image_url]);
   await c.query('DELETE FROM cart_items WHERE id=? AND user_id=?',[product.cart_id,customerId]);
  }
  await history(c,r.insertId,null,'pending',customerId,'Pesanan dibuat, menunggu konfirmasi toko');
  await c.query('UPDATE stores SET last_active_at=NOW() WHERE id=?',[storeId]);
  await c.query('INSERT INTO chat_threads(store_id,customer_id,last_message_at) VALUES(?,?,NOW()) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),last_message_at=NOW()',[storeId,customerId]);
  const [threadRows]=await c.query('SELECT id FROM chat_threads WHERE store_id=? AND customer_id=?',[storeId,customerId]);
  await c.query('INSERT INTO chat_messages(thread_id,sender_id,order_id,type,body) VALUES(?,NULL,?,\'system\',?)',[threadRows[0].id,r.insertId,`Pesanan ${code} dibuat. Silakan sepakati lokasi dan jadwal COD.`]);
  const n=await notify(products[0].owner_user_id,'new_order','Pesanan baru',`Pesanan ${code} menunggu konfirmasi`,'/admin-toko/pesanan',c);notifications.push(n);
  output.push({id:r.insertId,code,total:subtotal,store_id:storeId});
 }
 return output;
 });notifications.forEach(emitNotification);return result;
}
export async function listOrders(customerId,q){const p=pageOptions(q),where=['o.customer_id=?'],args=[customerId];if(q.status){where.push('o.status=?');args.push(q.status);}const w=where.join(' AND ');
 const items=await rows(`SELECT o.*,s.name store_name,s.slug store_slug FROM orders o JOIN stores s ON s.id=o.store_id WHERE ${w} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);const count=await one(`SELECT COUNT(*) total FROM orders o WHERE ${w}`,args);return {items,pagination:pagination(count.total,p)};}
export async function customerOrder(customerId,code){return getWithDetails(await one('SELECT o.*,s.name store_name,s.slug store_slug,s.city,s.phone store_phone FROM orders o JOIN stores s ON s.id=o.store_id WHERE o.customer_id=? AND o.code=?',[customerId,code]));}
export async function listStoreOrders(storeId,q){const p=pageOptions(q),w=['o.store_id=?'],args=[storeId];if(q.status){w.push('o.status=?');args.push(q.status);}const where=w.join(' AND ');
 const items=await rows(`SELECT o.*,u.name customer_name,u.phone customer_phone FROM orders o JOIN users u ON u.id=o.customer_id WHERE ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);const count=await one(`SELECT COUNT(*) total FROM orders o WHERE ${where}`,args);return {items,pagination:pagination(count.total,p)};}
export async function storeOrder(storeId,id){return getWithDetails(await one('SELECT o.*,u.name customer_name,u.phone customer_phone FROM orders o JOIN users u ON u.id=o.customer_id WHERE o.id=? AND o.store_id=?',[id,storeId]));}
export async function confirm(storeId,id,actor,location,meetingAt){
 const result=await tx(async c=>{
 const o=await one('SELECT * FROM orders WHERE id=? AND store_id=? FOR UPDATE',[id,storeId],c);if(!o)fail(404,'Pesanan tidak ditemukan');assertTransition(o.status,'confirm','admin_toko');
 await c.query('UPDATE orders SET status=?,meeting_location=?,meeting_at=?,confirmed_at=NOW() WHERE id=?',['confirmed',location,meetingAt,id]);
 await history(c,id,'pending','confirmed',actor,`COD disepakati di ${location} pada ${meetingAt}`);
 const notification=await notify(o.customer_id,'order_confirmed','Jadwal COD disepakati',`Lokasi: ${location}` ,`/pesanan/${o.code}`,c);
 return {status:'confirmed',notification};
 });emitNotification(result.notification);return {status:result.status};
}
export async function paid(storeId,id,actor){
 const result=await tx(async c=>{
 const o=await one('SELECT * FROM orders WHERE id=? AND store_id=? FOR UPDATE',[id,storeId],c);if(!o)fail(404,'Pesanan tidak ditemukan');assertTransition(o.status,'paid','admin_toko');
 const items=await rows('SELECT * FROM order_items WHERE order_id=? ORDER BY product_id',[id],c);
 for(const it of items){
  const p=await one('SELECT id,stock,reserved FROM products WHERE id=? FOR UPDATE',[it.product_id],c);
  if(!p||p.stock<it.qty||p.reserved<it.qty)fail(409,'Data stok pesanan tidak konsisten; transaksi dibatalkan');
  await c.query('UPDATE products SET stock=stock-?,reserved=reserved-?,sold_count=sold_count+? WHERE id=?',[it.qty,it.qty,it.qty,it.product_id]);
  await c.query('INSERT INTO stock_movements(product_id,store_id,type,qty,balance_after,note,order_id,created_by) VALUES(?,?,?,?,?,?,?,?)',[it.product_id,storeId,'penjualan',-it.qty,p.stock-it.qty,`Pembayaran ${o.code}`,id,actor]);
 }
 await c.query('INSERT INTO finance_transactions(store_id,type,category,amount,description,trx_date,order_id,created_by) VALUES(?,?,?,?,?,CURDATE(),?,?)',[storeId,'income','Penjualan COD',o.total,`Pembayaran ${o.code}`,id,actor]);
 await c.query('UPDATE orders SET status=?,paid_at=NOW() WHERE id=?',['paid',id]);
 await history(c,id,'confirmed','paid',actor,'Uang tunai diterima dan stok terjual');
 await c.query('UPDATE stores SET last_active_at=NOW() WHERE id=?',[storeId]);
 const notification=await notify(o.customer_id,'order_paid','Pembayaran dikonfirmasi',`Pesanan ${o.code} sudah lunas`,`/pesanan/${o.code}`,c);
 return {status:'paid',notification};
 });emitNotification(result.notification);return {status:result.status};
}
export async function cancel(id,role,actor,reason,storeId=null){
 if(!reason||reason.trim().length<3)fail(422,'Alasan pembatalan wajib diisi');const output=await tx(async c=>{
 const field=role==='customer'?'customer_id':'store_id';const value=role==='customer'?actor:storeId;
 const o=await one(`SELECT * FROM orders WHERE id=? AND ${field}=? FOR UPDATE`,[id,value],c);if(!o)fail(404,'Pesanan tidak ditemukan');
 assertTransition(o.status,role==='customer'?'customer_cancel':'cancel',role);
 const items=await rows('SELECT * FROM order_items WHERE order_id=? ORDER BY product_id',[id],c);
 for(const item of items){const p=await one('SELECT * FROM products WHERE id=? FOR UPDATE',[item.product_id],c);if(p.reserved<item.qty)fail(409,'Stok dipesan tidak konsisten');await c.query('UPDATE products SET reserved=reserved-? WHERE id=?',[item.qty,item.product_id]);}
 await c.query('UPDATE orders SET status=?,cancel_reason=?,cancelled_at=NOW() WHERE id=?',['cancelled',reason,id]);
 await history(c,id,o.status,'cancelled',actor,reason);
 const destination=role==='customer'?(await one('SELECT owner_user_id FROM stores WHERE id=?',[o.store_id],c)).owner_user_id:o.customer_id;
 const notification=await notify(destination,'order_cancelled','Pesanan dibatalkan',`Pesanan ${o.code}: ${reason}`,role==='customer'?'/admin-toko/pesanan':`/pesanan/${o.code}`,c);
 return {status:'cancelled',notification};
 });emitNotification(output.notification);return {status:output.status};
}
export async function customerCancel(customerId,code,reason){const o=await one('SELECT id FROM orders WHERE code=? AND customer_id=?',[code,customerId]);if(!o)fail(404,'Pesanan tidak ditemukan');return cancel(o.id,'customer',customerId,reason);}
export async function received(customerId,code){
 return tx(async c=>{const o=await one('SELECT * FROM orders WHERE code=? AND customer_id=? FOR UPDATE',[code,customerId],c);if(!o)fail(404,'Pesanan tidak ditemukan');assertTransition(o.status,'received','customer');await c.query('UPDATE orders SET status=?,completed_at=NOW() WHERE id=?',['completed',o.id]);await history(c,o.id,'paid','completed',customerId,'Barang diterima customer');return {status:'completed'};});
}
export async function addReview(customerId,code,productId,rating,comment){
 return tx(async c=>{
 const o=await one('SELECT id,status FROM orders WHERE code=? AND customer_id=? FOR UPDATE',[code,customerId],c);
 if(!o||o.status!=='completed')fail(409,'Ulasan hanya setelah pesanan selesai');
 const item=await one('SELECT product_id FROM order_items WHERE order_id=? AND product_id=?',[o.id,productId],c);if(!item)fail(404,'Produk tidak terdapat dalam pesanan');
 await c.query('INSERT INTO reviews(product_id,order_id,customer_id,rating,comment) VALUES(?,?,?,?,?)',[productId,o.id,customerId,rating,comment||null]);
 await c.query('UPDATE products SET rating_count=(SELECT COUNT(*) FROM reviews WHERE product_id=?),rating_avg=(SELECT COALESCE(AVG(rating),0) FROM reviews WHERE product_id=?) WHERE id=?',[productId,productId,productId]);return {product_id:productId};
 });
}
