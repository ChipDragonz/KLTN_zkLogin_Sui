module document_vault::vault {
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table}; // Thêm Table để tra cứu mã băm

    // --- MÃ LỖI ---
    const EHashAlreadyExists: u64 = 0;

    // --- CẤU TRÚC DỮ LIỆU ---

    // Registry này sẽ là một Shared Object để mọi người dùng chung
    struct VaultRegistry has key {
        id: UID,
        // Lưu mã băm (String) và địa chỉ người đầu tiên công chứng nó
        hashes: Table<String, address> 
    }

    struct DocumentRecord has key, store {
        id: UID,
        owner: address,
        hash_value: String,
        file_name: String,
        description: String,
        timestamp: u64,
    }

    struct HashStored has copy, drop {
        record_id: address,
        hash_value: String,
        file_name: String,
        description: String,
        timestamp: u64,
    }

    // --- LOGIC ---

    // Hàm init chạy duy nhất 1 lần khi deploy contract
    fun init(ctx: &mut TxContext) {
        let registry = VaultRegistry {
            id: object::new(ctx),
            hashes: table::new(ctx),
        };
        // Chia sẻ object này để ai cũng có thể đọc/ghi vào bảng băm
        transfer::share_object(registry);
    }

    #[allow(lint(public_entry))]
    public entry fun store_hash(
        registry: &mut VaultRegistry, // Nhận Registry vào để kiểm tra
        hash_value: String, 
        file_name: String, 
        description: String, 
        clock: &sui::clock::Clock, 
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);

        // KIỂM TRA TRÙNG LẶP: Nếu mã băm đã tồn tại trong Table thì dừng ngay
        assert!(!table::contains(&registry.hashes, hash_value), EHashAlreadyExists);

        // Nếu chưa tồn tại, thêm vào Table để đánh dấu
        table::add(&mut registry.hashes, hash_value, owner);

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
            description,
            timestamp: sui::clock::timestamp_ms(clock),
        });
    }
}