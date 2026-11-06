import {HttpError} from '../utils/common.js';
export const validate=(schema,where='body')=>(req,res,next)=>{
 const parsed=schema.safeParse(req[where]);
 if(!parsed.success) return next(new HttpError(422,'Periksa kembali data yang dimasukkan',parsed.error.flatten().fieldErrors));
 req[where]=parsed.data;next();
};
