import styles from "./page.module.css";
import LoginButton from "../components/LoginButton"; // Import component vừa tạo

export default function Home() {
  return (
    <div className={styles.mainContainer}>
      <main className={styles.contentWrapper}>
        <h1 className={styles.title}>
          Hệ thống Document Vault
        </h1>
        <p className={styles.subtitle}>
          Nền tảng lưu trữ và xác thực tài liệu an toàn trên Sui Blockchain
        </p>
        
        {/* Nhúng nút đăng nhập vào đây */}
        <LoginButton />
      </main>
    </div>
  );
}