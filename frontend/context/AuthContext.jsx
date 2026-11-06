'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {api} from '@/lib/api';
const AuthContext=createContext(null);
export function AuthProvider({children}){
 const [user,setUser]=useState(null),[loading,setLoading]=useState(true);
 const refresh=useCallback(async()=>{try{setUser(await api('/auth/me'));}catch{setUser(null);}finally{setLoading(false);}},[]);
 useEffect(()=>{refresh();},[refresh]);
 const login=async(email,password)=>{await api('/auth/login',{method:'POST',body:{email,password}});await refresh();};
 const logout=async()=>{await api('/auth/logout',{method:'POST'});setUser(null);window.location.href='/';};
 return <AuthContext.Provider value={{user,loading,refresh,login,logout}}>{children}</AuthContext.Provider>;
}
export const useAuth=()=>useContext(AuthContext);
