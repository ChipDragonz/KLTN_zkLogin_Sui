module document_vault::vault {
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;

    struct DocumentRecord has key, store {
        id: UID,
        owner: address,
        hash_value: String,
        file_name: String,    // MỚI: Tên tệp
        description: String,  // MỚI: Mô tả ngắn gọn
        timestamp: u64,
    }

    struct HashStored has copy, drop {
        record_id: address,
        hash_value: String,
        file_name: String,
        description: String, // THÊM MỚI
        timestamp: u64,      // THÊM MỚI
    }

    #[allow(lint(public_entry))]
    public entry fun store_hash(
        hash_value: String, 
        file_name: String,    // MỚI
        description: String,  // MỚI
        clock: &sui::clock::Clock, 
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        let id = object::new(ctx);
        let record_id = object::uid_to_address(&id);

        let record = DocumentRecord {
            id,
            owner,
            hash_value,
            file_name,
            description,
            timestamp: sui::clock::timestamp_ms(clock),
        };

        transfer::transfer(record, owner);

        event::emit(HashStored {
            record_id,
            hash_value,
            file_name,
            description, // Truyền mô tả vào sự kiện
            timestamp: sui::clock::timestamp_ms(clock), // Truyền thời gian vào sự kiện
        });
    }
}