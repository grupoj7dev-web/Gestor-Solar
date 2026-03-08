import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

const NotificationContext = createContext();

export function useNotification() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within NotificationProvider');
    }
    return context;
}

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [confirmDialog, setConfirmDialog] = useState(null);
    const nativeAlertRef = useRef(null);

    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    const addNotification = useCallback((message, type = 'info', duration = 4000) => {
        const id = Date.now() + Math.floor(Math.random() * 1000);
        setNotifications(prev => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                removeNotification(id);
            }, duration);
        }
    }, [removeNotification]);

    const success = useCallback((message, duration) => addNotification(message, 'success', duration), [addNotification]);
    const error = useCallback((message, duration) => addNotification(message, 'error', duration), [addNotification]);
    const info = useCallback((message, duration) => addNotification(message, 'info', duration), [addNotification]);
    const warning = useCallback((message, duration) => addNotification(message, 'warning', duration), [addNotification]);

    const confirm = useCallback((message, onConfirm, onCancel) => {
        return new Promise((resolve) => {
            setConfirmDialog({
                message,
                onConfirm: () => {
                    onConfirm?.();
                    setConfirmDialog(null);
                    resolve(true);
                },
                onCancel: () => {
                    onCancel?.();
                    setConfirmDialog(null);
                    resolve(false);
                }
            });
        });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        nativeAlertRef.current = window.alert;

        window.alert = (message) => {
            const text = typeof message === 'string' ? message : 'Atenção';
            error(text, 5000);
        };

        return () => {
            if (nativeAlertRef.current) {
                window.alert = nativeAlertRef.current;
            }
        };
    }, [error]);

    const value = useMemo(() => ({
        success,
        error,
        info,
        warning,
        confirm
    }), [success, error, info, warning, confirm]);

    return (
        <NotificationContext.Provider value={value}>
            {children}

            <div className="fixed top-4 right-4 z-50 space-y-2">
                {notifications.map(notification => (
                    <Toast
                        key={notification.id}
                        message={notification.message}
                        type={notification.type}
                        onClose={() => removeNotification(notification.id)}
                    />
                ))}
            </div>

            {confirmDialog && (
                <ConfirmDialog
                    message={confirmDialog.message}
                    onConfirm={confirmDialog.onConfirm}
                    onCancel={confirmDialog.onCancel}
                />
            )}
        </NotificationContext.Provider>
    );
}

function Toast({ message, type, onClose }) {
    const styles = {
        success: {
            bg: 'bg-green-50 border-green-200',
            icon: 'text-green-600',
            text: 'text-green-800',
            Icon: CheckCircle
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            icon: 'text-red-600',
            text: 'text-red-800',
            Icon: XCircle
        },
        warning: {
            bg: 'bg-yellow-50 border-yellow-200',
            icon: 'text-yellow-600',
            text: 'text-yellow-800',
            Icon: AlertCircle
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            icon: 'text-blue-600',
            text: 'text-blue-800',
            Icon: AlertCircle
        }
    };

    const style = styles[type] || styles.info;
    const Icon = style.Icon;

    return (
        <div className={`${style.bg} border ${style.text} rounded-xl shadow-lg p-4 min-w-[320px] max-w-md animate-slide-in-right flex items-start gap-3`}>
            <Icon className={`h-5 w-5 ${style.icon} flex-shrink-0 mt-0.5`} />
            <p className="flex-1 text-sm font-medium">{message}</p>
            <button
                onClick={onClose}
                className={`${style.icon} hover:opacity-70 transition-opacity flex-shrink-0`}
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

function ConfirmDialog({ message, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                <div className="flex items-start gap-4 mb-6">
                    <div className="p-3 bg-yellow-100 rounded-full flex-shrink-0">
                        <AlertCircle className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Confirmacao</h3>
                        <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-lg shadow-blue-600/30"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
