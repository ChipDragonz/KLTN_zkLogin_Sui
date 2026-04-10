import styles from "./page.module.css";
import LoginButton from "../components/LoginButton";
import AuthHandler from "../components/AuthHandler"; // Thêm dòng này

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
        
        <LoginButton />
        
        {/* Bộ xử lý sẽ tàng hình cho đến khi bắt được token */}
        <AuthHandler />
      </main>
    </div>
  );
}