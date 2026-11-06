import 'dotenv/config';
import { z } from 'zod';
const schema=z.object({
 NODE_ENV:z.enum(['development','test','production']).default('development'),
 PORT:z.coerce.number().int().positive().default(5000),
 DB_HOST:z.string().min(1),DB_PORT:z.coerce.number().int().positive().default(3306),
 DB_USER:z.string().min(1),DB_PASSWORD:z.string().default(''),DB_NAME:z.string().min(1),
 DB_SSL:z.preprocess(v=>v==='true'||v==='1'||v===true,z.boolean()).default(false),
 JWT_SECRET:z.string().min(32),CLIENT_ORIGIN:z.string().url(),UPLOAD_DIR:z.string().default('uploads'),
 SMTP_HOST:z.string().optional(),SMTP_PORT:z.coerce.number().optional(),SMTP_USER:z.string().optional(),
 SMTP_PASSWORD:z.string().optional(),SMTP_FROM:z.string().optional()
});
const parsed=schema.safeParse(process.env);
if(!parsed.success){ console.error('Konfigurasi .env belum lengkap:',parsed.error.flatten().fieldErrors);process.exit(1); }
export const env=parsed.data;
