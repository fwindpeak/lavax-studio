import React, { useRef, useState } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useI18n } from '../i18n';

interface EditorProps {
    code: string;
    onChange: (code: string) => void;
    language?: string; // 支持 c, cpp, javascript, python 等
}

export const CodeEditor: React.FC<EditorProps> = ({ 
    code, 
    onChange, 
    language = 'c' // 默认设为 C 语言（根据你之前的关键字推断）
}) => {
    const { t } = useI18n();
    const monaco = useMonaco();
    const editorRef = useRef<any>(null);
    const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });

    // 编辑器加载完成时的回调
    const handleEditorDidMount = (editor: any, monaco: any) => {
        editorRef.current = editor;

        // 定义并应用符合你原 UI 风格的透明暗黑主题
        monaco.editor.defineTheme('my-dark-theme', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
                { token: 'keyword', foreground: 'c084fc', fontStyle: 'bold' },
                { token: 'string', foreground: '4ade80' },
                { token: 'number', foreground: 'fb923c' },
            ],
            colors: {
                'editor.background': '#00000000', // 透明背景，以便透出外层的毛玻璃
                'editor.lineHighlightBackground': '#ffffff10',
                'editorLineNumber.foreground': '#ffffff40',
            }
        });
        monaco.editor.setTheme('my-dark-theme');

        // 监听光标位置变化，更新状态栏
        editor.onDidChangeCursorPosition((e: any) => {
            setCursorPosition({
                line: e.position.lineNumber,
                column: e.position.column
            });
        });
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden border border-white/10 rounded-xl bg-black/40 backdrop-blur-md relative group h-full">
            
            {/* 核心编辑器区域 */}
            <div className="flex-1 overflow-hidden relative pt-2">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    onChange={(value) => onChange(value || '')}
                    onMount={handleEditorDidMount}
                    options={{
                        fontSize: 14,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        stickyScroll: { enabled: false },
                        minimap: { enabled: false }, // 是否开启右侧小地图
                        scrollBeyondLastLine: false,
                        wordWrap: 'on', // 自动换行
                        automaticLayout: true, // 自动响应容器大小变化
                        lineHeight: 24,
                        padding: { top: 16 },
                        renderLineHighlight: 'all',
                        cursorBlinking: 'smooth',
                        smoothScrolling: true,
                    }}
                />
            </div>

            {/* 底部状态栏 */}
            <div className="h-6 bg-white/5 border-t border-white/10 px-4 flex items-center justify-between text-white/50 text-xs font-mono">
                <div>
                    {t?.('lineLabel') || 'Ln'} {cursorPosition.line}, {t?.('columnLabel') || 'Col'} {cursorPosition.column}
                </div>
                <div>
                    {language.toUpperCase()}
                </div>
            </div>
        </div>
    );
};