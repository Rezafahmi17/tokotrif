USE marketplace_cod;
-- AKUN DEVELOPMENT ONLY. Email: admin@marketplace.local | Sandi awal: AdminCOD123!
INSERT INTO users(role,name,email,password_hash) VALUES ('super_admin','Super Admin','admin@marketplace.local','$2y$12$u1/S9MH.tqHQKSCtvrIabOLLd/ckdS18GXes4iNT7YsUtOoMihO0i')
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO categories(name,slug,icon,sort_order) VALUES
('Elektronik','elektronik','Laptop',1),
('Rumah dan Dapur','rumah-dan-dapur','House',2),
('Fashion','fashion','Shirt',3),
('Kecantikan','kecantikan','Sparkles',4),
('Olahraga','olahraga','Dumbbell',5),
('Mainan','mainan','Gamepad2',6),
('Otomotif','otomotif','CarFront',7),
('Hewan Peliharaan','hewan-peliharaan','PawPrint',8)
ON DUPLICATE KEY UPDATE name=VALUES(name);
INSERT INTO settings (`key`,`value`) VALUES ('inactive_days','30') ON DUPLICATE KEY UPDATE `value`=VALUES(`value`);
INSERT INTO banners(title,subtitle,cta_label,cta_link,placement,sort_order)
SELECT 'Belanja dekat, bayar saat bertemu','Jelajahi produk dari toko terverifikasi di kotamu.','Mulai belanja','/cari','hero',1
WHERE NOT EXISTS(SELECT 1 FROM banners WHERE title='Belanja dekat, bayar saat bertemu');
