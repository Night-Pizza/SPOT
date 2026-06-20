import { MenuOutlined, GlobalOutlined, SunOutlined } from '@ant-design/icons';
import { Avatar, Button, Layout, Space, Typography } from 'antd';
import { type ReactNode, useState } from 'react';
import DrawerMenu from './DrawerMenu';

type AppShellProps = {
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <Layout className="app-shell">
            <DrawerMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

            <Layout className="app-layout">
                <header className="app-header">
                    <Space size={18} align="center">
                        <Button
                            className="mobile-menu-button"
                            type="text"
                            icon={<MenuOutlined />}
                            onClick={() => setIsMenuOpen(true)}
                            aria-label="Open navigation"
                        />
                        <div className="brand-lockup header-brand">
                            <img src="/baam-logo.png" alt="" className="brand-mark" />
                            <Typography.Text className="header-title">
                                INNOPOLIS UNIVERSITY
                            </Typography.Text>
                        </div>
                    </Space>

                    <Space size={18} align="center" className="header-actions">
                        <SunOutlined className="header-icon" />
                        <Button className="language-button" icon={<GlobalOutlined />}>
                            EN
                        </Button>
                        <Avatar className="user-avatar">E</Avatar>
                        <Typography.Text className="user-name">Enzhe</Typography.Text>
                    </Space>
                </header>

                <main className={['app-page', pageClassName].filter(Boolean).join(' ')}>
                    {showPageTitle && (
                        <div className="page-heading">
                            <Typography.Title level={1}>{title}</Typography.Title>
                            {subtitle && <Typography.Paragraph>{subtitle}</Typography.Paragraph>}
                        </div>
                    )}
                    {children}
                </main>
            </Layout>
        </Layout>
    );
}
