import nodemailer from 'nodemailer';
import {env} from '../config/env.js';
export async function sendReset(email,link){
 if(!env.SMTP_HOST){if(env.NODE_ENV!=='production')console.info('Link reset development:',link);else console.warn('SMTP belum dikonfigurasi: reset email tidak terkirim');return;}
 const transport=nodemailer.createTransport({host:env.SMTP_HOST,port:env.SMTP_PORT||587,secure:(env.SMTP_PORT||587)===465,auth:{user:env.SMTP_USER,pass:env.SMTP_PASSWORD}});
 await transport.sendMail({from:env.SMTP_FROM||env.SMTP_USER,to:email,subject:'Atur ulang sandi marketplace',text:`Gunakan tautan ini dalam 1 jam: ${link}`});
}
