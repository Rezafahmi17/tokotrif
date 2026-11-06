import bcrypt from 'bcryptjs';
const password=process.argv[2];
if(!password||password.length<8){console.error('Gunakan: npm run hash -- "sandi-minimal-8"');process.exit(1);}
console.log(await bcrypt.hash(password,12));
