// COMPACT FILTER BAR

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

export default function FilterBarCompact({
  t,

  search,
  setSearch,

  statusOptions = [],
  statusValue,
  setStatusValue,

  methodOptions = [],
  methodValue,
  setMethodValue,

  currencyOptions = [],
  currencyValue,
  setCurrencyValue,

  campaignOptions = [],
  campaignValue,
  setCampaignValue,

  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,

  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
}) {
  return (
    <div className="p-3 border rounded-md bg-gray-50 space-y-4">

      {/* 🔍 SEARCH */}
      <div className="max-w-sm">
        <label className="text-[11px] font-medium">{t("filters.search")}</label>
        <Input
          className="h-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("filters.searchPlaceholder")}
        />
      </div>

      {/* 🧩 FILTER ROW 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* STATUS */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.status")}</label>
          <Select value={statusValue} onValueChange={setStatusValue}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("filters.any")} />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem className="text-xs" key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* METHOD */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.method")}</label>
          <Select value={methodValue} onValueChange={setMethodValue}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("filters.any")} />
            </SelectTrigger>
            <SelectContent>
              {methodOptions.map((opt) => (
                <SelectItem className="text-xs" key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CURRENCY */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.currency")}</label>
          <Select value={currencyValue} onValueChange={setCurrencyValue}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder={t("filters.any")} />
            </SelectTrigger>
            <SelectContent>
              {currencyOptions.map((opt) => (
                <SelectItem className="text-xs" key={opt.value} value={opt.value}>
                  {t(opt.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* CAMPAIGN */}
        {campaignOptions.length > 0 && (
          <div>
            <label className="text-[11px] font-medium">{t("filters.campaign")}</label>
            <Select value={campaignValue} onValueChange={setCampaignValue}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={t("filters.any")} />
              </SelectTrigger>
              <SelectContent>
                {campaignOptions.map((opt) => (
                  <SelectItem className="text-xs" key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      </div>

      {/* 🗓 DATE & AMOUNT — COMPACT ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* DATE FROM */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.dateFrom")}</label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        {/* DATE TO */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.dateTo")}</label>
          <Input
            type="date"
            className="h-8 text-xs"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        {/* MIN AMOUNT */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.minAmount")}</label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
            placeholder="0"
          />
        </div>

        {/* MAX AMOUNT */}
        <div>
          <label className="text-[11px] font-medium">{t("filters.maxAmount")}</label>
          <Input
            type="number"
            className="h-8 text-xs"
            value={maxAmount}
            onChange={(e) => setMaxAmount(e.target.value)}
            placeholder="50000"
          />
        </div>
      </div>
    </div>
  );
}
