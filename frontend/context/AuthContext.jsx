'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {api} from '@/lib/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{
  try{
   const u=await api('/auth/me');
   setUser(u);
   return u;
  }catch{
   setUser(null);
   if(typeof window!=='undefined')localStorage.removeItem('kb_token');
   return null;
  }finally{
   setLoading(false);
  }
 },[]);
 useEffect(()=>{refresh();},[refresh]);
 const login=async(email,password)=>{
  const res=await api('/auth/login',{method:'POST',body:{email,password}});
  if(res?.token&&typeof window!=='undefined'){
   localStorage.setItem('kb_token',res.token);
  }
  if(res?.user){
   setUser(res.user);
   return res.user;
  }
  return await refresh();
 };
 const logout=async()=>{
  try{await api('/auth/logout',{method:'POST'});}catch{}
  if(typeof window!=='undefined')localStorage.removeItem('kb_token');
  setUser(null);
  window.location.href='/';
 };
 return <AuthContext.Provider value={{user,loading,refresh,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
