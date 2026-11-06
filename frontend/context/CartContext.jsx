'use client';
import {createContext,useCallback,useContext,useEffect,useState} from 'react';
import {api} from '@/lib/api';import {useAuth} from './AuthContext';
const C=createContext(null);
export function CartProvider({children}){const {user}=useAuth();const [count,setCount]=useState(0);
 const refresh=useCallback(async()=>{if(user?.role==='customer'){try{setCount((await api('/cart')).count);}catch{setCount(0);}}else setCount(0);},[user?.id,user?.role]);
 useEffect(()=>{refresh();},[refresh]);return <C.Provider value={{count,refresh}}>{children}</C.Provider>;}
export const useCart=()=>useContext(C);
