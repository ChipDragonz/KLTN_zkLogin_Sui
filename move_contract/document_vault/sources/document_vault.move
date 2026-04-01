module document_vault::document_vault {
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use std::string::{String};

    // Định nghĩa cấu trúc tài liệu lưu trên Blockchain
    public struct Document has key, store {
        id: UID,
        owner: address,
        file_hash: String, // Mã Hash SHA-256 của tài liệu
        description: String,
    }

    // Hàm để tạo và lưu trữ một tài liệu mới
    public entry fun add_document(
        file_hash: String, 
        description: String, 
        ctx: &mut TxContext
    ) {
        let document = Document {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            file_hash,
            description,
        };
        // Chuyển quyền sở hữu tài liệu cho người tạo
        transfer::transfer(document, tx_context::sender(ctx));
    }
}