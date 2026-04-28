"use client";

import { useMemo } from "react";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";

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
  const resolvedValue = useMemo((): Option | null => {
    const hit = options.find((o) => o.name === value);
    if (hit) return hit;
    if (allowAdd && value) return { id: value, name: value };
    return null;
  }, [options, value, allowAdd]);

  return (
    <Autocomplete<Option, false, false, boolean>
      freeSolo={Boolean(allowAdd)}
      options={options}
      value={resolvedValue}
      inputValue={value}
      onInputChange={(_, newInputValue) => {
        onChange(newInputValue);
      }}
      onChange={(_, newValue) => {
        if (newValue === null) {
          onChange("");
          return;
        }
        if (typeof newValue === "string") {
          onChange(newValue.trim());
          return;
        }
        onChange(newValue.name);
      }}
      getOptionLabel={(option) => (typeof option === "string" ? option : option.name)}
      isOptionEqualToValue={(a, b) => {
        const an = typeof a === "string" ? a : a.name;
        const bn = typeof b === "string" ? b : b.name;
        return an === bn;
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder || undefined} />
      )}
    />
  );
}
