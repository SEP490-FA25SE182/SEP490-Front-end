import { usePayments } from '@/context/PaymentContext';

export default function TransactionPage() {
  const { payments: paymentHistory } = usePayments();

  return (
    <>
      <h1 className="text-xl font-bold text-gray-800 mb-8">LỊCH SỬ THANH TOÁN</h1>
      <div className="space-y-4">
        {paymentHistory.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow hover:shadow-md transition-all">
            <div className="flex flex-col">
              <h3 className="font-bold text-gray-800">{item.title}</h3>
              <p className="text-gray-500 text-sm">Phương thức: {item.method}</p>
              <p className="text-gray-400 text-xs mt-1">{item.date}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg text-purple-600">
                {item.amount.toLocaleString('vi-VN')}₫
              </p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full inline-block mt-1 ${
                  item.status === 'success'
                    ? 'bg-green-100 text-green-600'
                    : item.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-red-100 text-red-600'
                }`}
              >
                {item.status === 'success'
                  ? 'Thành công'
                  : item.status === 'pending'
                  ? 'Đang xử lý'
                  : 'Thất bại'}
              </span>
            </div>
          </div>
        ))}
        {paymentHistory.length === 0 && (
          <p className="text-gray-400 text-center py-8 italic">Bạn chưa có giao dịch nào.</p>
        )}
      </div>
    </>
  );
}
