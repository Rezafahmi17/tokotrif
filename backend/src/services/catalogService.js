import {db,one,rows} from '../config/db.js';
import {fail,pageOptions,pagination} from '../utils/common.js';
const visible="p.status='active' AND p.deleted_at IS NULL AND s.status='approved' AND s.deleted_at IS NULL";
const base=`SELECT p.*,c.name category_name,c.slug category_slug,s.name store_name,s.slug store_slug,s.city,
 (SELECT url FROM product_images i WHERE i.product_id=p.id ORDER BY i.is_primary DESC,i.sort_order,i.id LIMIT 1) image_url,
 (p.stock-p.reserved) available,
 IF(p.compare_price>p.price,ROUND((p.compare_price-p.price)*100/p.compare_price),0) discount_pct
 FROM products p JOIN stores s ON s.id=p.store_id JOIN categories c ON c.id=p.category_id`;
export async function listProducts(q){
 const p=pageOptions(q),filters=[visible],params=[];
 if(q.q){filters.push('(p.name LIKE ? OR p.description LIKE ? OR s.name LIKE ?)');params.push(...Array(3).fill(`%${q.q}%`));}
 if(q.category){filters.push('(c.slug=? OR c.parent_id=(SELECT id FROM categories WHERE slug=? LIMIT 1))');params.push(q.category,q.category);}
 if(q.city){filters.push('s.city LIKE ?');params.push(`%${q.city}%`);}
 if(q.store){filters.push('s.slug=?');params.push(q.store);}
 if(q.minPrice&&Number(q.minPrice)>=0){filters.push('p.price>=?');params.push(Number(q.minPrice));}
 if(q.maxPrice&&Number(q.maxPrice)>=0){filters.push('p.price<=?');params.push(Number(q.maxPrice));}
 const sort={newest:'p.created_at DESC',bestseller:'p.sold_count DESC,p.created_at DESC',price_asc:'p.price ASC',price_desc:'p.price DESC',rating:'p.rating_avg DESC,p.rating_count DESC'}[q.sort]||'p.created_at DESC';
 const where=filters.join(' AND '),items=await rows(`${base} WHERE ${where} ORDER BY ${sort} LIMIT ? OFFSET ?`,[...params,p.limit,p.offset]);
 const count=await one(`SELECT COUNT(*) total FROM products p JOIN stores s ON s.id=p.store_id JOIN categories c ON c.id=p.category_id WHERE ${where}`,params);
 return {items,pagination:pagination(count.total,p)};
}
export async function product(slug){
 const p=await one(`${base} WHERE ${visible} AND p.slug=?`,[slug]);if(!p)fail(404,'Produk tidak ditemukan');
 p.images=await rows('SELECT * FROM product_images WHERE product_id=? ORDER BY is_primary DESC,sort_order,id',[p.id]);
 p.reviews=await rows('SELECT r.rating,r.comment,r.created_at,u.name customer_name FROM reviews r JOIN users u ON u.id=r.customer_id WHERE r.product_id=? ORDER BY r.created_at DESC LIMIT 20',[p.id]);
 return p;
}
export async function store(slug){
 const s=await one('SELECT id,name,slug,description,logo_url,city,address,cod_area_note,phone,created_at FROM stores WHERE slug=? AND status=? AND deleted_at IS NULL',[slug,'approved']);
 if(!s)fail(404,'Toko tidak ditemukan');s.products=await listProducts({store:slug,limit:20});return s;
}
export async function home(){
 const [banners,categories,discounts,bestsellers,recent,stats,stores]=await Promise.all([
 rows('SELECT * FROM banners WHERE is_active=1 ORDER BY placement,sort_order'),
 rows('SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order,name'),
 rows(`${base} WHERE ${visible} AND p.compare_price>p.price ORDER BY (p.compare_price-p.price) DESC LIMIT 10`),
 rows(`${base} WHERE ${visible} ORDER BY p.sold_count DESC,p.rating_avg DESC LIMIT 10`),
 rows(`${base} WHERE ${visible} ORDER BY p.created_at DESC LIMIT 10`),
 one(`SELECT (SELECT COUNT(*) FROM stores WHERE status='approved' AND deleted_at IS NULL) verified_stores,(SELECT COUNT(*) FROM orders WHERE status='completed') completed_orders,(SELECT COALESCE(ROUND(AVG(rating),1),0) FROM reviews) avg_rating`),
 rows('SELECT id,name,slug,city,logo_url FROM stores WHERE status=? AND deleted_at IS NULL ORDER BY verified_at DESC LIMIT 5',['approved'])
 ]);return {banners,categories,discounts,bestsellers,recent,stats,stores};
}
export async function categories(){return rows('SELECT * FROM categories WHERE is_active=1 ORDER BY sort_order,name');}
