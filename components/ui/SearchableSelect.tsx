"use client";

import { useState, useRef, useEffect } from "react";

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
}

export function SearchableSelect({ label, value, options, onChange, placeholder }: SearchableSelectProps) {
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

  return (
    <div className="field" ref={containerRef}>
      <span>{label}</span>
      <div className="searchable-select">
        <input
          type="text"
          value={isOpen ? search : value}
          onChange={(e) => setSearch(e.target.value)}
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
              <div className="dropdown-item muted">No results</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
