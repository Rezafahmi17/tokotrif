-- DEMO SAJA. Impor setelah schema.sql dan seed.sql.
-- sandi seluruh akun demo: DemoCOD123! ; jangan gunakan di produksi.
USE marketplace_cod;
INSERT INTO users(role,name,email,password_hash,phone) VALUES
('admin_toko','Dina Setiawati','toko.satu@demo.local','$2y$12$j26b3RLYuf7O2PGuVjTm7.I6PaGhHha0f0TdRh.GTiD9Zy5qazV/W','081111111111'),
('admin_toko','Raka Pratama','toko.dua@demo.local','$2y$12$j26b3RLYuf7O2PGuVjTm7.I6PaGhHha0f0TdRh.GTiD9Zy5qazV/W','082222222222'),
('customer','Pelanggan Demo','pembeli@demo.local','$2y$12$j26b3RLYuf7O2PGuVjTm7.I6PaGhHha0f0TdRh.GTiD9Zy5qazV/W','083333333333')
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO stores(owner_user_id,name,slug,description,city,address,cod_area_note,phone,status,verified_at,last_active_at)
VALUES
((SELECT id FROM users WHERE email='toko.satu@demo.local'),'Ruang Pilihan','ruang-pilihan','Koleksi pilihan untuk kebutuhan sehari-hari dan gaya hidup.','Bandar Lampung','Jl. Zainal Abidin Pagar Alam, Bandar Lampung','COD area Bandar Lampung','081111111111','approved',NOW(),NOW()),
((SELECT id FROM users WHERE email='toko.dua@demo.local'),'Gadget Lokal','gadget-lokal','Gawai dan aksesori elektronik untuk produktivitas.','Metro','Jl. Ahmad Yani, Kota Metro','COD area Metro','082222222222','approved',NOW(),NOW())
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO products(store_id,category_id,name,slug,description,price,compare_price,stock,sold_count,status)
VALUES
((SELECT id FROM stores WHERE slug='ruang-pilihan'),(SELECT id FROM categories WHERE slug='fashion'),'Hoodie Fleece Premium','hoodie-fleece-premium','Hoodie unisex dengan bahan fleece tebal dan nyaman.',159000,210000,24,18,'active'),
((SELECT id FROM stores WHERE slug='ruang-pilihan'),(SELECT id FROM categories WHERE slug='fashion'),'Tas Kanvas Minimalis','tas-kanvas-minimalis','Tas kanvas untuk kuliah dan aktivitas sehari-hari.',89000,115000,20,24,'active'),
((SELECT id FROM stores WHERE slug='ruang-pilihan'),(SELECT id FROM categories WHERE slug='rumah-dan-dapur'),'Botol Minum Stainless 750ml','botol-minum-stainless-750ml','Botol minum stainless untuk dibawa ke mana saja.',99000,129000,35,10,'active'),
((SELECT id FROM stores WHERE slug='ruang-pilihan'),(SELECT id FROM categories WHERE slug='olahraga'),'Matras Yoga Travel','matras-yoga-travel','Matras portabel antiselip untuk olahraga di rumah.',119000,149000,15,11,'active'),
((SELECT id FROM stores WHERE slug='ruang-pilihan'),(SELECT id FROM categories WHERE slug='kecantikan'),'Pouch Kosmetik Multifungsi','pouch-kosmetik-multifungsi','Pouch serbaguna untuk makeup dan perlengkapan kecil.',49000,70000,30,13,'active'),
((SELECT id FROM stores WHERE slug='gadget-lokal'),(SELECT id FROM categories WHERE slug='elektronik'),'Headset Bluetooth Stereo','headset-bluetooth-stereo','Headset nirkabel nyaman untuk panggilan dan musik.',179000,249000,12,29,'active'),
((SELECT id FROM stores WHERE slug='gadget-lokal'),(SELECT id FROM categories WHERE slug='elektronik'),'Keyboard Mekanikal Compact','keyboard-mekanikal-compact','Keyboard compact dengan switch tactile untuk mengetik.',349000,420000,10,15,'active'),
((SELECT id FROM stores WHERE slug='gadget-lokal'),(SELECT id FROM categories WHERE slug='elektronik'),'Mouse Wireless Ergonomis','mouse-wireless-ergonomis','Mouse wireless nyaman untuk laptop dan PC.',109000,139000,18,22,'active'),
((SELECT id FROM stores WHERE slug='gadget-lokal'),(SELECT id FROM categories WHERE slug='elektronik'),'Lampu Meja LED Fleksibel','lampu-meja-led-fleksibel','Lampu baca LED dengan tiga tingkat kecerahan.',79000,110000,27,14,'active'),
((SELECT id FROM stores WHERE slug='gadget-lokal'),(SELECT id FROM categories WHERE slug='elektronik'),'USB Hub Type-C 5-in-1','usb-hub-type-c-5-in-1','Hub USB-C untuk berbagai perangkat.',189000,235000,11,9,'active')
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO banners(title,subtitle,cta_label,cta_link,placement,sort_order)
SELECT 'Temukan favorit barumu','Produk dari toko lokal terverifikasi, bayar tunai saat bertemu.','Lihat koleksi','/cari','hero',2
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE title='Temukan favorit barumu');
INSERT INTO banners(title,subtitle,cta_label,cta_link,placement,sort_order)
SELECT 'Pilihan buat harimu','Belanja dari penjual terdekat di kota pilihanmu.','Lihat toko','/cari','promo',1
WHERE NOT EXISTS (SELECT 1 FROM banners WHERE title='Pilihan buat harimu');
