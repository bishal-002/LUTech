import { Spinner } from "@astryxdesign/core";

function Loader({ message = "Loading..." }) {
  return (
    <div
      className="flex min-h-48 flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <Spinner size="xl" label={message} />
    </div>
  );
}

export default Loader;
