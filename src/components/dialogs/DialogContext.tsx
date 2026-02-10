
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ConfirmDialog } from './ConfirmDialog';
import { InputDialog } from './InputDialog';

interface DialogContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    prompt: (options: PromptOptions) => Promise<string | null>;
    alert: (message: string, title?: string) => Promise<void>;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface PromptOptions {
    title?: string;
    message?: string;
    defaultValue?: string;
    placeholder?: string;
    confirmText?: string;
    cancelText?: string;
    validation?: (value: string) => string | null;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export const useDialog = () => {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
};

export const DialogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Confirm Dialog State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean;
        options: ConfirmOptions;
        resolve: (value: boolean) => void;
    }>({
        isOpen: false,
        options: { message: '' },
        resolve: () => { },
    });

    // Input Dialog State
    const [inputState, setInputState] = useState<{
        isOpen: boolean;
        options: PromptOptions;
        resolve: (value: string | null) => void;
    }>({
        isOpen: false,
        options: {},
        resolve: () => { },
    });

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setConfirmState({
                isOpen: true,
                options,
                resolve,
            });
        });
    }, []);

    const prompt = useCallback((options: PromptOptions) => {
        return new Promise<string | null>((resolve) => {
            setInputState({
                isOpen: true,
                options,
                resolve,
            });
        });
    }, []);

    const alert = useCallback((message: string, title: string = 'Alert') => {
        return new Promise<void>((resolve) => {
            setConfirmState({
                isOpen: true,
                options: {
                    title,
                    message,
                    confirmText: 'OK',
                    cancelText: '', // Hide cancel button
                },
                resolve: () => resolve(),
            });
        });
    }, []);

    const handleConfirmClose = (result: boolean) => {
        setConfirmState((prev) => ({ ...prev, isOpen: false }));
        confirmState.resolve(result);
    };

    const handleInputClose = (result: string | null) => {
        setInputState((prev) => ({ ...prev, isOpen: false }));
        inputState.resolve(result);
    };

    return (
        <DialogContext.Provider value={{ confirm, prompt, alert }}>
            {children}

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.options.title}
                message={confirmState.options.message}
                confirmText={confirmState.options.confirmText}
                cancelText={confirmState.options.cancelText}
                isDestructive={confirmState.options.isDestructive}
                onConfirm={() => handleConfirmClose(true)}
                onCancel={() => handleConfirmClose(false)}
            />

            <InputDialog
                isOpen={inputState.isOpen}
                title={inputState.options.title}
                message={inputState.options.message}
                defaultValue={inputState.options.defaultValue}
                placeholder={inputState.options.placeholder}
                confirmText={inputState.options.confirmText}
                cancelText={inputState.options.cancelText}
                validation={inputState.options.validation}
                onConfirm={(val) => handleInputClose(val)}
                onCancel={() => handleInputClose(null)}
            />
        </DialogContext.Provider>
    );
};
