import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import LoginPage from '../pages/Login';
import RegisterPage from '../pages/Register';
import DashboardPage from '../pages/Dashboard';
import AttendancePage from '../pages/Attendance';
import SessionsPage from '../pages/Sessions';
import CreateSessionPage from '../pages/CreateSession';
import ActiveSessionPage from '../pages/ActiveSession';
import ProfilePage from '../pages/Profile';
import VerificationPage from '../pages/Verification';
import WebAuthVerificationPage from '../pages/WebAuthVerification';
import { useAuth } from '../contexts/AuthContext';

export default function AppRouter() {
    const { user, loading, isWebauthVerified } = useAuth();
    const location = useLocation();

    if (loading) {
        return null;
    }

    const publicPaths = ['/login', '/register'];
    const isPublicPath = publicPaths.includes(location.pathname);

    if (!user.id && !isPublicPath) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user.id && isPublicPath) {
        return <Navigate to="/dashboard" replace />;
    }

    const skippedWebauth = sessionStorage.getItem('spot_webauth_skipped') === 'true';
    const needsWebauth = user.id && user.webauthRegistered && !isWebauthVerified && !skippedWebauth;
    if (needsWebauth && location.pathname !== '/webauth-verify') {
        return <Navigate to="/webauth-verify" state={{ from: location }} replace />;
    }

    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/webauth-verify" element={<WebAuthVerificationPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/attendance/verify" element={<VerificationPage />} />
            <Route path="/sessions" element={<SessionsPage />} />
            <Route path="/sessions/create" element={<CreateSessionPage />} />
            <Route path="/sessions/:sessionId" element={<ActiveSessionPage />} />
            <Route path="/profile" element={<ProfilePage />} />
        </Routes>
    );
}
