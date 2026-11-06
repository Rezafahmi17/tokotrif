'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Store } from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Elements';
import { api } from '@/lib/api';

export default function Page() {
    const { user, refresh } = useAuth(), { show } = useToast(), [pwd, setPwd] = useState({ oldPassword: '', newPassword: '' }), [email, setEmail] = useState({ oldPassword: '', email: '' }), [busy, setBusy] = useState(false);
    const save = async (type, data) => { setBusy(true); try { await api(`/auth/${type}`, { method: 'PATCH', body: data }); show('Pengaturan akun berhasil diperbarui'); await refresh(); setPwd({ oldPassword: '', newPassword: '' }); setEmail({ oldPassword: '', email: '' }); } catch (e) { show(e.message, 'error'); } finally { setBusy(false); } };
    return (
        <RouteGuard roles={['customer', 'admin_toko', 'super_admin']}>
            <div className="container page-space" style={{ maxWidth: 800 }}>
                <div className="page-heading">
                    <h1>Pengaturan akun</h1>
                    <p>{user?.name} · {user?.email} <span className="badge" style={{ marginLeft: 8, textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</span></p>
                </div>

                {user?.role === 'customer' && (
                    <div className="panel" style={{ marginBottom: 24, background: '#f0fdf4', borderColor: '#bbf7d0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#166534', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Store size={20} /> Ingin Mulai Berjualan di KampusBalik?
                                </h3>
                                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#15803d' }}>
                                    Buka toko Anda sekarang tanpa menunggu verifikasi. Toko langsung aktif untuk menambahkan produk dan mengelola pesanan.
                                </p>
                            </div>
                            <Link href="/daftar-toko" className="btn btn-primary" style={{ background: '#166534', borderColor: '#166534' }}>
                                Buka Toko Sekarang
                            </Link>
                        </div>
                    </div>
                )}

                {user?.role === 'admin_toko' && (
                    <div className="panel" style={{ marginBottom: 24, background: '#eff6ff', borderColor: '#bfdbfe' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                            <div>
                                <h3 style={{ margin: 0, color: '#1e40af', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Store size={20} /> Toko Anda: {user.store?.name || 'Aktif'}
                                </h3>
                                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#1d4ed8' }}>
                                    Kelola katalog produk, stok, pesanan pembeli, dan keuangan toko Anda.
                                </p>
                            </div>
                            <Link href="/admin-toko" className="btn btn-primary">
                                Masuk Dashboard Toko
                            </Link>
                        </div>
                    </div>
                )}

                <div className="form-row">
                    <form className="panel" onSubmit={e => { e.preventDefault(); save('password', pwd); }}>
                        <h3 style={{ marginBottom: 20 }}>Ubah kata sandi</h3>
                        <div className="form-field"><label>Sandi lama</label><input type="password" value={pwd.oldPassword} required onChange={e => setPwd({ ...pwd, oldPassword: e.target.value })} /></div>
                        <div className="form-field"><label>Sandi baru (min. 8 karakter)</label><input type="password" minLength={8} value={pwd.newPassword} required onChange={e => setPwd({ ...pwd, newPassword: e.target.value })} /></div>
                        <Button loading={busy}>Simpan sandi</Button>
                    </form>
                    <form className="panel" onSubmit={e => { e.preventDefault(); save('email', email); }}>
                        <h3 style={{ marginBottom: 20 }}>Ubah alamat email</h3>
                        <div className="form-field"><label>Email baru</label><input type="email" value={email.email} required onChange={e => setEmail({ ...email, email: e.target.value })} /></div>
                        <div className="form-field"><label>Konfirmasi sandi lama</label><input type="password" value={email.oldPassword} required onChange={e => setEmail({ ...email, oldPassword: e.target.value })} /></div>
                        <Button loading={busy}>Simpan email</Button>
                    </form>
                </div>
            </div>
        </RouteGuard>
    );
}
