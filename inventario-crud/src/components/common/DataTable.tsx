import React from "react";
import { Table } from "react-bootstrap";

export interface DataTableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  actions?: (item: T) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onRowClick?: (item: T) => void; // Nueva prop
}

function DataTable<T extends { _id?: string }>({
  columns,
  data,
  actions,
  className,
  style,
  onRowClick, // Nueva prop
}: DataTableProps<T>) {
  return (
    <Table striped bordered hover className={className} style={style}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key as string}>{col.label}</th>
          ))}
          {actions && <th>Más</th>}
        </tr>
      </thead>
      <tbody>
        {data.map((item) => (
          <tr 
            key={item._id || JSON.stringify(item)}
            onClick={() => onRowClick?.(item)}
            style={onRowClick ? { cursor: 'pointer' } : undefined}
          >
            {columns.map((col) => (
              <td key={col.key as string}>
                {col.render ? col.render(item) : (item as any)[col.key]}
              </td>
            ))}
            {actions && <td>{actions(item)}</td>}
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default DataTable;