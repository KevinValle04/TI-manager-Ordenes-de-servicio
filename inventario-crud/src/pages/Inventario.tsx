// src/pages/Dashboard.tsx
import InventarioList from "../components/inventario/InventoryList";

const Inventario: React.FC = () => {
    return (
    <div>
      <h2>Almacén Interno</h2>
      <InventarioList />
    </div>
  );
  };
  
  export default Inventario;
