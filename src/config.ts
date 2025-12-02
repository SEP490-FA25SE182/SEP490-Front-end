// Đọc biến môi trường
const apiRookie = import.meta.env.VITE_API_URL_RK;
const apiAI = import.meta.env.VITE_API_URL_AI;
const apiAR = import.meta.env.VITE_API_URL_AR;

// Validate để tránh lỗi runtime khó debug
if (!apiRookie) {
  throw new Error("Thiếu biến môi trường: VITE_API_URL_RK");
}
if (!apiAI) {
  throw new Error("Thiếu biến môi trường: VITE_API_URL_AI");
}
if (!apiAR) {
  throw new Error("Thiếu biến môi trường: VITE_API_URL_AR");
}

// Export từng URL
export const API_RK = apiRookie;
export const API_AI = apiAI;
export const API_AR = apiAR;

// (Optional) gom thành object dễ dùng
export const API = {
  rookies: API_RK,
  ai: API_AI,
  ar: API_AR,
};
