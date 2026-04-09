import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness } from '@mysten/zklogin';

// Hàm chuẩn bị các tham số bảo mật trước khi gọi Google OAuth
export function prepareZkLogin() {
  // 1. Sinh ra một cặp khóa tạm thời (Khóa bí mật và Khóa công khai)
  const ephemeralKeyPair = new Ed25519Keypair();
  const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();

  // 2. Định nghĩa thời hạn của khóa
  // Lưu ý: Giá trị này tính theo đơn vị Epoch của mạng Sui
  // Trong môi trường thực tế, chúng ta sẽ cần gọi API để lấy Epoch hiện tại
  // Tạm thời ở bước này, tôi để giá trị giả lập
  const maxEpoch = 2;

  // 3. Tạo một chuỗi ngẫu nhiên với độ Entropy cao để chống đoán nhận
  const randomness = generateRandomness();

  // 4. Băm các tham số thành Nonce để gửi cho Identity Provider (Google)
  const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);

  return {
    ephemeralKeyPair,
    maxEpoch,
    randomness,
    nonce,
  };
}