import mysql from 'mysql2/promise';
import { env } from './env.js';
export const db=mysql.createPool({host:env.DB_HOST,port:env.DB_PORT,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,ssl:env.DB_SSL?{minVersion:'TLSv1.2',rejectUnauthorized:true}:undefined,waitForConnections:true,connectionLimit:10,decimalNumbers:true,dateStrings:true,timezone:'+07:00',charset:'utf8mb4'});
export async function tx(handler){const c=await db.getConnection();try{await c.beginTransaction();const result=await handler(c);await c.commit();return result;}catch(e){await c.rollback();throw e;}finally{c.release();}}
export async function one(sql,args=[],c=db){const [rows]=await c.query(sql,args);return rows[0]??null;}
export async function rows(sql,args=[],c=db){const [result]=await c.query(sql,args);return result;}
