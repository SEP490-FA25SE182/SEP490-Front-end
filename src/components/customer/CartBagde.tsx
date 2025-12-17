import { useCart } from "@/context/CartContext";
import { Link } from "react-router-dom";

export default function CartBadge() {
  const { count } = useCart();

  return (
    <Link
      to="/cart"
      className="
        relative inline-flex items-center
        px-3 py-2 rounded-lg
        hover:bg-white/10 transition
        whitespace-nowrap
        min-w-[90px]
        justify-center
      "
    >
      <span className="text-sm leading-none">Giỏ hàng</span>

      {count > 0 && (
        <span
          className="
            absolute -top-1 -right-1
            min-w-5 h-5 px-1
            rounded-full bg-red-500 text-white
            text-[10px] font-bold
            grid place-items-center
          "
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
