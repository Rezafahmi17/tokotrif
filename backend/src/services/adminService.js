import {db,one,rows,tx} from '../config/db.js';
import {fail,pageOptions,pagination,uniqSlug} from '../utils/common.js';
import {writeAudit} from '../utils/audit.js';
import {notify,emitNotification} from './notificationService.js';
const activitySql='(COALESCE(s.last_active_at,s.created_at)<DATE_SUB(NOW(),INTERVAL ? DAY) AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.store_id=s.id AND o.created_at>=DATE_SUB(NOW(),INTERVAL ? DAY)))';
async function inactiveDays(){return Number((await one('SELECT `value` FROM settings WHERE `key`=?',['inactive_days']))?.value||30);}
export async function listStores(q){
 const p=pageOptions(q),days=await inactiveDays(),filters=['s.deleted_at IS NULL'],args=[days,days];
 if(q.status){filters.push('s.status=?');args.push(q.status);}
 if(q.q){filters.push('(s.name LIKE ? OR u.email LIKE ?)');args.push(`%${q.q}%`,`%${q.q}%`);}
 const where=filters.join(' AND ');
 const data=await rows(`SELECT s.*,u.name owner_name,u.email owner_email,${activitySql} AS isInactive,
 (SELECT COUNT(*) FROM products p WHERE p.store_id=s.id AND p.deleted_at IS NULL) product_count,
 (SELECT COUNT(*) FROM orders o WHERE o.store_id=s.id) order_count
 FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE ${where} ORDER BY FIELD(s.status,'pending','approved','rejected','suspended'),s.created_at DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);
 const count=await one(`SELECT COUNT(*) total FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE ${where}`,args.slice(2));
 return {items:data,pagination:pagination(count.total,p)};
}
export async function stats(){
 const count=await rows('SELECT status,COUNT(*) count FROM stores WHERE deleted_at IS NULL GROUP BY status');
 const days=await inactiveDays();
 const inactive=await one(`SELECT COUNT(*) count FROM stores s WHERE s.deleted_at IS NULL AND ${activitySql}`,[days,days]);
 const orders=await one('SELECT COUNT(*) total,COALESCE(SUM(status=? AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)),0) completed_30d FROM orders',['completed']);
 const customer=await one('SELECT COUNT(*) count FROM users WHERE role=? AND status=?',['customer','active']);
 return {stores:count,inactive:inactive.count,orders:orders.total,completed30d:orders.completed_30d,customers:customer.count};
}
export async function transitionStore(id,action,actor,reason,ip){
 const allowed={approve:['pending','rejected','suspended'],reject:['pending'],suspend:['approved'],reactivate:['suspended']};
 if(!allowed[action])fail(404,'Aksi tidak tersedia');
 if(['reject','suspend'].includes(action)&&!reason?.trim())fail(422,'Alasan wajib diisi');
 const output=await tx(async c=>{
  const s=await one('SELECT * FROM stores WHERE id=? AND deleted_at IS NULL FOR UPDATE',[id],c);
  if(!s)fail(404,'Toko tidak ditemukan');
  if(!allowed[action].includes(s.status))fail(409,'Perubahan status toko tidak diperbolehkan');
  const to={approve:'approved',reject:'rejected',suspend:'suspended',reactivate:'approved'}[action];
  await c.query('UPDATE stores SET status=?,rejection_reason=?,verified_by=?,verified_at=NOW() WHERE id=?',[to,reason||null,actor,id]);
  await writeAudit(actor,`store.${action}`,'store',id,{from:s.status,to,reason},ip,c);
  const n=await notify(s.owner_user_id,'store_status',`Status toko: ${to}`,reason||'Status toko telah diperbarui','/admin-toko',c);
  return {status:to,notification:n};
 });emitNotification(output.notification);return {status:output.status};
}
export async function deleteStore(id,actor,reason,confirm,ip){
 if(confirm!==true||!reason?.trim())fail(422,'Konfirmasi dan alasan wajib diisi');
 await tx(async c=>{
  const s=await one('SELECT * FROM stores WHERE id=? AND deleted_at IS NULL FOR UPDATE',[id],c);
  if(!s)fail(404,'Toko tidak ditemukan');
  const active=await one('SELECT COUNT(*) count FROM orders WHERE store_id=? AND status IN (?,?,?)',[id,'pending','confirmed','paid'],c);
  if(active.count)fail(409,'Tidak dapat menghapus toko karena masih ada pesanan aktif yang belum selesai');
  await c.query("UPDATE products SET deleted_at=NOW(),status='archived' WHERE store_id=? AND deleted_at IS NULL",[id]);
  await c.query('UPDATE stores SET deleted_at=NOW(),status=? WHERE id=?',['suspended',id]);
  await c.query("UPDATE users SET role='customer' WHERE id=?",[s.owner_user_id]);
  await writeAudit(actor,'store.delete','store',id,{reason},ip,c);
 });
}
export async function getCategories(){return rows('SELECT c.*,p.name parent_name FROM categories c LEFT JOIN categories p ON p.id=c.parent_id ORDER BY c.sort_order,c.name');}
export async function saveCategory(body,id){
 if(body.parent_id){const parent=await one('SELECT * FROM categories WHERE id=?',[body.parent_id]);if(!parent||parent.parent_id||Number(body.parent_id)===Number(id))fail(422,'Kategori induk hanya boleh satu tingkat');}
 if(id){await db.query('UPDATE categories SET name=?,icon=?,parent_id=?,sort_order=?,is_active=? WHERE id=?',[body.name,body.icon||null,body.parent_id||null,body.sort_order??0,body.is_active??true,id]);return {id};}
 const [r]=await db.query('INSERT INTO categories(name,slug,icon,parent_id,sort_order,is_active) VALUES(?,?,?,?,?,?)',[body.name,uniqSlug(body.name),body.icon||null,body.parent_id||null,body.sort_order??0,body.is_active??true]);return {id:r.insertId};
}
export async function deleteCategory(id){
 if((await one('SELECT COUNT(*) count FROM products WHERE category_id=?',[id])).count)fail(409,'Kategori dipakai produk');
 if((await one('SELECT COUNT(*) count FROM categories WHERE parent_id=?',[id])).count)fail(409,'Kategori memiliki subkategori');
 const [r]=await db.query('DELETE FROM categories WHERE id=?',[id]);if(!r.affectedRows)fail(404,'Kategori tidak ditemukan');
}
export async function getBanners(){return rows('SELECT * FROM banners ORDER BY placement,sort_order,id');}
export async function saveBanner(body,id){const values=[body.title,body.subtitle||null,body.cta_label||null,body.cta_link||'/cari',body.image_url||null,body.placement||'hero',body.sort_order??0,body.is_active??true];
 if(id){const [r]=await db.query('UPDATE banners SET title=?,subtitle=?,cta_label=?,cta_link=?,image_url=?,placement=?,sort_order=?,is_active=? WHERE id=?',[...values,id]);if(!r.affectedRows)fail(404,'Banner tidak ditemukan');return {id};}
 const [r]=await db.query('INSERT INTO banners(title,subtitle,cta_label,cta_link,image_url,placement,sort_order,is_active) VALUES(?,?,?,?,?,?,?,?)',values);return {id:r.insertId};}
export async function audit(q){const p=pageOptions(q),where=['1=1'],args=[];if(q.action){where.push('a.action LIKE ?');args.push(`%${q.action}%`);}
 const items=await rows(`SELECT a.*,u.name actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id WHERE ${where.join(' AND ')} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);const count=await one(`SELECT COUNT(*) total FROM audit_logs a WHERE ${where.join(' AND ')}`,args);return {items,pagination:pagination(count.total,p)};}
export async function settings(){return rows('SELECT * FROM settings ORDER BY `key`');}
export async function updateSettings(body){if(!Number.isInteger(body.inactive_days)||body.inactive_days<1||body.inactive_days>365)fail(422,'Batas hari harus antara 1 dan 365');await db.query('INSERT INTO settings (`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',['inactive_days',String(body.inactive_days)]);return {inactive_days:body.inactive_days};}
