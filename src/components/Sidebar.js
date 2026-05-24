import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { motion } from 'framer-motion';
import { LayoutDashboard, List, ShieldCheck, Bot, Settings, Plus, Lock, ShieldAlert } from 'lucide-react';
import { useVaultStore } from '@/vault';
const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: _jsx(LayoutDashboard, { size: 16 }) },
    { id: 'all-items', label: 'All Items', icon: _jsx(List, { size: 16 }) },
    { id: 'security-report', label: 'Security', icon: _jsx(ShieldAlert, { size: 16 }) },
    { id: 'ai-assistant', label: 'AI Assistant', icon: _jsx(Bot, { size: 16 }) },
    { id: 'settings', label: 'Settings', icon: _jsx(Settings, { size: 16 }) },
];
export function Sidebar({ onAddItem }) {
    const { currentPage, navigate, lock, healthReport } = useVaultStore();
    return (_jsxs("div", { style: {
            width: '180px',
            flexShrink: 0,
            background: 'rgba(10, 10, 22, 0.95)',
            borderRight: '1px solid rgba(139,92,246,0.1)',
            display: 'flex',
            flexDirection: 'column',
            padding: '16px 10px',
            height: '100%',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '9px', padding: '0 4px', marginBottom: '20px' }, children: [_jsx("div", { style: { width: '28px', height: '28px', borderRadius: '8px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: _jsx(ShieldCheck, { size: 15, color: "white" }) }), _jsx("span", { style: { fontSize: '14px', fontWeight: '700', color: '#e8e8f8', letterSpacing: '-0.3px' }, children: "VaultGuard" })] }), _jsxs(motion.button, { className: "btn-primary", onClick: onAddItem, whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 }, style: { width: '100%', justifyContent: 'center', padding: '9px 12px', fontSize: '12.5px', marginBottom: '16px', gap: '6px' }, children: [_jsx(Plus, { size: 14 }), "Add Item"] }), _jsx("nav", { style: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }, children: NAV_ITEMS.map(item => (_jsxs(motion.button, { onClick: () => navigate(item.id), className: `nav-item ${currentPage === item.id ? 'active' : ''}`, whileHover: { x: 2 }, style: { width: '100%', border: currentPage === item.id ? '1px solid rgba(139,92,246,0.2)' : '1px solid transparent' }, children: [item.icon, _jsx("span", { style: { flex: 1, textAlign: 'left' }, children: item.label }), item.id === 'security-report' && healthReport && healthReport.weakPasswords > 0 && (_jsx("span", { style: { background: 'rgba(239,68,68,0.2)', color: '#f87171', fontSize: '10px', fontWeight: '700', padding: '1px 6px', borderRadius: '99px', border: '1px solid rgba(239,68,68,0.3)' }, children: healthReport.weakPasswords }))] }, item.id))) }), _jsxs("div", { style: { borderTop: '1px solid rgba(139,92,246,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '7px', padding: '6px 8px' }, children: [_jsx("div", { style: { width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.5)' } }), _jsx("span", { style: { fontSize: '11px', color: '#5a5a7a' }, children: "Vault Unlocked" })] }), _jsxs(motion.button, { onClick: lock, className: "nav-item", whileHover: { x: 2 }, style: { width: '100%', color: '#5a5a7a', fontSize: '12.5px' }, children: [_jsx(Lock, { size: 14 }), "Lock Vault"] })] })] }));
}
