import { useParams, useNavigate } from "react-router-dom";
import { useGetPageById } from "@/services/BookManageService";
import { useState, useMemo } from "react";
import { Menu, X, ArrowLeft } from "lucide-react";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import { Button } from "@/components/ui/button";

import {
  useSearchPageIllustrations,
  useGetAllIllustrations,
  useSearchPageAudios,
  useGetAudios,
  type Illustration,
  type PageIllustration,
  type Audio,
  type PageAudio,
} from "@/services/AIService";

import { useSearchMarkers, type Marker } from "@/services/ARService";

const AuthorPageDetail = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { data: page, isLoading, isError } = useGetPageById(pageId);

  // 🔹 lấy relations & illustrations
  const { data: pageIllustrationsResp } = useSearchPageIllustrations();
  const { data: illustrationsResp } = useGetAllIllustrations();
  // 🔹 lấy marker gắn theo page (sử dụng pageId)
  const { data: markersResp } = useSearchMarkers({ pageId });

  // 🔹 lấy quan hệ page-audio + list audio
  const { data: pageAudiosResp } = useSearchPageAudios({ pageId });
  const { data: audiosResp } = useGetAudios();

  const pageIllustrations: PageIllustration[] = useMemo(() => {
    if (!pageIllustrationsResp) return [];
    if (Array.isArray((pageIllustrationsResp as any).content)) {
      return (pageIllustrationsResp as any).content;
    }
    return Array.isArray(pageIllustrationsResp)
      ? (pageIllustrationsResp as PageIllustration[])
      : [];
  }, [pageIllustrationsResp]);

  const illustrations: Illustration[] = useMemo(() => {
    if (!illustrationsResp) return [];
    return Array.isArray(illustrationsResp)
      ? (illustrationsResp as Illustration[])
      : Array.isArray((illustrationsResp as any).content)
        ? ((illustrationsResp as any).content as Illustration[])
        : [];
  }, [illustrationsResp]);

  const markers: Marker[] = useMemo(() => {
    if (!markersResp) return [];
    if (Array.isArray((markersResp as any).content)) {
      return (markersResp as any).content as Marker[];
    }
    return Array.isArray(markersResp) ? (markersResp as Marker[]) : [];
  }, [markersResp]);

  const pageAudios: PageAudio[] = useMemo(() => {
    if (!pageAudiosResp) return [];
    if (Array.isArray((pageAudiosResp as any).content)) {
      return (pageAudiosResp as any).content as PageAudio[];
    }
    return Array.isArray(pageAudiosResp)
      ? (pageAudiosResp as PageAudio[])
      : [];
  }, [pageAudiosResp]);

  const audios: Audio[] = useMemo(() => {
    if (!audiosResp) return [];
    return Array.isArray(audiosResp)
      ? (audiosResp as Audio[])
      : Array.isArray((audiosResp as any).content)
        ? ((audiosResp as any).content as Audio[])
        : [];
  }, [audiosResp]);

  // gộp quan hệ page-audio với thông tin audio
  const pageAudiosWithAudio = useMemo(
    () =>
      pageAudios
        .map((pa: any) => {
          const audioId = pa.audioId || pa.audio?.audioId;
          if (!audioId) return null;

          const audioFromList = audios.find((a) => a.audioId === audioId);
          const audio: any = audioFromList || pa.audio;

          if (!audio || !audio.audioUrl) return null;

          return { rel: pa, audio };
        })
        .filter(Boolean) as { rel: PageAudio; audio: Audio }[],
    [pageAudios, audios]
  );

  // 🔹 helper
  const isImageUrl = (url?: string) => {
    if (!url) return false;
    return (
      url.startsWith("gs://") ||
      url.includes("firebasestorage.googleapis.com") ||
      /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url)
    );
  };

  const getDisplayImageUrl = (url?: string): string => {
    if (!url) return "";
    if (url.startsWith("gs://")) {
      const bucket = url.split("/")[2];
      const path = url.split("/").slice(3).join("/");
      return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(
        path
      )}?alt=media`;
    }
    return url;
  };

  // ✅ TẤT CẢ HOOK nằm trên này, không có hook phía dưới nữa

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
        Đang tải...
      </div>
    );
  }

  if (isError || !page) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0f172a] text-red-400">
        Không thể tải trang này.
      </div>
    );
  }

  // 🔹 Tính imageUrl từ relation nhưng KHÔNG dùng hook
  const imageUrlFromRelation = (() => {
    if (!page.pageId) return undefined;

    // tìm quan hệ theo pageId (hỗ trợ cả dạng có pageId trực tiếp và dạng lồng page.pageId)
    const rel = pageIllustrations.find((pi: any) => {
      const pid = pi.pageId || pi.page?.pageId;
      return pid === page.pageId;
    });

    if (!rel) return undefined;

    // lấy illustrationId từ quan hệ
    const illustrationId =
      (rel as any).illustrationId || (rel as any).illustration?.illustrationId;

    if (!illustrationId) return undefined;

    // ưu tiên lấy từ list illustrations, fallback dùng luôn illustration embed trong rel
    const illuFromList = illustrations.find(
      (it) => it.illustrationId === illustrationId
    );

    const illu: any = illuFromList || (rel as any).illustration;

    return illu?.imageUrl;
  })();


  const contentIsImage = isImageUrl(page.content);
  const finalImageUrl =
    imageUrlFromRelation || (contentIsImage ? page.content : undefined);

  const isImage = page.pageType === "PICTURE" || !!finalImageUrl;
  const displayUrl = finalImageUrl ? getDisplayImageUrl(finalImageUrl) : "";

  console.log("page detail", page);
  console.log("pageIllustrationsResp raw", pageIllustrationsResp);
  console.log("pageIllustrations normalized", pageIllustrations);
  console.log("illustrations normalized", illustrations);


  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <AuthorSidebar isOpen={sidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10">
          <div className="flex items-center px-6 py-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>

            <div className="ml-4 text-white text-lg font-medium">
              Chi tiết trang {page.pageNumber}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="bg-white hover:bg-gray-200 text-gray-800 flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Quay lại
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 bg-[#0f172a] flex flex-col items-center">
          <div className="bg-white/5 border border-white/10 rounded-lg shadow-md p-6 max-w-3xl w-full">
            <h2 className="text-white text-xl font-semibold mb-4 text-center">
              Trang {page.pageNumber}
            </h2>

            {isImage ? (
              finalImageUrl && displayUrl ? (
                <div className="flex justify-center">
                  <img
                    src={displayUrl}
                    alt={`Trang ${page.pageNumber}`}
                    className="rounded-lg shadow-lg max-h-[80vh] object-contain border border-white/20"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.innerHTML =
                        '<p class="text-gray-400 text-sm text-center">Không thể tải ảnh.</p>';
                    }}
                  />
                </div>
              ) : (
                <p className="text-gray-300 text-sm text-center">
                  Trang ảnh (pageType = PICTURE) nhưng chưa tìm được URL ảnh từ
                  quan hệ page-illustration hoặc từ <code>content</code>.
                </p>
              )
            ) : (
              <div
                className="prose prose-invert max-w-none text-gray-200 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html:
                    page.content
                      ?.replace(/\n/g, "<br>")
                      ?.replace(/<b>(.*?)<\/b>/g, "<strong>$1</strong>")
                      ?.replace(/<i>(.*?)<\/i>/g, "<em>$1</em>")
                      ?.replace(/<u>(.*?)<\/u>/g, "<u>$1</u>")
                      ?.replace(/<p>/g, "<p class='mb-3'>") || "",
                }}
              />
            )}

            {/* MARKERS (hiển thị ảnh marker gắn theo pageId) */}
            {markers.length > 0 && (
              <div className="mt-6 flex flex-col items-center">
                <h3 className="text-sm text-gray-300 mb-3 text-center">
                  Marker gắn trên trang
                </h3>
                {markers.map((m) => (
                  <div key={m.markerId ?? m.markerCode} className="w-full max-w-3xl mb-4">
                    <div className="flex justify-center">
                      {m.imageUrl ? (
                        <img
                          src={getDisplayImageUrl(m.imageUrl)}
                          alt={m.markerCode}
                          className="rounded-lg shadow-lg w-full object-contain max-h-[40vh] border border-white/20"
                        />
                      ) : (
                        <div className="w-full h-36 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-300">
                          Không có ảnh
                        </div>
                      )}
                    </div>

                    {/* Thông tin marker trải ngang, bỏ width */}
                    <div className="mt-3 text-xs text-gray-300 flex flex-wrap items-center justify-center gap-6">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Code:</span>
                        <span className="truncate">{m.markerCode}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Type:</span>
                        <span className="truncate">{m.markerType}</span>
                      </div>

                      {m.printablePdfUrl && (
                        <div>
                          <a
                            href={m.printablePdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-300 underline"
                          >
                            Printable PDF
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AUDIOS (preview audio gắn theo pageId) */}
            {pageAudiosWithAudio.length > 0 && (
              <div className="mt-6 flex flex-col items-center">
                <h3 className="text-sm text-gray-300 mb-3 text-center">
                  Audio gắn trên trang
                </h3>

                {pageAudiosWithAudio.map(({ rel, audio }) => (
                  <div
                    key={rel.pageAudioId ?? audio.audioId}
                    className="w-full max-w-3xl mb-4"
                  >
                    <audio
                      controls
                      src={getDisplayImageUrl(audio.audioUrl)}
                      className="w-full"
                    >
                      Trình duyệt của bạn không hỗ trợ thẻ audio.
                    </audio>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthorPageDetail;