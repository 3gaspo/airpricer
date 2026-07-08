import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop with blur */}
      <div 
        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Centered Modal Card */}
      <div className="relative bg-white dark:bg-zinc-900 border border-neutral-100 dark:border-zinc-800 rounded-[32px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] transition-theme z-10 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-zinc-800">
          <h3 className="text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
            {title}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-all active:scale-90"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="overflow-y-auto p-6 flex-1">
          {children}
        </div>
      </div>
    </div>
  );
};
