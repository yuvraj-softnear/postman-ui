import type { Row } from "../types";
import { newRow } from "../draft";

type Props = {
  rows: Row[];
  onChange: (rows: Row[]) => void;
  keyLabel?: string;
  valueLabel?: string;
  disabled?: boolean;
};

export function KeyValueTable({ rows, onChange, keyLabel = "Key", valueLabel = "Value", disabled }: Props) {
  const update = (id: string, patch: Partial<Row>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  return (
    <div className="kv">
      <div className="kv-head">
        <span />
        <span>{keyLabel}</span>
        <span>{valueLabel}</span>
        <span />
      </div>
      {rows.map((row) => (
        <div className="kv-row" key={row.id}>
          <input
            type="checkbox"
            checked={row.enabled}
            disabled={disabled}
            onChange={(event) => update(row.id, { enabled: event.target.checked })}
            aria-label="Enabled"
          />
          <input
            value={row.key}
            disabled={disabled}
            placeholder={keyLabel}
            onChange={(event) => update(row.id, { key: event.target.value })}
          />
          <input
            value={row.value}
            disabled={disabled}
            placeholder={valueLabel}
            onChange={(event) => update(row.id, { value: event.target.value })}
          />
          <button
            type="button"
            className="icon-button"
            disabled={disabled}
            onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
            aria-label="Remove row"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="text-button" disabled={disabled} onClick={() => onChange([...rows, newRow()])}>
        Add row
      </button>
    </div>
  );
}
