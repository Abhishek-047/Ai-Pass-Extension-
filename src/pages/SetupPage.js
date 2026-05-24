import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ShieldCheck, AlertTriangle, Check } from 'lucide-react';
import { useVaultStore } from '@/vault';
import { staggerContainer, staggerItem, glowPulse } from '@/animations/variants';
import { estimateEntropy } from '@/crypto';
import { getStrengthColor, getStrengthLabel } from '@/utils/helpers';
function getPasswordScore(password) {
    if (!password)
        return 0;
    const entropy = estimateEntropy(password);
    let score = Math.min(100, Math.round(entropy * 1.5));
    if (!/[A-Z]/.test(password))
        score -= 10;
    if (!/[0-9]/.test(password))
        score -= 10;
    if (!/[^a-zA-Z0-9]/.test(password))
        score -= 15;
    if (password.length < 8)
        score -= 30;
    return Math.max(0, score);
}
const requirements = [
    { label: 'At least 12 characters', test: (p) => p.length >= 12 },
    { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
    { label: 'Number', test: (p) => /[0-9]/.test(p) },
    { label: 'Special character', test: (p) => /[^a-zA-Z0-9]/.test(p) },
];
export function SetupPage() {
    const { setupMasterPassword } = useVaultStore();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState('');
    const score = getPasswordScore(password);
    const strengthColor = getStrengthColor(score);
    const strengthLabel = getStrengthLabel(score);
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!password || isCreating)
            return;
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (score < 40) {
            setError('Please use a stronger master password');
            return;
        }
        setIsCreating(true);
        setError('');
        await setupMasterPassword(password);
        setIsCreating(false);
    };
    return (_jsx("div", { className: "gradient-bg", style: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', overflowY: 'auto' }, children: _jsxs(motion.div, { variants: staggerContainer, initial: "initial", animate: "animate", style: { width: '100%', maxWidth: '340px', display: 'flex', flexDirection: 'column', gap: '24px' }, children: [_jsxs(motion.div, { variants: staggerItem, style: { textAlign: 'center' }, children: [_jsx(motion.div, { variants: glowPulse, animate: "animate", style: { width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }, children: _jsx(ShieldCheck, { size: 30, color: "white" }) }), _jsx("h1", { style: { fontSize: '20px', fontWeight: '800', color: '#e8e8f8', letterSpacing: '-0.4px' }, children: "Create Your Vault" }), _jsxs("p", { style: { fontSize: '13px', color: '#6b6b8f', marginTop: '6px', lineHeight: '1.5' }, children: ["Your master password encrypts everything.", _jsx("br", {}), _jsx("strong", { style: { color: '#f87171' }, children: "Never forget it \u2014 it cannot be recovered." })] })] }), _jsx(motion.div, { variants: staggerItem, className: "glass-card", style: { padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }, children: _jsxs("form", { onSubmit: handleCreate, style: { display: 'flex', flexDirection: 'column', gap: '14px' }, children: [_jsxs("div", { children: [_jsx("label", { style: { fontSize: '12px', fontWeight: '600', color: '#9494b8', marginBottom: '6px', display: 'block' }, children: "Master Password" }), _jsxs("div", { style: { position: 'relative' }, children: [_jsx("input", { type: showPassword ? 'text' : 'password', value: password, onChange: e => setPassword(e.target.value), placeholder: "Create a strong master password", className: "input-field", style: { paddingRight: '44px' }, autoFocus: true }), _jsx("button", { type: "button", onClick: () => setShowPassword(s => !s), style: { position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: '#6b6b8f', display: 'flex', alignItems: 'center' }, children: showPassword ? _jsx(EyeOff, { size: 15 }) : _jsx(Eye, { size: 15 }) })] }), password && (_jsxs(motion.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, style: { marginTop: '8px' }, children: [_jsx("div", { className: "strength-bar", style: { marginBottom: '4px' }, children: _jsx(motion.div, { className: "strength-bar-fill", initial: { width: 0 }, animate: { width: `${score}%`, backgroundColor: strengthColor } }) }), _jsx("span", { style: { fontSize: '11px', color: strengthColor, fontWeight: '600' }, children: strengthLabel })] }))] }), _jsxs("div", { children: [_jsx("label", { style: { fontSize: '12px', fontWeight: '600', color: '#9494b8', marginBottom: '6px', display: 'block' }, children: "Confirm Password" }), _jsx("input", { type: showPassword ? 'text' : 'password', value: confirm, onChange: e => setConfirm(e.target.value), placeholder: "Re-enter your master password", className: "input-field", style: {
                                            borderColor: confirm && password !== confirm ? 'rgba(239,68,68,0.5)' : '',
                                        } })] }), password && (_jsx(motion.div, { initial: { opacity: 0, height: 0 }, animate: { opacity: 1, height: 'auto' }, style: { display: 'flex', flexDirection: 'column', gap: '5px' }, children: requirements.map(req => {
                                    const met = req.test(password);
                                    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '7px' }, children: [_jsx("div", { style: { width: '15px', height: '15px', borderRadius: '50%', background: met ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)', border: `1px solid ${met ? '#22c55e' : '#2a2a4a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, children: met && _jsx(Check, { size: 9, color: "#22c55e", strokeWidth: 3 }) }), _jsx("span", { style: { fontSize: '11.5px', color: met ? '#86efac' : '#5a5a7a' }, children: req.label })] }, req.label));
                                }) })), error && (_jsxs(motion.p, { initial: { opacity: 0 }, animate: { opacity: 1 }, style: { fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(AlertTriangle, { size: 12 }), " ", error] })), _jsx(motion.button, { type: "submit", className: "btn-primary", disabled: !password || !confirm || isCreating, whileHover: { scale: 1.01 }, whileTap: { scale: 0.98 }, style: { width: '100%', justifyContent: 'center', padding: '12px', marginTop: '4px' }, children: isCreating ? 'Creating Vault...' : '🔐 Create Secure Vault' })] }) }), _jsxs(motion.div, { variants: staggerItem, style: { background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px' }, children: [_jsx(AlertTriangle, { size: 14, color: "#fbbf24", style: { flexShrink: 0, marginTop: '1px' } }), _jsxs("p", { style: { fontSize: '11.5px', color: '#9b8a5a', lineHeight: '1.6' }, children: ["Your master password is ", _jsx("strong", { style: { color: '#fbbf24' }, children: "never stored" }), ". If lost, your vault data cannot be recovered. Write it down and store it safely."] })] })] }) }));
}
