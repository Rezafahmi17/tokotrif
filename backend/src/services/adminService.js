import {db,one,rows,tx} from '../config/db.js';
import {fail,pageOptions,pagination,uniqSlug} from '../utils/common.js';
import {writeAudit} from '../utils/audit.js';
import {notify,emitNotification} from './notificationService.js';
import {ensureCommissionSchema} from './commissionService.js';

const activitySql='(COALESCE(s.last_active_at,s.created_at)<DATE_SUB(NOW(),INTERVAL ? DAY) AND NOT EXISTS(SELECT 1 FROM orders o WHERE o.store_id=s.id AND o.created_at>=DATE_SUB(NOW(),INTERVAL ? DAY)))';
async function inactiveDays(){return Number((await one('SELECT `value` FROM settings WHERE `key`=?',['inactive_days']))?.value||30);}

export async function listStores(q){
 await ensureCommissionSchema();
 const p=pageOptions(q),days=await inactiveDays(),filters=['s.deleted_at IS NULL'],args=[days,days];
 if(q.status){
  if(q.status==='pending'){
   filters.push("(s.status='pending' OR u.ktm_status='pending')");
  }else{
   filters.push('s.status=?');
   args.push(q.status);
  }
 }
 if(q.q){filters.push('(s.name LIKE ? OR u.email LIKE ? OR u.name LIKE ? OR u.nim LIKE ?)');args.push(`%${q.q}%`,`%${q.q}%`,`%${q.q}%`,`%${q.q}%`);}
 const where=filters.join(' AND ');
 const data=await rows(`SELECT s.*,
  COALESCE(s.ktm_url, u.ktm_url) AS ktm_url,
  COALESCE(s.face_url, u.face_url) AS face_url,
  COALESCE(s.last_active_at, u.last_login_at, s.created_at) AS last_active_at,
  TIMESTAMPDIFF(MINUTE, COALESCE(s.last_active_at, u.last_login_at, s.created_at), NOW()) AS minutes_ago,
  u.name owner_name,u.email owner_email,u.phone owner_phone,u.nim owner_nim,u.ktm_status owner_ktm_status,
  ${activitySql} AS isInactive,
  (SELECT COUNT(*) FROM products p WHERE p.store_id=s.id AND p.deleted_at IS NULL) product_count,
  (SELECT COUNT(*) FROM orders o WHERE o.store_id=s.id) order_count,
  (SELECT COUNT(*) FROM store_commissions sc WHERE sc.store_id=s.id AND sc.status IN ('unpaid','rejected')) unpaid_commissions_count,
  (SELECT COALESCE(SUM(sc.total_commission),0) FROM store_commissions sc WHERE sc.store_id=s.id AND sc.status IN ('unpaid','rejected')) unpaid_commissions_amount
  FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE ${where}
  ORDER BY FIELD(s.status,'pending','approved','rejected','suspended'),FIELD(u.ktm_status,'pending','verified','rejected','unsubmitted'),COALESCE(s.last_active_at,s.created_at) DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);
 const count=await one(`SELECT COUNT(*) total FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE ${where}`,args.slice(2));
 return {items:data,pagination:pagination(count.total,p)};
}

export async function listCustomerKtm(q){
 const p=pageOptions(q),filters=["u.role='customer'","u.deleted_at IS NULL"],args=[];
 if(q.status){filters.push('u.ktm_status=?');args.push(q.status);}
 else{filters.push("u.ktm_status IN ('pending','verified','rejected')");}
 if(q.q){filters.push('(u.name LIKE ? OR u.email LIKE ? OR u.nim LIKE ?)');args.push(`%${q.q}%`,`%${q.q}%`,`%${q.q}%`);}
 const where=filters.join(' AND ');
 const items=await rows(`SELECT u.id,u.name,u.email,u.phone,u.nim,u.ktm_url,u.face_url,u.ktm_status,u.ktm_rejection_reason,u.last_login_at,u.created_at
  FROM users u WHERE ${where}
  ORDER BY FIELD(u.ktm_status,'pending','verified','rejected','unsubmitted'),u.created_at DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);
 const count=await one(`SELECT COUNT(*) total FROM users u WHERE ${where}`,args);
 return {items,pagination:pagination(count.total,p)};
}

export async function verifyCustomerKtm(userId,action,actor,reason,ip){
 if(!['approve','reject'].includes(action))fail(404,'Aksi tidak valid');
 if(action==='reject'&&!reason?.trim())fail(422,'Alasan penolakan KTM wajib diisi');
 const to=action==='approve'?'verified':'rejected';
 const output=await tx(async c=>{
  const u=await one('SELECT * FROM users WHERE id=? AND deleted_at IS NULL FOR UPDATE',[userId],c);
  if(!u)fail(404,'Pengguna tidak ditemukan');
  await c.query('UPDATE users SET ktm_status=?,ktm_rejection_reason=? WHERE id=?',[to,action==='reject'?reason.trim():null,userId]);
  await writeAudit(actor,`user.ktm_${action}`,'user',userId,{from:u.ktm_status,to,reason},ip,c);
  const n=await notify(userId,'ktm_status',action==='approve'?'KTM Mahasiswa Terverifikasi':'Verifikasi KTM Ditolak',action==='approve'?'Selamat! KTM Mahasiswa Anda telah diverifikasi oleh Super Admin.':`Alasan: ${reason}`,'/akun',c);
  return {status:to,notification:n};
 });
 emitNotification(output.notification);
 return {status:output.status};
}

export async function stats(){
 const count=await rows('SELECT status,COUNT(*) count FROM stores WHERE deleted_at IS NULL GROUP BY status');
 const days=await inactiveDays();
 const inactive=await one(`SELECT COUNT(*) count FROM stores s WHERE s.deleted_at IS NULL AND ${activitySql}`,[days,days]);
 const orders=await one('SELECT COUNT(*) total,COALESCE(SUM(status=? AND created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY)),0) completed_30d FROM orders',['completed']);
 const customer=await one('SELECT COUNT(*) count FROM users WHERE role=? AND status=?',['customer','active']);
 const pendingKtm=await one("SELECT COUNT(*) count FROM users WHERE role='customer' AND ktm_status='pending' AND deleted_at IS NULL");
 const recentStores=await rows(`SELECT s.id,s.name,s.city,s.status,s.logo_url,
  COALESCE(s.last_active_at, u.last_login_at, s.created_at) AS last_active_at,
  TIMESTAMPDIFF(MINUTE, COALESCE(s.last_active_at, u.last_login_at, s.created_at), NOW()) AS minutes_ago,
  u.name owner_name,u.email owner_email,u.ktm_status owner_ktm_status
  FROM stores s JOIN users u ON u.id=s.owner_user_id WHERE s.deleted_at IS NULL
  ORDER BY COALESCE(s.last_active_at, u.last_login_at, s.created_at) DESC LIMIT 8`);
 return {stores:count,inactive:inactive.count,orders:orders.total,completed30d:orders.completed_30d,customers:customer.count,pendingKtmBuyers:pendingKtm?.count||0,recentStores};
}

export async function transitionStore(id,action,actor,reason,ip){
 const allowed={approve:['pending','rejected','suspended','approved'],reject:['pending','approved'],suspend:['approved'],reactivate:['suspended']};
 if(!allowed[action])fail(404,'Aksi tidak tersedia');
 if(['reject','suspend'].includes(action)&&!reason?.trim())fail(422,'Alasan wajib diisi');
 const output=await tx(async c=>{
  const s=await one('SELECT * FROM stores WHERE id=? AND deleted_at IS NULL FOR UPDATE',[id],c);
  if(!s)fail(404,'Toko tidak ditemukan');
  if(!allowed[action].includes(s.status))fail(409,'Perubahan status toko tidak diperbolehkan');
  if(['reactivate','approve'].includes(action)&&s.status==='suspended'){
   const unpaid=await one("SELECT COUNT(*) count,COALESCE(SUM(total_commission),0) total FROM store_commissions WHERE store_id=? AND status IN ('unpaid','rejected')",[id],c);
   if(Number(unpaid?.count||0)>0){
    fail(409,`Toko masih memiliki ${unpaid.count} tunggakan komisi QRIS sebesar Rp ${Number(unpaid.total).toLocaleString('id-ID')}. Toko wajib membayar dan melunasi komisi terlebih dahulu sebelum akun dapat diaktifkan kembali.`);
   }
  }
  const to={approve:'approved',reject:'rejected',suspend:'suspended',reactivate:'approved'}[action];
  const u=await one('SELECT id,ktm_url,face_url FROM users WHERE id=?',[s.owner_user_id],c);
  await c.query('UPDATE stores SET status=?,rejection_reason=?,verified_by=?,verified_at=NOW(),ktm_url=COALESCE(ktm_url,?),face_url=COALESCE(face_url,?) WHERE id=?',[to,reason||null,actor,u?.ktm_url||null,u?.face_url||null,id]);
  if(to==='approved'){
   await c.query("UPDATE users SET ktm_status='verified',ktm_rejection_reason=NULL,ktm_url=COALESCE(ktm_url,?),face_url=COALESCE(face_url,?) WHERE id=?",[s.ktm_url||null,s.face_url||null,s.owner_user_id]);
  }else if(to==='rejected'){
   await c.query("UPDATE users SET ktm_status='rejected',ktm_rejection_reason=? WHERE id=?",[reason||null,s.owner_user_id]);
  }
  await writeAudit(actor,`store.${action}`,'store',id,{from:s.status,to,reason},ip,c);
  const n=await notify(s.owner_user_id,'store_status',to==='approved'?'Toko & KTM Penjual Terverifikasi':`Status toko: ${to}`,reason||'Toko dan dokumen verifikasi KTM Anda telah disetujui oleh Super Admin.','/admin-toko',c);
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
export async function updateSettings(body){
 if(body.inactive_days!==undefined){
  const days=Number(body.inactive_days);
  if(!Number.isInteger(days)||days<1||days>365)fail(422,'Batas hari harus antara 1 dan 365');
  await db.query('INSERT INTO settings (`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',['inactive_days',String(days)]);
 }
 if(body.commission_per_item!==undefined){
  const comm=Number(body.commission_per_item);
  if(Number.isNaN(comm)||comm<0)fail(422,'Komisi per barang tidak valid');
  await db.query('INSERT INTO settings (`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',['commission_per_item',String(Math.round(comm))]);
 }
 if(body.qris_merchant_name!==undefined){
  await db.query('INSERT INTO settings (`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',['qris_merchant_name',String(body.qris_merchant_name||'KampusBalik Official (Super Admin)')]);
 }
 if(body.support_phone!==undefined){
  await db.query('INSERT INTO settings (`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',['support_phone',String(body.support_phone||'')]);
 }
 if(body.platform_notice!==undefined){
  await db.query('INSERT INTO settings (`key`,`value`) VALUES(?,?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)',['platform_notice',String(body.platform_notice||'')]);
 }
 return settings();
}
