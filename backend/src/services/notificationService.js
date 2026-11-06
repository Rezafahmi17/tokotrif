import {db} from '../config/db.js';
let emitter=()=>{};
export function setNotificationEmitter(fn){emitter=fn;}
export async function notify(userId,type,title,body='',link='',c=db){
 const [result]=await c.query('INSERT INTO notifications(user_id,type,title,body,link) VALUES(?,?,?,?,?)',[userId,type,title,body,link]);
 // Emisi real-time sebaiknya dilakukan setelah commit melalui emitNotification() di service pemanggil.
 return {id:result.insertId,user_id:userId,type,title,body,link};
}
export function emitNotification(notification){if(notification)emitter(notification.user_id,notification);}
