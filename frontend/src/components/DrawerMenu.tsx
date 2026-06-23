import {
    AppstoreOutlined,
    CalendarOutlined,
    CheckSquareOutlined,
    UserOutlined,
} from '@ant-design/icons';
import { NavLink } from 'react-router-dom';

type DrawerMenuProps = {
    isOpen: boolean;
    onClose: () => void;
};

export default function DrawerMenu({ isOpen, onClose }: DrawerMenuProps) {
    return (
        <>
            <div
                className={isOpen ? 'drawer-overlay open' : 'drawer-overlay'}
                onClick={onClose}
            />

            <aside className={isOpen ? 'drawer-menu open' : 'drawer-menu'}>
                <div className="drawer-logo-box">
                    <div className="brand-lockup sidebar-brand">
                        <img src="/baam-logo.png" alt="" className="brand-mark" />
                        <div className="sidebar-brand-text" aria-label="Innopolis University SPOT">
                            <span>INNOPOLIS</span>
                            <span>UNIVERSITY</span>
                            <strong>SPOT</strong>
                        </div>
                    </div>
                </div>

                <nav className="drawer-nav">
                    <NavLink
                        to="/dashboard"
                        className={({ isActive }) =>
                            isActive ? 'drawer-link active' : 'drawer-link'
                        }
                        onClick={onClose}
                    >
                        <AppstoreOutlined className="drawer-icon" />
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink
                        to="/attendance"
                        className={({ isActive }) =>
                            isActive ? 'drawer-link active' : 'drawer-link'
                        }
                        onClick={onClose}
                    >
                        <CheckSquareOutlined className="drawer-icon" />
                        <span>Attendance</span>
                    </NavLink>

                    <NavLink
                        to="/sessions"
                        className={({ isActive }) =>
                            isActive ? 'drawer-link active' : 'drawer-link'
                        }
                        onClick={onClose}
                    >
                        <CalendarOutlined className="drawer-icon" />
                        <span>Sessions</span>
                    </NavLink>

                    <NavLink
                        to="/profile"
                        className={({ isActive }) =>
                            isActive ? 'drawer-link active' : 'drawer-link'
                        }
                        onClick={onClose}
                    >
                        <UserOutlined className="drawer-icon" />
                        <span>Profile</span>
                    </NavLink>
                </nav>

                <div className="drawer-footer">© 2026 Innopolis University</div>
            </aside>
        </>
    );
}
