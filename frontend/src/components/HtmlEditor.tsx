import React, { useEffect, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Link2Off, Image as ImageIcon,
  Undo2, Redo2,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';

interface HtmlEditorProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  tooltip,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={active ? 'secondary' : 'ghost'}
          size="icon"
          className="h-7 w-7"
          onClick={onClick}
          disabled={disabled}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export default function HtmlEditor({ value, onChange, minHeight = 200 }: HtmlEditorProps) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

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

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  const applyLink = () => {
    if (linkUrl === '') {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().setLink({ href: linkUrl }).run();
    }
    setLinkOpen(false);
    setLinkUrl('');
  };

  const applyImage = () => {
    if (imageUrl) editor.chain().focus().setImage({ src: imageUrl }).run();
    setImageOpen(false);
    setImageUrl('');
  };

  const openLinkPopover = () => {
    setLinkUrl(editor.getAttributes('link').href ?? '');
    setLinkOpen(true);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="border rounded-md overflow-hidden">
        <div className="flex flex-wrap items-center gap-0.5 p-1 border-b bg-muted/40">
          <ToolbarButton tooltip="Bold" active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton tooltip="Italic" active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton tooltip="Strikethrough" active={editor.isActive('strike')}
            onClick={() => editor.chain().focus().toggleStrike().run()}>
            <Strikethrough className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton tooltip="Heading 2" active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
            <Heading2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton tooltip="Heading 3" active={editor.isActive('heading', { level: 3 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
            <Heading3 className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton tooltip="Bullet list" active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton tooltip="Ordered list" active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton tooltip="Blockquote" active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}>
            <Quote className="h-3.5 w-3.5" />
          </ToolbarButton>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* Link popover */}
          <Popover open={linkOpen} onOpenChange={setLinkOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant={editor.isActive('link') ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-7 w-7"
                    onClick={openLinkPopover}
                  >
                    <Link2 className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Link</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="flex flex-col gap-2">
                <Label className="text-xs">URL</Label>
                <Input
                  value={linkUrl}
                  onChange={e => setLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                  onKeyDown={e => e.key === 'Enter' && applyLink()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={applyLink}>Apply</Button>
                  {editor.isActive('link') && (
                    <Button size="sm" variant="outline" onClick={() => {
                      editor.chain().focus().unsetLink().run();
                      setLinkOpen(false);
                    }}>
                      <Link2Off className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image popover */}
          <Popover open={imageOpen} onOpenChange={setImageOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-7 w-7">
                    <ImageIcon className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Insert image</TooltipContent>
            </Tooltip>
            <PopoverContent className="w-72 p-3" align="start">
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Image URL</Label>
                <Input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-8 text-sm"
                  onKeyDown={e => e.key === 'Enter' && applyImage()}
                  autoFocus
                />
                <Button size="sm" onClick={applyImage} disabled={!imageUrl}>Insert</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="mx-1 h-5" />

          <ToolbarButton tooltip="Undo" disabled={!editor.can().undo()}
            onClick={() => editor.chain().focus().undo().run()}>
            <Undo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton tooltip="Redo" disabled={!editor.can().redo()}
            onClick={() => editor.chain().focus().redo().run()}>
            <Redo2 className="h-3.5 w-3.5" />
          </ToolbarButton>
        </div>

        <EditorContent editor={editor} />
      </div>
    </TooltipProvider>
  );
}
