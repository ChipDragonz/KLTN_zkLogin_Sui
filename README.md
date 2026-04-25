# KLTN: Ứng dụng Quản lý Tài liệu Số Toàn vẹn trên Sui Blockchain sử dụng zkLogin

Dự án Khóa luận Tốt nghiệp (KLTN) này xây dựng một hệ thống công chứng tài liệu số (Document Vault) dựa trên Sui Blockchain. 

Người dùng có thể tải lên tài liệu, hệ thống sẽ băm tài liệu đó thành mã `SHA-256` và ghi lại thông tin lên trên Blockchain để đảm bảo tính toàn vẹn (Integrity) và bất biến (Immutability). Sự kiện (Event) được ghi nhận trên chuỗi khối, có thể được tra cứu công khai ở bất kỳ đâu để chứng minh sự tồn tại của tài liệu tại một thời điểm nhất định.

## Các công nghệ sử dụng:
- **Sui Blockchain / Move Language:** Viết Smart Contract xử lý nghiệp vụ, lưu trữ lịch sử mã băm chống giả mạo (Document Record).
- **SvelteKit:** Framework Frontend hiện đại, tối ưu cho UI và UX.
- **Enoki / zkLogin:** Tính năng của Sui giúp xác thực danh tính người dùng thông qua Google mà không cần phải ghi nhớ chuỗi hạt giống (Seed Phrase), tăng cường độ thân thiện cho người dùng Web2.
- **Gas Sponsoring:** Sử dụng kỹ thuật tài trợ phí Gas để người dùng có thể tương tác với hợp đồng mà không cần mua trước SUI token.

## Kiến trúc thư mục:
- `document_vault/`: Chứa mã nguồn Smart Contract viết bằng ngôn ngữ Move.
- `frontend/`: Chứa mã nguồn cho ứng dụng Web SvelteKit.

## Cách chạy dự án

### Chạy Frontend
1. Mở terminal tại thư mục `frontend`
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Chạy môi trường phát triển:
   ```bash
   npm run dev
   ```

### Smart Contract (Move)
1. Cài đặt Sui CLI.
2. Di chuyển đến thư mục `document_vault`.
3. Biên dịch và xuất bản (Deploy) mã nguồn:
   ```bash
   sui move build
   sui client publish --gas-budget 50000000
   ```
4. Cập nhật các địa chỉ trả về vào tệp `.env` trong Frontend.
