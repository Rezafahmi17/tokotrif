import {fail} from '../utils/common.js';
export const transitions={
 pending:{confirm:['admin_toko','confirmed'],cancel:['admin_toko','cancelled'],customer_cancel:['customer','cancelled']},
 confirmed:{paid:['admin_toko','paid'],cancel:['admin_toko','cancelled']},
 paid:{received:['customer','completed']},completed:{},cancelled:{}
};
export function assertTransition(status,action,role){
 const t=transitions[status]?.[action];if(!t||t[0]!==role)fail(409,`Pesanan berstatus ${status} tidak bisa melakukan aksi ${action}`);return t[1];
}
