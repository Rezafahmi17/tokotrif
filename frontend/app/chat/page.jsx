'use client';
import {useEffect,useRef,useState,useCallback} from 'react';
import Link from 'next/link';
import {Send,MessageCircle,ArrowLeft,Image as ImageIcon,Video,X,Clock,Search,ExternalLink,Paperclip} from 'lucide-react';
import RouteGuard from '@/components/ui/RouteGuard';
import {useAuth} from '@/context/AuthContext';
import {useToast} from '@/components/ui/Toast';
import {api,dateID,imageSrc} from '@/lib/api';

export default function Page(){
 const {user}=useAuth();
 const {show}=useToast();
 const [threads,setThreads]=useState([]);
 const [selected,setSelected]=useState(null);
 const [messages,setMessages]=useState([]);
 const [draft,setDraft]=useState('');
 const [sending,setSending]=useState(false);
 const [uploadingMedia,setUploadingMedia]=useState(false);
 const [attachment,setAttachment]=useState(null); // { url, media_type, name }
 const [searchThread,setSearchThread]=useState('');
 const [filterUnread,setFilterUnread]=useState(false);
 const [lightbox,setLightbox]=useState(null);
 const fileInputRef=useRef(null);
 const bottomRef=useRef(null);
 const isInitialLoad=useRef(true);

 const loadThreads=useCallback(async()=>{
  if(!user)return[];
  try{
   const t=await api('/chat/threads');
   setThreads(t||[]);
   return t||[];
  }catch{
   return[];
  }
 },[user]);

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

 useEffect(()=>{
  if(!selected)return;
  isInitialLoad.current=true;
  loadMessages(selected,false);
 },[selected,loadMessages]);

 useEffect(()=>{
  if(!user||!selected)return;
  const pollTimer=setInterval(()=>loadMessages(selected,true),2500);
  const threadsTimer=setInterval(()=>loadThreads(),5000);
  return()=>{
   clearInterval(pollTimer);
   clearInterval(threadsTimer);
  };
 },[user,selected,loadMessages,loadThreads]);

 useEffect(()=>{
  bottomRef.current?.scrollIntoView({behavior:isInitialLoad.current?'auto':'smooth'});
  if(messages.length)isInitialLoad.current=false;
 },[messages.length]);

 const handleFileSelect=async e=>{
  const file=e.target.files?.[0];
  e.target.value='';
  if(!file)return;
  setUploadingMedia(true);
  try{
   const fd=new FormData();
   fd.append('file',file);
   const res=await api('/chat/upload',{method:'POST',body:fd});
   setAttachment({url:res.url,media_type:res.media_type,name:file.name});
   show(res.media_type==='video'?'Video siap dikirim':'Foto siap dikirim');
  }catch(err){
   show(err.message||'Gagal mengunggah media','error');
  }finally{
   setUploadingMedia(false);
  }
 };

 const send=async e=>{
  e.preventDefault();
  if((!draft.trim()&&!attachment)||!selected||sending||uploadingMedia)return;
  const body=draft.trim();
  const currentAttachment=attachment;
  setDraft('');
  setAttachment(null);
  setSending(true);

  const tempMsg={
   id:'temp-'+Date.now(),
   thread_id:selected,
   sender_id:user.id,
   sender_name:user.name,
   type:currentAttachment?currentAttachment.media_type:'text',
   body:body||(currentAttachment?.media_type==='video'?'[Lampiran Video]':currentAttachment?.media_type==='image'?'[Lampiran Foto]':''),
   media_url:currentAttachment?.url||null,
   media_type:currentAttachment?.media_type||null,
   created_at:new Date().toISOString()
  };
  setMessages(prev=>[...prev,tempMsg]);

  try{
   const saved=await api(`/chat/threads/${selected}/messages`,{
    method:'POST',
    body:{
     body,
     type:currentAttachment?currentAttachment.media_type:'text',
     media_url:currentAttachment?.url||null,
     media_type:currentAttachment?.media_type||null
    }
   });
   setMessages(prev=>prev.map(m=>m.id===tempMsg.id?saved:m));
   loadThreads();
  }catch(err){
   setMessages(prev=>prev.filter(m=>m.id!==tempMsg.id));
   show(err.message||'Gagal mengirim pesan','error');
  }finally{
   setSending(false);
  }
 };

 const current=threads.find(t=>Number(t.id)===Number(selected));
 const chatPartnerName=user?.role==='customer'?current?.store_name:current?.customer_name;
 const initial=(chatPartnerName||'K').charAt(0).toUpperCase();

 const filteredThreads=threads.filter(t=>{
  const name=(user?.role==='customer'?t.store_name:t.customer_name)||'';
  const msg=t.last_message||'';
  const unread=(user?.role==='customer'?t.customer_unread:t.store_unread)>0;
  if(filterUnread&&!unread)return false;
  if(searchThread.trim()){
   const q=searchThread.toLowerCase();
   return name.toLowerCase().includes(q)||msg.toLowerCase().includes(q);
  }
  return true;
 });

 return (
  <RouteGuard roles={['customer','admin_toko']}>
   <div className="container page-space chat-container">
    <div className="page-heading">
     <h1>Riwayat Chat & Diskusi COD</h1>
     <p>Kirim pesan, foto, atau video kondisi barang, lalu sepakati lokasi dan waktu bertemu COD di kampus.</p>
    </div>

    <div className="message-layout">
     {/* Left: Thread History List */}
     <aside className={`thread-list ${selected?'mobile-hidden':''}`}>
      <div className="thread-list-header" style={{flexDirection:'column',alignItems:'stretch',gap:10}}>
       <div className="between">
        <h3>Riwayat Percakapan</h3>
        <span className="muted text-xs">{threads.length} percakapan</span>
       </div>
       <div style={{position:'relative'}}>
        <Search size={14} style={{position:'absolute',left:11,top:'50%',transform:'translateY(-50%)',color:'#94a3b8'}}/>
        <input
         value={searchThread}
         onChange={e=>setSearchThread(e.target.value)}
         placeholder="Cari nama toko / pesan..."
         style={{width:'100%',height:34,padding:'0 12px 0 32px',borderRadius:8,border:'1px solid #e2e8f0',fontSize:12,background:'#f8fafc'}}
        />
       </div>
       <div style={{display:'flex',gap:6}}>
        <button
         type="button"
         onClick={()=>setFilterUnread(false)}
         style={{flex:1,padding:'4px 8px',fontSize:11,fontWeight:700,borderRadius:6,background:!filterUnread?'#1669e8':'#f1f5f9',color:!filterUnread?'#fff':'#475569'}}
        >
         Semua ({threads.length})
        </button>
        <button
         type="button"
         onClick={()=>setFilterUnread(true)}
         style={{flex:1,padding:'4px 8px',fontSize:11,fontWeight:700,borderRadius:6,background:filterUnread?'#1669e8':'#f1f5f9',color:filterUnread?'#fff':'#475569'}}
        >
         Belum Dibaca ({threads.filter(t=>(user?.role==='customer'?t.customer_unread:t.store_unread)>0).length})
        </button>
       </div>
      </div>

      <div className="thread-list-scroll">
       {filteredThreads.length?filteredThreads.map(t=>{
        const name=user?.role==='customer'?t.store_name:t.customer_name;
        const unreadCount=Number(user?.role==='customer'?t.customer_unread:t.store_unread||0);
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
            {unreadCount>0&&(
             <span className="thread-badge">{unreadCount} baru</span>
            )}
           </div>
           <span className="thread-preview">{t.last_message||'Mulai percakapan...'}</span>
           {t.last_message_at&&(
            <small style={{fontSize:10,color:'#94a3b8',display:'block',marginTop:2}}>
             {dateID(t.last_message_at)}
            </small>
           )}
          </div>
         </button>
        );
       }):(
        <div style={{padding:'40px 16px',textAlign:'center'}}>
         <MessageCircle size={38} color="#94a3b8" style={{margin:'0 auto 10px'}}/>
         <p style={{fontSize:13,color:'#64748b',fontWeight:600}}>Belum ada riwayat chat.</p>
         <small style={{fontSize:11,color:'#94a3b8'}}>Buka halaman produk dan tekan tombol <b>Chat</b> untuk berdiskusi dengan penjual.</small>
        </div>
       )}
      </div>
     </aside>

     {/* Right: Active Chat Window */}
     <main className={`chat-window ${!selected?'mobile-hidden':''}`}>
      {selected?(
       <>
        <div className="chat-header">
         <div className="chat-header-info">
          <button className="chat-back-btn" onClick={()=>setSelected(null)} title="Kembali ke riwayat chat">
           <ArrowLeft size={16}/> Kembali
          </button>
          <div className="thread-avatar" style={{width:38,height:38,fontSize:14}}>
           {initial}
          </div>
          <div>
           <div className="chat-header-name">{chatPartnerName}</div>
           <span className="chat-header-status">
            <span className="chat-header-dot"/> {user?.role==='customer'?`Toko Kampus ${current?.store_city?`• ${current.store_city}`:''}`:'Pembeli Mahasiswa'}
           </span>
          </div>
         </div>
         {user?.role==='customer'&&current?.store_slug&&(
          <Link href={`/toko/${current.store_slug}`} className="btn btn-outline" style={{minHeight:32,padding:'4px 10px',fontSize:12}}>
           Lihat Toko <ExternalLink size={13}/>
          </Link>
         )}
        </div>

        <div className="chat-scroll">
         {messages.length?(
          messages.map(m=>{
           const isMine=Number(m.sender_id)===Number(user?.id);
           const isSys=m.type==='system'||!m.sender_id;
           const mediaUrl=m.media_url?imageSrc(m.media_url):null;
           const isVideo=m.media_type==='video'||m.type==='video';
           const isImage=(m.media_type==='image'||m.type==='image')&&mediaUrl;

           return (
            <div
             key={m.id}
             className={`chat-bubble ${isSys?'system':isMine?'mine':''}`}
            >
             {isImage&&(
              <div className="chat-media-wrap" onClick={()=>setLightbox(mediaUrl)}>
               <img src={mediaUrl} alt="Lampiran Foto Chat" className="chat-media-img"/>
              </div>
             )}
             {isVideo&&mediaUrl&&(
              <div className="chat-media-wrap">
               <video src={mediaUrl} controls playsInline preload="metadata" className="chat-media-video"/>
              </div>
             )}
             {m.body&&!(mediaUrl&&(m.body==='[Lampiran Foto]'||m.body==='[Lampiran Video]'||m.body==='📷 Mengirim foto'||m.body==='🎥 Mengirim video'))&&(
              <p>{m.body}</p>
             )}
             <small>{dateID(m.created_at)}</small>
            </div>
           );
          })
         ):(
          <div style={{padding:'60px 20px',textAlign:'center'}}>
           <Clock size={36} color="#94a3b8" style={{margin:'0 auto 8px'}}/>
           <p style={{color:'#64748b',fontWeight:600}}>Belum ada pesan dalam percakapan ini.</p>
           <small style={{color:'#94a3b8'}}>Kirim pesan, foto, atau video untuk menyepakati lokasi dan waktu COD!</small>
          </div>
         )}
         <div ref={bottomRef}/>
        </div>

        {attachment&&(
         <div className="chat-attachment-preview">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
           {attachment.media_type==='video'?(
            <video src={imageSrc(attachment.url)} style={{width:72,height:52,objectFit:'cover',borderRadius:6,background:'#000'}}/>
           ):(
            <img src={imageSrc(attachment.url)} alt="Preview" style={{width:56,height:56,objectFit:'cover',borderRadius:6}}/>
           )}
           <div>
            <b style={{fontSize:12,color:'#0f172a',display:'flex',alignItems:'center',gap:5}}>
             {attachment.media_type==='video'?<><Video size={14} color="#1669e8"/> Video siap dikirim</>:<><ImageIcon size={14} color="#1669e8"/> Foto siap dikirim</>}
            </b>
            <small className="muted text-xs">{attachment.name}</small>
           </div>
          </div>
          <button
           type="button"
           onClick={()=>setAttachment(null)}
           style={{width:28,height:28,borderRadius:'50%',background:'#fee2e2',color:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center'}}
           title="Batalkan lampiran"
          >
           <X size={15}/>
          </button>
         </div>
        )}

        <form className="chat-send" onSubmit={send}>
         <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
          style={{display:'none'}}
          onChange={handleFileSelect}
         />
         <button
          type="button"
          className="chat-attach-btn"
          onClick={()=>fileInputRef.current?.click()}
          disabled={uploadingMedia||sending}
          title="Kirim Foto atau Video"
         >
          <ImageIcon size={19}/>
         </button>
         <input
          aria-label="Isi pesan chat"
          value={draft}
          maxLength={1000}
          onChange={e=>setDraft(e.target.value)}
          placeholder={uploadingMedia?'Mengunggah foto/video...':'Tulis pesan atau kirim foto/video kondisi barang...'}
          autoFocus
         />
         <button type="submit" className="chat-submit-btn" disabled={(!draft.trim()&&!attachment)||sending||uploadingMedia} title="Kirim pesan">
          <Send size={18}/>
         </button>
        </form>
       </>
      ):(
       <div className="chat-empty-state">
        <MessageCircle size={54} color="#94a3b8"/>
        <h3 style={{fontSize:17,fontWeight:700,color:'#0f172a'}}>Pilih Riwayat Percakapan</h3>
        <p style={{fontSize:13,maxWidth:340,color:'#64748b'}}>
         Pilih salah satu kontak di sebelah kiri untuk melihat riwayat obrolan, mengirim foto atau video barang, dan menyepakati COD.
        </p>
       </div>
      )}
     </main>
    </div>

    {lightbox&&(
     <div className="lightbox-overlay" onClick={()=>setLightbox(null)}>
      <div className="lightbox-content" onClick={e=>e.stopPropagation()}>
       <button className="lightbox-close" onClick={()=>setLightbox(null)}><X size={20}/></button>
       <img src={lightbox} alt="Pratinjau Penuh"/>
      </div>
     </div>
    )}
   </div>
  </RouteGuard>
 );
}
