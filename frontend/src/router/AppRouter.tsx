import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/Login';
import RegisterPage from '../pages/Register';
import DashboardPage from '../pages/Dashboard';
import AttendancePage from '../pages/Attendance';
import SessionsPage from '../pages/Sessions';
import CreateSessionPage from '../pages/CreateSession';
import ActiveSessionPage from '../pages/ActiveSession';
import ProfilePage from '../pages/Profile';
import SettingsPage from '../pages/Settings';

export default function AppRouter() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
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
