import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  getDownloadURL,
  getMetadata,
  getStorage,
  listAll,
  ref as storageRef,
} from "firebase/storage";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AuthorTermsOfUse({ isOpen, onClose }: Props) {
  const [openContract, setOpenContract] = useState(false);

  const [contractImgs, setContractImgs] = useState<
    { url: string; name: string; time: number }[]
  >([]);
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  useEffect(() => {
    if (!openContract) return;

    let cancelled = false;

    const loadContractImages = async () => {
      try {
        setContractLoading(true);
        setContractError(null);
        setContractImgs([]);

        const storage = getStorage();
        const folderRef = storageRef(storage, "contracts");

        const res = await listAll(folderRef);
        const items = res.items ?? [];

        if (items.length === 0) {
          throw new Error("Chưa có ảnh hợp đồng trong thư mục contracts.");
        }

        // Lấy metadata + url cho từng ảnh
        const mapped = await Promise.all(
          items.map(async (it) => {
            const meta = await getMetadata(it);
            const t = meta.updated || meta.timeCreated || "";
            const time = t ? new Date(t).getTime() : 0;
            const url = await getDownloadURL(it);
            return { url, name: it.name, time };
          })
        );

        // sort desc theo thời gian
        mapped.sort((a, b) => b.time - a.time);

        if (!cancelled) setContractImgs(mapped);
      } catch (e: any) {
        if (!cancelled) {
          setContractError(e?.message || "Không thể tải ảnh hợp đồng.");
        }
      } finally {
        if (!cancelled) setContractLoading(false);
      }
    };

    loadContractImages();

    return () => {
      cancelled = true;
    };
  }, [openContract]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
        <DialogContent
          size="lg"
          className="bg-[#111827] text-white border border-white/10 max-w-3xl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg">
              Điều khoản sử dụng dành cho Tác giả
            </DialogTitle>
          </DialogHeader>

          {/* Body */}
          <div className="max-h-[70vh] overflow-auto pr-2 space-y-5 text-sm text-white/80">
            <div className="space-y-1">
              <div>
                <b>Ngày hiệu lực:</b> 22/12/2025
              </div>
              <div>
                <b>Đơn vị vận hành nền tảng:</b> Rookies
              </div>
              <div>
                <b>Đối tượng áp dụng:</b> Người dùng vai trò <b>Tác giả</b>.
              </div>
              <div>
                Bằng việc sử dụng Nền tảng (bao gồm công cụ AI), Bạn xác nhận đã
                đọc, hiểu và đồng ý với Điều khoản này.
              </div>
            </div>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">1. Định nghĩa</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <b>Sách/Nội dung:</b> văn bản, hình ảnh, audio, mô hình 3D, quiz,
                  metadata… do Tác giả tạo/tải lên/tạo bằng AI.
                </li>
                <li>
                  <b>Công cụ AI:</b> tính năng tạo <b>audio</b>, <b>ảnh</b>,{" "}
                  <b>3D model</b> bằng trí tuệ nhân tạo.
                </li>
                <li>
                  <b>Ví Rookies:</b> ví điện tử nội bộ của Tác giả dùng để thanh
                  toán phí dịch vụ.
                </li>
                <li>
                  <b>Phí tạo nội dung AI:</b> số tiền trừ từ Ví Rookies khi Tác giả
                  yêu cầu tạo nội dung bằng AI.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                2. Điều kiện tài khoản và trách nhiệm của Tác giả
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cung cấp thông tin đăng ký chính xác và cập nhật khi thay đổi.</li>
                <li>
                  Chịu trách nhiệm bảo mật tài khoản và mọi hoạt động phát sinh từ
                  tài khoản.
                </li>
                <li>Không chia sẻ/cho thuê/chuyển nhượng tài khoản trái phép.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                3. Quyền và nghĩa vụ khi tạo sách
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Có thể tạo/chỉnh sửa/xuất bản/gỡ xuất bản/xóa sách theo cơ chế
                  Nền tảng (tùy trạng thái xét duyệt).
                </li>
                <li>
                  Chịu trách nhiệm về tính chính xác và phù hợp của nội dung trước
                  khi công bố cho người dùng.
                </li>
                <li>
                  Cung cấp thông tin bổ sung khi Nền tảng yêu cầu để hỗ trợ kiểm
                  duyệt hoặc xử lý khiếu nại liên quan đến nội dung.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                4. Sử dụng công cụ AI (Audio/Ảnh/3D Model)
              </h3>

              <div className="space-y-2">
                <h4 className="text-white font-semibold">4.1. Nguyên tắc chung</h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    AI tạo nội dung dựa trên prompt/dữ liệu đầu vào do Bạn cung
                    cấp.
                  </li>
                  <li>
                    Không yêu cầu AI tạo nội dung vi phạm pháp luật, trái đạo đức
                    xã hội, hoặc gây ảnh hưởng tiêu cực đến cộng đồng/người khác.
                  </li>
                  <li>
                    Kết quả AI có thể sai lệch; Bạn cần kiểm tra trước khi xuất bản.
                  </li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-white font-semibold">
                  4.2. Phí sử dụng AI và cơ chế trừ Ví Rookies
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Hệ thống sẽ <b>trừ trực tiếp</b> từ <b>Ví Rookies</b> của chính
                    Tác giả thực hiện thao tác.
                  </li>
                  <li>
                    <b>Mức phí tối thiểu:</b>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                      <li>
                        <b>Tạo Ảnh AI:</b> <b>1.000đ</b> / mỗi lần tạo
                      </li>
                      <li>
                        <b>Tạo 3D Model AI:</b> <b>2.000đ</b> / mỗi lần tạo
                      </li>
                      <li>
                        <b>Tạo audio:</b> <b>Miễn phí năm đầu. Từ năm 2 sẽ tính 1000đ</b>{" "}
                        / mỗi lần tạo
                      </li>
                    </ul>
                  </li>
                  <li>
                    Phí tạo Audio AI (nếu áp dụng) và các tính năng AI khác sẽ hiển
                    thị tại thời điểm tạo hoặc theo bảng phí.
                  </li>
                  <li>Ví không đủ số dư: yêu cầu tạo AI có thể bị từ chối.</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-white font-semibold">
                  4.3. Hoàn phí và xử lý lỗi
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Phí tạo AI có thể <b>không hoàn lại</b> vì chi phí xử lý phát
                    sinh ngay khi chạy tác vụ.
                  </li>
                  <li>
                    Nếu lỗi kỹ thuật từ hệ thống (tạo thất bại/không trả kết quả),
                    Nền tảng có thể hoàn phí hoặc cấp lượt tạo lại tương đương.
                  </li>
                  <li>
                    Từ chối hoàn phí nếu lỗi do dữ liệu đầu vào không hợp lệ, vi
                    phạm điều khoản, hoặc tự ý hủy trong quá trình xử lý.
                  </li>
                </ul>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                5. Nội dung bị cấm và giới hạn sử dụng
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Nội dung vi phạm pháp luật, kích động thù hằn/bạo lực, lừa đảo,
                  bôi nhọ.
                </li>
                <li>
                  Nội dung xâm hại trẻ em; nội dung tình dục liên quan trẻ vị thành
                  niên (nghiêm cấm).
                </li>
                <li>
                  Nội dung gây thù địch, quấy rối, phân biệt đối xử, hoặc cổ súy
                  hành vi nguy hiểm.
                </li>
                <li>
                  Hướng dẫn hành vi nguy hiểm, chế tạo vũ khí, phá hoại hệ thống,
                  spam/mã độc.
                </li>
              </ul>
              <div>
                Nền tảng có quyền gỡ nội dung, khóa tính năng AI hoặc khóa tài
                khoản khi phát hiện vi phạm.
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                6. Kiểm duyệt, trạng thái sách và xử lý vi phạm
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Nền tảng có thể kiểm duyệt trước/sau xuất bản tùy chính sách.</li>
                <li>
                  Khi có khiếu nại, có thể tạm ẩn nội dung để xác minh.
                </li>
                <li>
                  Tác giả phối hợp cung cấp thông tin để xử lý khiếu nại, tranh
                  chấp hoặc yêu cầu từ cơ quan có thẩm quyền (nếu có).
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">7. Giới hạn trách nhiệm</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  AI cung cấp “như hiện có”, không cam kết chính xác hoặc phù hợp
                  mục đích cụ thể.
                </li>
                <li>
                  Nền tảng không chịu trách nhiệm thiệt hại do bạn phụ thuộc vào
                  kết quả AI mà không kiểm tra.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">8. Bảo mật và dữ liệu</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Dữ liệu tài khoản/nội dung/giao dịch Ví Rookies được xử lý theo
                  chính sách bảo mật của Nền tảng.
                </li>
                <li>
                  Prompt và dữ liệu đầu vào có thể được lưu trữ để vận hành/chống
                  gian lận/cải thiện dịch vụ (tùy chính sách).
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                9. Chấm dứt và tạm ngưng
              </h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Bạn có thể ngừng sử dụng theo cơ chế Nền tảng.</li>
                <li>
                  Nền tảng có thể tạm ngưng/chấm dứt nếu vi phạm điều khoản hoặc
                  gây rủi ro.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">10. Sửa đổi điều khoản</h3>
              <div>
                Nền tảng có thể cập nhật điều khoản. Bạn tiếp tục sử dụng nghĩa là
                đồng ý điều khoản mới.
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">
                11. Luật áp dụng và giải quyết tranh chấp
              </h3>
              <div>
                Điều khoản này chịu sự điều chỉnh của pháp luật Việt Nam. Tranh
                chấp ưu tiên thương lượng, sau đó đưa ra cơ quan có thẩm quyền.
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-white font-semibold">12. Liên hệ hỗ trợ</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Email: tuyenctnse182129@fpt.edu.vn</li>
                <li>Hotline: (+84) 334301854</li>
                <li>Địa chỉ: FPT University, District 9, HCMC</li>
              </ul>
            </section>
          </div>

          {/* Footer */}
          <div className="pt-4 flex justify-end gap-2">
            <Button
              onClick={() => setOpenContract(true)}
              className="bg-white/10 hover:bg-white/20 text-white"
            >
              Hợp đồng tác giả
            </Button>

            <Button
              onClick={onClose}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openContract}
        onOpenChange={(o) => !o && setOpenContract(false)}
      >
        <DialogContent
          size="lg"
          className="bg-[#0b1220] text-white border border-white/10 max-w-4xl"
        >
          <DialogHeader>
            <DialogTitle className="text-lg">Hợp đồng tác giả</DialogTitle>
          </DialogHeader>

          {/* Body: scroll nếu ảnh dài */}
          <div className="max-h-[75vh] overflow-auto pr-2">
            {contractLoading && (
              <div className="text-white/70 text-sm">Đang tải hợp đồng...</div>
            )}

            {!contractLoading && contractError && (
              <div className="text-red-300 text-sm">{contractError}</div>
            )}

            {!contractLoading && !contractError && contractImgs.length === 0 && (
              <div className="text-white/60 text-sm">Không có ảnh hợp đồng.</div>
            )}

            {!contractLoading && !contractError && contractImgs.length > 0 && (
              <div className="space-y-4">
                {contractImgs.map((img, idx) => (
                  <div
                    key={img.url}
                    className="border border-white/10 rounded-md overflow-hidden bg-white/5"
                  >
                    {/* Header nhỏ cho mỗi ảnh (tuỳ thích) */}
                    <div className="px-3 py-2 text-xs text-white/70 flex items-center justify-between border-b border-white/10">
                      <div className="truncate">
                        {idx + 1}. {img.name}
                      </div>
                      <div className="shrink-0 ml-3">
                        {img.time ? new Date(img.time).toLocaleDateString("vi-VN") : "-"}
                      </div>
                    </div>

                    <img
                      src={img.url}
                      alt={`Hợp đồng tác giả ${idx + 1}`}
                      className="w-full h-auto object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>


          <div className="pt-3 flex justify-end">
            <Button
              onClick={() => setOpenContract(false)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}