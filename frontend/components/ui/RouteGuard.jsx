'use client';
import {useEffect} from 'react';import {useRouter} from 'next/navigation';import {useAuth} from '@/context/AuthContext';
export default function RouteGuard({roles,children,approved=false}){const {user,loading}=useAuth(),router=useRouter();
 useEffect(()=>{if(loading)return;if(!user)router.replace('/masuk');else if(!roles.includes(user.role))router.replace('/');else if(approved&&user?.store?.status!=='approved')router.replace('/menunggu-verifikasi');},[user,loading,router,approved,roles.join(',')]);
 if(loading)return <div className="container page-space muted">Memeriksa sesi...</div>;
 if(!user||!roles.includes(user.role)||(approved&&user.store?.status!=='approved'))return null;
 return children;
}
