'use client'; 

import { useEffect, useState } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import styles from "./page.module.css";
import LoginButton from "../components/LoginButton";
import AuthHandler from "../components/AuthHandler";
import UploadDocument from "../components/UploadDocument"; 

export default function Home() {
  const suiClient = useSuiClient(); 
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [suiAddress, setSuiAddress] = useState('');
  const [email, setEmail] = useState('');
  const [balance, setBalance] = useState('Đang tải...');

  // Hook kiểm tra phiên đăng nhập từ session
  useEffect(() => {
    const checkSession = () => {
      const proof = sessionStorage.getItem('zklogin_proof');
      const savedAddress = sessionStorage.getItem('sui_address');
      const savedEmail = sessionStorage.getItem('user_email');

      // Phải có đủ proof và address thì mới tính là đăng nhập xong
      if (proof && savedAddress) {
        setIsLoggedIn(true);
        setSuiAddress(savedAddress);
        setEmail(savedEmail || '');
      }
    };

    // Kiểm tra ngay khi load
    checkSession();
    
    // Tạo một interval nhỏ để "bắt" sự kiện AuthHandler lưu xong data
    const interval = setInterval(checkSession, 500);
    return () => clearInterval(interval);
  }, []);

  // Hook lấy số dư SUI
  useEffect(() => {
    async function fetchBalance() {
      if (!suiAddress) return;
      try {
        const result = await suiClient.getBalance({ owner: suiAddress });
        const suiAmount = (Number(result.totalBalance) / 1_000_000_000).toFixed(4);
        setBalance(suiAmount);
      } catch (error) {
        console.error("Lỗi lấy số dư:", error);
        setBalance('Lỗi mạng');
      }
    }
    if (isLoggedIn) fetchBalance();
  }, [suiAddress, isLoggedIn, suiClient]);

  // Hàm dọn dẹp phiên làm việc (Đăng xuất)
  const handleLogout = () => {
    sessionStorage.clear(); // Xóa sạch dữ liệu mật mã
    window.location.reload(); // F5 lại trang
  };

  const maskEmail = (rawEmail: string) => {
    if (!rawEmail) return '';
    const [name, domain] = rawEmail.split('@');
    return `${name.substring(0, 2)}***@${domain}`;
  };

  return (
    <div className={styles.mainContainer}>
      <main className={styles.contentWrapper}>
        <h1 className={styles.title}>Hệ thống Document Vault</h1>
        <p className={styles.subtitle}>Nền tảng lưu trữ và xác thực tài liệu an toàn trên Sui Blockchain</p>

        {/* Xử lý rẽ nhánh UI */}
        {!isLoggedIn ? (
          <>
            <LoginButton />
            <AuthHandler />
          </>
        ) : (
          <div className="w-full max-w-2xl mx-auto mt-8 space-y-6">
            <div className="p-6 bg-gray-900 border border-green-500 rounded-xl shadow-lg">
              
              {/* Tiêu đề & Nút Đăng xuất */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <span className="text-green-500 text-xl">✅</span>
                  <h3 className="text-green-500 font-bold text-lg">Xác thực zkLogin thành công</h3>
                </div>
                <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 underline">
                  Đăng xuất (Xóa Session)
                </button>
              </div>
              
              <div className="space-y-3 text-sm text-gray-300 text-left">
                <p><strong className="text-white">Tài khoản:</strong> {maskEmail(email)}</p>
                <div className="bg-black p-3 rounded-md break-all border border-gray-700">
                  <p><strong className="text-gray-400">Địa chỉ Ví Sui:</strong></p>
                  <p className="text-blue-400 font-mono mt-1">{suiAddress}</p>
                </div>
                <div className="bg-black p-3 rounded-md border border-gray-700 flex justify-between items-center">
                  <p><strong className="text-gray-400">Số dư Testnet (Gas Fee):</strong></p>
                  <p className="text-green-400 font-bold font-mono text-lg">{balance} SUI</p>
                </div>
              </div>
            </div>

            <UploadDocument />
          </div>
        )}
      </main>
    </div>
  );
}