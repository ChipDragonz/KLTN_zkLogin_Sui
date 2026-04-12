"use client";

import { useEffect, useState } from "react";
import { suiClient } from "@/lib/suiClient";
import { hashFileSHA256 } from "@/lib/crypto";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<string>("Đang kiểm tra kết nối...");

  // Kỹ thuật mounted state: Đảm bảo component chỉ render nội dung client-side sau khi mount
  useEffect(() => {
    setIsMounted(true);
    checkSuiConnection();
  }, []);

  const checkSuiConnection = async () => {
    try {
      // Ping thử lên mạng Sui để lấy chain identifier
      await suiClient.getChainIdentifier();
      setNetworkStatus("Kết nối Sui OK ✅");
    } catch (error) {
      setNetworkStatus("Kết nối Sui thất bại ❌");
      console.error(error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("Đang xử lý file:", file.name);
    
    try {
      const hash = await hashFileSHA256(file);
      console.log("Mã băm SHA-256 (calculatedHash):", hash);
      alert(`Đã băm thành công! Xem Console để lấy mã Hex.`);
    } catch (error) {
      console.error("Lỗi khi băm file:", error);
    }
  };

  // Tránh lỗi Hydration: Return null hoặc skeleton lúc đang render ở server
  if (!isMounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-50 text-gray-900">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md flex flex-col gap-6">
        <h1 className="text-2xl font-bold text-center">Document Vault</h1>
        
        <div className="p-4 bg-gray-100 rounded-lg text-center font-mono text-sm">
          Trạng thái: {networkStatus}
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold text-sm">Kiểm tra Module Băm File</label>
          <input 
            type="file" 
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
      </div>
    </main>
  );
}