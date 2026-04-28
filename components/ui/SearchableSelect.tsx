"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  allowAdd?: boolean;
}

export function SearchableSelect({ label, value, options, onChange, placeholder, allowAdd }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter((option) =>
    option.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && allowAdd && search) {
      onChange(search);
      setIsOpen(false);
      setSearch("");
      e.preventDefault();
    }
  }

  return (
    <div className="field" ref={containerRef}>
      <span>{label}</span>
      <div className="searchable-select">
        <input
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            setIsOpen(true);
            setSearch("");
          }}
          placeholder={placeholder || value || "Select..."}
        />
        {isOpen && (
          <div className="dropdown-menu">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <div
                  key={option.id}
                  className="dropdown-item"
                  onClick={() => {
                    onChange(option.name);
                    setIsOpen(false);
                    setSearch("");
                  }}
                >
                  {option.name}
                </div>
              ))
            ) : (
              allowAdd && search ? (
                <div className="dropdown-item active" onClick={() => {
                  onChange(search);
                  setIsOpen(false);
                  setSearch("");
                }}>
                  Add &quot;{search}&quot; (Press Enter)
                </div>
              ) : (
                <div className="dropdown-item muted">No results</div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
