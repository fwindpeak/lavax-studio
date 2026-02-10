
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    width?: string;
    closeOnBackdropClick?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    width = 'max-w-md',
    closeOnBackdropClick = true
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            // Small delay to allow render before animation starts
            setTimeout(() => setIsAnimating(true), 10);
        } else {
            setIsAnimating(false);
            const timer = setTimeout(() => setIsVisible(false), 300); // Match transition duration
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-300 ${isAnimating ? 'opacity-100' : 'opacity-0'}`}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={closeOnBackdropClick ? onClose : undefined}
            />

            {/* Modal Content */}
            <div
                className={`relative bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden w-full mx-4 flex flex-col transform transition-all duration-300 ${width} ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}
            >
                {/* Header */}
                {(title || onClose) && (
                    <div className="px-5 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                        {title && <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>}
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors ml-auto"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Body */}
                <div className="p-5 text-sm text-neutral-300">
                    {children}
                </div>
            </div>
        </div>
    );
};
