import { useParams } from "react-router-dom";
import { useGetPageById } from "@/services/BookManageService";
import ModeratorLayout from "./ModeratorLayout";

export default function ModeratorPageDetail() {
  const { pageId } = useParams<{ pageId: string }>();
  const { data: page, isLoading } = useGetPageById(pageId);

  if (isLoading) return <div className="text-white p-10">Đang tải...</div>;
  if (!page) return <div className="text-red-400 p-10">Không tìm thấy trang</div>;

  const isImage =
    page.content?.includes("firebasestorage.googleapis.com") ||
    page.content?.startsWith("gs://");

  const toImage = (url: string) => {
    if (!url.startsWith("gs://")) return url;
    const bucket = url.split("/")[2];
    const path = url.split("/").slice(3).join("/");
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
      path
    )}?alt=media`;
  };

  return (
    <ModeratorLayout
      title={`Trang ${page.pageNumber}`}
      breadcrumb={[
        { label: "Moderator", to: "/moderator" },
        { label: "Page" },
      ]}
    >
      {isImage ? (
        <img
          src={toImage(page.content)}
          className="max-w-full mx-auto rounded"
        />
      ) : (
        <div className="text-gray-200 whitespace-pre-line">
          {page.content}
        </div>
      )}
    </ModeratorLayout>
  );
}
