import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';

interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

const TOOLBAR_BTN = 'px-2 py-1 text-sm rounded hover:bg-accent disabled:opacity-40 transition-colors';

export default function HtmlEditor({ value, onChange, minHeight = 200 }: HtmlEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Image.configure({ inline: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height:${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g. when article loads)
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Image URL');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev ?? '');
    if (url === null) return;
    if (url === '') { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-1 border-b bg-muted/40">
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('bold') ? 'bg-accent font-bold' : ''}`}>B</button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('italic') ? 'bg-accent' : ''}`}><em>I</em></button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('strike') ? 'bg-accent' : ''}`}><s>S</s></button>
        <div className="w-px bg-border mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}`}>H2</button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}`}>H3</button>
        <div className="w-px bg-border mx-1" />
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}>• List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}>1. List</button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`${TOOLBAR_BTN} ${editor.isActive('blockquote') ? 'bg-accent' : ''}`}>" Quote</button>
        <div className="w-px bg-border mx-1" />
        <button type="button" onClick={setLink}
          className={`${TOOLBAR_BTN} ${editor.isActive('link') ? 'bg-accent' : ''}`}>🔗 Link</button>
        <button type="button" onClick={addImage} className={TOOLBAR_BTN}>🖼 Image</button>
        <div className="w-px bg-border mx-1" />
        <button type="button" onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()} className={TOOLBAR_BTN}>↩ Undo</button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()} className={TOOLBAR_BTN}>↪ Redo</button>
      </div>
      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
