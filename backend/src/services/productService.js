import {db,one,rows,tx} from '../config/db.js';
import {fail,uniqSlug,pageOptions,pagination} from '../utils/common.js';
import {saveImage} from '../utils/upload.js';
export async function storeProducts(storeId,q){const p=pageOptions(q),where=['p.store_id=?'],args=[storeId];if(q.status){where.push('p.status=?');args.push(q.status);}if(q.q){where.push('p.name LIKE ?');args.push(`%${q.q}%`);}const w=where.join(' AND ');const items=await rows(`SELECT p.*,c.name category_name,(SELECT url FROM product_images i WHERE i.product_id=p.id ORDER BY is_primary DESC,sort_order,id LIMIT 1) image_url FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE ${w} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);const count=await one(`SELECT COUNT(*) total FROM products p WHERE ${w}`,args);return {items,pagination:pagination(count.total,p)};}
export async function storeProduct(storeId,id){const p=await one('SELECT * FROM products WHERE id=? AND store_id=?',[id,storeId]);if(!p)fail(404,'Produk tidak ditemukan');p.images=await rows('SELECT * FROM product_images WHERE product_id=? ORDER BY is_primary DESC,sort_order,id',[id]);return p;}
export async function createProduct(storeId,actor,body){
 return tx(async c=>{
 const [r]=await c.query('INSERT INTO products(store_id,category_id,name,slug,description,price,compare_price,sku,stock,low_stock_threshold,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',[storeId,body.category_id,body.name,uniqSlug(body.name),body.description||'',body.price,body.compare_price||null,body.sku||null,body.stock||0,body.low_stock_threshold??5,body.status||'active']);
 if(body.stock>0)await c.query('INSERT INTO stock_movements(product_id,store_id,type,qty,balance_after,note,created_by) VALUES(?,?,?,?,?,?,?)',[r.insertId,storeId,'masuk',body.stock,body.stock,'Stok awal',actor]);
 return {id:r.insertId};
 });
}
export async function updateProduct(storeId,id,body){await storeProduct(storeId,id);const pairs=[],values=[];
 for(const k of ['name','category_id','description','price','compare_price','sku','low_stock_threshold','status'])if(Object.hasOwn(body,k)){pairs.push(`${k}=?`);values.push(body[k]);}
 if(!pairs.length)fail(422,'Tidak ada perubahan');if(body.status==='archived')pairs.push('deleted_at=NOW()');if(body.status==='active')pairs.push('deleted_at=NULL');
 await db.query(`UPDATE products SET ${pairs.join(',')} WHERE id=? AND store_id=?`,[...values,id,storeId]);return storeProduct(storeId,id);
}
export async function archiveProduct(storeId,id){await storeProduct(storeId,id);await db.query('UPDATE products SET status=?,deleted_at=NOW() WHERE id=? AND store_id=?',['archived',id,storeId]);}
export async function adjustStock(storeId,actor,id,type,qty,note){
 return tx(async c=>{
  const p=await one('SELECT * FROM products WHERE id=? AND store_id=? FOR UPDATE',[id,storeId],c);if(!p)fail(404,'Produk tidak ditemukan');
  const next=type==='masuk'?p.stock+qty:type==='kurang'?p.stock-qty:qty;
  if(next<p.reserved)fail(409,`Stok minimum ${p.reserved} karena sedang dipesan`);
  if(next<0)fail(422,'Stok tidak boleh negatif');
  await c.query('UPDATE products SET stock=? WHERE id=?',[next,id]);
  await c.query('INSERT INTO stock_movements(product_id,store_id,type,qty,balance_after,note,created_by) VALUES(?,?,?,?,?,?,?)',[id,storeId,type,next-p.stock,next,note,actor]);
  return {stock:next,reserved:p.reserved,available:next-p.reserved};
 });
}
export async function stockHistory(storeId,id,q){await storeProduct(storeId,id);const p=pageOptions(q);const items=await rows('SELECT * FROM stock_movements WHERE product_id=? AND store_id=? ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?',[id,storeId,p.limit,p.offset]);const count=await one('SELECT COUNT(*) total FROM stock_movements WHERE product_id=? AND store_id=?',[id,storeId]);return {items,pagination:pagination(count.total,p)};}
export async function addImages(storeId,id,files){await storeProduct(storeId,id);if(!files?.length)fail(422,'Pilih foto produk');
 const current=await one('SELECT COUNT(*) count FROM product_images WHERE product_id=?',[id]);if(current.count+files.length>5)fail(422,'Maksimal 5 foto per produk');
 const urls=[];for(const f of files)urls.push(await saveImage(f));
 for(let i=0;i<urls.length;i++)await db.query('INSERT INTO product_images(product_id,url,sort_order,is_primary) VALUES(?,?,?,?)',[id,urls[i],current.count+i,current.count+i===0]);
 return storeProduct(storeId,id);
}
export async function removeImage(storeId,id,imageId){await storeProduct(storeId,id);const [r]=await db.query('DELETE FROM product_images WHERE id=? AND product_id=?',[imageId,id]);if(!r.affectedRows)fail(404,'Foto tidak ditemukan');const first=await one('SELECT id FROM product_images WHERE product_id=? ORDER BY sort_order,id LIMIT 1',[id]);if(first)await db.query('UPDATE product_images SET is_primary=(id=?) WHERE product_id=?',[first.id,id]);}
export async function setPrimary(storeId,id,imageId){await storeProduct(storeId,id);const image=await one('SELECT id FROM product_images WHERE id=? AND product_id=?',[imageId,id]);if(!image)fail(404,'Foto tidak ditemukan');await db.query('UPDATE product_images SET is_primary=(id=?) WHERE product_id=?',[imageId,id]);}
