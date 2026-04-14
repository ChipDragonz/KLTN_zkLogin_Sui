module document_vault::vault {
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    // 1. Cấu trúc Object lưu trữ bản ghi tài liệu
    struct DocumentRecord has key, store {
        id: UID,
        owner: address,           // Địa chỉ (zkLogin) của người lưu
        hash_value: String,       // Mã băm SHA-256 của tài liệu
        timestamp: u64,           // Thời gian lưu trữ
    }

    // 2. Định nghĩa Event phát ra khi lưu thành công
    struct HashStored has copy, drop {
        record_id: address,
        owner: address,
        hash_value: String,
    }

    // 3. Hàm chính để thực thi việc lưu mã băm
    public entry fun store_hash(
        hash_value: String, 
        clock: &sui::clock::Clock, 
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        let id = object::new(ctx);
        let record_id = object::uid_to_address(&id);

        // Tạo một bản ghi mới
        let record = DocumentRecord {
            id,
            owner,
            hash_value,
            timestamp: sui::clock::timestamp_ms(clock),
        };

        // Chuyển quyền sở hữu Object này cho người gửi giao dịch
        transfer::transfer(record, owner);

        // Phát ra sự kiện để Frontend/Backend dễ truy xuất lịch sử
        event::emit(HashStored {
            record_id,
            owner,
            hash_value,
        });
    }
}