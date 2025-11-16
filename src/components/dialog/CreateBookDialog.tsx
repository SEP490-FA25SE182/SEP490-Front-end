import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BookCreationWizard from "@/components/author/BookCreationWizard";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const CreateBookDialog: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {/* add class create-book-dialog and inject CSS to force only inputs/textareas to black */}
      <DialogContent className="max-w-3xl w-full create-book-dialog">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Only force form control text color to black inside this dialog.
                 Do NOT override .text-white globally so buttons keep white text. */
              .create-book-dialog input,
              .create-book-dialog input[type="text"],
              .create-book-dialog input[type="email"],
              .create-book-dialog input[type="search"],
              .create-book-dialog textarea,
              .create-book-dialog [contenteditable] {
                color: #000 !important;
                caret-color: #000 !important;
              }
              .create-book-dialog input::placeholder,
              .create-book-dialog textarea::placeholder {
                color: rgba(0,0,0,0.45) !important;
              }
            `,
          }}
        />
        <DialogHeader>
          <DialogTitle>Tạo sách mới</DialogTitle>
        </DialogHeader>

        <div className="mt-2">
          {/* BookCreationWizard có thể emit sự kiện tạo xong — nếu component không expose callback,
              chúng ta truyền as any để tránh lỗi typing; onCreated sẽ được gọi nếu BookCreationWizard gọi */}
          <BookCreationWizard {...({ onCreated: () => { onCreated?.(); onClose(); } } as any)} />
        </div>

        <DialogFooter className="mt-4">
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateBookDialog;