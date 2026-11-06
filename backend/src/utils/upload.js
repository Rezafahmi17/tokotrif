import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import multer from 'multer';
import sharp from 'sharp';
import {fileTypeFromBuffer} from 'file-type';
import {env} from '../config/env.js';
import {fail} from './common.js';
export const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:2*1024*1024,files:5}});
export async function saveImage(file){
 if(!file)fail(422,'Pilih gambar terlebih dahulu');
 const actual=await fileTypeFromBuffer(file.buffer);
 if(!['image/png','image/jpeg','image/webp'].includes(actual?.mime))fail(422,'Hanya gambar JPG, PNG, atau WebP yang didukung');
 const name=crypto.randomUUID()+'.webp';
 const directory=path.resolve(process.env.VERCEL?'/tmp':process.cwd(),env.UPLOAD_DIR);await fs.mkdir(directory,{recursive:true});
 await sharp(file.buffer).rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(path.join(directory,name));
 return '/uploads/'+name;
}
