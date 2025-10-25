import { useState } from "react";
import { Button } from "@/components/ui/button";
import AuthorSidebar from "@/components/author/AuthorSidebar";
import BookCreationWizard from "@/components/author/BookCreationWizard";
import { ArrowLeft } from "lucide-react";

export default function AuthorCreateBook() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#1a1a2e] text-white">
      {/* Sidebar */}
      <AuthorSidebar isOpen={sidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-[#1a2332] shadow-lg border-b border-white/10 flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-white">Tạo sách mới</h1>
          </div>
        </header>

        {/* Main Layout: single-column wizard */}
        <div className="flex flex-1">
          <div className="flex-1 bg-[#1a2332] p-6 overflow-y-auto">
            <BookCreationWizard />
          </div>
        </div>
      </div>
    </div>
  );
}
