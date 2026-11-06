export function errorHandler(err,req,res,next){
 const status=err.status||((err.code==='ER_DUP_ENTRY')?409:500);
 if(status>=500)console.error(`[${req.method} ${req.originalUrl}]`,err);
 return res.status(status).json({success:false,message:status===500?'Terjadi kesalahan server':err.message,errors:err.errors||undefined});
}
