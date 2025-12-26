import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/button";

export default function RichTextEditor(props: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: true, autolink: true }),
    ],
    content: props.value || "<p></p>",
    editorProps: {
      attributes: {
        class:
          "min-h-[120px] rounded-md border bg-background p-3 text-sm focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      props.onChange(editor.getHTML());
    },
  });

  // אם הערך מתחלף מבחוץ (שפה/טעינה) – נעדכן את התוכן
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((props.value || "<p></p>") !== current) {
      editor.commands.setContent(props.value || "<p></p>", false);
    }
  }, [props.value, editor]);

  if (!editor) return null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBold().run()}>
          Bold
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Italic
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Bullets
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          Numbers
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => editor.chain().focus().setParagraph().run()}>
          P
        </Button>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
