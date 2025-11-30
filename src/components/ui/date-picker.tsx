import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Props = {
  value?: string; // yyyy-MM-dd
  onChange: (value: string) => void;
};

export function DatePicker({ value, onChange }: Props) {
  const parsed = value ? new Date(value) : undefined;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between text-left font-normal"
        >
          {parsed ? (
            format(parsed, "dd-MM-yyyy", { locale: vi })
          ) : (
            <span className="text-gray-400">Chọn ngày</span>
          )}
          <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={parsed}
          onSelect={(date) => {
            if (!date) return;
            const iso = date.toISOString().split("T")[0]; // yyyy-MM-dd
            onChange(iso);
          }}
          initialFocus
          locale={vi}
        />
      </PopoverContent>
    </Popover>
  );
}
