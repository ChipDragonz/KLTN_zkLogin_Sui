// utils/cryptoUtils.ts

/**
 * Băm dữ liệu file trực tiếp trên trình duyệt (Client-side).
 * Kiến trúc Zero-Trust: Đảm bảo nền tảng không có quyền truy cập vào nội dung thực của file.
 * @param file File từ người dùng
 * @returns Chuỗi Hex của SHA-256
 */
export async function hashFileSHA256(file: File): Promise<string> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    throw new Error("Môi trường Web Crypto API không hợp lệ.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (error) {
    console.error("Lỗi quá trình băm file:", error);
    throw new Error("Không thể tính toán vân tay số của file.");
  }
}