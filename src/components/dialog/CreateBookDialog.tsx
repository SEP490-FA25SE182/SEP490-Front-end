import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BookCreationWizard from "@/components/author/BookCreationWizard";
import GenreAddDialog from "@/components/dialog/GenreAddDialog";
import { useNavigate } from "react-router-dom";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void; // vẫn giữ để parent refresh
}

const CreateBookDialog: React.FC<Props> = ({ isOpen, onClose, onCreated }) => {
  const [genreDlgOpen, setGenreDlgOpen] = useState(false);
  const [createdBookId, setCreatedBookId] = useState<string>("");
  const navigate = useNavigate();

  const handleBookCreated = (bookId: string) => {
    setCreatedBookId(bookId);
    // đóng dialog tạo sách
    onClose();
    // mở dialog chọn genre
    setGenreDlgOpen(true);
    // báo cho parent refresh list
    onCreated?.();
  };

  return (
    <>
      {/* Dialog tạo sách */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl w-full create-book-dialog">
          <style
            dangerouslySetInnerHTML={{
              __html: `
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
            {/* Truyền onCreated(bookId) xuống wizard */}
            <BookCreationWizard onCreated={handleBookCreated} />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={onClose}>Đóng</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog gắn thể loại kế tiếp */}
      <GenreAddDialog
        isOpen={genreDlgOpen}
        bookId={createdBookId}
        onClose={() => setGenreDlgOpen(false)}
        onSaved={() => {
          // Sau khi lưu genre, điều hướng về danh sách sách của tác giả (nếu muốn)
          navigate("/author/authorbooklist");
        }}
      />
    </>
  );
};

export default CreateBookDialog;
