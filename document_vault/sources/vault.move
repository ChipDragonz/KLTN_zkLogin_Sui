module document_vault::vault {
    use std::string::String;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::event;
    use sui::table::{Self, Table}; // Bảng dữ liệu để tra cứu mã băm nhanh chóng

    // =========================================================================
    // MÃ LỖI (ERROR CODES)
    // Các mã lỗi được sử dụng để bắt các trường hợp ngoại lệ trong Smart Contract
    // =========================================================================
    const EHashAlreadyExists: u64 = 0;

    // =========================================================================
    // CẤU TRÚC DỮ LIỆU (DATA STRUCTURES)
    // =========================================================================

    /// Sổ đăng ký chung (VaultRegistry)
    /// Được lưu trữ dưới dạng Shared Object để tất cả người dùng có thể tương tác.
    /// Có nhiệm vụ theo dõi tất cả các mã băm tài liệu đã được công chứng.
    struct VaultRegistry has key {
        id: UID,
        // Bảng ánh xạ: Mã băm tài liệu (String) -> Địa chỉ người công chứng (address)
        hashes: Table<String, address> 
    }

    /// Bản ghi tài liệu (DocumentRecord)
    /// Một Object thuộc sở hữu của người dùng (Owned Object).
    /// Đại diện cho bằng chứng công chứng tài liệu của họ.
        id: UID,
        owner: address,
        hash_value: String,
        file_name: String,
        description: String,
        timestamp: u64,
    }

    /// Sự kiện lưu trữ mã băm (HashStored Event)
    /// Được phát ra (emit) mỗi khi có một tài liệu mới được công chứng thành công.
    /// Giúp cho các ứng dụng (Frontend/Indexer) có thể dễ dàng truy vấn lịch sử.
    struct HashStored has copy, drop {
        record_id: address,
        hash_value: String,
        file_name: String,
        description: String,
        timestamp: u64,
    }

    // =========================================================================
    // LOGIC CHÍNH (MAIN LOGIC)
    // =========================================================================

    /// Hàm khởi tạo (init)
    /// Chỉ được thực thi duy nhất 1 lần khi triển khai (deploy) Smart Contract.
    /// Dùng để tạo ra Sổ đăng ký (VaultRegistry) dùng chung.
    fun init(ctx: &mut TxContext) {
        let registry = VaultRegistry {
            id: object::new(ctx),
            hashes: table::new(ctx),
        };
        // Chia sẻ Object Registry này lên mạng lưới Sui để ai cũng có thể thao tác
        transfer::share_object(registry);
    }

    /// Hàm lưu trữ mã băm (store_hash)
    /// Entry function cho phép người dùng gọi từ bên ngoài để công chứng một tài liệu mới.
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

        // KIỂM TRA TÍNH DUY NHẤT CỦA TÀI LIỆU
        // Sử dụng bảng băm (Table) để kiểm tra xem mã băm này đã từng được lưu hay chưa.
        // Nếu đã tồn tại, giao dịch sẽ bị hủy (abort) ngay lập tức với mã lỗi EHashAlreadyExists.
        assert!(!table::contains(&registry.hashes, hash_value), EHashAlreadyExists);

        // NẾU TÀI LIỆU HỢP LỆ (CHƯA TỒN TẠI):
        // 1. Thêm mã băm vào Sổ đăng ký chung để đánh dấu.
        table::add(&mut registry.hashes, hash_value, owner);

        // 2. Tạo một ID duy nhất cho bản ghi tài liệu (DocumentRecord).
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

        // 4. Chuyển quyền sở hữu Bản ghi (DocumentRecord) cho người dùng đã gửi giao dịch.
        transfer::transfer(record, owner);

        // 5. Phát ra sự kiện (Event) thông báo tài liệu đã được lưu trữ thành công.
        event::emit(HashStored {
            record_id,
            hash_value,
            file_name,
            description,
            timestamp: sui::clock::timestamp_ms(clock),
        });
    }
}