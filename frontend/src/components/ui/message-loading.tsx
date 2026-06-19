export function MessageLoading() {
  return (
    <div className="flex space-x-1.5 items-center h-6 px-2 opacity-70">
      <div className="w-1.5 h-1.5 bg-[#E1E0CC] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-1.5 h-1.5 bg-[#E1E0CC] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-1.5 h-1.5 bg-[#E1E0CC] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
}
