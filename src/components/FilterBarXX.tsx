import { Input } from "@/components/ui/input";

type Option = { value: string; label: string };

type FilterBarProps = {
  search: string;
  setSearch: (v: string) => void;

  statusOptions?: Option[];
  statusValue?: string;
  setStatusValue?: (v: string) => void;

  methodOptions?: Option[];
  methodValue?: string;
  setMethodValue?: (v: string) => void;

  currencyOptions?: Option[];
  currencyValue?: string;
  setCurrencyValue?: (v: string) => void;

  campaignOptions?: Option[];
  campaignValue?: string;
  setCampaignValue?: (v: string) => void;

  dateFrom?: string;
  setDateFrom?: (v: string) => void;

  dateTo?: string;
  setDateTo?: (v: string) => void;

  minAmount?: string;
  setMinAmount?: (v: string) => void;

  maxAmount?: string;
  setMaxAmount?: (v: string) => void;

  t: (key: string) => string;
};

export default function FilterBar(props: FilterBarProps) {
  const {
    search,
    setSearch,
    statusOptions,
    statusValue,
    setStatusValue,
    methodOptions,
    methodValue,
    setMethodValue,
    currencyOptions,
    currencyValue,
    setCurrencyValue,
    campaignOptions,
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
    t,
  } = props;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* SEARCH */}
      <Input
        placeholder={t("filters.search")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* STATUS */}
      {statusOptions && setStatusValue && (
        <select
          className="border p-2 rounded"
          value={statusValue}
          onChange={(e) => setStatusValue(e.target.value)}
        >
          <option value="">{t("filters.status")}</option>
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.label)}
            </option>
          ))}
        </select>
      )}

      {/* METHOD */}
      {methodOptions && setMethodValue && (
        <select
          className="border p-2 rounded"
          value={methodValue}
          onChange={(e) => setMethodValue(e.target.value)}
        >
          <option value="">{t("filters.method")}</option>
          {methodOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {t(o.label)}
            </option>
          ))}
        </select>
      )}

      {/* CURRENCY */}
      {currencyOptions && setCurrencyValue && (
        <select
          className="border p-2 rounded"
          value={currencyValue}
          onChange={(e) => setCurrencyValue(e.target.value)}
        >
          <option value="">{t("filters.currency")}</option>
          {currencyOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.value}
            </option>
          ))}
        </select>
      )}

      {/* CAMPAIGN */}
      {campaignOptions && setCampaignValue && (
        <select
          className="border p-2 rounded"
          value={campaignValue}
          onChange={(e) => setCampaignValue(e.target.value)}
        >
          <option value="">{t("filters.campaign")}</option>
          {campaignOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}

      {/* DATE FROM */}
      {setDateFrom && (
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          placeholder={t("filters.dateFrom")}
        />
      )}

      {/* DATE TO */}
      {setDateTo && (
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          placeholder={t("filters.dateTo")}
        />
      )}

      {/* MIN AMOUNT */}
      {setMinAmount && (
        <Input
          placeholder={t("filters.minAmount")}
          value={minAmount}
          onChange={(e) => setMinAmount(e.target.value)}
        />
      )}

      {/* MAX AMOUNT */}
      {setMaxAmount && (
        <Input
          placeholder={t("filters.maxAmount")}
          value={maxAmount}
          onChange={(e) => setMaxAmount(e.target.value)}
        />
      )}
    </div>
  );
}
