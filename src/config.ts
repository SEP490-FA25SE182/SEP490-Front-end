// 1. Đọc biến môi trường từ Vite
const apiUrlFromEnv = import.meta.env.VITE_API_URL;

// 2. Kiểm tra xem biến có tồn tại và hợp lệ không
if (!apiUrlFromEnv) {
  // Nếu biến không được định nghĩa, văng lỗi ngay để lập trình viên biết
  throw new Error("Lỗi nghiêm trọng: Biến môi trường VITE_API_URL chưa được thiết lập trong file .env");
}

// 3. Nếu mọi thứ ổn, export nó ra dưới dạng một hằng số đã được xác định kiểu
export const API_BASE_URL: string = apiUrlFromEnv;

// Bạn cũng có thể gom tất cả vào một object để tiện quản lý
export const config = {
  apiUrl: API_BASE_URL,
  // Thêm các biến khác ở đây
};