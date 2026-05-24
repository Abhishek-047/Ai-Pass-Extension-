import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Copy, Eye, EyeOff, Trash2, Globe, CreditCard, FileText, User, Filter, ChevronRight } from 'lucide-react';
import { useVaultStore } from '@/vault';
import { staggerContainer, staggerItem } from '@/animations/variants';
import { getFaviconUrl, copyToClipboard, timeAgo, getCategoryIcon } from '@/utils/helpers';
const CATEGORY_FILTERS = [
    { value: null, label: 'All' },
    { value: 'social', label: '🌐 Social' },
    { value: 'finance', label: '🏦 Finance' },
    { value: 'work', label: '💼 Work' },
    { value: 'email', label: '📧 Email' },
    { value: 'shopping', label: '🛒 Shopping' },
    { value: 'entertainment', label: '🎬 Entertainment' },
    { value: 'crypto', label: '₿ Crypto' },
    { value: 'other', label: '🔑 Other' },
];
function ItemTypeIcon({ type }) {
    const icons = {
        login: _jsx(Globe, { size: 16, color: "#a78bfa" }),
        card: _jsx(CreditCard, { size: 16, color: "#67e8f9" }),
        note: _jsx(FileText, { size: 16, color: "#86efac" }),
        identity: _jsx(User, { size: 16, color: "#fbbf24" }),
    };
    return icons[type];
}
function ItemDetail({ item, onClose }) {
    const { getDecryptedPassword, deleteItem, toggleFavorite, settings, addToast } = useVaultStore();
    const [revealed, setRevealed] = useState(false);
    const [password, setPassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [copied, setCopied] = useState(null);
    const handleReveal = async () => {
        if (item.type !== 'login')
            return;
        if (!revealed) {
            const pwd = await getDecryptedPassword(item);
            setPassword(pwd);
        }
        setRevealed(r => !r);
    };
    const handleCopyPassword = async () => {
        if (item.type !== 'login')
            return;
        const pwd = password || await getDecryptedPassword(item);
        await copyToClipboard(pwd, settings?.clipboardClearSeconds ?? 15);
        setCopied('password');
        addToast({ type: 'success', title: 'Copied!', description: `Clipboard clears in ${settings?.clipboardClearSeconds ?? 15}s` });
        setTimeout(() => setCopied(null), 2000);
    };
    const handleCopyUsername = async () => {
        if (item.type !== 'login')
            return;
        await copyToClipboard(item.username);
        setCopied('username');
        addToast({ type: 'success', title: 'Username copied!' });
        setTimeout(() => setCopied(null), 2000);
    };
    const handleDelete = async () => {
        if (!isDeleting) {
            setIsDeleting(true);
            return;
        }
        await deleteItem(item.id);
        onClose();
    };
    return (_jsxs(motion.div, { initial: { opacity: 0, x: 20 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 }, transition: { duration: 0.25 }, className: "glass-card", style: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', height: '100%' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [_jsx("div", { className: "vault-item-icon", style: { width: '44px', height: '44px' }, children: item.type === 'login' ? (_jsx("img", { src: getFaviconUrl(item.website || item.name), alt: item.name, width: 22, height: 22, style: { borderRadius: '4px' }, onError: e => { e.target.style.display = 'none'; } })) : _jsx(ItemTypeIcon, { type: item.type }) }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("h3", { style: { fontSize: '16px', fontWeight: '700', color: '#e8e8f8' }, children: item.name }), item.type === 'login' && _jsx("p", { style: { fontSize: '12px', color: '#5a5a7a' }, children: item.website })] }), _jsx("button", { onClick: () => toggleFavorite(item.id), className: "btn-icon", title: "Toggle favorite", children: _jsx(Star, { size: 14, color: item.favorite ? '#fbbf24' : '#5a5a7a', fill: item.favorite ? '#fbbf24' : 'none' }) }), _jsx("button", { onClick: onClose, className: "btn-ghost", style: { fontSize: '18px', padding: '4px 8px', color: '#5a5a7a' }, children: "\u2715" })] }), _jsx("div", { className: "divider" }), item.type === 'login' && (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: '12px' }, children: [_jsxs("div", { style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: '10px', padding: '12px 14px' }, children: [_jsx("div", { style: { fontSize: '10.5px', color: '#5a5a7a', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.05em' }, children: "EMAIL / USERNAME" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("span", { style: { fontSize: '14px', color: '#e8e8f8' }, children: item.username }), _jsx("button", { onClick: handleCopyUsername, className: "btn-icon", style: { width: '28px', height: '28px' }, children: copied === 'username' ? _jsx("span", { style: { fontSize: '12px' }, children: "\u2713" }) : _jsx(Copy, { size: 12 }) })] })] }), _jsxs("div", { style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: '10px', padding: '12px 14px' }, children: [_jsx("div", { style: { fontSize: '10.5px', color: '#5a5a7a', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.05em' }, children: "PASSWORD" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }, children: [_jsx("span", { style: { fontSize: '15px', color: '#a78bfa', fontFamily: 'monospace', letterSpacing: revealed ? '1px' : '2px', flex: 1 }, children: revealed ? password : '••••••••••••••' }), _jsxs("div", { style: { display: 'flex', gap: '4px' }, children: [_jsx("button", { onClick: handleReveal, className: "btn-icon", style: { width: '28px', height: '28px' }, children: revealed ? _jsx(EyeOff, { size: 12 }) : _jsx(Eye, { size: 12 }) }), _jsx("button", { onClick: handleCopyPassword, className: "btn-icon", style: { width: '28px', height: '28px' }, children: copied === 'password' ? _jsx("span", { style: { fontSize: '12px' }, children: "\u2713" }) : _jsx(Copy, { size: 12 }) })] })] })] }), item.notes && (_jsxs("div", { style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: '10px', padding: '12px 14px' }, children: [_jsx("div", { style: { fontSize: '10.5px', color: '#5a5a7a', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.05em' }, children: "NOTES" }), _jsx("p", { style: { fontSize: '13px', color: '#9494b8', lineHeight: '1.5' }, children: item.notes })] }))] })), item.type === 'note' && (_jsxs("div", { style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: '10px', padding: '14px', flex: 1 }, children: [_jsx("div", { style: { fontSize: '10.5px', color: '#5a5a7a', fontWeight: '600', marginBottom: '8px' }, children: "ENCRYPTED CONTENT" }), _jsx("p", { style: { fontSize: '13px', color: '#9494b8' }, children: "\uD83D\uDD10 Content is encrypted. Decryption available in next update." })] })), item.type === 'identity' && (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '10px' }, children: [
                    ['FIRST NAME', item.firstName],
                    ['LAST NAME', item.lastName],
                    ['EMAIL', item.email],
                    ['PHONE', item.phone],
                    ['COMPANY', item.company],
                ].filter(([, v]) => v).map(([label, value]) => (_jsxs("div", { style: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(139,92,246,0.1)', borderRadius: '10px', padding: '10px 14px' }, children: [_jsx("div", { style: { fontSize: '10px', color: '#5a5a7a', fontWeight: '600', marginBottom: '3px' }, children: label }), _jsx("span", { style: { fontSize: '13.5px', color: '#e8e8f8' }, children: value })] }, label))) })), _jsxs("div", { style: { fontSize: '11px', color: '#3a3a5a' }, children: ["Updated ", timeAgo(item.updatedAt), " \u00B7 ", getCategoryIcon(item.category), " ", item.category] }), _jsxs("button", { onClick: handleDelete, className: "btn-danger", style: { width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '6px', padding: '9px' }, children: [_jsx(Trash2, { size: 13 }), isDeleting ? 'Tap again to confirm delete' : 'Delete Item'] })] }));
}
export function AllItemsPage() {
    const { items, searchQuery, setSearchQuery, activeCategory, setActiveCategory } = useVaultStore();
    const [selectedItem, setSelectedItem] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const filtered = items.filter(item => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = !q ||
            item.name.toLowerCase().includes(q) ||
            (item.type === 'login' && (item.username.toLowerCase().includes(q) ||
                item.website?.toLowerCase().includes(q)));
        const matchesCategory = !activeCategory || item.category === activeCategory;
        return matchesSearch && matchesCategory;
    });
    const favorites = filtered.filter(i => i.favorite);
    const rest = filtered.filter(i => !i.favorite);
    return (_jsxs("div", { style: { flex: 1, display: 'flex', gap: '0', overflow: 'hidden' }, children: [_jsxs("div", { style: { flex: selectedItem ? '0 0 240px' : '1', display: 'flex', flexDirection: 'column', padding: '20px', gap: '14px', overflow: 'hidden', transition: 'flex 0.3s ease' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [_jsx("h1", { style: { fontSize: '20px', fontWeight: '800', color: '#e8e8f8', letterSpacing: '-0.5px' }, children: "All Items" }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '4px' }, children: [_jsx("span", { style: { fontSize: '11px', color: '#4a4a6a', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.15)', borderRadius: '6px', padding: '3px 8px' }, children: items.length }), _jsx("button", { onClick: () => setShowFilters(f => !f), className: "btn-icon", style: { width: '30px', height: '30px' }, children: _jsx(Filter, { size: 13, color: showFilters ? '#7c3aed' : '#5a5a7a' }) })] })] }), _jsxs("div", { className: "search-wrapper", children: [_jsx(Search, { size: 14, className: "search-icon" }), _jsx("input", { className: "input-field", placeholder: "Search vault...", value: searchQuery, onChange: e => setSearchQuery(e.target.value) })] }), _jsx(AnimatePresence, { children: showFilters && (_jsx(motion.div, { initial: { height: 0, opacity: 0 }, animate: { height: 'auto', opacity: 1 }, exit: { height: 0, opacity: 0 }, style: { display: 'flex', flexWrap: 'wrap', gap: '6px', overflow: 'hidden' }, children: CATEGORY_FILTERS.map(f => (_jsx("button", { onClick: () => setActiveCategory(f.value), style: {
                                    padding: '4px 10px', borderRadius: '7px', fontSize: '11px', fontWeight: '500',
                                    border: '1px solid',
                                    borderColor: activeCategory === f.value ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.06)',
                                    background: activeCategory === f.value ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.03)',
                                    color: activeCategory === f.value ? '#a78bfa' : '#5a5a7a',
                                    cursor: 'pointer',
                                    fontFamily: 'Inter, sans-serif',
                                    transition: 'all 0.15s',
                                }, children: f.label }, String(f.value)))) })) }), _jsx("div", { className: "scroll-area", style: { flex: 1 }, children: filtered.length === 0 ? (_jsxs("div", { style: { textAlign: 'center', padding: '32px 16px', color: '#3a3a5a' }, children: [_jsx("div", { style: { fontSize: '36px', marginBottom: '10px' }, children: "\uD83D\uDD0D" }), _jsx("p", { style: { fontSize: '13px', color: '#4a4a6a' }, children: searchQuery ? `No results for "${searchQuery}"` : 'Your vault is empty' })] })) : (_jsxs(motion.div, { variants: staggerContainer, initial: "initial", animate: "animate", style: { display: 'flex', flexDirection: 'column', gap: '2px' }, children: [favorites.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { style: { fontSize: '10.5px', fontWeight: '700', color: '#4a4a6a', letterSpacing: '0.08em', padding: '4px 10px', marginBottom: '2px' }, children: "FAVORITES" }), favorites.map(item => (_jsx(ItemRow, { item: item, selected: selectedItem?.id === item.id, onClick: () => setSelectedItem(item), compact: !!selectedItem }, item.id))), _jsx("div", { style: { margin: '6px 0' }, className: "divider" })] })), rest.length > 0 && (_jsxs(_Fragment, { children: [favorites.length > 0 && _jsx("div", { style: { fontSize: '10.5px', fontWeight: '700', color: '#4a4a6a', letterSpacing: '0.08em', padding: '4px 10px', marginBottom: '2px' }, children: "ALL ITEMS" }), rest.map(item => (_jsx(ItemRow, { item: item, selected: selectedItem?.id === item.id, onClick: () => setSelectedItem(item), compact: !!selectedItem }, item.id)))] }))] })) })] }), _jsx(AnimatePresence, { children: selectedItem && (_jsx("div", { style: { flex: 1, padding: '20px 20px 20px 0', overflow: 'hidden' }, children: _jsx(ItemDetail, { item: selectedItem, onClose: () => setSelectedItem(null) }) })) })] }));
}
function ItemRow({ item, selected, onClick, compact }) {
    return (_jsxs(motion.div, { variants: staggerItem, className: "vault-item", onClick: onClick, style: {
            background: selected ? 'rgba(139,92,246,0.12)' : '',
            borderColor: selected ? 'rgba(139,92,246,0.3)' : 'transparent',
        }, whileHover: { x: 2 }, children: [_jsx("div", { className: "vault-item-icon", children: item.type === 'login' ? (_jsx("img", { src: getFaviconUrl(item.website || item.name), alt: item.name, width: 18, height: 18, style: { borderRadius: '3px' }, onError: e => { e.target.style.display = 'none'; } })) : _jsx(ItemTypeIcon, { type: item.type }) }), _jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [_jsx("div", { style: { fontSize: '13px', fontWeight: '600', color: '#e8e8f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: item.name }), !compact && item.type === 'login' && (_jsx("div", { style: { fontSize: '11.5px', color: '#5a5a7a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }, children: item.username }))] }), item.favorite && !compact && _jsx(Star, { size: 11, color: "#fbbf24", fill: "#fbbf24" }), _jsx(ChevronRight, { size: 13, color: "#3a3a5a" })] }));
}
