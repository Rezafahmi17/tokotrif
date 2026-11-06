import {db} from '../config/db.js';
export async function writeAudit(actor,action,targetType,targetId,meta={},ip='',c=db){
 await c.query('INSERT INTO audit_logs (actor_user_id,action,target_type,target_id,meta,ip_address) VALUES (?,?,?,?,?,?)',[actor,action,targetType,targetId,JSON.stringify(meta),ip]);
}
