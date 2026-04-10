"use client";

import { prepareZkLogin } from "../utils/zkLogin";

export default function LoginButton() {
  const handleLogin = () => {
    // 1. Sinh các tham số Mật mã: Khóa tạm thời (Ephemeral Key), Nonce, Randomness
    const { ephemeralKeyPair, maxEpoch, randomness, nonce } = prepareZkLogin();

    // 2. Lưu trữ an toàn các thông số vào session trình duyệt (Client-side)
    window.sessionStorage.setItem("zklogin_ephemeral_key", ephemeralKeyPair.getSecretKey());
    window.sessionStorage.setItem("zklogin_max_epoch", maxEpoch.toString());
    window.sessionStorage.setItem("zklogin_randomness", randomness.toString());

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri = "http://localhost:3000";

    // 3. Xây dựng URL chuẩn OAuth 2.0. Gắn Nonce vào để ràng buộc danh tính với Khóa tạm thời
    const oauthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    oauthUrl.searchParams.append("client_id", clientId as string);
    oauthUrl.searchParams.append("redirect_uri", redirectUri);
    oauthUrl.searchParams.append("response_type", "id_token"); 
    oauthUrl.searchParams.append("scope", "openid email profile");
    oauthUrl.searchParams.append("nonce", nonce); 

    // Chuyển hướng sang Google Identity Provider
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