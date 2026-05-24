import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useVaultStore } from '@/vault';
import { toastVariants } from '@/animations/variants';
const ICONS = {
    success: _jsx(CheckCircle, { size: 16, color: "#4ade80" }),
    error: _jsx(XCircle, { size: 16, color: "#f87171" }),
    warning: _jsx(AlertTriangle, { size: 16, color: "#fbbf24" }),
    info: _jsx(Info, { size: 16, color: "#60a5fa" }),
};
const COLORS = {
    success: { border: 'rgba(74,222,128,0.25)', bg: 'rgba(74,222,128,0.07)' },
    error: { border: 'rgba(248,113,113,0.25)', bg: 'rgba(248,113,113,0.07)' },
    warning: { border: 'rgba(251,191,36,0.25)', bg: 'rgba(251,191,36,0.07)' },
    info: { border: 'rgba(96,165,250,0.25)', bg: 'rgba(96,165,250,0.07)' },
};
export function ToastContainer() {
    const { toasts, removeToast } = useVaultStore();
    return (_jsx("div", { style: { position: 'fixed', bottom: '16px', right: '16px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 }, children: _jsx(AnimatePresence, { children: toasts.map(toast => (_jsxs(motion.div, { variants: toastVariants, initial: "initial", animate: "animate", exit: "exit", style: {
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    background: `linear-gradient(135deg, ${COLORS[toast.type].bg}, rgba(13,13,26,0.95))`,
                    border: `1px solid ${COLORS[toast.type].border}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    minWidth: '220px', maxWidth: '300px',
                    backdropFilter: 'blur(20px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }, children: [ICONS[toast.type], _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("p", { style: { fontSize: '13px', fontWeight: '600', color: '#e8e8f8', lineHeight: '1.3' }, children: toast.title }), toast.description && (_jsx("p", { style: { fontSize: '11.5px', color: '#9494b8', marginTop: '3px', lineHeight: '1.4' }, children: toast.description }))] }), _jsx("button", { onClick: () => removeToast(toast.id), style: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#5a5a7a', padding: '2px', display: 'flex', alignItems: 'center', flexShrink: 0 }, children: _jsx(X, { size: 13 }) })] }, toast.id))) }) }));
}
