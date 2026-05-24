import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVaultStore } from '@/vault';
import { Sidebar } from '@/components/Sidebar';
import { ToastContainer } from '@/components/ToastContainer';
import { AddItemModal } from '@/components/AddItemModal';
import { SetupPage } from '@/pages/SetupPage';
import { UnlockPage } from '@/pages/UnlockPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { AllItemsPage } from '@/pages/AllItemsPage';
import { AIAssistantPage } from '@/pages/AIAssistantPage';
import { SecurityReportPage } from '@/pages/SecurityReportPage';
import { SettingsPage } from '@/pages/SettingsPage';
function App() {
    const { isSetup, isLocked, isLoading, currentPage, initialize } = useVaultStore();
    const [showAddModal, setShowAddModal] = useState(false);
    // Initialize vault state
    useEffect(() => {
        initialize();
    }, [initialize]);
    // Show a loading screen on start
    if (isLoading) {
        return (_jsx("div", { className: "gradient-bg", style: { width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(motion.div, { animate: { rotate: 360 }, transition: { duration: 1, repeat: Infinity, ease: 'linear' }, style: {
                    width: 32,
                    height: 32,
                    border: '3px solid #7c3aed',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                } }) }));
    }
    // Routing before vault is setup
    if (!isSetup) {
        return (_jsxs("div", { style: { width: '100vw', height: '100vh', overflow: 'hidden' }, children: [_jsx(SetupPage, {}), _jsx(ToastContainer, {})] }));
    }
    // Routing when vault is locked
    if (isLocked) {
        return (_jsxs("div", { style: { width: '100vw', height: '100vh', overflow: 'hidden' }, children: [_jsx(UnlockPage, {}), _jsx(ToastContainer, {})] }));
    }
    // Main layout when vault is unlocked
    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return _jsx(DashboardPage, {});
            case 'all-items':
                return _jsx(AllItemsPage, {});
            case 'ai-assistant':
                return _jsx(AIAssistantPage, {});
            case 'security-report':
                return _jsx(SecurityReportPage, {});
            case 'settings':
                return _jsx(SettingsPage, {});
            default:
                return _jsx(DashboardPage, {});
        }
    };
    return (_jsxs("div", { className: "gradient-bg", style: { width: '100vw', height: '100vh', display: 'flex', overflow: 'hidden', position: 'relative' }, children: [_jsx(Sidebar, { onAddItem: () => setShowAddModal(true) }), _jsx("main", { style: { flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }, children: _jsx(AnimatePresence, { mode: "wait", children: _jsx(motion.div, { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 }, transition: { duration: 0.15 }, style: { display: 'flex', flex: 1, height: '100%', overflow: 'hidden' }, children: renderPage() }, currentPage) }) }), showAddModal && (_jsx(AddItemModal, { onClose: () => setShowAddModal(false) })), _jsx(ToastContainer, {})] }));
}
export default App;
