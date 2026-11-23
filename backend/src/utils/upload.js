import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import multer from 'multer';
import sharp from 'sharp';
import {fileTypeFromBuffer} from 'file-type';
import {env} from '../config/env.js';
import {db} from '../config/db.js';
import {fail} from './common.js';

export const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:4*1024*1024,files:5}});
export const uploadMedia=multer({storage:multer.memoryStorage(),limits:{fileSize:15*1024*1024,files:1}});

async function persistFile(name,mime,buffer){
 try{
  const directory=path.resolve(process.env.VERCEL?'/tmp':process.cwd(),env.UPLOAD_DIR);
  await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,name),buffer);
 }catch{}
 try{
  await db.query('INSERT INTO uploaded_files (filename,mime,data) VALUES(?,?,?)',[name,mime,buffer]);
 }catch(e){
  console.error('Gagal menyimpan file ke database:',e.message);
 }
 return '/uploads/'+name;
}

export async function saveImage(file){
 if(!file)fail(422,'Pilih gambar terlebih dahulu');
 const actual=await fileTypeFromBuffer(file.buffer);
 if(!['image/png','image/jpeg','image/webp'].includes(actual?.mime))fail(422,'Hanya gambar JPG, PNG, atau WebP yang didukung');
 const name=crypto.randomUUID()+'.webp';
 const buffer=await sharp(file.buffer).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
 return persistFile(name,'image/webp',buffer);
}

export async function saveChatMedia(file){
 if(!file)fail(422,'Pilih foto atau video terlebih dahulu');
 const actual=await fileTypeFromBuffer(file.buffer);
 const mime=actual?.mime||file.mimetype||'';
 if(['image/png','image/jpeg','image/webp','image/gif'].includes(mime)){
  const name=crypto.randomUUID()+'.webp';
  const buffer=await sharp(file.buffer).rotate().resize({width:1280,height:1280,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer();
  const url=await persistFile(name,'image/webp',buffer);
  return {url,media_type:'image'};
 }
 if(['video/mp4','video/webm','video/quicktime','video/x-m4v'].includes(mime)){
  if(file.buffer.length>15*1024*1024)fail(422,'Ukuran video maksimal 15 MB');
  const ext=mime.includes('webm')?'webm':mime.includes('quicktime')?'mov':'mp4';
  const name=`${crypto.randomUUID()}.${ext}`;
  const url=await persistFile(name,mime,file.buffer);
  return {url,media_type:'video'};
 }
 fail(422,'Format tidak didukung. Gunakan foto (JPG/PNG/WebP) atau video (MP4/WebM/MOV).');
}
