'use client';
import {useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/context/AuthContext';

export default function RouteGuard({roles,children,approved=false,allowSuspended=false}){
 const {user,loading}=useAuth(),router=useRouter();
 const storeStatus=user?.store?.status;
 const isAllowedStore=!approved||storeStatus==='approved'||(allowSuspended&&storeStatus==='suspended');

 useEffect(()=>{
  if(loading)return;
  if(!user)router.replace('/masuk');
  else if(!roles.includes(user.role))router.replace('/');
  else if(!isAllowedStore){
   if(storeStatus==='suspended')router.replace('/admin-toko/komisi');
   else router.replace('/menunggu-verifikasi');
  }
 },[user,loading,router,isAllowedStore,storeStatus,roles.join(',')]);

 if(loading)return <div className="container page-space muted">Memeriksa sesi...</div>;
 if(!user||!roles.includes(user.role)||!isAllowedStore)return null;
 return children;
}
