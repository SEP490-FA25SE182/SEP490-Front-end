import { useState } from 'react';

export default function WalletPage() {
  const [filterType, setFilterType] = useState<'all' | 'received' | 'used'>('all');

  const transactions = [
    { id: 1, title: "Đăng nhập hằng ngày", desc: "Xu từ đăng nhập hằng ngày", date: "00:07 | 19-09-2025", amount: +300, type: "received" },
    { id: 2, title: "Mua truyện", desc: "Thanh toán cho 'Kẻ cắp mặt trăng'", date: "09:30 | 18-09-2025", amount: -200, type: "used" },
    { id: 3, title: "Đăng nhập hằng ngày", desc: "Xu từ đăng nhập hằng ngày", date: "00:05 | 18-09-2025", amount: +300, type: "received" },
  ];

  const filteredTransactions =
    filterType === 'all' ? transactions : transactions.filter((t) => t.type === filterType);

  return (
    <>
      <h1 className="text-xl font-bold text-gray-800 mb-8">VÍ CỦA TÔI</h1>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-yellow-500">300 Xu</h2>
        <p className="text-gray-500 text-sm mt-2">100 Xu sẽ hết vào ngày 19/09/2025</p>
      </div>

      <div className="grid grid-cols-3 border-b border-gray-300 mb-6 text-gray-600 font-semibold text-center">
        {['all', 'received', 'used'].map((tab) => (
          <button
            key={tab}
            onClick={() => setFilterType(tab as any)}
            className={`py-2 transition-all duration-200 ${
              filterType === tab
                ? 'text-purple-600 border-b-2 border-purple-600 font-bold'
                : 'hover:text-purple-400'
            }`}
          >
            {tab === 'all' ? 'Tất cả' : tab === 'received' ? 'Đã nhận' : 'Đã dùng'}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTransactions.map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-200 p-4 shadow hover:shadow-md transition-all">
            <div className="flex items-center gap-4">
              <img src="/coin-x.png" alt="coin" className="w-12 h-12" />
              <div>
                <h3 className="font-bold text-gray-800">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
                <p className="text-gray-400 text-xs mt-1">{item.date}</p>
              </div>
            </div>
            <p className={`font-bold text-lg ${item.amount > 0 ? 'text-yellow-500' : 'text-red-500'}`}>
              {item.amount > 0 ? `+${item.amount}` : item.amount}
            </p>
          </div>
        ))}
        {filteredTransactions.length === 0 && (
          <p className="text-gray-400 text-center py-8 italic">Không có giao dịch nào.</p>
        )}
      </div>
    </>
  );
}
