import { ref, uploadBytes } from "firebase/storage";
import { storage } from "@/firebase";

export const UploadService = {
  async uploadImageToFirebase(file: File, folder: string = "blog"): Promise<string> {
    try {
      const filePath = `${folder}/${Date.now()}_${file.name}`;
      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, file);

      //  Thay vì getDownloadURL → trả về gs://
      const bucket = storage.app.options.storageBucket;
      const gsUrl = `gs://${bucket}/${filePath}`;
      console.log(" Uploaded to Firebase:", gsUrl);

      return gsUrl;
    } catch (err) {
      console.error(" Upload error:", err);
      throw err;
    }
  },
};
