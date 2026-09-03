import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { HospitalGuard } from '@/components/auth/HospitalGuard';
import { RoleGuard } from '@/components/auth/RoleGuard';
import { Layout } from '@/components/layout/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { SeleccionarHospitalPage } from '@/pages/SeleccionarHospitalPage';
import { SuperusuarioPage } from '@/pages/SuperusuarioPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AltaPersonalPage } from '@/pages/AltaPersonalPage';
import { GestionSectoresPage } from '@/pages/GestionSectoresPage';
import { DerivarPacientePage } from '@/pages/DerivarPacientePage';
import { SolicitudesPage } from '@/pages/SolicitudesPage';
import { HistorialAltasPage } from '@/pages/HistorialAltasPage';
import { ROLES } from '@/constants/roles';
import { useAuth } from '@/contexts/AuthContext';

function InicioRedirect() {
  const { loading, persona } = useAuth();
  if (loading) return null;
  if (persona?.es_superusuario) return <Navigate to="/superusuario" replace />;
  return <Navigate to="/dashboard" replace />;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/seleccionar-hospital" element={<SeleccionarHospitalPage />} />
          <Route path="/superusuario" element={<SuperusuarioPage />} />

          <Route element={<HospitalGuard />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/historial" element={<HistorialAltasPage />} />

              <Route element={<RoleGuard allowedRoles={[ROLES.ADMINISTRACION]} />}>
                <Route path="/alta-personal" element={<AltaPersonalPage />} />
                <Route path="/sectores" element={<GestionSectoresPage />} />
              </Route>

              <Route element={<RoleGuard allowedRoles={[ROLES.MEDICO, ROLES.ADMINISTRACION]} />}>
                <Route path="/derivar" element={<DerivarPacientePage />} />
                <Route path="/solicitudes" element={<SolicitudesPage />} />
              </Route>
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<InicioRedirect />} />
        <Route path="*" element={<InicioRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
