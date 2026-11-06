import crypto from 'node:crypto';
export class HttpError extends Error{constructor(status,message,errors){super(message);this.status=status;this.errors=errors;}}
export const fail=(status,message,errors)=>{throw new HttpError(status,message,errors);};
export const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
export const ok=(res,data=null,message='Berhasil',status=200)=>res.status(status).json({success:true,data,message});
export const slugify=s=>(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'item';
export const uniqSlug=s=>`${slugify(s)}-${crypto.randomBytes(3).toString('hex')}`;
export const pageOptions=q=>{const page=Math.max(1,Math.min(10000,Number.parseInt(q.page)||1)),limit=Math.max(1,Math.min(60,Number.parseInt(q.limit)||12));return {page,limit,offset:(page-1)*limit};};
export const pagination=(total,{page,limit})=>({page,limit,total,pages:Math.ceil(total/limit)});
export const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');
