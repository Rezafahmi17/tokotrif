'use client';
import {createContext,useContext,useState} from 'react';import {CheckCircle2,XCircle,X} from 'lucide-react';
const Context=createContext(null);export function ToastProvider({children}){const [toast,setToast]=useState(null);
 const show=(message,type='success')=>{setToast({message,type});setTimeout(()=>setToast(null),4500);};
 return <Context.Provider value={{show}}>{children}{toast&&<div role="status" className={`toast ${toast.type==='error'?'toast-error':''}`}>{toast.type==='error'?<XCircle size={19}/>:<CheckCircle2 size={19}/>}<span>{toast.message}</span><button onClick={()=>setToast(null)} aria-label="Tutup"><X size={16}/></button></div>}</Context.Provider>;}
export const useToast=()=>useContext(Context);
