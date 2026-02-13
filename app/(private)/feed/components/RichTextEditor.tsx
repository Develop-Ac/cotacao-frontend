"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import {
    MdFormatBold,
    MdFormatItalic,
    MdFormatUnderlined,
    MdFormatSize
} from 'react-icons/md';

// Extensão customizada simples para FontSize
const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() {
        return {
            types: ['textStyle'],
        };
    },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) {
                                return {};
                            }
                            return {
                                style: `font-size: ${attributes.fontSize}`,
                            };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize })
                    .run();
            },
            unsetFontSize: () => ({ chain }) => {
                return chain()
                    .setMark('textStyle', { fontSize: null })
                    .removeEmptyTextStyle()
                    .run();
            },
        };
    },
});

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    placeholder?: string;
}

export default function RichTextEditor({ content, onChange, placeholder }: RichTextEditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextStyle,
            FontSize,
        ],
        content: content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none w-full min-h-[56px] px-5 py-4 text-base text-gray-800 dark:text-white',
            },
        },
    });

    // Sincroniza conteúdo externo (especialmente para limpar após postar)
    useEffect(() => {
        if (editor && content === '' && editor.getHTML() !== '<p></p>') {
            editor.commands.setContent('');
        }
    }, [content, editor]);

    if (!editor) {
        return null;
    }

    const sizes = [
        { label: 'Normal', value: '16px' },
        { label: 'Pequeno', value: '14px' },
        { label: 'Grande', value: '20px' },
        { label: 'Extra Grande', value: '24px' },
    ];

    return (
        <div className="w-full flex flex-col border border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all dark:bg-gray-800 relative">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl sticky top-0 z-20">
                <button
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    disabled={!editor.can().chain().focus().toggleBold().run()}
                    className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/40' : 'text-gray-600 dark:text-gray-400'}`}
                    title="Negrito"
                >
                    <MdFormatBold size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    disabled={!editor.can().chain().focus().toggleItalic().run()}
                    className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/40' : 'text-gray-600 dark:text-gray-400'}`}
                    title="Itálico"
                >
                    <MdFormatItalic size={20} />
                </button>
                <button
                    onClick={() => editor.chain().focus().toggleUnderline().run()}
                    className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${editor.isActive('underline') ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/40' : 'text-gray-600 dark:text-gray-400'}`}
                    title="Sublinhado"
                >
                    <MdFormatUnderlined size={20} />
                </button>

                <div className="w-[1px] h-6 bg-gray-200 dark:bg-gray-700 mx-1" />

                <div className="relative group">
                    <button className="flex items-center gap-1 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400">
                        <MdFormatSize size={20} />
                        <span className="text-xs font-medium">Tamanho</span>
                    </button>
                    <div className="absolute top-full left-0 mt-1 hidden group-hover:flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 py-1 min-w-[120px]">
                        {sizes.map((size) => (
                            <button
                                key={size.value}
                                onClick={() => (editor.commands as any).setFontSize(size.value)}
                                className="px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors"
                            >
                                {size.label}
                            </button>
                        ))}
                        <button
                            onClick={() => (editor.commands as any).unsetFontSize()}
                            className="px-4 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-800 text-red-500 transition-colors"
                        >
                            Resetar
                        </button>
                    </div>
                </div>
            </div>

            {/* Editor Area */}
            <div className="relative">
                <EditorContent
                    editor={editor}
                    className="cursor-text"
                />
                {!content && placeholder && (
                    <div className="absolute top-4 left-5 pointer-events-none text-gray-400 dark:text-gray-500">
                        {placeholder}
                    </div>
                )}
            </div>
        </div>
    );
}
