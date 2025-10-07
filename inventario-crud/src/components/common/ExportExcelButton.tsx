import React from "react";
import { Button } from "react-bootstrap";
import * as XLSX from "xlsx";

interface ExportExcelButtonProps {
  data: any[];
  fileName?: string;
  sheetName?: string;
  label?: string;
  className?: string;
}

const ExportExcelButton: React.FC<ExportExcelButtonProps> = ({
  data,
  fileName = "export.xlsx",
  sheetName = "Sheet1",
  label = "Exportar Excel",
  className = "",
}) => {
  const handleExport = () => {
    // Procesar los datos para convertir arrays en strings
    const processedData = data.map(item => ({
      ...item,
      // Si el item tiene numerosSerie, conviértelo a string
      numerosSerie: item.numerosSerie ? item.numerosSerie.join(", ") : "",
      // Si hay categorías, también las convertimos
      categorias: item.categorias ? item.categorias.join(", ") : ""
    }));

    const ws = XLSX.utils.json_to_sheet(processedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  };

  return (
    <Button variant="outline-primary" className={className} onClick={handleExport}>
      {label}
    </Button>
  );
};

export default ExportExcelButton;
