// src/components/FilterBarCompact.tsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface FilterField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select";
  options?: string[];
}

interface FilterBarCompactProps {
  filters: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onReset: () => void;
  fields: FilterField[];
  onExport?: () => void;
}

export default function FilterBarCompact({
  filters,
  onChange,
  onReset,
  onExport,
  fields,
}: FilterBarCompactProps) {
  const handleChange = (key: string, value: any) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="p-4 border rounded-md bg-white shadow-sm mb-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {fields.map((field) => {
          const currentValue = filters[field.key] ?? "";

          if (field.type === "select") {
            const opts = field.options || [];
            return (
              <div key={field.key} className="space-y-1">
                <label className="text-xs text-gray-600">{field.label}</label>
                <Select
                  value={currentValue || "__all__"}
                  onValueChange={(val) => {
                    handleChange(field.key, val === "__all__" ? "" : val);
                  }}
                >
                  <SelectTrigger className="w-full h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All</SelectItem>

                    {opts
                      .filter((opt) => opt) // remove empty strings
                      .map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            );
          }

          return (
            <div key={field.key} className="space-y-1">
              <label className="text-xs text-gray-600">{field.label}</label>
              <Input
                type={field.type}
                value={currentValue}
                className="h-9"
                onChange={(e) => handleChange(field.key, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <Button variant="outline" onClick={onReset}>
          Reset Filters
        </Button>
        {onExport && (
          <Button onClick={onExport} className="ml-auto">
            Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}
