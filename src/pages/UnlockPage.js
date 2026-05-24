import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, ShieldCheck, Fingerprint } from 'lucide-react';
import { useVaultStore } from '@/vault';
import { staggerContainer, staggerItem, glowPulse } from '@/animations/variants';
export function UnlockPage() {
    const { unlock, isLoading } = useVaultStore();
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [error, setError] = useState('');
    const [shaking, setShaking] = useState(false);
    const handleUnlock = async (e) => {
        e.preventDefault();
        if (!password || isUnlocking)
            return;
        setIsUnlocking(true);
        setError('');
        const success = await unlock(password);
        if (!success) {
            setShaking(true);
            setError('Incorrect master password. Please try again.');
            setTimeout(() => setShaking(false), 600);
        }
        setIsUnlocking(false);
    };
    if (isLoading) {
        return (_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }, children: _jsx(motion.div, { animate: { rotate: 360 }, transition: { duration: 1, repeat: Infinity, ease: 'linear' }, style: { width: 28, height: 28, border: '2px solid #7c3aed', borderTopColor: 'transparent', borderRadius: '50%' } }) }));
    }
    return (_jsxs("div", { className: "gradient-bg", style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', overflow: 'hidden' }, children: [_jsx("div", { style: { position: 'absolute', top: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', pointerEvents: 'none' } }), _jsx("div", { style: { position: 'absolute', bottom: '-60px', right: '-60px', width: '250px', height: '250px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)', pointerEvents: 'none' } }), _jsxs(motion.div, { variants: staggerContainer, initial: "initial", animate: "animate", style: { width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }, children: [_jsxs(motion.div, { variants: staggerItem, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }, children: [_jsxs(motion.div, { variants: glowPulse, animate: "animate", style: {
                                    width: '72px', height: '72px',
                                    borderRadius: '20px',
                                    background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 8px 32px rgba(124,58,237,0.4)',
                                    position: 'relative',
                                }, children: [_jsx(ShieldCheck, { size: 36, color: "white" }), _jsx(motion.div, { animate: { scale: [1, 1.2, 1], opacity: [0.4, 0, 0.4] }, transition: { duration: 3, repeat: Infinity }, style: {
                                            position: 'absolute', inset: '-8px',
                                            border: '1px solid rgba(139,92,246,0.4)',
                                            borderRadius: '28px',
                                        } })] }), _jsxs("div", { style: { textAlign: 'center' }, children: [_jsx("h1", { style: { fontSize: '22px', fontWeight: '800', color: '#e8e8f8', letterSpacing: '-0.5px' }, children: "VaultGuard" }), _jsx("p", { style: { fontSize: '13px', color: '#6b6b8f', marginTop: '4px' }, children: "AI-Powered Password Manager" })] })] }), _jsxs(motion.div, { variants: staggerItem, className: "glass-card", style: { width: '100%', padding: '24px' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }, children: [_jsx(Lock, { size: 15, color: "#7c3aed" }), _jsx("span", { style: { fontSize: '13px', color: '#9494b8', fontWeight: '500' }, children: "Vault is locked" })] }), _jsx("h2", { style: { fontSize: '17px', fontWeight: '700', color: '#e8e8f8', marginBottom: '18px' }, children: "Unlock Your Vault" }), _jsxs("form", { onSubmit: handleUnlock, style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: [_jsxs(motion.div, { animate: shaking ? { x: [-8, 8, -8, 8, -4, 4, 0] } : {}, transition: { duration: 0.5 }, style: { position: 'relative' }, children: [_jsx("input", { type: showPassword ? 'text' : 'password', value: password, onChange: e => setPassword(e.target.value), placeholder: "Master Password", className: "input-field", autoFocus: true, style: { paddingRight: '44px' } }), _jsx("button", { type: "button", onClick: () => setShowPassword(s => !s), className: "btn-icon", style: { position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', width: '30px', height: '30px', background: 'transparent', border: 'none', borderRadius: '6px', padding: '4px' }, children: showPassword ? _jsx(EyeOff, { size: 15, color: "#6b6b8f" }) : _jsx(Eye, { size: 15, color: "#6b6b8f" }) })] }), error && (_jsxs(motion.p, { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 }, style: { fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }, children: ["\u26A0 ", error] })), _jsx(motion.button, { type: "submit", className: "btn-primary", disabled: !password || isUnlocking, whileHover: { scale: 1.01 }, whileTap: { scale: 0.98 }, style: { width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px' }, children: isUnlocking ? (_jsxs(_Fragment, { children: [_jsx(motion.span, { animate: { rotate: 360 }, transition: { duration: 0.8, repeat: Infinity, ease: 'linear' }, style: { display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%' } }), "Unlocking..."] })) : (_jsxs(_Fragment, { children: [_jsx(Lock, { size: 14 }), "Unlock Vault"] })) })] }), _jsxs("div", { style: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(139,92,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }, children: [_jsx(Fingerprint, { size: 16, color: "#5a5a7a" }), _jsx("span", { style: { fontSize: '12px', color: '#5a5a7a' }, children: "Use Biometrics (coming soon)" })] })] }), _jsx(motion.p, { variants: staggerItem, style: { fontSize: '11px', color: '#3a3a5a', textAlign: 'center' }, children: "\uD83D\uDD10 End-to-end encrypted \u2022 Local-first \u2022 Zero-knowledge" })] })] }));
}
