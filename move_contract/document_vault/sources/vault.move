module document_vault::vault {
    use sui::clock::{Self, Clock};
    use std::string::String;
    use sui::event;

    // Cấu trúc Document: Lưu trữ "vân tay số" của tài liệu trên on-chain.
    // 'key' cho phép nó trở thành một Object độc lập, 'store' cho phép chuyển nhượng.
    public struct Document has key, store {
        id: UID,
        file_hash: String, // Mã băm SHA-256 (Đảm bảo tính Toàn vẹn)
        creator: address,  // Ví người tạo (Đảm bảo Xác thực nguồn gốc)
        created_at: u64,   // Dấu thời gian (Đảm bảo Chống chối bỏ)
    }

    // Sự kiện (Event): Phát sóng ra mạng lưới khi một tài liệu được công chứng thành công.
    // Frontend (SuiScan hoặc UI của Tiến) có thể lắng nghe event này.
    public struct DocumentNotarized has copy, drop {
        document_id: ID,
        file_hash: String,
        creator: address,
    }

    // Hàm gọi từ Frontend để công chứng tài liệu
    public fun notarize_document(
        file_hash: String,
        clock: &Clock, // Tham số này yêu cầu Frontend phải truyền Object '0x6'
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let uid = object::new(ctx);
        let doc_id = object::uid_to_inner(&uid);

        let document = Document {
            id: uid,
            file_hash: file_hash,
            creator: sender,
            created_at: clock::timestamp_ms(clock), // Lấy thời gian chuẩn từ mạng Sui
        };

        let event_data = DocumentNotarized {
            document_id: doc_id,
            file_hash: file_hash,
            creator: sender,
        };
        event::emit(event_data);

        // Giao quyền sở hữu Object này cho người gửi giao dịch (Zero-Trust)
        transfer::public_transfer(document, sender);
    }
}