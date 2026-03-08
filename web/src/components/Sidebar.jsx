import React, { useEffect, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import {
    LayoutGrid,
    Settings,
    Activity,
    Phone,
    Zap,
    List,
    Columns,
    User,
    UserPlus,
    Building,
    FileText,
    Link2,
    Shield,
    LogOut,
    ChevronDown,
    ChevronRight,
    Brain
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openMenus, setOpenMenus] = useState({});
    const location = useLocation();
    const navigate = useNavigate();
    const { logout, hasPermission, isAdmin } = useAuth();

    // Map routes to required permissions
    const routePermissions = {
        '/': 'dashboard',
        '/monitoring': 'monitoring',
        '/operation': 'operation',
        '/inverters': 'inverters',
        '/branches': 'branches',
        '/parameters': 'parameters',
        '/employees': 'employees',
        '/customers': 'clients'
    };

    const canAccess = (path) => {
        if (!path) return true;
        if (isAdmin()) return true;
        const requiredPermission = routePermissions[path];
        if (!requiredPermission) return true;
        return hasPermission(requiredPermission);
    };

    const toggleMenu = (menu) => {
        if (isCollapsed) {
            setIsCollapsed(false);
            setTimeout(() => {
                setOpenMenus(prev => ({ ...prev, [menu]: true }));
            }, 100);
        } else {
            setOpenMenus(prev => ({ ...prev, [menu]: !prev[menu] }));
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { icon: LayoutGrid, label: 'Dashboard', path: '/' },
        { icon: Brain, label: 'Visao I.A.', path: '/ai-vision' },
        { icon: Settings, label: 'Painel de Operacao', path: '/operation' },
        { icon: Activity, label: 'Plantas Integradas', path: '/monitoring' },
        {
            icon: Phone,
            label: 'Chamados',
            id: 'chamados',
            submenu: [
                { icon: Zap, label: 'Abertura de chamado', path: '/tickets/new' },
                { icon: List, label: 'Chamados abertos', path: '/tickets' },
                { icon: Columns, label: 'Kanban de chamados', path: '/tickets/kanban' },
            ]
        },
        { icon: User, label: 'Clientes', path: '/customers' },
        {
            icon: UserPlus,
            label: 'Cadastros',
            id: 'cadastros',
            submenu: [
                { icon: Zap, label: 'Inversores', path: '/inverters' },
                { icon: Building, label: 'Filiais', path: '/branches' },
                { icon: FileText, label: 'Parametros', path: '/parameters' },
            ]
        },
        { icon: Shield, label: 'Funcionarios', path: '/employees' },
        {
            icon: Settings,
            label: 'Configuracoes',
            id: 'settings',
            submenu: [
                { icon: Link2, label: 'Integracoes', path: '/settings/integrations' },
                { icon: User, label: 'Atendentes', path: '/settings/employees' },
                { icon: FileText, label: 'Motivos de Chamado', path: '/settings/reasons' },
            ]
        },
    ];

    const getVisibleSubmenu = (submenu = []) => {
        return submenu.filter(subItem => canAccess(subItem.path));
    };

    const visibleMenuItems = menuItems.filter((item) => {
        if (item.submenu) {
            return getVisibleSubmenu(item.submenu).length > 0;
        }
        return canAccess(item.path);
    });

    useEffect(() => {
        const prefetch = () => {
            // Warm-up most used routes right after login/navigation shell is mounted.
            import('../Dashboard');
            import('../pages/OperationPanel');
            import('../pages/TicketList');
            import('../pages/Customers');
            import('../pages/AIVision');
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const id = window.requestIdleCallback(prefetch, { timeout: 2000 });
            return () => window.cancelIdleCallback(id);
        }

        const t = setTimeout(prefetch, 1200);
        return () => clearTimeout(t);
    }, []);

    return (
        <div
            className={cn(
                "flex h-screen flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out relative",
                isCollapsed ? "w-20" : "w-72"
            )}
        >
            {/* Toggle Button */}
            <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="absolute -right-3 top-9 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white z-50"
            >
                {isCollapsed ? (
                    <ChevronRight className="h-3 w-3" />
                ) : (
                    <div className="flex">
                        <ChevronDown className="h-3 w-3 rotate-90" />
                    </div>
                )}
            </button>

            {/* Logo Section */}
            <div className={cn(
                "flex items-center gap-3 px-6 py-6",
                isCollapsed && "justify-center px-2"
            )}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                    <Zap className="h-6 w-6 fill-current" />
                </div>
                {!isCollapsed && (
                    <div className="overflow-hidden whitespace-nowrap">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Gestor Solar</h1>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Sistema de Usinas</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-1 scrollbar-hide">
                {visibleMenuItems.map((item, index) => {
                    const isActive = item.path && location.pathname === item.path;
                    const visibleSubmenu = item.submenu ? getVisibleSubmenu(item.submenu) : [];

                    return (
                        <div key={index}>
                            {item.submenu ? (
                                <div>
                                    <button
                                        onClick={() => toggleMenu(item.id)}
                                        className={cn(
                                            "flex w-full items-center rounded-lg py-3 text-sm font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                                            isCollapsed ? "justify-center px-0" : "justify-between px-4"
                                        )}
                                        title={isCollapsed ? item.label : undefined}
                                    >
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-5 w-5 shrink-0" />
                                            {!isCollapsed && <span>{item.label}</span>}
                                        </div>
                                        {!isCollapsed && (
                                            openMenus[item.id] ? (
                                                <ChevronDown className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                            )
                                        )}
                                    </button>

                                    {/* Submenu - Only show if NOT collapsed */}
                                    {!isCollapsed && openMenus[item.id] && (
                                        <div className="mt-1 space-y-1 px-2">
                                            {visibleSubmenu.map((subItem, subIndex) => (
                                                subItem.path ? (
                                                    <Link
                                                        key={subIndex}
                                                        to={subItem.path}
                                                        className={cn(
                                                            "flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ml-2",
                                                            location.pathname === subItem.path
                                                                ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                                                                : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                                        )}
                                                    >
                                                        <subItem.icon className={cn("h-4 w-4", location.pathname === subItem.path ? "text-blue-600 dark:text-blue-300" : "text-gray-400 dark:text-gray-500")} />
                                                        {subItem.label}
                                                    </Link>
                                                ) : (
                                                    <button
                                                        key={subIndex}
                                                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ml-2 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                                    >
                                                        <subItem.icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                                                        {subItem.label}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : item.path ? (
                                <Link
                                    to={item.path}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors",
                                        isCollapsed ? "justify-center px-0" : "px-4",
                                        isActive
                                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300"
                                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-blue-600 dark:text-blue-300" : "text-gray-500 dark:text-gray-400")} />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </Link>
                            ) : (
                                <button
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-lg py-3 text-sm font-medium transition-colors text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                                        isCollapsed ? "justify-center px-0" : "px-4"
                                    )}
                                    title={isCollapsed ? item.label : undefined}
                                >
                                    <item.icon className="h-5 w-5 text-gray-500 dark:text-gray-400 shrink-0" />
                                    {!isCollapsed && <span>{item.label}</span>}
                                </button>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <button
                    onClick={handleLogout}
                    className={cn(
                        "flex w-full items-center rounded-lg py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-300 transition-colors group",
                        isCollapsed ? "justify-center px-0" : "justify-center gap-2 px-4"
                    )}
                    title={isCollapsed ? "Sair do Sistema" : undefined}
                >
                    <LogOut className="h-5 w-5 text-red-500 group-hover:text-red-600 shrink-0" />
                    {!isCollapsed && <span>Sair do Sistema</span>}
                </button>
            </div>
        </div>
    );
}

