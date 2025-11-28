import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ModeratorLayout from "./ModeratorLayout";
import { getAllPages } from "@/services/BookManageService";

export default function ModeratorPageList() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const [pages, setPages] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getAllPages({ chapterId }).then((res) => {
      const list = Array.isArray(res) ? res : res.content ?? [];
      setPages(list);
    });
  }, [chapterId]);

  return (
    <ModeratorLayout
      title="Danh sách trang"
      breadcrumb={[
        { label: "Moderator", to: "/moderator" },
        { label: "Pages" },
      ]}
    >
      <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
        {pages.map((p) => (
          <div
            key={p.pageId}
            onClick={() => navigate(`/moderator/pages/${p.pageId}`)}
            className="bg-white/5 p-2 rounded text-center cursor-pointer"
          >
            Trang {p.pageNumber}
          </div>
        ))}
      </div>
    </ModeratorLayout>
  );
}
