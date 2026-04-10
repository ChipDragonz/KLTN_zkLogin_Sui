// utils/zkTxBuilder.ts
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import { getZkLoginSignature } from '@mysten/zklogin';
import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';

/**
 * Module cốt lõi: Ký giao dịch thay mặt người dùng dựa vào ZKP
 */
export async function executeZkLoginTx(txb: Transaction, client: SuiClient) {
  const ephemeralKeyString = sessionStorage.getItem('zklogin_ephemeral_key');
  const zkProofString = sessionStorage.getItem('zklogin_proof');
  const maxEpochString = sessionStorage.getItem('zklogin_max_epoch');

  if (!ephemeralKeyString || !zkProofString || !maxEpochString) {
    throw new Error("Phiên làm việc hết hạn. Vui lòng đăng nhập lại.");
  }

  // Khôi phục khóa tạm thời từ bộ nhớ
  const { secretKey } = decodeSuiPrivateKey(ephemeralKeyString);
  const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKey);
  const zkProof = JSON.parse(zkProofString);
  const maxEpoch = Number(maxEpochString);

  try {
    // 1. Dùng Khóa tạm thời ký lên dữ liệu giao dịch
    const { bytes, signature: userSignature } = await txb.sign({
      client,
      signer: ephemeralKeyPair,
    });

    // 2. Lắp ráp chữ ký zkLogin hoàn chỉnh (ZKP + Chữ ký người dùng + Max Epoch)
    const zkLoginSignature = getZkLoginSignature({
      inputs: zkProof,
      maxEpoch,
      userSignature,
    });

    // 3. Đẩy lên Blockchain
    return await client.executeTransactionBlock({
      transactionBlock: bytes,
      signature: zkLoginSignature,
      options: {
        showEffects: true, 
        showEvents: true,  
      },
    });
  } catch (error) {
    console.error("Giao dịch zkLogin thất bại:", error);
    throw error;
  }
}