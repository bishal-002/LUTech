
import { useState } from "react";
import { Button } from "@astryxdesign/core";

function SearchBar({ onSearch, placeholder = "Search products..." }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.(searchTerm.trim());
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch?.("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      className="flex w-full items-center gap-2 rounded-xl border border-[#E5E9E5] bg-white p-2 shadow-sm"
    >
      <div className="min-w-0 flex-1">
        <input
          type="search"
          aria-label="Search products"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={placeholder}
          className="search-bar-input w-full border-0 bg-transparent px-2 py-2 text-base text-[#20332B] placeholder:text-[#68766F] outline-none ring-0 shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none"
        />
      </div>

      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[#68766F] hover:bg-[#EBF0EB] hover:text-[#20332B]"
          aria-label="Clear search"
        >
          Clear
        </button>
      )}

      <Button
        type="submit"
        label="Search"
        variant="primary"
        size="md"
        className="shrink-0"
      />
    </form>
  );
}

export default SearchBar;
