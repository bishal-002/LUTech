
import { useState } from "react";

function SearchBar({ onSearch, placeholder = "Search products..." }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch?.(searchTerm.trim());
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch?.("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center gap-2 rounded-xl border border-[#E5E9E5] bg-white p-2 shadow-sm transition-all duration-200 focus-within:border-[#1A2E26] focus-within:ring-2 focus-within:ring-[#1A2E26]/10"
    >
      <span className="pl-2 text-[#68766F]" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </span>

      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        aria-label="Search products"
        className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2.5 text-sm text-[#20332B] outline-none placeholder:text-[#89958D]"
      />

      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="rounded-lg px-3 py-2 text-sm font-medium text-[#68766F] transition-colors hover:bg-[#EBF0EB] hover:text-[#20332B]"
        >
          Clear
        </button>
      )}

      <button
        type="submit"
        className="rounded-lg bg-[#1A2E26] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#294438] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B9533B]"
      >
        Search
      </button>
    </form>
  );
}

export default SearchBar;
