// D:\KLTN\repo\web_frontend\components\DocumentUploader.tsx
"use client";

import React, { useState, useEffect } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { hashFileSHA256 } from "../utils/cryptoUtils";
import { buildStoreHashTx } from "../utils/txUtils";

// THÊM: Các thư viện dùng để lắp ráp chữ ký
import { getZkLoginSignature } from "@mysten/zklogin";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

export default function DocumentUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [documentHash, setDocumentHash] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("Đang tải...");
  
  const suiClient = useSuiClient(); 
  const network = "Sui Testnet";

  // Hook lấy địa chỉ ví từ Session ngay khi load component
  useEffect(() => {
    const savedAddress = sessionStorage.getItem("zklogin_address"); 
    if (savedAddress) {
      setUserAddress(savedAddress);
      fetchBalance(savedAddress);
    } else {
      setBalance("Không tìm thấy ví");
    }
  }, []);

  const fetchBalance = async (address: string) => {
    try {
      const coinBalance = await suiClient.getBalance({
        owner: address,
        coinType: "0x2::sui::SUI", 
      });
      const mistBalance = Number(coinBalance.totalBalance);
      const suiAmount = mistBalance / 1_000_000_000;
      setBalance(`${suiAmount.toFixed(4)} SUI`);
    } catch (error) {
      console.error("Lỗi khi đọc số dư:", error);
      setBalance("Lỗi kết nối RPC");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    try {
      const hash = await hashFileSHA256(selectedFile);
      setDocumentHash(hash);
    } catch (error) {
      console.error("Lỗi băm file:", error);
    }
  };

  // HÀM CHÍNH: Xử lý và gửi giao dịch thực tế
  const handleSubmitTx = async () => {
    if (!documentHash || !userAddress) {
      alert("Vui lòng chọn file và đảm bảo đã đăng nhập!");
      return;
    }

    try {
      console.log("1. Đang xây dựng khối giao dịch (PTB)...");
      const txBlock = buildStoreHashTx(documentHash);
      
      // Bắt buộc khai báo người gửi để RPC tính toán Gas chính xác
      txBlock.setSender(userAddress); 

      console.log("2. Khôi phục dữ liệu bảo mật từ Session Storage...");
      const secretKeyBase32 = sessionStorage.getItem("zklogin_ephemeral_key");
      const maxEpochStr = sessionStorage.getItem("zklogin_max_epoch");
      const proofStr = sessionStorage.getItem("zklogin_proof");
      
      // QUAN TRỌNG: Lấy Address Seed đã nấu từ Giai đoạn 2 (Không dùng Salt tĩnh ở đây nữa)
      const addressSeedStr = sessionStorage.getItem("zklogin_address_seed"); 

      if (!secretKeyBase32 || !maxEpochStr || !proofStr || !addressSeedStr) {
        throw new Error("Mất dữ liệu phiên zkLogin. Vui lòng F5 và Đăng nhập lại.");
      }

      // Khôi phục Keypair và Proof
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKeyBase32);
      const zkProof = JSON.parse(proofStr);

      console.log("3. Đóng gói giao dịch (Build) thành Byte array...");
      // Hàm build sẽ gọi RPC để Dry-Run, nếu Pass sẽ trả về mảng Bytes
      const txBytes = await txBlock.build({ client: suiClient });

      console.log("4. Ký giao dịch bằng Ephemeral Key (Khóa tạm thời)...");
      const { signature: ephemeralSignature } = await ephemeralKeyPair.signTransaction(txBytes);

      console.log("5. Lắp ráp chữ ký zkLogin hoàn chỉnh...");
      // Gộp Proof + Seed + Chữ ký tạm thời thành 1 chuẩn duy nhất
      const zkLoginSignature = getZkLoginSignature({
        inputs: {
          ...zkProof,
          addressSeed: addressSeedStr, // Sử dụng Seed an toàn
        },
        maxEpoch: parseInt(maxEpochStr, 10),
        userSignature: ephemeralSignature,
      });

      console.log("6. Gửi giao dịch lên mạng Sui Testnet...");
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: txBytes,
        signature: zkLoginSignature,
        options: {
          showEffects: true, // Trả về trạng thái thực thi
        },
      });

      console.log("✅ GIAO DỊCH THÀNH CÔNG!", result);
      
      if (result.effects?.status.status === "success") {
        alert(`Lưu tài liệu thành công!\nMã giao dịch (Digest): ${result.digest}`);
        setDocumentHash(""); // Reset UI sau khi thành công
        setFile(null);
      } else {
        alert(`Giao dịch thất bại: ${result.effects?.status.error}`);
      }

    } catch (error) {
      console.error("Lỗi khi gửi giao dịch:", error);
      alert("Đã xảy ra lỗi. Vui lòng mở F12 (Console) để xem chi tiết.");
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto bg-white rounded-xl shadow-md space-y-6 border border-gray-200">
      
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
        <h2 className="text-lg font-bold text-blue-800 mb-2">Trạng Thái Kết Nối zkLogin</h2>
        <div className="text-sm text-gray-700 space-y-1 break-all">
          <p>🌍 <strong>Môi trường:</strong> <span className="text-green-600 font-semibold">{network}</span></p>
          <p>🏷️ <strong>Địa chỉ ví:</strong> {userAddress ? userAddress : "Chưa đăng nhập"}</p>
          <p>💰 <strong>Số dư:</strong> <span className="font-mono font-bold text-gray-900">{balance}</span></p>
        </div>
      </div>

      <hr className="border-gray-200" />

      <div>
        <h3 className="text-lg font-bold text-gray-800 mb-4">Kho Lưu Trữ Tài Liệu</h3>
        
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Chọn tài liệu cần bảo mật:
        </label>
        <input 
          type="file" 
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 mb-4
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />

        {file && (
          <div className="bg-gray-50 p-4 rounded-md text-sm break-all mb-4 border border-gray-200">
            <p><strong>Tên file:</strong> {file.name}</p>
            <p className="mt-2 text-green-600 font-mono">
              <strong>Mã băm SHA-256 (Local):</strong> <br/> {documentHash}
            </p>
          </div>
        )}

        <button 
          onClick={handleSubmitTx} // Đã đổi sang hàm Submit thực tế
          disabled={!documentHash || userAddress === ""}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Lưu Tài Liệu Lên Blockchain
        </button>
      </div>
    </div>
  );
}