import React from "react";
import {
  HomePageContent,
  HomeRow,
  HomeBlock,
  LocalizedText,
  CaptionPosition,
} from "./home.types";

type TextSize = "sm" | "md" | "lg" | "xl";
type TextAlign = "left" | "center" | "right";
type CaptionAlign = "left" | "center" | "right";

function resolveLocalizedText(
  value: LocalizedText | undefined,
  lang: string,
  fallback: string
) {
  if (!value) return fallback;
  if (value[lang]) return value[lang];
  if (value.en) return value.en;
  // אם יש שפה אחרת כלשהי – ניקח ראשונה
  const first = Object.values(value)[0];
  return first ?? fallback;
}

function toEmbedUrl(url: string): string | null {
  if (!url) return null;

  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (short) return `https://www.youtube.com/embed/${short[1]}`;

  const long = url.match(/[?&]v=([a-zA-Z0-9_-]+)/);
  if (long) return `https://www.youtube.com/embed/${long[1]}`;

  if (url.includes("/embed/")) return url;

  return null;
}

function rowGridClass(layout: HomeRow["layout"]) {
  switch (layout) {
    case "1":
      return "grid-cols-1";
    case "2":
      return "grid-cols-2";
    case "3":
      return "grid-cols-3";
    case "1-2":
    case "2-1":
      return "grid-cols-3";
    default:
      return "grid-cols-1";
  }
}

function colSpanClass(layout: HomeRow["layout"], colIndex: number) {
  if (layout === "1-2") return colIndex === 0 ? "col-span-1" : "col-span-2";
  if (layout === "2-1") return colIndex === 0 ? "col-span-2" : "col-span-1";
  return "col-span-1";
}

function captionAlignClass(align: CaptionAlign | undefined) {
  const a = align ?? "center"; // ✅ default “אמצע”
  if (a === "left") return "text-left";
  if (a === "right") return "text-right";
  return "text-center";
}

function textSizeClass(size: TextSize | undefined) {
  const s = size ?? "md";
  if (s === "sm") return "text-sm";
  if (s === "lg") return "text-lg";
  if (s === "xl") return "text-xl";
  return "text-base";
}

function textAlignClass(align: TextAlign | undefined) {
  const a = align ?? "left";
  if (a === "center") return "text-center";
  if (a === "right") return "text-right";
  return "text-left";
}

// Markdown-lite מינימלי: **bold** ו-*italic* (לא HTML)
// אם תרצה – נשדרג לטיפטאפ בהמשך.
function renderMarkdownLite(text: string) {
  // פשוט: נשמור שורות, ונרנדר עם <span> bold/italic דרך split הכי בסיסי
  // כדי לא להכניס HTML injection – לא משתמשים ב dangerouslySetInnerHTML.
  // זה "טוב מספיק" לשלב 1.
  const parts: React.ReactNode[] = [];
  let i = 0;

  while (i < text.length) {
    // bold **...**
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        const inner = text.slice(i + 2, end);
        parts.push(<strong key={`b-${i}`}>{inner}</strong>);
        i = end + 2;
        continue;
      }
    }

    // italic *...*
    if (text.startsWith("*", i)) {
      const end = text.indexOf("*", i + 1);
      if (end !== -1) {
        const inner = text.slice(i + 1, end);
        parts.push(<em key={`i-${i}`}>{inner}</em>);
        i = end + 1;
        continue;
      }
    }

    // רגיל
    parts.push(<span key={`t-${i}`}>{text[i]}</span>);
    i += 1;
  }

  // תומך בשורות חדשות
  const joined = parts.reduce<React.ReactNode[]>((acc, node) => {
    if (typeof node === "string") return [...acc, node];
    return [...acc, node];
  }, []);

  return <>{joined}</>;
}

function renderCaption(
  caption: LocalizedText | undefined,
  lang: string,
  fallbackKey: string,
  align?: CaptionAlign
) {
  if (!caption) return null;
  const text = resolveLocalizedText(caption, lang, fallbackKey);
  if (!text) return null;
  return <div className={`text-sm text-muted-foreground ${captionAlignClass(align)}`}>{text}</div>;
}

function wrapWithCaption(params: {
  caption?: LocalizedText;
  captionPosition?: CaptionPosition;
  captionAlign?: CaptionAlign;
  lang: string;
  fallbackKey: string;
  children: React.ReactNode;
}) {
  const pos = (params.captionPosition ?? "bottom") as CaptionPosition;
  const cap = renderCaption(params.caption, params.lang, params.fallbackKey, params.captionAlign);
  if (!cap) return <>{params.children}</>;

  if (pos === "top") {
    return (
      <div className="space-y-2">
        {cap}
        {params.children}
      </div>
    );
  }

  if (pos === "bottom") {
    return (
      <div className="space-y-2">
        {params.children}
        {cap}
      </div>
    );
  }

  if (pos === "left") {
    return (
      <div className="flex gap-3 items-center">
        <div className="w-1/3">{cap}</div>
        <div className="w-2/3">{params.children}</div>
      </div>
    );
  }

  // right
  return (
    <div className="flex gap-3 items-center">
      <div className="w-2/3">{params.children}</div>
      <div className="w-1/3">{cap}</div>
    </div>
  );
}

export default function HomeRenderer(props: {
  title: LocalizedText;
  heroImage: string | null;
  content: HomePageContent;
  language: string;
}) {
  const { title, heroImage, content, language } = props;

  return (
    <div className="space-y-10">
      <h1 className="text-4xl font-bold text-center">
        {resolveLocalizedText(title, language, "home.title")}
      </h1>

      {heroImage && (
        <img
          src={heroImage}
          className="w-full max-h-[420px] object-cover rounded-xl"
          alt=""
        />
      )}

      <div className="space-y-8">
        {content.rows.map((row) => (
          <div key={row.id} className={`grid gap-6 ${rowGridClass(row.layout)}`}>
            {row.columns.map((col, idx) => (
              <div key={col.id} className={colSpanClass(row.layout, idx)}>
                <div className="space-y-6">
                  {col.blocks.map((block) => (
                    <BlockRenderer
                      key={block.id}
                      block={block}
                      lang={language}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockRenderer(props: { block: HomeBlock; lang: string }) {
  const { block, lang } = props;

  if (block.type === "text") {
    const b: any = block;
    const text = resolveLocalizedText(b.content, lang, "home.block.text");
    const sizeClass = textSizeClass(b.size as any);
    const alignClass = textAlignClass(b.align as any);

    return (
      <div className={`${sizeClass} ${alignClass} leading-relaxed whitespace-pre-line`}>
        {/* markdown-lite */}
        {renderMarkdownLite(text)}
      </div>
    );
  }

  if (block.type === "image") {
    const b: any = block;
    if (!b.src) return null;

    return wrapWithCaption({
      caption: b.caption,
      captionPosition: (b.captionPosition ?? "bottom") as any,
      captionAlign: (b.captionAlign ?? "center") as any,
      lang,
      fallbackKey: "home.block.image.caption",
      children: <img src={b.src} className="rounded-xl w-full object-cover" alt="" />,
    });
  }

  if (block.type === "video") {
    const b: any = block;
    const embed = toEmbedUrl(b.embedUrl) ?? b.embedUrl;
    if (!embed) {
      return <div className="text-sm text-muted-foreground">home.block.video.invalid_url</div>;
    }

    // captionPosition: top/bottom בלבד לוידאו
    const pos = (b.captionPosition ?? "bottom") as "top" | "bottom";
    const cap = renderCaption(b.caption, lang, "home.block.video.caption", b.captionAlign);

    return (
      <div className="space-y-2">
        {pos === "top" && cap}
        <div className="aspect-video">
          <iframe
            src={embed}
            className="w-full h-full rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="video"
          />
        </div>
        {pos !== "top" && cap}
      </div>
    );
  }

  return null;
}
