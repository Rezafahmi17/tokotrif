import ExcelJS from 'exceljs';
import {db,one,rows} from '../config/db.js';
import {fail,dateValid,pageOptions,pagination} from '../utils/common.js';
const period=(q)=>{
 const from=q.from||'2000-01-01',to=q.to||'2100-01-01';
 if(!dateValid(from)||!dateValid(to)||from>to)fail(422,'Rentang tanggal tidak valid');return {from,to};
};
export async function summary(storeId,q){const {from,to}=period(q);
 const [s,series,categories,top]=await Promise.all([
 one(`SELECT COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) income,COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) expense,COUNT(DISTINCT CASE WHEN type='income' THEN order_id END) paid_orders FROM finance_transactions WHERE store_id=? AND deleted_at IS NULL AND trx_date BETWEEN ? AND ?`,[storeId,from,to]),
 rows('SELECT trx_date date,SUM(CASE WHEN type=? THEN amount ELSE 0 END) income,SUM(CASE WHEN type=? THEN amount ELSE 0 END) expense FROM finance_transactions WHERE store_id=? AND deleted_at IS NULL AND trx_date BETWEEN ? AND ? GROUP BY trx_date ORDER BY trx_date',["income","expense",storeId,from,to]),
 rows('SELECT category,SUM(amount) amount FROM finance_transactions WHERE store_id=? AND type=? AND deleted_at IS NULL AND trx_date BETWEEN ? AND ? GROUP BY category ORDER BY amount DESC',[storeId,'expense',from,to]),
 rows(`SELECT oi.product_name name,SUM(oi.qty) qty FROM finance_transactions ft JOIN order_items oi ON oi.order_id=ft.order_id WHERE ft.store_id=? AND ft.type='income' AND ft.trx_date BETWEEN ? AND ? GROUP BY oi.product_id,oi.product_name ORDER BY qty DESC LIMIT 5`,[storeId,from,to])
 ]);return {...s,profit:s.income-s.expense,series,categories,top,from,to};}
export async function transactions(storeId,q){const p=pageOptions(q),{from,to}=period(q),where=['store_id=?','deleted_at IS NULL','trx_date BETWEEN ? AND ?'],args=[storeId,from,to];if(q.type){where.push('type=?');args.push(q.type);}if(q.category){where.push('category LIKE ?');args.push(`%${q.category}%`);}const w=where.join(' AND ');const items=await rows(`SELECT * FROM finance_transactions WHERE ${w} ORDER BY trx_date DESC,id DESC LIMIT ? OFFSET ?`,[...args,p.limit,p.offset]);const count=await one(`SELECT COUNT(*) total FROM finance_transactions WHERE ${w}`,args);return {items,pagination:pagination(count.total,p)};}
export async function addExpense(storeId,actor,b){const [r]=await db.query('INSERT INTO finance_transactions(store_id,type,category,amount,description,trx_date,created_by) VALUES(?,?,?,?,?,?,?)',[storeId,'expense',b.category,b.amount,b.description||'',b.trx_date,actor]);return {id:r.insertId};}
export async function updateExpense(storeId,id,b){const [r]=await db.query('UPDATE finance_transactions SET category=?,amount=?,description=?,trx_date=? WHERE id=? AND store_id=? AND type=? AND order_id IS NULL AND deleted_at IS NULL',[b.category,b.amount,b.description||'',b.trx_date,id,storeId,'expense']);if(!r.affectedRows)fail(404,'Pengeluaran tidak ditemukan atau tidak boleh diubah');}
export async function deleteExpense(storeId,id){const [r]=await db.query('UPDATE finance_transactions SET deleted_at=NOW() WHERE id=? AND store_id=? AND type=? AND order_id IS NULL AND deleted_at IS NULL',[id,storeId,'expense']);if(!r.affectedRows)fail(404,'Pengeluaran tidak ditemukan atau tidak boleh dihapus');}
export async function exportExcel(store,q){
 const {from,to}=period(q);
 const [s,transactionsAll]=await Promise.all([
  summary(store.id,{from,to}),
  rows(`SELECT ft.*,o.code,o.payment_method FROM finance_transactions ft LEFT JOIN orders o ON o.id=ft.order_id WHERE ft.store_id=? AND ft.deleted_at IS NULL AND ft.trx_date BETWEEN ? AND ? ORDER BY ft.trx_date ASC,ft.id ASC`,[store.id,from,to])
 ]);

 const book=new ExcelJS.Workbook();
 book.creator='KampusBalik';
 book.lastModifiedBy='KampusBalik Finance Engine';
 book.created=new Date();

 const moneyFmt='"Rp "#,##0;[Red]("-Rp "#,##0);"-"';
 const percentFmt='0.0%';
 const intFmt='#,##0';

 const thinBorder={
  top:{style:'thin',color:{argb:'FFE2E8F0'}},
  left:{style:'thin',color:{argb:'FFE2E8F0'}},
  bottom:{style:'thin',color:{argb:'FFE2E8F0'}},
  right:{style:'thin',color:{argb:'FFE2E8F0'}}
 };

 const doubleBottomBorder={
  top:{style:'thin',color:{argb:'FF94A3B8'}},
  left:{style:'thin',color:{argb:'FFE2E8F0'}},
  bottom:{style:'double',color:{argb:'FF0F1F3D'}},
  right:{style:'thin',color:{argb:'FFE2E8F0'}}
 };

 const profitMargin=s.income>0?(s.profit/s.income):0;
 const aov=s.paid_orders>0?Math.round(s.income/s.paid_orders):0;
 const printDateStr=new Date().toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

 // ========================================================
 // 1. SHEET: RINGKASAN EKSEKUTIF
 // ========================================================
 const ws1=book.addWorksheet('Ringkasan Eksekutif',{
  properties:{tabColor:{argb:'FF0F1F3D'}},
  views:[{showGridLines:true}]
 });

 ws1.columns=[
  {width:4},
  {width:23},
  {width:23},
  {width:23},
  {width:23},
  {width:23}
 ];

 ws1.mergeCells('B2:F2');
 const h1=ws1.getCell('B2');
 h1.value='KAMPUSBALIK — LAPORAN KEUANGAN TOKO';
 h1.font={name:'Calibri',size:16,bold:true,color:{argb:'FF0F1F3D'}};
 ws1.getRow(2).height=28;

 ws1.mergeCells('B3:F3');
 const sub1=ws1.getCell('B3');
 sub1.value='Marketplace COD Kampus & Komunitas Lokal • Rekapitulasi Finansial Resmi';
 sub1.font={name:'Calibri',size:10,italic:true,color:{argb:'FF64748B'}};
 ws1.getRow(3).height=18;

 // Metadata Box
 ws1.mergeCells('B5:F5');
 const metaH=ws1.getCell('B5');
 metaH.value='INFORMASI TOKO & PERIODE LAPORAN';
 metaH.font={name:'Calibri',size:10,bold:true,color:{argb:'FFFFFFFF'}};
 metaH.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F1F3D'}};
 metaH.alignment={vertical:'middle',indent:1};
 ws1.getRow(5).height=24;

 const metaRows=[
  ['Nama Toko:',store.name||'-','Periode:',`${from} s.d. ${to}`,'Status Keuangan:'],
  ['Area / Kota COD:',store.city||'Semua Area','Dicetak Pada:',printDateStr,s.profit>=0?'Surplus (Profit)':'Defisit']
 ];

 metaRows.forEach((rVals,idx)=>{
  const rNum=6+idx;
  ws1.getRow(rNum).height=22;
  ['B','C','D','E','F'].forEach((col,cIdx)=>{
   const cell=ws1.getCell(`${col}${rNum}`);
   cell.value=rVals[cIdx];
   cell.alignment={vertical:'middle'};
   cell.border=thinBorder;
   if(cIdx===0||cIdx===2||cIdx===4){
    cell.font={name:'Calibri',size:9.5,bold:true,color:{argb:'FF475569'}};
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}};
   }else{
    cell.font={name:'Calibri',size:10,color:{argb:'FF0F172A'}};
   }
   if(rNum===7&&col==='F'){
    cell.font={name:'Calibri',size:10,bold:true,color:{argb:s.profit>=0?'FF16A34A':'FFDC2626'}};
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:s.profit>=0?'FFECFDF5':'FFFEE2E2'}};
   }
  });
 });

 // Section KPI
 ws1.getCell('B9').value='RINGKASAN METRIK FINANSIAL UTAMA (KPI)';
 ws1.getCell('B9').font={name:'Calibri',size:11,bold:true,color:{argb:'FF0F1F3D'}};
 ws1.getRow(9).height=22;

 const kpis=[
  {col:'B',title:'TOTAL PEMASUKAN',val:s.income,fmt:moneyFmt,sub:`${s.paid_orders} Pesanan Selesai`,color:'FF15803D',bg:'FFECFDF5',border:'FFA7F3D0'},
  {col:'C',title:'TOTAL PENGELUARAN',val:s.expense,fmt:moneyFmt,sub:'Biaya Operasional Toko',color:'FFB91C1C',bg:'FFFFF1F2',border:'FFFECDD3'},
  {col:'D',title:'LABA BERSIH (PROFIT)',val:s.profit,fmt:moneyFmt,sub:`Margin: ${(profitMargin*100).toFixed(1)}%`,color:'FF1E40AF',bg:'FFEFF6FF',border:'FFBFDBFE'},
  {col:'E',title:'PESANAN SELESAI',val:s.paid_orders,fmt:intFmt,sub:`AOV: Rp ${aov.toLocaleString('id-ID')}`,color:'FF6B21A8',bg:'FFF5F3FF',border:'FFDDD6FE'},
  {col:'F',title:'PROFIT MARGIN',val:profitMargin,fmt:percentFmt,sub:s.profit>=0?'Sehat & Menguntungkan':'Evaluasi Biaya',color:'FFB45309',bg:'FFFEF3C7',border:'FFFDE68A'}
 ];

 kpis.forEach(k=>{
  ws1.getRow(10).height=18;
  ws1.getRow(11).height=28;
  ws1.getRow(12).height=16;

  const t=ws1.getCell(`${k.col}10`);
  t.value=k.title;
  t.font={name:'Calibri',size:8.5,bold:true,color:{argb:k.color}};
  t.alignment={horizontal:'center',vertical:'middle'};
  t.fill={type:'pattern',pattern:'solid',fgColor:{argb:k.bg}};

  const v=ws1.getCell(`${k.col}11`);
  v.value=k.val;
  v.numFmt=k.fmt;
  v.font={name:'Calibri',size:14,bold:true,color:{argb:k.color}};
  v.alignment={horizontal:'center',vertical:'middle'};
  v.fill={type:'pattern',pattern:'solid',fgColor:{argb:k.bg}};

  const sC=ws1.getCell(`${k.col}12`);
  sC.value=k.sub;
  sC.font={name:'Calibri',size:7.5,color:{argb:'FF64748B'}};
  sC.alignment={horizontal:'center',vertical:'middle'};
  sC.fill={type:'pattern',pattern:'solid',fgColor:{argb:k.bg}};

  for(let r=10;r<=12;r++){
   ws1.getCell(`${k.col}${r}`).border={
    top:r===10?{style:'medium',color:{argb:k.border}}:undefined,
    bottom:r===12?{style:'thin',color:{argb:k.border}}:undefined,
    left:{style:'thin',color:{argb:k.border}},
    right:{style:'thin',color:{argb:k.border}}
   };
  }
 });

 // Table Recap
 ws1.getCell('B14').value='REKAPITULASI LAPORAN LABA RUGI';
 ws1.getCell('B14').font={name:'Calibri',size:11,bold:true,color:{argb:'FF0F1F3D'}};
 ws1.getRow(14).height=24;

 const recapH=['No.','Komponen Finansial','Nominal (Rp)','% Terhadap Omzet','Catatan'];
 ws1.getRow(15).height=24;
 recapH.forEach((th,i)=>{
  const col=['B','C','D','E','F'][i];
  const cell=ws1.getCell(`${col}15`);
  cell.value=th;
  cell.font={name:'Calibri',size:10,bold:true,color:{argb:'FFFFFFFF'}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0F1F3D'}};
  cell.alignment={horizontal:i===0?'center':i===2||i===3?'right':'left',vertical:'middle'};
  cell.border=thinBorder;
 });

 const recapData=[
  [1,'Pendapatan Penjualan Produk (Omzet)',s.income,1.0,'Pemasukan pesanan selesai COD'],
  [2,'Biaya Operasional Toko (Pengeluaran)',s.expense,s.income>0?(s.expense/s.income):0,'Biaya dicatat manual oleh toko'],
  [3,'Laba Bersih Usaha (Net Profit)',s.profit,profitMargin,s.profit>=0?'Keuntungan bersih':'Defisit operasional'],
  [4,'Rata-rata Nilai Transaksi (AOV)',aov,'-','Omzet dibagi pesanan lunas'],
  [5,'Total Pesanan Diselesaikan',s.paid_orders,'-','Jumlah transaksi COD berhasil']
 ];

 recapData.forEach((row,idx)=>{
  const rNum=16+idx;
  ws1.getRow(rNum).height=22;
  const isZebra=idx%2===1;
  const isProfit=idx===2;

  ['B','C','D','E','F'].forEach((col,cIdx)=>{
   const cell=ws1.getCell(`${col}${rNum}`);
   cell.value=row[cIdx];
   cell.border=thinBorder;
   cell.alignment={horizontal:cIdx===0?'center':cIdx===2||cIdx===3?'right':'left',vertical:'middle'};

   if(isProfit){
    cell.font={name:'Calibri',size:10.5,bold:true,color:{argb:s.profit>=0?'FF15803D':'FFDC2626'}};
    cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEFF6FF'}};
   }else{
    cell.font={name:'Calibri',size:9.5,bold:cIdx===1,color:{argb:'FF1E293B'}};
    if(isZebra){
     cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}};
    }
   }

   if(cIdx===2&&typeof row[cIdx]==='number'&&idx<4)cell.numFmt=moneyFmt;
   if(cIdx===3&&typeof row[cIdx]==='number')cell.numFmt=percentFmt;
   if(cIdx===2&&idx===4)cell.numFmt=intFmt;
  });
 });

 if(s.top&&s.top.length>0){
  ws1.getCell('B22').value='PRODUK TERLARIS PADA PERIODE INI';
  ws1.getCell('B22').font={name:'Calibri',size:10.5,bold:true,color:{argb:'FF0F1F3D'}};
  ws1.getRow(22).height=22;

  ws1.getRow(23).height=20;
  ['No.','Nama Produk','Jumlah Terjual (Qty)'].forEach((h,i)=>{
   const col=['B','C','D'][i];
   const cell=ws1.getCell(`${col}23`);
   cell.value=h;
   cell.font={name:'Calibri',size:9,bold:true,color:{argb:'FFFFFFFF'}};
   cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF1E293B'}};
   cell.alignment={horizontal:i===2?'right':'left',vertical:'middle'};
   cell.border=thinBorder;
  });

  s.top.forEach((p,idx)=>{
   const rNum=24+idx;
   ws1.getRow(rNum).height=20;
   ws1.getCell(`B${rNum}`).value=idx+1;
   ws1.getCell(`B${rNum}`).alignment={horizontal:'center',vertical:'middle'};
   ws1.getCell(`C${rNum}`).value=p.name;
   ws1.getCell(`D${rNum}`).value=Number(p.qty);
   ws1.getCell(`D${rNum}`).numFmt=intFmt;
   ws1.getCell(`D${rNum}`).alignment={horizontal:'right',vertical:'middle'};
   ['B','C','D'].forEach(c=>{
    ws1.getCell(`${c}${rNum}`).border=thinBorder;
    ws1.getCell(`${c}${rNum}`).font={name:'Calibri',size:9};
   });
  });
 }

 // ========================================================
 // 2. SHEET: PEMASUKAN (PENJUALAN)
 // ========================================================
 const ws2=book.addWorksheet('Pemasukan',{
  properties:{tabColor:{argb:'FF16A34A'}},
  views:[{showGridLines:true}]
 });

 ws2.columns=[
  {width:6},
  {width:20},
  {width:16},
  {width:36},
  {width:16},
  {width:22}
 ];

 ws2.mergeCells('A1:F1');
 const h2=ws2.getCell('A1');
 h2.value='RINCIAN PEMASUKAN PENJUALAN (TRANSAKSI COD)';
 h2.font={name:'Calibri',size:14,bold:true,color:{argb:'FF166534'}};
 ws2.getRow(1).height=26;

 ws2.mergeCells('A2:F2');
 const sub2=ws2.getCell('A2');
 sub2.value=`Toko: ${store.name}  |  Periode: ${from} s.d. ${to}  |  Dicetak: ${printDateStr}`;
 sub2.font={name:'Calibri',size:9.5,italic:true,color:{argb:'FF64748B'}};
 ws2.getRow(2).height=18;

 const incH=['No.','Kode Pesanan','Tanggal Transaksi','Keterangan Pesanan','Metode Bayar','Nominal (Rp)'];
 ws2.getRow(4).height=24;
 incH.forEach((th,i)=>{
  const col=['A','B','C','D','E','F'][i];
  const cell=ws2.getCell(`${col}4`);
  cell.value=th;
  cell.font={name:'Calibri',size:10,bold:true,color:{argb:'FFFFFFFF'}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF166534'}};
  cell.alignment={horizontal:i===0?'center':i===5?'right':i===1||i===2||i===4?'center':'left',vertical:'middle'};
  cell.border=thinBorder;
 });

 const incomes=transactionsAll.filter(t=>t.type==='income');
 let rC2=5;

 if(incomes.length===0){
  ws2.mergeCells('A5:F5');
  const eC=ws2.getCell('A5');
  eC.value='Belum ada transaksi pemasukan pada rentang tanggal ini.';
  eC.font={name:'Calibri',size:10,italic:true,color:{argb:'FF94A3B8'}};
  eC.alignment={horizontal:'center',vertical:'middle'};
  for(let c=1;c<=6;c++)ws2.getCell(5,c).border=thinBorder;
  rC2=6;
 }else{
  incomes.forEach((t,idx)=>{
   ws2.getRow(rC2).height=22;
   const isZebra=idx%2===1;
   const vals=[idx+1,t.code||'-',t.trx_date,t.description||'Pesanan Produk',t.payment_method==='cod_cash'?'COD Tunai':(t.payment_method||'COD Tunai'),Number(t.amount)];

   ['A','B','C','D','E','F'].forEach((col,cIdx)=>{
    const cell=ws2.getCell(`${col}${rC2}`);
    cell.value=vals[cIdx];
    cell.border=thinBorder;
    cell.font={name:'Calibri',size:9.5,color:{argb:'FF1E293B'}};
    cell.alignment={horizontal:cIdx===0||cIdx===1||cIdx===2||cIdx===4?'center':cIdx===5?'right':'left',vertical:'middle'};
    if(isZebra)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF0FDF4'}};
    if(cIdx===5){
     cell.numFmt=moneyFmt;
     cell.font={name:'Calibri',size:10,bold:true,color:{argb:'FF15803D'}};
    }
   });
   rC2++;
  });
 }

 ws2.getRow(rC2).height=26;
 ws2.mergeCells(`A${rC2}:E${rC2}`);
 const totIncL=ws2.getCell(`A${rC2}`);
 totIncL.value='TOTAL PEMASUKAN PENJUALAN:';
 totIncL.font={name:'Calibri',size:10.5,bold:true,color:{argb:'FF166534'}};
 totIncL.alignment={horizontal:'right',vertical:'middle'};
 totIncL.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDCFCE7'}};

 const totIncV=ws2.getCell(`F${rC2}`);
 totIncV.value=incomes.length>0?{formula:`SUM(F5:F${rC2-1})`}:0;
 totIncV.numFmt=moneyFmt;
 totIncV.font={name:'Calibri',size:12,bold:true,color:{argb:'FF166534'}};
 totIncV.alignment={horizontal:'right',vertical:'middle'};
 totIncV.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFDCFCE7'}};

 ['A','B','C','D','E','F'].forEach(c=>ws2.getCell(`${c}${rC2}`).border=doubleBottomBorder);
 if(incomes.length>0)ws2.autoFilter={from:'A4',to:`F${rC2-1}`};

 // ========================================================
 // 3. SHEET: PENGELUARAN (BIAYA)
 // ========================================================
 const ws3=book.addWorksheet('Pengeluaran',{
  properties:{tabColor:{argb:'FFDC2626'}},
  views:[{showGridLines:true}]
 });

 ws3.columns=[
  {width:6},
  {width:16},
  {width:22},
  {width:38},
  {width:22}
 ];

 ws3.mergeCells('A1:E1');
 const h3=ws3.getCell('A1');
 h3.value='RINCIAN PENGELUARAN BIAYA OPERASIONAL TOKO';
 h3.font={name:'Calibri',size:14,bold:true,color:{argb:'FF991B1B'}};
 ws3.getRow(1).height=26;

 ws3.mergeCells('A2:E2');
 const sub3=ws3.getCell('A2');
 sub3.value=`Toko: ${store.name}  |  Periode: ${from} s.d. ${to}  |  Dicetak: ${printDateStr}`;
 sub3.font={name:'Calibri',size:9.5,italic:true,color:{argb:'FF64748B'}};
 ws3.getRow(2).height=18;

 const expH=['No.','Tanggal','Kategori Biaya','Catatan / Keterangan','Nominal (Rp)'];
 ws3.getRow(4).height=24;
 expH.forEach((th,i)=>{
  const col=['A','B','C','D','E'][i];
  const cell=ws3.getCell(`${col}4`);
  cell.value=th;
  cell.font={name:'Calibri',size:10,bold:true,color:{argb:'FFFFFFFF'}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF991B1B'}};
  cell.alignment={horizontal:i===0||i===1?'center':i===4?'right':'left',vertical:'middle'};
  cell.border=thinBorder;
 });

 const expenses=transactionsAll.filter(t=>t.type==='expense');
 let rC3=5;

 if(expenses.length===0){
  ws3.mergeCells('A5:E5');
  const eC=ws3.getCell('A5');
  eC.value='Belum ada catatan pengeluaran pada rentang tanggal ini.';
  eC.font={name:'Calibri',size:10,italic:true,color:{argb:'FF94A3B8'}};
  eC.alignment={horizontal:'center',vertical:'middle'};
  for(let c=1;c<=5;c++)ws3.getCell(5,c).border=thinBorder;
  rC3=6;
 }else{
  expenses.forEach((t,idx)=>{
   ws3.getRow(rC3).height=22;
   const isZebra=idx%2===1;
   const vals=[idx+1,t.trx_date,t.category||'Operasional',t.description||'-',Number(t.amount)];

   ['A','B','C','D','E'].forEach((col,cIdx)=>{
    const cell=ws3.getCell(`${col}${rC3}`);
    cell.value=vals[cIdx];
    cell.border=thinBorder;
    cell.font={name:'Calibri',size:9.5,color:{argb:'FF1E293B'}};
    cell.alignment={horizontal:cIdx===0||cIdx===1?'center':cIdx===4?'right':'left',vertical:'middle'};
    if(isZebra)cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF1F2'}};
    if(cIdx===4){
     cell.numFmt=moneyFmt;
     cell.font={name:'Calibri',size:10,bold:true,color:{argb:'FFB91C1C'}};
    }
   });
   rC3++;
  });
 }

 ws3.getRow(rC3).height=26;
 ws3.mergeCells(`A${rC3}:D${rC3}`);
 const totExpL=ws3.getCell(`A${rC3}`);
 totExpL.value='TOTAL PENGELUARAN OPERASIONAL:';
 totExpL.font={name:'Calibri',size:10.5,bold:true,color:{argb:'FF991B1B'}};
 totExpL.alignment={horizontal:'right',vertical:'middle'};
 totExpL.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFEE2E2'}};

 const totExpV=ws3.getCell(`E${rC3}`);
 totExpV.value=expenses.length>0?{formula:`SUM(E5:E${rC3-1})`}:0;
 totExpV.numFmt=moneyFmt;
 totExpV.font={name:'Calibri',size:12,bold:true,color:{argb:'FF991B1B'}};
 totExpV.alignment={horizontal:'right',vertical:'middle'};
 totExpV.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFEE2E2'}};

 ['A','B','C','D','E'].forEach(c=>ws3.getCell(`${c}${rC3}`).border=doubleBottomBorder);
 if(expenses.length>0)ws3.autoFilter={from:'A4',to:`E${rC3-1}`};

 // ========================================================
 // 4. SHEET: BUKU KAS (SEMUA TRANSAKSI)
 // ========================================================
 const ws4=book.addWorksheet('Buku Kas Lengkap',{
  properties:{tabColor:{argb:'FF4F46E5'}},
  views:[{showGridLines:true}]
 });

 ws4.columns=[
  {width:6},
  {width:14},
  {width:15},
  {width:18},
  {width:32},
  {width:18},
  {width:18},
  {width:20}
 ];

 ws4.mergeCells('A1:H1');
 const h4=ws4.getCell('A1');
 h4.value='BUKU KAS KRONOLOGIS TRANSAKSI TOKO';
 h4.font={name:'Calibri',size:14,bold:true,color:{argb:'FF312E81'}};
 ws4.getRow(1).height=26;

 ws4.mergeCells('A2:H2');
 const sub4=ws4.getCell('A2');
 sub4.value=`Toko: ${store.name}  |  Periode: ${from} s.d. ${to}  |  Dicetak: ${printDateStr}`;
 sub4.font={name:'Calibri',size:9.5,italic:true,color:{argb:'FF64748B'}};
 ws4.getRow(2).height=18;

 const ledH=['No.','Tanggal','Jenis','Kode / Ref','Kategori / Keterangan','Masuk / Debit (Rp)','Keluar / Kredit (Rp)','Saldo Kumulatif (Rp)'];
 ws4.getRow(4).height=24;
 ledH.forEach((th,i)=>{
  const col=['A','B','C','D','E','F','G','H'][i];
  const cell=ws4.getCell(`${col}4`);
  cell.value=th;
  cell.font={name:'Calibri',size:10,bold:true,color:{argb:'FFFFFFFF'}};
  cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF312E81'}};
  cell.alignment={horizontal:i<=3?'center':i>=5?'right':'left',vertical:'middle'};
  cell.border=thinBorder;
 });

 let rC4=5;
 let runningBal=0;

 if(transactionsAll.length===0){
  ws4.mergeCells('A5:H5');
  const eC=ws4.getCell('A5');
  eC.value='Belum ada transaksi pada rentang tanggal ini.';
  eC.font={name:'Calibri',size:10,italic:true,color:{argb:'FF94A3B8'}};
  eC.alignment={horizontal:'center',vertical:'middle'};
  for(let c=1;c<=8;c++)ws4.getCell(5,c).border=thinBorder;
  rC4=6;
 }else{
  transactionsAll.forEach((t,idx)=>{
   ws4.getRow(rC4).height=22;
   const isInc=t.type==='income';
   const amt=Number(t.amount);
   if(isInc)runningBal+=amt;
   else runningBal-=amt;

   const vals=[idx+1,t.trx_date,isInc?'PEMASUKAN':'PENGELUARAN',t.code||'-',t.description||t.category||'-',isInc?amt:0,!isInc?amt:0,runningBal];

   ['A','B','C','D','E','F','G','H'].forEach((col,cIdx)=>{
    const cell=ws4.getCell(`${col}${rC4}`);
    cell.value=vals[cIdx];
    cell.border=thinBorder;
    cell.font={name:'Calibri',size:9.5,color:{argb:'FF1E293B'}};
    cell.alignment={horizontal:cIdx<=3?'center':cIdx>=5?'right':'left',vertical:'middle'};

    if(cIdx===2){
     cell.font={name:'Calibri',size:9,bold:true,color:{argb:isInc?'FF15803D':'FFB91C1C'}};
     cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:isInc?'FFECFDF5':'FFFFF1F2'}};
    }
    if(cIdx===5){
     cell.numFmt=moneyFmt;
     if(isInc)cell.font={name:'Calibri',size:9.5,bold:true,color:{argb:'FF15803D'}};
    }
    if(cIdx===6){
     cell.numFmt=moneyFmt;
     if(!isInc)cell.font={name:'Calibri',size:9.5,bold:true,color:{argb:'FFB91C1C'}};
    }
    if(cIdx===7){
     cell.numFmt=moneyFmt;
     cell.font={name:'Calibri',size:10,bold:true,color:{argb:runningBal>=0?'FF1E3A8A':'FFDC2626'}};
     cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFF8FAFC'}};
    }
   });
   rC4++;
  });
 }

 ws4.getRow(rC4).height=26;
 ws4.mergeCells(`A${rC4}:E${rC4}`);
 const totLedL=ws4.getCell(`A${rC4}`);
 totLedL.value='TOTAL MUTASI & SALDO AKHIR:';
 totLedL.font={name:'Calibri',size:10,bold:true,color:{argb:'FF312E81'}};
 totLedL.alignment={horizontal:'right',vertical:'middle'};
 totLedL.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEF2FF'}};

 const totD=ws4.getCell(`F${rC4}`);
 totD.value=transactionsAll.length>0?{formula:`SUM(F5:F${rC4-1})`}:0;
 totD.numFmt=moneyFmt;
 totD.font={name:'Calibri',size:11,bold:true,color:{argb:'FF15803D'}};
 totD.alignment={horizontal:'right',vertical:'middle'};
 totD.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEF2FF'}};

 const totK=ws4.getCell(`G${rC4}`);
 totK.value=transactionsAll.length>0?{formula:`SUM(G5:G${rC4-1})`}:0;
 totK.numFmt=moneyFmt;
 totK.font={name:'Calibri',size:11,bold:true,color:{argb:'FFB91C1C'}};
 totK.alignment={horizontal:'right',vertical:'middle'};
 totK.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEF2FF'}};

 const finalB=ws4.getCell(`H${rC4}`);
 finalB.value=s.profit;
 finalB.numFmt=moneyFmt;
 finalB.font={name:'Calibri',size:12,bold:true,color:{argb:s.profit>=0?'FF1E3A8A':'FFDC2626'}};
 finalB.alignment={horizontal:'right',vertical:'middle'};
 finalB.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFEEF2FF'}};

 ['A','B','C','D','E','F','G','H'].forEach(c=>ws4.getCell(`${c}${rC4}`).border=doubleBottomBorder);
 if(transactionsAll.length>0)ws4.autoFilter={from:'A4',to:`H${rC4-1}`};

 return {buffer:await book.xlsx.writeBuffer(),filename:`laporan-keuangan-${store.slug}-${from}-${to}.xlsx`};
}
export async function dashboard(storeId){const [s,pending,low,products]=await Promise.all([
 summary(storeId,{from:new Date().toISOString().slice(0,7)+'-01',to:'2100-01-01'}),
 one('SELECT COUNT(*) count FROM orders WHERE store_id=? AND status IN (?,?)',[storeId,'pending','confirmed']),
 rows('SELECT id,name,stock,reserved,low_stock_threshold FROM products WHERE store_id=? AND status=? AND deleted_at IS NULL AND stock-reserved<=low_stock_threshold ORDER BY stock-reserved ASC LIMIT 10',[storeId,'active']),
 one('SELECT COUNT(*) count FROM products WHERE store_id=? AND deleted_at IS NULL',[storeId])
 ]);const today=await one("SELECT COALESCE(SUM(amount),0) amount FROM finance_transactions WHERE store_id=? AND type='income' AND deleted_at IS NULL AND trx_date=CURDATE()",[storeId]);return {income_today:today.amount,income_month:s.income,expense_month:s.expense,profit_month:s.profit,pending_orders:pending.count,products:products.count,low_stock:low,series:s.series};}
