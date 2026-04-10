// utils/zkLogin.ts
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey } from '@mysten/zklogin';

/**
 * Chuẩn bị các tham số mật mã để sinh Nonce cho Google OAuth
 */
export function prepareZkLogin() {
  const ephemeralKeyPair = new Ed25519Keypair();
  const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
  
  // Thời hạn sống của khóa (Tính theo Epoch của Sui).
  const maxEpoch = 2; 
  const randomness = generateRandomness();
  const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);

  return { ephemeralKeyPair, maxEpoch, randomness, nonce };
}

/**
 * Gửi yêu cầu đến Mysten Labs Prover để xin Bằng chứng Zero-Knowledge (ZKP)
 */
export async function fetchZkProof(
  jwt: string,
  ephemeralPublicKey: any,
  maxEpoch: number,
  randomness: string,
  userSalt: string
) {
  const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralPublicKey);

  const response = await fetch("https://prover-dev.mystenlabs.com/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jwt: jwt,
      extendedEphemeralPublicKey: extendedEphemeralPublicKey,
      maxEpoch: maxEpoch,
      jwtRandomness: randomness,
      salt: userSalt,
      keyClaimName: "sub" // Chỉ định 'sub' là mã định danh từ Google
    }),
  });

  if (!response.ok) {
    throw new Error(`Lỗi từ Prover: ${await response.text()}`);
  }

  return await response.json();
}