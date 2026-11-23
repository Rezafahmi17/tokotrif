import {db,one,rows,tx} from '../config/db.js';
import {fail,pageOptions,pagination} from '../utils/common.js';
import {writeAudit} from '../utils/audit.js';
import {notify,emitNotification} from './notificationService.js';

export async function getQrisConfig(){
 const data=await rows("SELECT `key`,`value` FROM settings WHERE `key` IN ('commission_per_item','qris_image_url','qris_merchant_name')");
 const map=Object.fromEntries(data.map(r=>[r.key,r.value]));
 return {
  commission_per_item:Number(map.commission_per_item||2000),
  qris_image_url:map.qris_image_url||null,
  qris_merchant_name:map.qris_merchant_name||'KampusBalik Official (Super Admin)'
 };
}

export async function updateQrisConfig(body){
 if(body.commission_per_item!==undefined){
  const val=Number(body.commission_per_item);
  if(Number.isNaN(val)||val<0)fail(422,'Nominal komisi per barang tidak valid');
  await db.query("INSERT INTO settings(`key`,`value`) VALUES('commission_per_item',?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)",[String(Math.round(val))]);
 }
 if(body.qris_image_url!==undefined){
  await db.query("INSERT INTO settings(`key`,`value`) VALUES('qris_image_url',?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)",[body.qris_image_url||'']);
 }
 if(body.qris_merchant_name!==undefined){
  await db.query("INSERT INTO settings(`key`,`value`) VALUES('qris_merchant_name',?) ON DUPLICATE KEY UPDATE `value`=VALUES(`value`)",[body.qris_merchant_name||'KampusBalik Official (Super Admin)']);
 }
 return getQrisConfig();
}

export async function getStoreCommissions(storeId){
 const config=await getQrisConfig();
 const store=await one('SELECT id,name,status,rejection_reason FROM stores WHERE id=?',[storeId]);
 const items=await rows(`SELECT sc.*,o.total order_total,o.paid_at order_paid_at
  FROM store_commissions sc
  LEFT JOIN orders o ON o.id=sc.order_id
  WHERE sc.store_id=?
  ORDER BY FIELD(sc.status,'unpaid','rejected','waiting_verification','paid'),sc.created_at DESC`,[storeId]);
 const summary=await one(`SELECT
  COALESCE(SUM(CASE WHEN status IN ('unpaid','rejected') THEN total_commission ELSE 0 END),0) unpaid_amount,
  COUNT(CASE WHEN status IN ('unpaid','rejected') THEN 1 END) unpaid_count,
  COALESCE(SUM(CASE WHEN status='waiting_verification' THEN total_commission ELSE 0 END),0) waiting_amount,
  COUNT(CASE WHEN status='waiting_verification' THEN 1 END) waiting_count,
  COALESCE(SUM(CASE WHEN status='paid' THEN total_commission ELSE 0 END),0) paid_amount,
  COUNT(CASE WHEN status='paid' THEN 1 END) paid_count,
  COALESCE(SUM(items_sold),0) total_items_sold
  FROM store_commissions WHERE store_id=?`,[storeId]);
 return {config,store,summary,items};
}

export async function submitCommissionPayment(storeId,actor,commissionIds,proofUrl){
 if(!proofUrl)fail(422,'Wajib mengunggah foto bukti pembayaran QRIS');
 const output=await tx(async c=>{
  let targets=[];
  if(Array.isArray(commissionIds)&&commissionIds.length>0){
   targets=await rows(`SELECT * FROM store_commissions WHERE store_id=? AND id IN (${commissionIds.map(()=>'?').join(',')}) AND status IN ('unpaid','rejected') FOR UPDATE`,[storeId,...commissionIds],c);
  }else{
   targets=await rows("SELECT * FROM store_commissions WHERE store_id=? AND status IN ('unpaid','rejected') FOR UPDATE",[storeId],c);
  }
  if(!targets.length)fail(422,'Tidak ada tagihan komisi yang perlu dibayar');
  const ids=targets.map(t=>t.id);
  await c.query(`UPDATE store_commissions SET status='waiting_verification',proof_url=?,paid_at=NOW(),rejection_reason=NULL WHERE id IN (${ids.map(()=>'?').join(',')})`,[proofUrl,...ids]);
  await c.query('UPDATE stores SET last_active_at=NOW() WHERE id=?',[storeId]);
  const admins=await rows("SELECT id FROM users WHERE role='super_admin' AND status='active'",[],c);
  const store=await one('SELECT name FROM stores WHERE id=?',[storeId],c);
  const totalPaid=targets.reduce((acc,x)=>acc+Number(x.total_commission),0);
  const notifs=[];
  for(const adm of admins){
   notifs.push(await notify(adm.id,'commission_payment',`Bukti Bayar Komisi QRIS: ${store?.name||'Toko'}`,`Pembayaran ${targets.length} tagihan komisi sebesar Rp ${totalPaid.toLocaleString('id-ID')} menunggu verifikasi.`,'/super-admin/komisi',c));
  }
  return {count:targets.length,totalPaid,notifs};
 });
 output.notifs.forEach(emitNotification);
 return {count:output.count,totalPaid:output.totalPaid};
}

export async function adminListCommissions(q){
 const config=await getQrisConfig();
 const p=pageOptions(q);
 const where=['1=1'],args=[];
 if(q.status){where.push('sc.status=?');args.push(q.status);}
 if(q.store_id){where.push('sc.store_id=?');args.push(Number(q.store_id));}
 if(q.q){where.push('(s.name LIKE ? OR sc.order_code LIKE ? OR u.name LIKE ?)');args.push(`%${q.q}%`,`%${q.q}%`,`%${q.q}%`);}
 const w=where.join(' AND ');
 const items=await rows(`SELECT sc.*,s.name store_name,s.status store_status,u.name owner_name,u.email owner_email,
  (SELECT COUNT(*) FROM store_commissions sc2 WHERE sc2.store_id=sc.store_id AND sc2.status IN ('unpaid','rejected')) store_unpaid_count
  FROM store_commissions sc
  JOIN stores s ON s.id=sc.store_id
  JOIN users u ON u.id=s.owner_user_id
  WHERE ${w}
  ORDER BY FIELD(sc.status,'waiting_verification','unpaid','rejected','paid'),sc.created_at DESC
  LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);
 const count=await one(`SELECT COUNT(*) total FROM store_commissions sc JOIN stores s ON s.id=sc.store_id JOIN users u ON u.id=s.owner_user_id WHERE ${w}`,args);
 const totals=await one(`SELECT
  COALESCE(SUM(CASE WHEN status='paid' THEN total_commission ELSE 0 END),0) total_revenue,
  COALESCE(SUM(CASE WHEN status='waiting_verification' THEN total_commission ELSE 0 END),0) waiting_revenue,
  COALESCE(SUM(CASE WHEN status IN ('unpaid','rejected') THEN total_commission ELSE 0 END),0) unpaid_revenue,
  COUNT(CASE WHEN status='waiting_verification' THEN 1 END) waiting_count,
  COUNT(CASE WHEN status IN ('unpaid','rejected') THEN 1 END) unpaid_count,
  COALESCE(SUM(CASE WHEN status='paid' THEN items_sold ELSE 0 END),0) paid_items_sold
  FROM store_commissions`);
 const delinquentStores=await rows(`SELECT s.id,s.name,s.city,s.status,s.rejection_reason,u.name owner_name,u.email owner_email,
  COUNT(sc.id) unpaid_count,SUM(sc.total_commission) unpaid_total
  FROM store_commissions sc
  JOIN stores s ON s.id=sc.store_id
  JOIN users u ON u.id=s.owner_user_id
  WHERE sc.status IN ('unpaid','rejected') AND s.deleted_at IS NULL
  GROUP BY s.id
  ORDER BY unpaid_count DESC,unpaid_total DESC`);
 return {config,totals,delinquentStores,items,pagination:pagination(count.total,p)};
}

export async function adminVerifyCommission(id,action,actor,reason,ip){
 if(!['approve','reject'].includes(action))fail(404,'Aksi tidak valid');
 if(action==='reject'&&!reason?.trim())fail(422,'Alasan penolakan bukti bayar wajib diisi');
 const output=await tx(async c=>{
  const comm=await one('SELECT * FROM store_commissions WHERE id=? FOR UPDATE',[id],c);
  if(!comm)fail(404,'Data komisi tidak ditemukan');
  const store=await one('SELECT * FROM stores WHERE id=? FOR UPDATE',[comm.store_id],c);
  if(action==='approve'){
   await c.query("UPDATE store_commissions SET status='paid',verified_at=NOW(),verified_by=?,rejection_reason=NULL WHERE id=?",[actor,id]);
   // Catat pengeluaran komisi pada keuangan toko
   const existingExp=await one("SELECT id FROM finance_transactions WHERE store_id=? AND category='Komisi QRIS Super Admin' AND description LIKE ?",[comm.store_id,`%${comm.order_code}%`],c);
   if(!existingExp){
    await c.query(
     "INSERT INTO finance_transactions(store_id,type,category,amount,description,trx_date,created_by) VALUES(?,'expense','Komisi QRIS Super Admin',?,?,CURDATE(),?)",
     [comm.store_id,comm.total_commission,`Pembayaran Komisi QRIS Pesanan ${comm.order_code} (${comm.items_sold} barang)`,actor]
    );
   }
   // Periksa sisa tunggakan toko: jika sudah 0 (lunas semua) dan toko sedang suspended, aktifkan kembali toko!
   const rem=await one("SELECT COUNT(*) count FROM store_commissions WHERE store_id=? AND status IN ('unpaid','rejected')",[comm.store_id],c);
   let reactivated=false;
   if(Number(rem?.count||0)===0&&store?.status==='suspended'){
    await c.query("UPDATE stores SET status='approved',rejection_reason=NULL,verified_at=NOW(),verified_by=? WHERE id=?",[actor,comm.store_id]);
    reactivated=true;
   }
   await writeAudit(actor,'commission.approve','store_commission',id,{store_id:comm.store_id,amount:comm.total_commission,reactivated},ip,c);
   const n=await notify(
    store.owner_user_id,
    'commission_verified',
    reactivated?'Komisi Lunas & Akun Toko Diaktifkan Kembali!':'Pembayaran Komisi QRIS Diterima',
    reactivated
     ?`Seluruh tunggakan komisi Anda telah lunas. Akun toko ${store.name} kini telah aktif kembali dan siap digunakan!`
     :`Pembayaran komisi pesanan ${comm.order_code} sebesar Rp ${Number(comm.total_commission).toLocaleString('id-ID')} telah diverifikasi lunas.`,
    '/admin-toko/komisi',
    c
   );
   return {status:'paid',reactivated,notification:n};
  }else{
   await c.query("UPDATE store_commissions SET status='rejected',rejection_reason=?,verified_at=NOW(),verified_by=? WHERE id=?",[reason.trim(),actor,id]);
   // Cek apabila setelah ditolak jumlah unpaid/rejected >= 2, kenakan sanksi penangguhan otomatis
   const rem=await one("SELECT COUNT(*) count FROM store_commissions WHERE store_id=? AND status IN ('unpaid','rejected')",[comm.store_id],c);
   if(Number(rem?.count||0)>=2&&store?.status==='approved'){
    const sanctionReason=`Sanksi Otomatis: Menunggak pembayaran komisi QRIS sebanyak ${rem.count} kali penjualan. Harap lunasi seluruh tunggakan komisi via QRIS untuk mengaktifkan kembali akun toko.`;
    await c.query("UPDATE stores SET status='suspended',rejection_reason=? WHERE id=?",[sanctionReason,comm.store_id]);
   }
   await writeAudit(actor,'commission.reject','store_commission',id,{store_id:comm.store_id,reason},ip,c);
   const n=await notify(store.owner_user_id,'commission_rejected',`Bukti Komisi Ditolak (${comm.order_code})`,`Alasan: ${reason}. Silakan unggah bukti pembayaran QRIS yang valid.`,'/admin-toko/komisi',c);
   return {status:'rejected',reactivated:false,notification:n};
  }
 });
 emitNotification(output.notification);
 return {status:output.status,reactivated:output.reactivated};
}

export async function adminSanctionStore(storeId,sanctionType,actor,reason,ip){
 if(!['suspend','delete'].includes(sanctionType))fail(422,'Jenis sanksi tidak valid');
 const defaultReason=reason?.trim()||'Sanksi Pelanggaran: Tidak membayar komisi penjualan QRIS kepada Super Admin sebanyak 2 kali atau lebih. Lunasi seluruh tunggakan komisi untuk mengaktifkan kembali akun.';
 const output=await tx(async c=>{
  const s=await one('SELECT * FROM stores WHERE id=? AND deleted_at IS NULL FOR UPDATE',[storeId],c);
  if(!s)fail(404,'Toko tidak ditemukan');
  if(sanctionType==='suspend'){
   await c.query("UPDATE stores SET status='suspended',rejection_reason=? WHERE id=?",[defaultReason,storeId]);
   await writeAudit(actor,'store.sanction_suspend','store',storeId,{reason:defaultReason},ip,c);
   const n=await notify(s.owner_user_id,'store_sanction','Sanksi Penangguhan Akun Toko',defaultReason,'/admin-toko/komisi',c);
   return {action:'suspended',notification:n};
  }else{
   await c.query("UPDATE products SET deleted_at=NOW(),status='archived' WHERE store_id=? AND deleted_at IS NULL",[storeId]);
   await c.query("UPDATE stores SET deleted_at=NOW(),status='suspended',rejection_reason=? WHERE id=?",[defaultReason,storeId]);
   await c.query("UPDATE users SET role='customer' WHERE id=?",[s.owner_user_id]);
   await writeAudit(actor,'store.sanction_delete','store',storeId,{reason:defaultReason},ip,c);
   const n=await notify(s.owner_user_id,'store_deleted','Sanksi Penghapusan Akun Toko',`Toko ${s.name} telah dihapus karena pelanggaran tunggakan komisi: ${defaultReason}`,'/akun',c);
   return {action:'deleted',notification:n};
  }
 });
 emitNotification(output.notification);
 return {action:output.action};
}
