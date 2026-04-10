"use client";

import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { jwtToAddress } from "@mysten/zklogin";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fetchZkProof } from "../utils/zkLogin";

export default function AuthHandler() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [suiAddress, setSuiAddress] = useState<string | null>(null);
  const [zkpReady, setZkpReady] = useState<boolean>(false);

  useEffect(() => {
    const hash = window.location.hash;
    
    if (hash && hash.includes("id_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      const idToken = params.get("id_token");

      if (idToken) {
        const processLogin = async () => {
          try {
            // 1. Giải mã JWT lấy thông tin định danh Google
            const decoded = jwtDecode(idToken);
            setUserInfo(decoded);

            // 2. Tính toán địa chỉ ví Sui (Sử dụng Salt tĩnh cục bộ)
            const userSalt = "12345678901234567890"; 
            const address = jwtToAddress(idToken, userSalt);
            setSuiAddress(address);

            // --- ĐIỂM SỬA LỖI QUAN TRỌNG TẠI ĐÂY ---
            // Lưu thông tin vào session để page.tsx có thể nhận diện đăng nhập
            window.sessionStorage.setItem("user_email", decoded.email as string);
            window.sessionStorage.setItem("sui_address", address);

            // 3. Khôi phục thông số bảo mật từ session (Khóa tạm thời, randomness)
            const secretKeyBase32 = window.sessionStorage.getItem("zklogin_ephemeral_key");
            const maxEpochStr = window.sessionStorage.getItem("zklogin_max_epoch");
            const randomness = window.sessionStorage.getItem("zklogin_randomness");

            if (!secretKeyBase32 || !maxEpochStr || !randomness) {
              throw new Error("Mất dữ liệu phiên đăng nhập cục bộ. Vui lòng thử lại.");
            }

            const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKeyBase32);
            const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
            const maxEpoch = parseInt(maxEpochStr, 10);

            // 4. Giao tiếp với Mysten Prover lấy ZK Proof (Bằng chứng Không tiết lộ)
            const zkProofResult = await fetchZkProof(
              idToken,
              ephemeralPublicKey,
              maxEpoch,
              randomness,
              userSalt
            );
            
            // Lưu Proof để sử dụng ký Transaction
            window.sessionStorage.setItem("zklogin_proof", JSON.stringify(zkProofResult));
            setZkpReady(true);

            // 5. Dọn dẹp token khỏi URL để tránh rò rỉ JWT qua lịch sử duyệt web
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
    // Component này chỉ hiển thị luồng log tạm thời. Khi tích hợp vào page.tsx, 
    // page.tsx sẽ tự động đè lên và quản lý UI tổng thể.
    <div className="hidden">Đang xử lý Auth ngầm...</div>
  );
}