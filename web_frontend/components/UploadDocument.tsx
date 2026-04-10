'use client';

import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useSuiClient } from '@mysten/dapp-kit';
import { hashFileSHA256 } from '../utils/cryptoUtils';
import { executeZkLoginTx } from '../utils/zkTxBuilder';

export default function UploadDocument() {
  const suiClient = useSuiClient(); 
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<string>('');
  const [txDigest, setTxDigest] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false); 

  const handleUpload = async () => {
    if (!file) {
      alert('Vui lòng chọn file cần bảo vệ trước!');
      return;
    }

    setIsProcessing(true);
    setTxDigest(''); 

    try {
      // 1. CLIENT-SIDE HASHING (Không đẩy file lên server)
      setStatus('⏳ Đang băm file cục bộ (SHA-256)...');
      const fileHash = await hashFileSHA256(file);
      console.log('Vân tay số của file:', fileHash);

      // 2. KHỞI TẠO GIAO DỊCH (TXB) CHUẨN SUI
      setStatus('⏳ Đang khởi tạo Transaction đóng gói dữ liệu...');
      const txb = new Transaction();
      const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID as string;
      
      // --- ĐIỂM SỬA LỖI QUAN TRỌNG: GỌI ĐÚNG HÀM VÀ TRUYỀN CLOCK ---
      txb.moveCall({
        target: `${packageId}::vault::notarize_document`, // Đúng tên hàm trong vault.move
        arguments: [
          txb.pure.string(fileHash), // Tham số 1: Mã băm file
          txb.object('0x6')          // Tham số 2: Object ID của Sui System Clock (0x6)
        ],
      });

      // 3. KÝ VÀ GỬI GIAO DỊCH BẰNG ZKLOGIN
      setStatus('🔐 Đang ký bằng zkLogin và gửi lên mạng lưới Sui...');
      const response = await executeZkLoginTx(txb, suiClient);

      // 4. XỬ LÝ KẾT QUẢ
      if (response.effects?.status.status === 'success') {
        setStatus('✅ Thành công! Mã băm tài liệu đã được khắc lên Blockchain.');
        setTxDigest(response.digest);
      } else {
        setStatus('❌ Giao dịch thất bại (Contract Revert).');
        console.error('Chi tiết lỗi từ Blockchain:', response.effects);
      }

    } catch (error: any) {
      setStatus(`❌ Lỗi hệ thống: ${error.message}`);
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-md border border-gray-200 space-y-5">
      <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Bảo mật Tài liệu (Zero-Knowledge)</h2>
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">Chọn tài liệu cần lưu trữ vết bảo mật:</label>
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={isProcessing}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
        <p className="text-xs text-gray-400 italic">*Dữ liệu gốc của bạn sẽ không bị tải lên bất kỳ máy chủ nào.</p>
      </div>
      <button 
        onClick={handleUpload}
        disabled={isProcessing}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-md transition-colors disabled:bg-gray-400"
      >
        {isProcessing ? 'Đang xử lý mật mã...' : 'Lưu trữ mã băm lên Blockchain'}
      </button>

      {status && (
        <div className={`p-3 rounded-md text-sm font-medium ${status.includes('✅') ? 'bg-green-100 text-green-700' : status.includes('❌') ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {status}
        </div>
      )}
      
      {txDigest && (
        <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm overflow-hidden text-ellipsis">
          <span className="font-semibold text-gray-700">Mã giao dịch (Tx Digest): </span><br/>
          <a href={`https://suiscan.xyz/testnet/tx/${txDigest}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline break-all font-mono">
            {txDigest}
          </a>
        </div>
      )}
    </div>
  );
}