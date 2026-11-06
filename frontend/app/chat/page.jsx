'use client';
import {useEffect,useRef,useState,useCallback} from 'react';
import {Send,MessageCircle,ArrowLeft,CheckCheck,Store,User,Clock} from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';
import {useAuth} from '@/context/AuthContext';
import {useToast} from '@/components/ui/Toast';
import {api,dateID} from '@/lib/api';

export default function Page(){
 const {user}=useAuth();
 const {show}=useToast();
 const [threads,setThreads]=useState([]);
 const [selected,setSelected]=useState(null);
 const [messages,setMessages]=useState([]);
 const [draft,setDraft]=useState('');
 const [sending,setSending]=useState(false);
 const bottomRef=useRef(null);
 const isInitialLoad=useRef(true);

 // 1. Load threads list
 const loadThreads=useCallback(async()=>{
  if(!user)return;
  try{
   const t=await api('/chat/threads');
   setThreads(t||[]);
   return t;
  }catch{
   return [];
  }
 },[user]);

 // 2. Initial load and URL param handling
 useEffect(()=>{
  if(!user)return;
  loadThreads().then(tList=>{
   const requested=new URLSearchParams(window.location.search).get('thread');
   if(requested){
    setSelected(Number(requested));
   }else if(tList?.length&&!selected&&window.innerWidth>768){
    setSelected(tList[0].id);
   }
  });
 },[user,loadThreads]);

 // 3. Load messages for selected thread
 const loadMessages=useCallback(async(threadId,silent=false)=>{
  if(!threadId)return;
  try{
   const d=await api(`/chat/threads/${threadId}/messages?limit=60`);
   const newItems=d.items||[];
   setMessages(old=>{
    if(old.length!==newItems.length||(newItems.length>0&&old[old.length-1]?.id!==newItems[newItems.length-1]?.id)){
     return newItems;
    }
    return old;
   });
   if(!silent){
    api(`/chat/threads/${threadId}/read`,{method:'PATCH'}).catch(()=>{});
   }
  }catch(e){
   if(!silent)show(e.message,'error');
  }
 },[show]);

 // 4. Thread selection change
 useEffect(()=>{
  if(!selected)return;
  isInitialLoad.current=true;
  loadMessages(selected,false);
 },[selected,loadMessages]);

 // 5. Auto-Polling for real-time updates (no manual refresh needed!)
 useEffect(()=>{
  if(!user||!selected)return;
  const pollTimer=setInterval(()=>{
   loadMessages(selected,true);
  },2500);

  const threadsTimer=setInterval(()=>{
   loadThreads();
  },5000);

  return ()=>{
   clearInterval(pollTimer);
   clearInterval(threadsTimer);
  };
 },[user,selected,loadMessages,loadThreads]);

 // 6. Auto-scroll to bottom on messages change
 useEffect(()=>{
  bottomRef.current?.scrollIntoView({behavior:isInitialLoad.current?'auto':'smooth'});
  if(messages.length)isInitialLoad.current=false;
 },[messages.length]);

 // 7. Send message
 const send=async e=>{
  e.preventDefault();
  if(!draft.trim()||!selected||sending)return;
  const body=draft.trim();
  setDraft('');
  setSending(true);

  // Optimistic UI update
  const tempMsg={
   id:'temp-'+Date.now(),
   thread_id:selected,
   sender_id:user.id,
   sender_name:user.name,
   body,
   created_at:new Date().toISOString()
  };
  setMessages(prev=>[...prev,tempMsg]);

  try{
   const saved=await api(`/chat/threads/${selected}/messages`,{method:'POST',body:{body}});
   setMessages(prev=>prev.map(m=>m.id===tempMsg.id?saved:m));
   loadThreads();
  }catch(e){
   setMessages(prev=>prev.filter(m=>m.id!==tempMsg.id));
   show(e.message||'Gagal mengirim pesan','error');
  }finally{
   setSending(false);
  }
 };

 const current=threads.find(t=>Number(t.id)===Number(selected));
 const chatPartnerName=user?.role==='customer'?current?.store_name:current?.customer_name;
 const initial=(chatPartnerName||'K').charAt(0).toUpperCase();

 return (
  <RouteGuard roles={['customer','admin_toko']}>
   <div className="container page-space chat-container">
    <div className="page-heading">
     <h1>Pusat Pesan & Chat COD</h1>
     <p>Sepakati lokasi titik temu, jadwal, dan detail transaksi COD secara langsung dan aman.</p>
    </div>

    <div className="message-layout">
     {/* Left: Thread list */}
     <aside className={`thread-list ${selected?'mobile-hidden':''}`}>
      <div className="thread-list-header">
       <h3>Percakapan</h3>
       <span className="muted text-xs">{threads.length} kontak</span>
      </div>
      <div className="thread-list-scroll">
       {threads.length?threads.map(t=>{
        const name=user?.role==='customer'?t.store_name:t.customer_name;
        const unread=(user?.role==='customer'?t.customer_unread:t.store_unread)>0;
        const isActive=Number(selected)===Number(t.id);
        const letter=(name||'K').charAt(0).toUpperCase();

        return (
         <button
          key={t.id}
          onClick={()=>setSelected(t.id)}
          className={`thread-item ${isActive?'active':''}`}
         >
          <div className="thread-avatar">{letter}</div>
          <div className="thread-content">
           <div className="thread-top">
            <span className="thread-name">{name}</span>
            {unread&&<span className="thread-badge">Pesan baru</span>}
           </div>
           <span className="thread-preview">{t.last_message||'Mulai percakapan...'}</span>
          </div>
         </button>
        );
       }):(
        <div className="p-6 text-center text-muted" style={{padding:'40px 16px',textAlign:'center'}}>
         <MessageCircle size={38} color="#94a3b8" style={{margin:'0 auto 10px'}}/>
         <p style={{fontSize:13,color:'#64748b'}}>Belum ada percakapan aktif.</p>
         <small style={{fontSize:11,color:'#94a3b8'}}>Buka rincian produk toko dan klik tombol <b>Chat Penjual</b> untuk memulai.</small>
        </div>
       )}
      </div>
     </aside>

     {/* Right: Active chat window */}
     <main className={`chat-window ${!selected?'mobile-hidden':''}`}>
      {selected?(
       <>
        <div className="chat-header">
         <div className="chat-header-info">
          <button className="chat-back-btn" onClick={()=>setSelected(null)} title="Kembali ke daftar percakapan">
           <ArrowLeft size={16}/> Kembali
          </button>
          <div className="thread-avatar" style={{width:38,height:38,fontSize:14}}>
           {initial}
          </div>
          <div>
           <div className="chat-header-name">{chatPartnerName}</div>
           <span className="chat-header-status">
            <span className="chat-header-dot"/> {user?.role==='customer'?'Penjual Terverifikasi':'Pembeli Kampus'}
           </span>
          </div>
         </div>
        </div>

        <div className="chat-scroll">
         {messages.length?(
          messages.map(m=>{
           const isMine=Number(m.sender_id)===Number(user?.id);
           const isSys=m.type==='system'||!m.sender_id;

           return (
            <div
             key={m.id}
             className={`chat-bubble ${isSys?'system':isMine?'mine':''}`}
            >
             <p>{m.body}</p>
             <small>{dateID(m.created_at)}</small>
            </div>
           );
          })
         ):(
          <div className="text-center" style={{padding:'60px 20px',textAlign:'center'}}>
           <Clock size={36} color="#94a3b8" style={{margin:'0 auto 8px'}}/>
           <p style={{color:'#64748b',fontWeight:600}}>Belum ada pesan dalam percakapan ini.</p>
           <small style={{color:'#94a3b8'}}>Kirim pesan pertama untuk menyepakati lokasi dan waktu COD!</small>
          </div>
         )}
         <div ref={bottomRef}/>
        </div>

        <form className="chat-send" onSubmit={send}>
         <input
          aria-label="Isi pesan chat"
          value={draft}
          maxLength={1000}
          onChange={e=>setDraft(e.target.value)}
          placeholder="Tulis pesan titik temu atau pertanyaan COD..."
          autoFocus
         />
         <button type="submit" disabled={!draft.trim()||sending} title="Kirim pesan">
          <Send size={18}/>
         </button>
        </form>
       </>
      ):(
       <div className="chat-empty-state">
        <MessageCircle size={54} color="#94a3b8"/>
        <h3 style={{fontSize:17,fontWeight:700,color:'#0f172a'}}>Pilih Percakapan</h3>
        <p style={{fontSize:13,maxWidth:320,color:'#64748b'}}>
         Pilih salah satu kontak di sisi kiri untuk membuka riwayat pesan dan berdiskusi COD.
        </p>
       </div>
      )}
     </main>
    </div>
   </div>
  </RouteGuard>
 );
}
