import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDownloadURL, ref } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const storage = getStorage(app);
export async function resolveFirebaseUrl(url: string): Promise<string> {
  if (!url) return "";

  // Nếu đã là https thì trả về luôn
  if (!url.startsWith("gs://")) return url;

  try {
    const bucket = storage.app.options.storageBucket; // ví dụ: "your-app.appspot.com"

    const path = url.replace(`gs://${bucket}/`, "");

    const fileRef = ref(storage, path);

    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (err) {
    console.error(" Lỗi khi convert Firebase URL:", err);
    return "";
  }
}
