import {
    MenuOutlined,
    GlobalOutlined,
    SunOutlined,
    AppstoreOutlined,
    FileTextOutlined,
    CalendarOutlined,
    UserOutlined,
    MoonOutlined,
} from '@ant-design/icons';
import { Button, Space, Typography } from 'antd';
import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';


interface AppShellProps  {
    title: string;
    subtitle?: string;
    showPageTitle?: boolean;
    pageClassName?: string;
    children: ReactNode;
};

export default function AppShell({
    title,
    subtitle,
    showPageTitle = true,
    pageClassName,
    children,
}: AppShellProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading } = useAuth();
    const { theme, toggleTheme, language, setLanguage, t } = useTheme();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const isActive = (path: string) => location.pathname === path;
    const toggleDrawer = () => setDrawerOpen(!drawerOpen);



    const navItems = [
        { key: '/dashboard', icon: <AppstoreOutlined />, labelKey: 'dashboard' },
        { key: '/attendance', icon: <FileTextOutlined />, labelKey: 'attendance' },
        { key: '/sessions', icon: <CalendarOutlined />, labelKey: 'sessions' },
        { key: '/profile', icon: <UserOutlined />, labelKey: 'profile' },
    ];

    const themeIcon = theme === 'light' ? <SunOutlined /> : <MoonOutlined />;
    const userLabel = user.email || (loading ? t('loading') : t('profile'));
    const firstLetter = user.email.charAt(0).toUpperCase() || '?';

    const goToProfile = () => navigate('/profile');

    return (
        <div className="app-shell">
            <div className={`drawer-overlay ${drawerOpen ? 'open' : ''}`} onClick={toggleDrawer} />

            <div className={`drawer-menu ${drawerOpen ? 'open' : ''}`}>
                <div className="drawer-logo-box">
                    <div className="sidebar-brand">
                        <img src="/baam-logo.svg" alt="IU" className="brand-mark" />
                        <div className="sidebar-brand-text">
                            <span>INNOPOLIS</span>
                            <span>UNIVERSITY</span>
                            <strong>SPOT</strong>
                        </div>
                    </div>
                </div>
                <nav className="drawer-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.key}
                            to={item.key}
                            className={`drawer-link ${isActive(item.key) ? 'active' : ''}`}
                            onClick={() => setDrawerOpen(false)}
                        >
                            <span className="drawer-icon">{item.icon}</span>
                            {t(item.labelKey)}
                        </Link>
                    ))}
                </nav>
                <div className="drawer-footer">© 2026 Innopolis University</div>
            </div>

            <div className="app-layout">
                <header className="app-header">
                    <div className="brand-lockup">
                        <Button
                            className="mobile-menu-button"
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={toggleDrawer}
                        />
                        <div className="brand-lockup header-brand">
                            <img src="/baam-logo.svg" alt="IU" className="brand-mark" />
                            <span className="header-university">INNOPOLIS UNIVERSITY</span>
                        </div>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Button
                            type="text"
                            icon={themeIcon}
                            onClick={toggleTheme}
                            className="theme-toggle"
                            style={{ fontSize: 20 }}
                        />

                        <Button
                            className="language-button"
                            icon={<GlobalOutlined />}
                            onClick={() => setLanguage(language === 'en' ? 'ru' : 'en')}
                        >
                            {language.toUpperCase()}
                        </Button>


                        <Space size={10} align="center" style={{ cursor: 'pointer' }} onClick={goToProfile}>
                            <div
                                className="user-avatar"
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: '50%',
                                    background: '#5ec832',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: 18,
                                    textTransform: 'uppercase',
                                }}
                            >
                                {firstLetter}
                            </div>
                            <span className="user-name" style={{ fontWeight: 700 }}>
                                {userLabel}
                            </span>
                        </Space>
                    </div>
                </header>

                <main className={`app-page ${pageClassName}`}>
                    {showPageTitle && (
                        <div className="page-heading">
                            {title && <Typography.Title level={1}>{title}</Typography.Title>}
                            {subtitle && <Typography.Text>{subtitle}</Typography.Text>}
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
}
