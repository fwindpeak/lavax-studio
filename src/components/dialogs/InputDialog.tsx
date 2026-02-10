
import React, { useState, useEffect, useRef } from 'react';
import { Modal } from './Modal';

interface InputDialogProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    onConfirm: (value: string) => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    validation?: (value: string) => string | null;
}

export const InputDialog: React.FC<InputDialogProps> = ({
    isOpen,
    title = 'Input Required',
    message,
    defaultValue = '',
    placeholder = '',
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    validation
}) => {
    const [value, setValue] = useState(defaultValue);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setValue(defaultValue);
            setError(null);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen, defaultValue]);

    const handleConfirm = () => {
        if (validation) {
            const err = validation(value);
            if (err) {
                setError(err);
                return;
            }
        }
        onConfirm(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirm();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onCancel}
            title={title}
            width="max-w-sm"
        >
            <div className="space-y-4">
                {message && <p className="text-neutral-300 text-sm">{message}</p>}

                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        value={value}
                        onChange={(e) => {
                            setValue(e.target.value);
                            if (error) setError(null);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        className={`w-full bg-neutral-950 border ${error ? 'border-red-500/50 focus:border-red-500' : 'border-neutral-700 focus:border-blue-500'} rounded-lg px-3 py-2 text-white placeholder-neutral-600 focus:outline-none focus:ring-1 ${error ? 'focus:ring-red-500/20' : 'focus:ring-blue-500/20'} transition-all`}
                    />
                    {error && <p className="text-red-400 text-xs mt-1 absolute -bottom-5 left-0">{error}</p>}
                </div>

                <div className="flex justify-end gap-3 mt-8">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </Modal>
    );
};
