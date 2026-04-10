// D:\KLTN\repo\web_frontend\utils\cryptoUtils.ts

/**
 * Hàm đọc file và băm SHA-256 ngay trên trình duyệt.
 * @param file Đối tượng File lấy từ thẻ <input type="file">
 * @returns Chuỗi Hex (mã băm) của file
 */
export const hashFileSHA256 = async (file: File): Promise<string> => {
  try {
    // 1. Chuyển đổi File thành ArrayBuffer (Byte array thô)
    const arrayBuffer = await file.arrayBuffer();

    // 2. Sử dụng Web Crypto API để băm dữ liệu
    // crypto.subtle.digest trả về một ArrayBuffer chứa kết quả băm
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

    // 3. Chuyển đổi Buffer kết quả thành mảng Byte (Uint8Array)
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // 4. Chuyển từng Byte thành chuỗi Hex (hệ cơ số 16) và ghép lại
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  } catch (error) {
    console.error("Lỗi trong quá trình băm file:", error);
    throw new Error("Không thể băm tài liệu. Vui lòng thử lại.");
  }
};