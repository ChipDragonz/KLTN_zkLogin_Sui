export async function hashFileSHA256(file: File): Promise<string> {
    // 1. Chuyển đổi file thành ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // 2. Sử dụng Web Crypto API để băm dữ liệu
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    
    // 3. Chuyển đổi Buffer thành mảng byte
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // 4. Ép kiểu mảng byte thành chuỗi Hex chuẩn
    const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return calculatedHash;
}