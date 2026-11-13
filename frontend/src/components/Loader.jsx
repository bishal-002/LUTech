
function Loader({ message = "Loading..." }) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      {/* Loading Spinner */}
      <div className="relative flex h-11 w-11 items-center justify-center">
        <div className="absolute h-11 w-11 animate-spin rounded-full border-[3px] border-[#E5E9E5] border-t-[#1A2E26]" />
        <div className="h-2 w-2 rounded-full bg-[#E07A5F]" />
      </div>

      {/* Loading Message */}
      <p className="text-sm font-medium tracking-wide text-[#68766F]">
        {message}
      </p>
    </div>
  );
}

export default Loader;
