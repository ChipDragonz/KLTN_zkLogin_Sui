"use client";

import { prepareZkLogin } from "../utils/zkLogin";

export default function LoginButton() {
  const handleLogin = () => {
    // 1. Khởi tạo các tham số bảo mật (Khóa tạm thời, Nonce, v.v.)
    const { ephemeralKeyPair, maxEpoch, randomness, nonce } = prepareZkLogin();

    // 2. Lưu Khóa bí mật tạm thời và maxEpoch vào sessionStorage
    // Chuyển đổi khóa sang định dạng chuỗi (export) để lưu trữ an toàn
    window.sessionStorage.setItem("zklogin_ephemeral_key", ephemeralKeyPair.getSecretKey());
    window.sessionStorage.setItem("zklogin_max_epoch", maxEpoch.toString());
    window.sessionStorage.setItem("zklogin_randomness", randomness.toString());

    // 3. Lấy Client ID từ biến môi trường
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    
    // 4. Định nghĩa URL nhận kết quả trả về từ Google (Callback URL)
    // Lưu ý: Port mặc định của Next.js là 3000
    const redirectUri = "http://localhost:3000";

    // 5. Cấu hình URL OAuth 2.0 của Google Identity Provider
    const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    oauthUrl.searchParams.append("client_id", clientId as string);
    oauthUrl.searchParams.append("redirect_uri", redirectUri);
    oauthUrl.searchParams.append("response_type", "id_token"); // Chỉ yêu cầu trả về JWT
    oauthUrl.searchParams.append("scope", "openid email profile");
    // Gắn chuỗi nonce chứa mật mã học để ràng buộc danh tính
    oauthUrl.searchParams.append("nonce", nonce); 

    // 6. Chuyển hướng người dùng sang trang đăng nhập của Google
    window.location.href = oauthUrl.toString();
  };

  return (
    <button 
      onClick={handleLogin}
      className="mt-8 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
    >
      Đăng nhập bằng Google (zkLogin)
    </button>
  );
}