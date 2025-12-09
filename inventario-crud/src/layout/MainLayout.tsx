// src/layout/MainLayout.tsx
import { jwtDecode } from "jwt-decode";
import { useEffect, useState } from "react";
import {
    FaBars,
    FaBolt,
    FaBoxes,
    FaBuilding,
    FaCog,
    FaFileAlt,
    FaFileInvoiceDollar,
    FaProjectDiagram,
    FaShoppingCart,
    FaTachometerAlt,
    FaTools,
    FaTruck,
    FaUser,
    FaUsers,
    FaUserTie,
    FaWarehouse
} from "react-icons/fa";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import "./MainLayout.css";

const MainLayout: React.FC<{ username?: string | null, onLogout?: () => void }> = ({ username, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const token = localStorage.getItem('token');

  // Estado para controlar qué dropdown está abierto
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Efecto para manejar transiciones entre páginas
  useEffect(() => {
    setIsLoading(true);
    setIsVisible(false);
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsVisible(true);
    }, 300); // Duración de la transición

    return () => clearTimeout(timer);
  }, [location.pathname]);
  const groupedNavItems = [
    // Dashboard sin agrupar
    {
      label: "Dashboard",
      icon: <FaTachometerAlt size={16} />,
      items: [
        { path: "/dashboard", label: "Dashboard", icon: <FaTachometerAlt size={14} /> },
      ],
    },
    // Solicitudes solo para admin
    ...((token && (jwtDecode(token) as any).isAdmin) ? [{
      label: "Solicitudes",
      icon: <FaFileAlt size={16} />,
      items: [
        { path: "/solicitudes-inventario", label: "Solicitudes de Inventario", icon: <FaFileAlt size={14} /> },
        { path: "/solicitudes-herramientas", label: "Solicitudes de Herramientas", icon: <FaTools size={14} /> },
      ],
    }] : []),
    // Empleados
    {
      label: "Empleados",
      icon: <FaUsers size={16} />,
      items: [
        { path: "/colaboradores", label: "Empleados", icon: <FaUsers size={14} /> },
      ],
    },
    // Guías
    {
      label: "Guías",
      icon: <FaFileAlt size={16} />,
      items: [
        { path: "/guias", label: "Guías", icon: <FaFileAlt size={14} /> },
      ],
    },
    {
      label: "Proyectos",
      icon: <FaProjectDiagram size={16} />,
      items: [
        { path: "/proyectos", label: "Control de Proyectos", icon: <FaProjectDiagram size={14} /> },
        { path: "/ordenes-compra", label: "Órdenes de Compra", icon: <FaShoppingCart size={14} /> },
        { path: "/cotizaciones", label: "Cotizaciones", icon: <FaFileInvoiceDollar size={14} /> },
        { path: "/entregas", label: "Entregas", icon: <FaTruck size={14} /> },
        { path: "/cotizaciones-canalizacion", label: "Presupuesto de Canalización", icon: <FaFileInvoiceDollar size={14} /> },
      ],
    },
    {
      label: "Almacén",
      icon: <FaBoxes size={16} />,
      items: [
        { path: "/inventario", label: "Almacén Interno", icon: <FaWarehouse size={14} /> },
        { path: "/inventarioExterior", label: "Almacén Externo", icon: <FaWarehouse size={14} /> },
        ...((token && !(jwtDecode(token) as any).isAdmin) ? [
          { path: "/solicitudes-inventario", label: "Solicitudes", icon: <FaFileAlt size={14} /> }
        ] : []),
      ],
    },
    {
      label: "Bases de Datos",
      icon: <FaUsers size={16} />,
      items: [
        { path: "/clientes", label: "Clientes", icon: <FaUsers size={14} /> },
        { path: "/proveedores", label: "Proveedores", icon: <FaTruck size={14} /> },
        { path: "/razones-sociales", label: "Razones Sociales", icon: <FaBuilding size={14} /> },
        { path: "/vendedores", label: "Vendedores", icon: <FaUserTie size={14} /> },
        { path: "/mat-elec", label: "Material de Canalización", icon: <FaBolt size={14} /> },
        { path: "/vehiculos", label: "Vehículos", icon: <FaTruck size={14} /> },
      ],
    },
  ];

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <div className="d-flex vh-100">
      {/* Botón hamburguesa para móviles */}
      <button
        className="menu-toggle d-md-none"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label="Mostrar menú"
      >
        <FaBars size={24} />
      </button>
      <nav
        className={`main-nav bg-dark text-white p-3 ${menuOpen ? "open" : ""}`}
      >
        {/* Usuario arriba del menú y del título */}
        {username && (
          <div className="user-info mb-3 text-center border-bottom pb-2 d-flex flex-column align-items-center">
            <div className="d-flex align-items-center justify-content-center gap-2">
              <div className="d-flex align-items-center gap-2">
                <FaUser size={16} />
                <b>{username}</b>
              </div>
              <button
                className="btn btn-link p-0 ms-2"
                title="Configuración de usuario"
                style={{ color: '#495057' }}
                onClick={() => navigate('/usuario')}
              >
                <FaCog size={18} />
              </button>
            </div>
          </div>
        )}
        <h4 className="text-center mb-4">Menú</h4>
        <ul className="nav flex-column">
          {groupedNavItems.map((group) => (
            <li className="nav-item mb-2" key={group.label}>
              {/* Si el grupo tiene solo un elemento, renderizar como link directo */}
              {group.items.length === 1 ? (
                <Link
                  to={group.items[0].path}
                  className={`nav-link text-white d-flex align-items-center gap-2 ${location.pathname === group.items[0].path ? "fw-bold" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  {group.items[0].icon}
                  <span>{group.items[0].label}</span>
                </Link>
              ) : (
                <div
                  onMouseEnter={() => setOpenDropdown(group.label)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <button
                    className="group-toggle btn btn-link text-white w-100 text-start d-flex justify-content-between align-items-center"
                    style={{ textDecoration: 'none' }}
                    onClick={() => setOpenDropdown(openDropdown === group.label ? null : group.label)}
                    aria-expanded={openDropdown === group.label}
                    aria-controls={`dropdown-${group.label}`}
                    type="button"
                  >
                    <div className="d-flex align-items-center gap-2">
                      {group.icon}
                      <span>{group.label}</span>
                    </div>
                    <span className="arrow" style={{ fontSize: 12 }}>▼</span>
                  </button>
                  <ul
                    className={`dropdown-menu nav flex-column${openDropdown === group.label ? ' show' : ''}`}
                    id={`dropdown-${group.label}`}
                  >
                    {group.items.map((item) => (
                      <li className="nav-item mb-1" key={item.path}>
                        <Link
                          to={item.path}
                          className={`nav-link text-white d-flex align-items-center gap-2 ${location.pathname === item.path ? "fw-bold" : ""}`}
                          onClick={() => {
                            setMenuOpen(false);
                            setOpenDropdown(null);
                          }}
                        >
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
        {/* Botón de logout al final */}
        {username && (
          <div className="user-info mt-4 text-center">
            <button className="btn btn-sm btn-danger mt-2" onClick={handleLogout}>Cerrar sesión</button>
          </div>
        )}
      </nav>

      <main className="flex-grow-1 p-4 overflow-auto">
        <div className={`page-content ${isLoading ? 'loading' : 'loaded'}`}>
          {isLoading && (
            <div className="loading-overlay">
              <div className="loading-spinner">
                <div className="spinner"></div>
                <p>Cargando...</p>
              </div>
            </div>
          )}
          <div className={`content-wrapper ${isVisible ? 'fade-in' : 'fade-out'}`}>
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
