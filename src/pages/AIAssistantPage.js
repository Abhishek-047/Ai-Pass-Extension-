import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, Sparkles, Copy, RefreshCw, Shield } from 'lucide-react';
import { useVaultStore } from '@/vault';
import { processAIMessage, generatePassword } from '@/ai';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { copyToClipboard } from '@/utils/helpers';
import { nanoid } from '@/utils/nanoid';
const PRESET_PROMPTS = [
    { label: '🔐 Generate banking password', prompt: 'Generate a strong banking password' },
    { label: '🧠 Memorable password', prompt: 'Generate a memorable strong password' },
    { label: '📊 Audit my vault', prompt: 'Audit my vault health and security score' },
    { label: '💡 Security tip', prompt: 'Give me a security tip' },
    { label: '🔍 How does encryption work?', prompt: 'How does VaultGuard encryption work?' },
];
function PasswordCard({ generated }) {
    const { addToast, settings } = useVaultStore();
    const [copied, setCopied] = useState(false);
    const [newPwd, setNewPwd] = useState(generated);
    const handleRegenerate = () => {
        const result = generatePassword({ length: 20, uppercase: true, lowercase: true, numbers: true, symbols: true, memorable: generated.readable, context: 'general' });
        setNewPwd(result);
    };
    const handleCopy = async () => {
        await copyToClipboard(newPwd.password, settings?.clipboardClearSeconds ?? 15);
        setCopied(true);
        addToast({ type: 'success', title: 'Password copied!', description: `Clipboard clears in ${settings?.clipboardClearSeconds ?? 15}s` });
        setTimeout(() => setCopied(false), 2000);
    };
    const strengthColors = {
        'very-strong': '#4ade80',
        'strong': '#86efac',
        'fair': '#fbbf24',
        'weak': '#f97316',
        'very-weak': '#f87171',
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, style: {
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(139,92,246,0.3)',
            borderRadius: '12px',
            padding: '14px',
            marginTop: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px' }, children: [_jsx(Sparkles, { size: 12, color: "#7c3aed" }), _jsx("span", { style: { fontSize: '11px', color: '#7c3aed', fontWeight: '600' }, children: "AI GENERATED" }), _jsxs("span", { style: { marginLeft: 'auto', fontSize: '11px', color: strengthColors[newPwd.strength], fontWeight: '700' }, children: [newPwd.strength.replace('-', ' '), " \u00B7 ", newPwd.score, "/100"] })] }), _jsx("div", { className: "password-display", children: newPwd.password }), _jsxs("div", { style: { display: 'flex', gap: '8px' }, children: [_jsxs("button", { onClick: handleCopy, className: "btn-secondary", style: { flex: 1, justifyContent: 'center', fontSize: '12px', padding: '8px', gap: '5px', display: 'flex', alignItems: 'center' }, children: [_jsx(Copy, { size: 12 }), copied ? '✓ Copied!' : 'Copy Password'] }), _jsxs("button", { onClick: handleRegenerate, className: "btn-ghost", style: { display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', padding: '8px 12px' }, children: [_jsx(RefreshCw, { size: 12 }), "New"] })] })] }));
}
function ChatMessage({ message }) {
    const isUser = message.role === 'user';
    return (_jsxs(motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.3 }, style: {
            display: 'flex',
            flexDirection: 'column',
            alignItems: isUser ? 'flex-end' : 'flex-start',
            gap: '6px',
        }, children: [!isUser && (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }, children: [_jsx("div", { style: { width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Bot, { size: 12, color: "white" }) }), _jsx("span", { style: { fontSize: '11px', color: '#5a5a7a', fontWeight: '600' }, children: "VaultGuard AI" }), _jsx("span", { style: { fontSize: '10px', color: '#3a3a5a', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '4px', padding: '1px 5px' }, children: "Beta" })] })), _jsx("div", { className: isUser ? 'chat-bubble-user' : 'chat-bubble-ai', children: message.content }), message.generatedPassword && (_jsx("div", { style: { width: '100%', maxWidth: '90%' }, children: _jsx(PasswordCard, { generated: message.generatedPassword }) }))] }));
}
const WELCOME_MESSAGE = {
    id: 'welcome',
    role: 'assistant',
    content: '👋 Hi! I\'m VaultGuard\'s AI security assistant.\n\nI can help you:\n• Generate strong passwords\n• Check if a domain is suspicious\n• Audit your vault health\n• Explain security concepts\n\nWhat can I help you with today?',
    timestamp: Date.now(),
};
export function AIAssistantPage() {
    const { healthReport, items } = useVaultStore();
    const [messages, setMessages] = useState([WELCOME_MESSAGE]);
    const [input, setInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const bottomRef = useRef(null);
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);
    const sendMessage = async (text) => {
        if (!text.trim() || isProcessing)
            return;
        const userMsg = {
            id: nanoid(),
            role: 'user',
            content: text.trim(),
            timestamp: Date.now(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsProcessing(true);
        // Simulate thinking delay for UX
        await new Promise(r => setTimeout(r, 600 + Math.random() * 400));
        const context = healthReport ? {
            vaultItemCount: items.length,
            weakPasswordCount: healthReport.weakPasswords,
            reusedPasswordCount: healthReport.reusedPasswords,
            securityScore: healthReport.securityScore,
        } : undefined;
        const result = processAIMessage(text, context);
        const aiMsg = {
            id: nanoid(),
            role: 'assistant',
            content: result.response,
            timestamp: Date.now(),
            generatedPassword: result.generatedPassword,
        };
        setMessages(prev => [...prev, aiMsg]);
        setIsProcessing(false);
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage(input);
    };
    return (_jsxs("div", { style: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }, children: [_jsx("div", { style: { padding: '20px 20px 0', flexShrink: 0 }, children: _jsxs(motion.div, { variants: staggerContainer, initial: "initial", animate: "animate", children: [_jsxs(motion.div, { variants: staggerItem, style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }, children: [_jsx("div", { style: { width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Bot, { size: 17, color: "white" }) }), _jsxs("div", { children: [_jsxs("h1", { style: { fontSize: '18px', fontWeight: '800', color: '#e8e8f8', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '8px' }, children: ["AI Assistant", _jsx("span", { style: { fontSize: '10px', fontWeight: '600', background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', color: '#a78bfa', padding: '2px 7px', borderRadius: '6px' }, children: "Beta" })] }), _jsx("p", { style: { fontSize: '12px', color: '#4a4a6a' }, children: "Local AI \u2014 passwords never leave your device" })] })] }), _jsxs(motion.div, { variants: staggerItem, style: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '8px', padding: '6px 10px', marginBottom: '14px' }, children: [_jsx(Shield, { size: 11, color: "#4ade80" }), _jsx("span", { style: { fontSize: '11px', color: '#4ade80' }, children: "100% local processing \u00B7 Zero API calls \u00B7 No password exposure" })] }), _jsx(motion.div, { variants: staggerItem, style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }, children: PRESET_PROMPTS.map(p => (_jsx("button", { onClick: () => sendMessage(p.prompt), disabled: isProcessing, style: {
                                    padding: '6px 12px', borderRadius: '8px', fontSize: '11.5px', fontWeight: '500',
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(139,92,246,0.15)',
                                    color: '#7a7a9a',
                                    cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                    transition: 'all 0.15s',
                                }, onMouseEnter: e => {
                                    e.target.style.borderColor = 'rgba(139,92,246,0.4)';
                                    e.target.style.color = '#a78bfa';
                                }, onMouseLeave: e => {
                                    e.target.style.borderColor = 'rgba(139,92,246,0.15)';
                                    e.target.style.color = '#7a7a9a';
                                }, children: p.label }, p.prompt))) }), _jsx("div", { className: "divider" })] }) }), _jsxs("div", { className: "scroll-area", style: { flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }, children: [_jsx(AnimatePresence, { children: messages.map(msg => (_jsx(ChatMessage, { message: msg }, msg.id))) }), isProcessing && (_jsxs(motion.div, { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, style: { display: 'flex', alignItems: 'center', gap: '8px' }, children: [_jsx("div", { style: { width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(Bot, { size: 12, color: "white" }) }), _jsx("div", { style: { display: 'flex', gap: '4px' }, children: [0, 1, 2].map(i => (_jsx(motion.div, { animate: { y: [0, -5, 0] }, transition: { duration: 0.6, repeat: Infinity, delay: i * 0.15 }, style: { width: '6px', height: '6px', borderRadius: '50%', background: '#5a5a7a' } }, i))) })] })), _jsx("div", { ref: bottomRef })] }), _jsx("div", { style: { padding: '12px 20px 16px', flexShrink: 0, borderTop: '1px solid rgba(139,92,246,0.08)' }, children: _jsxs("form", { onSubmit: handleSubmit, style: { display: 'flex', gap: '10px' }, children: [_jsx("input", { className: "input-field", value: input, onChange: e => setInput(e.target.value), placeholder: "Ask anything about security...", style: { flex: 1 }, disabled: isProcessing }), _jsx(motion.button, { type: "submit", className: "btn-primary", disabled: !input.trim() || isProcessing, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, style: { padding: '10px 16px', gap: '6px' }, children: _jsx(Send, { size: 14 }) })] }) })] }));
}
