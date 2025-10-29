import { storage } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export const UploadService = {
  async uploadImageToFirebase(file: File, folder: string = "blog_covers"): Promise<string> {
    try {
      const fileRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      return url;
    } catch (error) {
      console.error("❌ Upload Firebase thất bại:", error);
      throw new Error("Không thể upload ảnh lên Firebase.");
    }
  },
};
