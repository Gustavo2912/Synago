// src/components/FilterBarCompact.tsx
import { FC } from "react";
import { Download, RotateCcw, Search } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FilterField {
  key: string;
  label: string;
  type: "date" | "number" | "select";
  options?: string[];
}

interface FilterBarCompactProps {
  filters: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  onReset: () => void;
  onExport?: () => void;
  fields: FilterField[];
}

const FilterBarCompact: FC<FilterBarCompactProps> = ({
  filters,
  onChange,
  onReset,
  onExport,
  fields,
}) => {
  const { t } = useLanguage();

  const handleFieldChange = (key: string, value: any) => {
    onChange({
      ...filters,
      [key]: value,
    });
  };

  return (
    <div className="border rounded-md bg-white p-4 shadow-sm space-y-3">
      {/* ROW 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {fields.map((field) => {
          const value = filters[field.key] ?? "";
          const label = t(field.label);

          if (field.type === "select") {
            return (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">{label}</label>

                <select
                  className="border rounded-md px-3 py-2 text-sm bg-white"
                  value={value}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  <option value="">{t("common.all")}</option>

                  {field.options?.map((o) => (
                    <option key={o} value={o}>
                      {t(o)}
                    </option>
                  ))}
                </select>
              </div>
            );
          }

          return (
            <div key={field.key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">{label}</label>

              <input
                type={field.type}
                className="border rounded-md px-3 py-2 text-sm bg-white"
                value={value}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
              />
            </div>
          );
        })}
      </div>

      {/* ROW 2: SEARCH AREA */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 justify-between">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
          {[
            ["searchName", "donations.searchName"],
            ["searchPhone", "donations.searchPhone"],
            ["searchEmail", "donations.searchEmail"],
            ["searchText", "donations.searchText"],
          ].map(([key, label]) => (
            <div key={key} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">{t(label)}</label>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />

                <input
                  type="text"
                  className="border rounded-md pl-8 pr-3 py-2 text-sm bg-white w-full"
                  placeholder={t(label)}
                  value={filters[key] || ""}
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-2 justify-end mt-1">
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-md border text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            {t("common.reset")}
          </button>

          {onExport && (
            <button
              onClick={onExport}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-md border bg-gray-800 text-white text-xs font-medium hover:bg-gray-900"
            >
              <Download className="w-4 h-4" />
              {t("common.export")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterBarCompact;
