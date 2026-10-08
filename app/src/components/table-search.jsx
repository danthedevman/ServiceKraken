import { Select } from './forms/select.jsx';
import React from 'react';

/** Search all data columns by default, or narrow the same query to one column. */
export function TableSearch({ columns, search, column, onSearch, onColumn }) {
  const searchable = columns.filter((item) => item.key !== 'actions' && item.searchable !== false);
  return (
    <>
      <label className="field-label">
        Search in
        <Select value={column} onChange={(event) => onColumn(event.target.value)}>
          <option value="">All columns</option>
          {searchable.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="field-label min-w-40 flex-1">
        Filter rows
        <input
          type="search"
          value={search}
          maxLength={100}
          placeholder={
            column
              ? `Search ${searchable.find((item) => item.key === column)?.label || 'column'}`
              : 'Search all columns'
          }
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
    </>
  );
}
