module document_vault::document_vault {
    use std::string::String;
    use sui::clock::{Self, Clock};

    /// Struct đại diện cho một tài liệu đã được xác thực
    public struct Document has key, store {
        id: UID,
        file_hash: String,
        owner: address,
        timestamp: u64,
    }

    /// Hàm lưu trữ mã băm tài liệu lên chuỗi
    public fun add_document(
        file_hash: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Cú pháp 2024 cho phép gọi trực tiếp ctx.sender() 
        let sender = ctx.sender();
        let current_time = clock.timestamp_ms();

        let document = Document {
            id: object::new(ctx),
            file_hash,
            owner: sender,
            timestamp: current_time,
        };

        transfer::public_transfer(document, sender);
    }
}