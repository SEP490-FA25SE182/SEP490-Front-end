import { useCart } from "@/context/CartContext";
import { ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

export default function CartBadge() {
  const { count } = useCart();
  return (
    <Link to="/cart" className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-white/10 transition">
      <ShoppingCart className="w-5 h-5 text-white" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
