module document_vault::vault {
    use sui::clock::{Self, Clock};
    use std::string::String;
    use sui::event;

    public struct Document has key, store {
        id: UID,
        file_hash: String,
        creator: address,
        created_at: u64,
    }

    public struct DocumentNotarized has copy, drop {
        document_id: ID,
        file_hash: String,
        creator: address,
    }

    public fun notarize_document(
        file_hash: String,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = ctx.sender();
        let uid = object::new(ctx);
        let doc_id = object::uid_to_inner(&uid);

        let document = Document {
            id: uid,
            file_hash: file_hash,
            creator: sender,
            created_at: clock::timestamp_ms(clock),
        };

        let event_data = DocumentNotarized {
            document_id: doc_id,
            file_hash: file_hash,
            creator: sender,
        };
        event::emit(event_data);

        transfer::public_transfer(document, sender);
    }
}