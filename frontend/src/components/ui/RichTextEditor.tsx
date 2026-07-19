"use client";

/**
 * Yangiliklar rich-text muharriri:
 * - Fayldan rasm/media yuklash (API)
 * - Drag&drop / paste
 * - Rasm joylashuvi: chap / markaz / o'ng / to'liq
 */

import {
  useEditor,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote, Undo2, Redo2,
  Link2, ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Code, Minus, RemoveFormatting, Upload, Loader2, PanelLeft, PanelRight,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { newsApi } from "@/lib/api";
import { mediaUrl } from "@/lib/media";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
};

type MediaAlign = "left" | "center" | "right" | "full";

function Btn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
        active
          ? "bg-indigo-500/25 text-indigo-200 border border-indigo-400/30"
          : "text-slate-400 hover:text-white hover:bg-white/8 border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function ImageNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const align = (node.attrs["data-align"] as MediaAlign) || "center";
  const src = mediaUrl(node.attrs.src as string) || (node.attrs.src as string);

  const wrapClass =
    align === "left"
      ? "float-left mr-4 mb-3 max-w-[48%]"
      : align === "right"
      ? "float-right ml-4 mb-3 max-w-[48%]"
      : align === "full"
      ? "block w-full my-4"
      : "block mx-auto my-4 max-w-[85%]";

  return (
    <NodeViewWrapper className={`${wrapClass} relative group`} data-drag-handle>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={(node.attrs.alt as string) || ""}
        className={`rounded-xl w-full h-auto border ${
          selected ? "border-indigo-400 ring-2 ring-indigo-500/40" : "border-white/10"
        }`}
        draggable={false}
      />
      <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 backdrop-blur-sm rounded-lg p-0.5 border border-white/10">
        {(
          [
            ["left", "Chapga", PanelLeft],
            ["center", "Markaz", AlignCenter],
            ["right", "O'ngga", PanelRight],
            ["full", "To'liq", AlignJustify],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => updateAttributes({ "data-align": key })}
            className={`p-1 rounded-md ${
              align === key ? "bg-indigo-500 text-white" : "text-slate-300 hover:bg-white/10"
            }`}
          >
            <Icon className="w-3 h-3" />
          </button>
        ))}
      </div>
    </NodeViewWrapper>
  );
}

const CustomImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-align": {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-align") || "center",
        renderHTML: (attrs) => {
          const align = attrs["data-align"] || "center";
          const cls =
            align === "left"
              ? "news-img-left"
              : align === "right"
              ? "news-img-right"
              : align === "full"
              ? "news-img-full"
              : "news-img-center";
          return {
            "data-align": align,
            class: `rounded-xl ${cls}`,
          };
        },
      },
      alt: { default: "" },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Yangilik matnini yozing…",
  className = "",
  minHeight = "280px",
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadRef = useRef<(file: File) => Promise<void>>(async () => {});
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-cyan-300 underline" },
      }),
      CustomImage.configure({ allowBase64: false, inline: false }),
      Placeholder.configure({ placeholder }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-invert prose-sm max-w-none focus:outline-none px-4 py-3 text-slate-200 min-h-[200px]",
      },
      handleDrop: (_view, event) => {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const file = files[0];
        if (!file.type.startsWith("image/")) return false;
        event.preventDefault();
        void uploadRef.current(file);
        return true;
      },
      handlePaste: (_view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) {
              event.preventDefault();
              void uploadRef.current(file);
              return true;
            }
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });

  const uploadAndInsert = useCallback(
    async (file: File) => {
      if (!editor) return;
      setUploadErr(null);
      setUploading(true);
      try {
        const res = await newsApi.uploadMedia(file);
        const body = res.data as { data?: { url?: string }; url?: string };
        const url = body?.data?.url || body?.url;
        if (!url) throw new Error("URL qaytmadi");
        editor
          .chain()
          .focus()
          .setImage({ src: url, alt: file.name })
          .updateAttributes("image", { "data-align": "center" })
          .run();
      } catch (e: unknown) {
        const ax = e as { response?: { data?: { detail?: string } }; message?: string };
        setUploadErr(ax.response?.data?.detail || ax.message || "Yuklashda xatolik");
      } finally {
        setUploading(false);
      }
    },
    [editor]
  );

  useEffect(() => {
    uploadRef.current = uploadAndInsert;
  }, [uploadAndInsert]);

  useEffect(() => {
    if (!editor) return;
    if ((value || "") !== editor.getHTML()) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!editor) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-black/30 animate-pulse ${className}`}
        style={{ minHeight }}
      />
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Havola URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const setImageUrl = () => {
    const url = window.prompt("Rasm URL (https://… yoki /media/…)");
    if (!url) return;
    editor
      .chain()
      .focus()
      .setImage({ src: url })
      .updateAttributes("image", { "data-align": "center" })
      .run();
  };

  const setSelectedAlign = (align: MediaAlign) => {
    if (editor.isActive("image")) {
      editor.chain().focus().updateAttributes("image", { "data-align": align }).run();
    }
  };

  const imgAlign = editor.isActive("image")
    ? (editor.getAttributes("image")["data-align"] as string)
    : "";

  return (
    <div className={`rounded-2xl border border-white/10 bg-[#0a1020]/90 overflow-hidden ${className}`}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadAndInsert(f);
        }}
      />

      <div className="flex flex-wrap items-center gap-0.5 px-2 py-2 border-b border-white/[0.07] bg-white/[0.03]">
        <Btn title="Qalin" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Kursiv" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Tagiga chizish" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="O'chirilgan" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-3.5 h-3.5" />
        </Btn>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <Btn title="H2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="H3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Iqtibos" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Kod" active={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="w-3.5 h-3.5" />
        </Btn>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <Btn title="Ro'yxat" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Raqamli" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Chiziq" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </Btn>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <Btn title="Matn chap" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()}>
          <AlignLeft className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Matn markaz" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()}>
          <AlignCenter className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Matn o'ng" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()}>
          <AlignRight className="w-3.5 h-3.5" />
        </Btn>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <Btn title="Havola" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Rasm URL" onClick={setImageUrl}>
          <ImageIcon className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Fayldan yuklash" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        </Btn>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <Btn title="Rasm chap" active={imgAlign === "left"} disabled={!editor.isActive("image")} onClick={() => setSelectedAlign("left")}>
          <PanelLeft className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Rasm markaz" active={imgAlign === "center"} disabled={!editor.isActive("image")} onClick={() => setSelectedAlign("center")}>
          <AlignCenter className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Rasm o'ng" active={imgAlign === "right"} disabled={!editor.isActive("image")} onClick={() => setSelectedAlign("right")}>
          <PanelRight className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Rasm to'liq" active={imgAlign === "full"} disabled={!editor.isActive("image")} onClick={() => setSelectedAlign("full")}>
          <AlignJustify className="w-3.5 h-3.5" />
        </Btn>
        <span className="w-px h-5 bg-white/10 mx-1" />
        <Btn title="Tozalash" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <RemoveFormatting className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Orqaga" onClick={() => editor.chain().focus().undo().run()}>
          <Undo2 className="w-3.5 h-3.5" />
        </Btn>
        <Btn title="Oldinga" onClick={() => editor.chain().focus().redo().run()}>
          <Redo2 className="w-3.5 h-3.5" />
        </Btn>
      </div>

      {(uploading || uploadErr) && (
        <div className="px-3 py-1.5 text-[11px] border-b border-white/[0.06] bg-white/[0.02]">
          {uploading && (
            <span className="text-indigo-300 inline-flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" /> Media yuklanmoqda…
            </span>
          )}
          {uploadErr && <span className="text-rose-300">{uploadErr}</span>}
        </div>
      )}

      <div style={{ minHeight }} className="rich-editor-body">
        <EditorContent editor={editor} />
      </div>

      <div className="px-3 py-2 border-t border-white/[0.06] text-[10px] text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>📎 Upload · drag&amp;drop · paste</span>
        <span>🖼 Rasm ustida joylashuv tugmalari</span>
      </div>
    </div>
  );
}
