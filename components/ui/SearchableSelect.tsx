"use client";

import { Select } from "@sovereignsquad/gds/client";
import { useMemo } from "react";

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
  const data = useMemo(() => {
    return options.map((option) => ({ value: option.name, label: option.name }));
  }, [options]);

  const selectValue = useMemo(() => {
    const hit = options.find((o) => o.name === value);
    if (hit) return hit.name;
    if (allowAdd && value.trim()) return value.trim();
    return null;
  }, [options, value, allowAdd]);

  return (
    <Select
      searchable
      clearable
      data={data}
      value={selectValue}
      label={label}
      size="md"
      comboboxProps={{ withinPortal: true }}
      placeholder={placeholder || undefined}
      onSearchChange={(query) => {
        if (allowAdd) {
          onChange(query);
        }
      }}
      searchValue={allowAdd ? value : undefined}
      onChange={(newValue) => {
        if (!newValue) {
          onChange("");
          return;
        }
        onChange(newValue.trim());
      }}
      nothingFoundMessage={placeholder || ""}
    />
  );
}
