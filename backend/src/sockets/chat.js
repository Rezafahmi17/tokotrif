import jwt from 'jsonwebtoken';
import {env} from '../config/env.js';
import {one,rows} from '../config/db.js';
import {cookieName} from '../middlewares/auth.js';
import {canAccess,sendMessage,markRead} from '../services/chatService.js';
import {setNotificationEmitter} from '../services/notificationService.js';
export function setupSocket(io){
 setNotificationEmitter((userId,notification)=>io.to(`user:${userId}`).emit('notification:new',notification));
 io.use(async(socket,next)=>{
  try{
   const cookies=Object.fromEntries((socket.handshake.headers.cookie||'').split(';').filter(Boolean).map(v=>{const index=v.indexOf('=');return [v.slice(0,index).trim(),decodeURIComponent(v.slice(index+1).trim())];}));
   const payload=jwt.verify(cookies[cookieName],env.JWT_SECRET);const user=await one('SELECT id,role,name,status FROM users WHERE id=?',[payload.sub]);if(!user||user.status!=='active')throw new Error('Akun tidak aktif');socket.data.user=user;next();
  }catch{next(new Error('Sesi tidak valid'));}
 });
 io.on('connection',async socket=>{
  const user=socket.data.user;socket.join(`user:${user.id}`);
  try{
   const ts=await rows(`SELECT t.id FROM chat_threads t JOIN stores s ON s.id=t.store_id WHERE ${user.role==='customer'?'t.customer_id=?':'s.owner_user_id=?'}`,[user.id]);
   if(['customer','admin_toko'].includes(user.role))ts.forEach(t=>socket.join(`thread:${t.id}`));
  }catch(e){console.error('Socket join error:',e.message);}
  socket.on('thread:join',async({threadId}={},ack=()=>{})=>{try{await canAccess(user,threadId);socket.join(`thread:${threadId}`);ack({success:true});}catch(e){ack({success:false,message:e.message});}});
  socket.on('message:send',async({threadId,body,type,orderId}={},ack=()=>{})=>{
   try{const m=await sendMessage(user,threadId,body,type,orderId);socket.join(`thread:${threadId}`);io.to(`thread:${threadId}`).emit('message:new',m);ack({success:true,data:m});}catch(e){ack({success:false,message:e.message});}
  });
  socket.on('message:read',async({threadId}={},ack=()=>{})=>{try{await markRead(user,threadId);io.to(`thread:${threadId}`).emit('message:read',{threadId,userId:user.id});ack({success:true});}catch(e){ack({success:false,message:e.message});}});
  socket.on('typing',async({threadId,isTyping}={})=>{try{await canAccess(user,threadId);socket.to(`thread:${threadId}`).emit('typing',{threadId,userId:user.id,isTyping:!!isTyping});}catch{}});
 });
}
