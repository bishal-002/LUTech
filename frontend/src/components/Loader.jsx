
function Loader({ message = "Loading..." }) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-700" />
      <p className="text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

export default Loader;
