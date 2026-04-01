import { RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

export function LoadingSpinner({ 
  message = "Carregando...", 
  className = "" 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-12 ${className}`}>
      <RefreshCw 
        className="h-8 w-8 animate-spin text-[#253663]" 
        strokeWidth={2}
      />
      <p className="text-sm text-gray-500">
        {message}
      </p>
    </div>
  );
}
