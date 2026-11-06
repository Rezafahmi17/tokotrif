import { db, one, rows, tx } from '../config/db.js';
import { fail } from '../utils/common.js';
export async function getCart(userId) {
    const items = await rows(`SELECT ci.id,ci.product_id,ci.qty,p.name,p.price,p.stock,p.reserved,p.slug,p.status,p.store_id,s.name store_name,s.slug store_slug,s.city,s.status store_status,
 (SELECT url FROM product_images pi WHERE pi.product_id=p.id ORDER BY is_primary DESC,sort_order LIMIT 1) image_url
 FROM cart_items ci JOIN products p ON p.id=ci.product_id JOIN stores s ON s.id=p.store_id WHERE ci.user_id=? ORDER BY s.name,p.name`, [userId]);
    const grouped = new Map(); for (const item of items) { if (!grouped.has(item.store_id)) grouped.set(item.store_id, { store_id: item.store_id, store_name: item.store_name, store_slug: item.store_slug, items: [], subtotal: 0 }); const g = grouped.get(item.store_id); g.items.push({ ...item, available: item.stock - item.reserved }); g.subtotal += item.qty * item.price; }
    return { groups: [...grouped.values()], count: items.reduce((acc, x) => acc + x.qty, 0), total: items.reduce((acc, x) => acc + x.qty * x.price, 0) };
}
export async function addCart(userId, productId, qty) {
    return tx(async c => {
        const p = await one(`SELECT p.*,s.status store_status,s.deleted_at store_deleted FROM products p JOIN stores s ON s.id=p.store_id WHERE p.id=? FOR UPDATE`, [productId], c);
        if (!p || p.status !== 'active' || p.deleted_at || p.store_status !== 'approved' || p.store_deleted) fail(404, 'Produk tidak tersedia');
        const current = await one('SELECT qty FROM cart_items WHERE user_id=? AND product_id=?', [userId, productId], c); const target = (current?.qty || 0) + qty;
        if (target > p.stock - p.reserved) fail(409, 'Stok tersedia tidak mencukupi');
        await c.query('INSERT INTO cart_items(user_id,product_id,qty) VALUES(?,?,?) ON DUPLICATE KEY UPDATE qty=?', [userId, productId, target, target]); return { qty: target };
    });
}
export async function updateCart(userId, id, qty) {
    const item = await one('SELECT ci.product_id,p.stock,p.reserved FROM cart_items ci JOIN products p ON p.id=ci.product_id WHERE ci.id=? AND ci.user_id=?', [id, userId]);
    if (!item) fail(404, 'Item keranjang tidak ditemukan'); if (qty > item.stock - item.reserved) fail(409, 'Stok tersedia tidak mencukupi');
    await db.query('UPDATE cart_items SET qty=? WHERE id=? AND user_id=?', [qty, id, userId]);
}
export async function deleteCart(userId, id) { await db.query('DELETE FROM cart_items WHERE id=? AND user_id=?', [id, userId]); }
