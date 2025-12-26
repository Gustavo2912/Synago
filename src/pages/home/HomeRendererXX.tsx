import React from "react";
import {
  HomePageContent,
  HomeRow,
  HomeBlock,
  LocalizedText,
  CaptionPosition,
} from "./home.types";

/* -------------------------------------------------- */
/* helpers                                            */
/* -------------------------------------------------- */

function resolveLocalizedText(
  value: LocalizedText | undefined,
  lang: string,
  fallbackKey: string
) {
  if (!value) return fallbackKey;
  if (value[lang]) return value[lang];
  if (value.en) return value.en;
  return fallbackKey;
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

/* -------------------------------------------------- */
/* layout helpers                                     */
/* -------------------------------------------------- */

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

/* -------------------------------------------------- */
/* caption helpers                                    */
/* -------------------------------------------------- */

function renderCaption(
  caption: LocalizedText | undefined,
  lang: string,
  fallbackKey: string
) {
  if (!caption) return null;

  const text = resolveLocalizedText(caption, lang, fallbackKey);
  return <div className="text-sm text-muted-foreground">{text}</div>;
}

function wrapWithCaption(params: {
  caption?: LocalizedText;
  captionPosition?: CaptionPosition;
  lang: string;
  fallbackKey: string;
  children: React.ReactNode;
}) {
  const pos = params.captionPosition ?? "bottom";
  const caption = renderCaption(params.caption, params.lang, params.fallbackKey);

  if (!caption) return <>{params.children}</>;

  if (pos === "top") {
    return (
      <div className="space-y-2">
        {caption}
        {params.children}
      </div>
    );
  }

  if (pos === "bottom") {
    return (
      <div className="space-y-2">
        {params.children}
        {caption}
      </div>
    );
  }

  if (pos === "left") {
    return (
      <div className="flex gap-4 items-center">
        <div className="w-1/3">{caption}</div>
        <div className="w-2/3">{params.children}</div>
      </div>
    );
  }

  // right
  return (
    <div className="flex gap-4 items-center">
      <div className="w-2/3">{params.children}</div>
      <div className="w-1/3">{caption}</div>
    </div>
  );
}

/* -------------------------------------------------- */
/* main renderer                                      */
/* -------------------------------------------------- */

export default function HomeRenderer(props: {
  title: LocalizedText;
  heroImage: string | null;
  content: HomePageContent;
  language: string;
}) {
  const { title, heroImage, content, language } = props;

  return (
    <div className="space-y-12">
      {/* ---------- TITLE ---------- */}
      <h1 className="text-4xl font-bold text-center">
        {resolveLocalizedText(title, language, "home.title")}
      </h1>

      {/* ---------- HERO IMAGE ---------- */}
      {heroImage && (
        <img
          src={heroImage}
          className="w-full max-h-[420px] object-cover rounded-xl"
        />
      )}

      {/* ---------- CONTENT ---------- */}
      <div className="space-y-10">
        {content.rows.map((row) => (
          <div
            key={row.id}
            className={`grid gap-6 ${rowGridClass(row.layout)}`}
          >
            {row.columns.map((col, colIndex) => (
              <div
                key={col.id}
                className={colSpanClass(row.layout, colIndex)}
              >
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

/* -------------------------------------------------- */
/* block renderer                                     */
/* -------------------------------------------------- */

function BlockRenderer(props: { block: HomeBlock; lang: string }) {
  const { block, lang } = props;

  /* ---------- TEXT ---------- */
  if (block.type === "text") {
    const text = resolveLocalizedText(
      block.content,
      lang,
      "home.block.text"
    );

    const alignClass =
      block.align === "center"
        ? "text-center"
        : block.align === "right"
        ? "text-right"
        : "text-left";

    if (block.rich) {
      return (
        <div
          className={`prose max-w-none ${alignClass}`}
          dangerouslySetInnerHTML={{ __html: text }}
        />
      );
    }

    return (
      <div className={`text-lg leading-relaxed whitespace-pre-line ${alignClass}`}>
        {text}
      </div>
    );
  }

  /* ---------- IMAGE ---------- */
  if (block.type === "image") {
    if (!block.src) return null;

    return wrapWithCaption({
      caption: block.caption,
      captionPosition: block.captionPosition ?? "bottom",
      lang,
      fallbackKey: "home.block.image.caption",
      children: (
        <img
          src={block.src}
          className="rounded-xl w-full object-cover"
        />
      ),
    });
  }

  /* ---------- VIDEO ---------- */
  if (block.type === "video") {
    const embedUrl = toEmbedUrl(block.embedUrl) ?? block.embedUrl;

    if (!embedUrl) {
      return (
        <div className="text-sm text-muted-foreground">
          home.block.video.invalid_url
        </div>
      );
    }

    return wrapWithCaption({
      caption: block.caption,
      captionPosition: block.captionPosition ?? "bottom",
      lang,
      fallbackKey: "home.block.video.caption",
      children: (
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            className="w-full h-full rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ),
    });
  }

  return null;
}
