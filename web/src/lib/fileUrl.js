export function normalizeFileUrl(input) {
    if (!input) return '';

    const value = String(input).trim();
    if (!value) return '';
    if (value.startsWith('/api/uploads/')) return value;
    if (value.startsWith('/uploads/')) return `/api${value}`;
    if (value.startsWith('uploads/')) return `/api/${value}`;

    try {
        const parsed = new URL(value, window.location.origin);
        if (parsed.origin === window.location.origin && parsed.pathname.startsWith('/uploads/')) {
            return `${parsed.origin}/api${parsed.pathname}${parsed.search}${parsed.hash}`;
        }
        return parsed.toString();
    } catch (_) {
        return value;
    }
}

