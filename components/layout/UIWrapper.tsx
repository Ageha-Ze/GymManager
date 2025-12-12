"use client";
import Sidebar from "./Sidebar";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function UIWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const isAuthPage = pathname === "/login";
  if (isAuthPage) {
    return <>{children}</>;
  }

  const handleMobileSidebarStateChange = (isOpen: boolean) => {
    setMobileSidebarOpen(isOpen && window.innerWidth < 1024);
  };

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <Sidebar onMobileSidebarStateChange={handleMobileSidebarStateChange} />

      {/* Blur overlay for mobile when sidebar is open */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden" />
      )}

      {/* Content area with proper background */}
      <div className={`ml-20 min-h-screen bg-gray-50 transition-all duration-300 ${mobileSidebarOpen ? 'lg:ml-64' : ''} relative z-10`}>
        <main className={`p-4 sm:p-6 transition-all duration-300 min-h-screen ${mobileSidebarOpen ? 'blur-sm lg:blur-none' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
