// D:\KLTN\repo\web_frontend\utils\txUtils.ts
import { Transaction } from '@mysten/sui/transactions';

// Gọi Package ID từ biến môi trường
const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID as string; 
const MODULE_NAME = "vault";
// 1. SỬA TÊN HÀM CHO KHỚP VỚI SMART CONTRACT
const FUNCTION_NAME = "notarize_document"; 

export const buildStoreHashTx = (documentHash: string): Transaction => {
  if (!PACKAGE_ID) {
    throw new Error("Lỗi hệ thống: Chưa cấu hình NEXT_PUBLIC_PACKAGE_ID trong file .env.local");
  }

  const tx = new Transaction();

  tx.moveCall({
    target: `${PACKAGE_ID}::${MODULE_NAME}::${FUNCTION_NAME}`,
    // 2. CẬP NHẬT MẢNG THAM SỐ (ARGUMENTS)
    arguments: [
      // Tham số 1: file_hash (Dữ liệu nguyên thủy -> dùng tx.pure)
      tx.pure.string(documentHash),
      
      // Tham số 2: clock (Là một Shared Object của hệ thống Sui -> dùng tx.object)
      // Địa chỉ 0x6 là địa chỉ chuẩn (Standard ID) của Sui System Clock
      tx.object('0x6')
    ],
  });

  return tx;
};