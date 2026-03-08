import React, { useEffect, useMemo, useRef, useState } from 'react';

export function VirtualizedList({
    items,
    itemHeight = 72,
    overscan = 6,
    className = '',
    containerClassName = '',
    renderItem,
}) {
    const containerRef = useRef(null);
    const [height, setHeight] = useState(560);
    const [scrollTop, setScrollTop] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        const updateHeight = () => {
            if (!containerRef.current) return;
            setHeight(containerRef.current.clientHeight || 560);
        };

        updateHeight();

        const ro = new ResizeObserver(updateHeight);
        ro.observe(containerRef.current);
        window.addEventListener('resize', updateHeight);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const { startIndex, endIndex, topSpacer, bottomSpacer, visibleItems } = useMemo(() => {
        const total = items.length;
        const visibleCount = Math.ceil(height / itemHeight) + overscan * 2;
        const baseStart = Math.floor(scrollTop / itemHeight);
        const start = Math.max(0, baseStart - overscan);
        const end = Math.min(total, start + visibleCount);
        const top = start * itemHeight;
        const bottom = Math.max(0, (total - end) * itemHeight);
        return {
            startIndex: start,
            endIndex: end,
            topSpacer: top,
            bottomSpacer: bottom,
            visibleItems: items.slice(start, end),
        };
    }, [height, scrollTop, itemHeight, overscan, items]);

    return (
        <div
            ref={containerRef}
            className={containerClassName || 'h-[70vh] overflow-auto'}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
            <div className={className}>
                {topSpacer > 0 && <div style={{ height: topSpacer }} />}
                {visibleItems.map((item, idx) => renderItem(item, startIndex + idx))}
                {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} />}
            </div>
        </div>
    );
}
