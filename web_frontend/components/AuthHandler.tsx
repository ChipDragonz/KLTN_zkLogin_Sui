"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { jwtToAddress } from "@mysten/zklogin";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fetchZkProof } from "../utils/zkLogin"; // Import hàm gọi Prover

export default function AuthHandler() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [suiAddress, setSuiAddress] = useState<string | null>(null);
  const [zkpReady, setZkpReady] = useState<boolean>(false); // Trạng thái ZKP

  useEffect(() => {
    const hash = window.location.hash;
    
    if (hash && hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");

      if (idToken) {
        // Tách luồng xử lý bất đồng bộ ra một hàm riêng
        const processLogin = async () => {
          try {
            // 1. Giải mã JWT và hiển thị
            const decoded = jwtDecode(idToken);
            setUserInfo(decoded);

            // 2. Tính toán địa chỉ ví Sui
            const userSalt = "12345678901234567890"; 
            const address = jwtToAddress(idToken, userSalt);
            setSuiAddress(address);

            // 3. Khôi phục thông số bảo mật từ sessionStorage
            const secretKeyBase32 = window.sessionStorage.getItem("zklogin_ephemeral_key");
            const maxEpochStr = window.sessionStorage.getItem("zklogin_max_epoch");
            const randomness = window.sessionStorage.getItem("zklogin_randomness");

            if (!secretKeyBase32 || !maxEpochStr || !randomness) {
              throw new Error("Mất dữ liệu phiên đăng nhập. Vui lòng thử lại.");
            }

            // Khôi phục Keypair từ chuỗi Bech32
            const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKeyBase32);
            const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
            const maxEpoch = parseInt(maxEpochStr, 10);

            // 4. Gọi Prover để lấy Bằng chứng (Bước này mất khoảng 2-5 giây)
            const zkProofResult = await fetchZkProof(
              idToken,
              ephemeralPublicKey,
              maxEpoch,
              randomness,
              userSalt
            );

            console.log("ZKP lấy thành công:", zkProofResult);
            
            // Lưu ZKP vào sessionStorage để tái sử dụng khi ký giao dịch
            window.sessionStorage.setItem("zklogin_proof", JSON.stringify(zkProofResult));
            setZkpReady(true);

            // 5. Dọn dẹp thanh URL
            window.history.replaceState(null, "", window.location.pathname);
          } catch (error) {
            console.error("Lỗi xử lý xác thực zkLogin:", error);
          }
        };

        processLogin();
      }
    }
  }, []);

  if (!userInfo || !suiAddress) return null;

  return (
    <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl text-left dark:bg-green-900/20 dark:border-green-800/30 w-full max-w-2xl">
      <h3 className="text-xl font-bold text-green-700 dark:text-green-400 mb-4">
        ✅ Xác thực zkLogin thành công
      </h3>
      <div className="text-zinc-700 dark:text-zinc-300 space-y-3">
        <p><strong>Email:</strong> {userInfo.email}</p>
        <p><strong>Mã định danh (sub):</strong> <span className="font-mono text-sm">{userInfo.sub}</span></p>
        
        <div className="mt-4 p-4 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-sm">
          <p className="text-sm font-semibold mb-1 text-zinc-500">Địa chỉ Ví Sui:</p>
          <p className="font-mono text-sm break-all text-blue-600 dark:text-blue-400">
            {suiAddress}
          </p>
        </div>

        {/* Khối hiển thị trạng thái ZKP */}
        <div className={`mt-4 p-3 rounded-lg border ${zkpReady ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'bg-yellow-50 border-yellow-200 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-300'}`}>
          <p className="font-medium">
            {zkpReady ? "🔒 Đã khởi tạo ZKP thành công. Sẵn sàng ký dữ liệu." : "⏳ Đang tính toán Zero-Knowledge Proof từ Mysten Labs..."}
          </p>
        </div>
      </div>
    </div>
  );
}