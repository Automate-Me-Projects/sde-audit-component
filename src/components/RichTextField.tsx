import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useEditor, useEditorState, EditorContent, Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import { Bold, Italic, Underline as UnderlineIcon, Baseline, Highlighter } from 'lucide-react';
import { sanitizeRichHtml, isRichHtml } from '../utils/richText';

interface RichTextFieldProps {
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  placeholder?: string;
  className?: string;
}

// Palette restreinte mais complète (option A : la couleur utilisateur prime,
// y compris sur fond clair).
const TEXT_COLORS = ['#000000', '#dc2626', '#ea580c', '#16a34a', '#2563eb', '#7c3aed'];
const HIGHLIGHT_COLORS = ['#fde68a', '#bbf7d0', '#bfdbfe', '#fbcfe8', '#fecaca'];

const extensions = [
  StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, horizontalRule: false }),
  TextStyle,
  Color,
  Highlight.configure({ multicolor: true }),
];

/** Convertit une valeur stockée en HTML affichable (texte brut hérité => <br>). */
const toEditorContent = (value: string): string => {
  if (!value) return '';
  if (isRichHtml(value)) return sanitizeRichHtml(value);
  return value
    .split('\n')
    .map((line) => line.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
    .join('<br>');
};

const ToolbarButton: React.FC<{
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ active, onClick, title, children }) => (
  <button
    type="button"
    title={title}
    // onMouseDown pour ne pas perdre la sélection de l'éditeur
    onMouseDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    className={`p-1 rounded hover:bg-gray-100 ${active ? 'bg-gray-200 text-sde-green' : 'text-gray-600'}`}
  >
    {children}
  </button>
);

const BubbleToolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  const [showColors, setShowColors] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive('bold'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
    }),
  });

  return (
    <BubbleMenu
      editor={editor}
      data-rich-toolbar
      className="flex items-center gap-0.5 rounded-md border border-gray-200 bg-white px-1 py-0.5 shadow-lg"
    >
      <ToolbarButton active={state.bold} title="Gras" onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton active={state.italic} title="Italique" onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        active={state.underline}
        title="Souligné"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="h-4 w-4" />
      </ToolbarButton>

      <div className="mx-0.5 h-4 w-px bg-gray-200" />

      <div className="relative">
        <ToolbarButton
          title="Couleur du texte"
          onClick={() => {
            setShowColors((v) => !v);
            setShowHighlights(false);
          }}
        >
          <Baseline className="h-4 w-4" />
        </ToolbarButton>
        {showColors && (
          <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setColor(c).run();
                  setShowColors(false);
                }}
                className="h-5 w-5 rounded-full border border-gray-300"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              title="Aucune"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetColor().run();
                setShowColors(false);
              }}
              className="h-5 w-5 rounded-full border border-gray-300 bg-white text-[10px] text-gray-400"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <ToolbarButton
          title="Surlignage"
          onClick={() => {
            setShowHighlights((v) => !v);
            setShowColors(false);
          }}
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>
        {showHighlights && (
          <div className="absolute left-0 top-full z-10 mt-1 flex gap-1 rounded-md border border-gray-200 bg-white p-1 shadow-lg">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleHighlight({ color: c }).run();
                  setShowHighlights(false);
                }}
                className="h-5 w-5 rounded-full border border-gray-300"
                style={{ backgroundColor: c }}
              />
            ))}
            <button
              type="button"
              title="Aucun"
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetHighlight().run();
                setShowHighlights(false);
              }}
              className="h-5 w-5 rounded-full border border-gray-300 bg-white text-[10px] text-gray-400"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
};

/** Éditeur Tiptap monté à la demande (au focus du champ). */
const ActiveEditor: React.FC<{
  value: string;
  onChange: (html: string) => void;
  onBlur: () => void;
  minHeight: number;
  autoFocus: boolean;
}> = ({ value, onChange, onBlur, minHeight, autoFocus }) => {
  const editor = useEditor({
    extensions,
    content: toEditorContent(value),
    autofocus: autoFocus ? 'end' : false,
    editorProps: {
      attributes: {
        class: 'focus:outline-none text-sm',
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor: e }) => {
      onChange(e.isEmpty ? '' : sanitizeRichHtml(e.getHTML()));
    },
    onBlur: () => onBlur(),
  });

  // Synchronise une mise à jour externe (ex. valeur distante) seulement hors focus.
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;
    const incoming = toEditorContent(value);
    if (incoming !== sanitizeRichHtml(editor.getHTML())) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <>
      <BubbleToolbar editor={editor} />
      <EditorContent editor={editor} />
    </>
  );
};

/**
 * Champ de saisie enrichi discret.
 * Au repos : rendu HTML statique léger. Au focus : éditeur Tiptap monté à la
 * demande (perf : seuls les champs réellement édités instancient un éditeur).
 */
export const RichTextField: React.FC<RichTextFieldProps> = ({
  value,
  onChange,
  minHeight = 80,
  placeholder,
  className = '',
}) => {
  const [active, setActive] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const activate = useCallback(() => setActive(true), []);

  // Désactive (démonte l'éditeur) quand le focus quitte vraiment le champ.
  // On défère pour laisser le focus se poser : s'il est reparti dans le champ
  // (re-render) ou dans la barre d'outils (portail [data-rich-toolbar]), on
  // garde l'éditeur monté.
  const handleEditorBlur = useCallback(() => {
    window.setTimeout(() => {
      const el = document.activeElement as HTMLElement | null;
      if (wrapperRef.current?.contains(el)) return;
      if (el?.closest?.('[data-rich-toolbar]')) return;
      setActive(false);
    }, 0);
  }, []);

  const html = toEditorContent(value);

  return (
    <div
      ref={wrapperRef}
      className={`rich-text-field w-full rounded border border-gray-200 p-2 text-sm focus-within:ring-2 focus-within:ring-blue-500 ${className}`}
      style={{ minHeight }}
    >
      {active ? (
        <ActiveEditor
          value={value}
          onChange={onChange}
          onBlur={handleEditorBlur}
          minHeight={minHeight - 16}
          autoFocus
        />
      ) : (
        <div
          tabIndex={0}
          role="textbox"
          onMouseDown={activate}
          onFocus={activate}
          className="min-h-full cursor-text focus:outline-none"
          style={{ minHeight: minHeight - 16 }}
        >
          {html ? (
            <div className="rich-text-content" dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <span className="text-gray-400">{placeholder || ''}</span>
          )}
        </div>
      )}
    </div>
  );
};
