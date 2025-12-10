import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCallback, useEffect, useRef } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'prose max-w-none p-4 min-h-[300px] focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(editor.getHTML());
    },
  });

  // Sync editor content when prop changes externally
  useEffect(() => {
    if (editor && !isInternalChange.current) {
      const currentContent = editor.getHTML();
      // Only update if content actually changed and it's not from internal editing
      if (content !== currentContent && content !== '<p></p>') {
        editor.commands.setContent(content, { emitUpdate: false });
      }
    }
    isInternalChange.current = false;
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border rounded-lg p-4 min-h-[300px] animate-pulse bg-muted">
        Caricamento editor...
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      <div className="bg-muted border-b p-2 flex gap-1 flex-wrap">
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleBold().run()} className={cn(editor.isActive('bold') && 'bg-brown-200')} title="Grassetto"><Bold className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleItalic().run()} className={cn(editor.isActive('italic') && 'bg-brown-200')} title="Corsivo"><Italic className="h-4 w-4" /></Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={cn(editor.isActive('heading', { level: 2 }) && 'bg-brown-200')} title="Titolo"><Heading2 className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={cn(editor.isActive('heading', { level: 3 }) && 'bg-brown-200')} title="Sottotitolo"><Heading3 className="h-4 w-4" /></Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleBulletList().run()} className={cn(editor.isActive('bulletList') && 'bg-brown-200')} title="Elenco puntato"><List className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={cn(editor.isActive('orderedList') && 'bg-brown-200')} title="Elenco numerato"><ListOrdered className="h-4 w-4" /></Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={cn(editor.isActive('blockquote') && 'bg-brown-200')} title="Citazione"><Quote className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={setLink} className={cn(editor.isActive('link') && 'bg-brown-200')} title="Link"><LinkIcon className="h-4 w-4" /></Button>
        <div className="flex-1" />
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Annulla"><Undo className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ripristina"><Redo className="h-4 w-4" /></Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
