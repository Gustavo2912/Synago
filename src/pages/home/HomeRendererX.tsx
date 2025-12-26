import React from "react";
import {
  HomePageContent,
  HomeRow,
  HomeBlock,
  LocalizedText,
  CaptionPosition,
} from "./home.types";

/* -------------------------------- helpers -------------------------------- */

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

/* ------------------------------- layout utils ----------------------------- */

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

/* ----------------------------- caption helpers ----------------------------- */

function captionAlignClass(align?: "center" | "left" | "right") {
  if (align === "left") return "text-left";
  if (align === "right") return "text-right";
  return "text-center";
}

function renderCaption(
  caption: LocalizedText | undefined,
  lang: string,
  fallbackKey: string,
  align?: "center" | "left" | "right"
) {
  if (!caption) return null;

  return (
    <div
      className={`text-sm text-muted-foreground ${captionAlignClass(
        align
      )}`}
    >
      {resolveLocalizedText(caption, lang, fallbackKey)}
    </div>
  );
}

function wrapWithCaption(params: {
  caption?: LocalizedText;
  captionPosition?: CaptionPosition;
  captionAlign?: "center" | "left" | "right";
  lang: string;
  fallbackKey: string;
  children: React.ReactNode;
}) {
  const position = params.captionPosition ?? "bottom";
  const caption = renderCaption(
    params.caption,
    params.lang,
    params.fallbackKey,
    params.captionAlign
  );

  if (!caption) return <>{params.children}</>;

  if (position === "top") {
    return (
      <div className="space-y-2">
        {caption}
        {params.children}
      </div>
    );
  }

  if (position === "bottom") {
    return (
      <div className="space-y-2">
        {params.children}
        {caption}
      </div>
    );
  }

  if (position === "left") {
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

/* ----------------------------- text helpers -------------------------------- */

function textSizeClass(size?: "sm" | "md" | "lg" | "xl") {
  switch (size) {
    case "sm":
      return "text-sm";
    case "lg":
      return "text-lg";
    case "xl":
      return "text-xl";
    default:
      return "text-base";
  }
}

/* -------------------------------------------------------------------------- */
/*                                  RENDERER                                  */
/* -------------------------------------------------------------------------- */

export default function HomeRenderer(props: {
  title: LocalizedText;
  heroImage: string | null;
  content: HomePageContent;
  language: string;
}) {
  const { title, heroImage, content, language } = props;

  return (
    <div className="space-y-12">
      {/* TITLE */}
      <h1 className="text-4xl font-bold text-center">
        {resolveLocalizedText(title, language, "home.title")}
      </h1>

      {/* HERO */}
      {heroImage && (
        <img
          src={heroImage}
          className="w-full max-h-[420px] object-cover rounded-xl"
        />
      )}

      {/* CONTENT */}
      <div className="space-y-10">
        {content.rows.map((row) => (
          <div
            key={row.id}
            className={`grid gap-6 ${rowGridClass(row.layout)}`}
          >
            {row.columns.map((col, idx) => (
              <div
                key={col.id}
                className={colSpanClass(row.layout, idx)}
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

/* ----------------------------- block renderer ------------------------------ */

function BlockRenderer(props: { block: HomeBlock; lang: string }) {
  const { block, lang } = props;

  /* TEXT */
  if (block.type === "text") {
    const text = resolveLocalizedText(
      block.content,
      lang,
      "home.block.text"
    );

    return (
      <div
        className={`leading-relaxed whitespace-pre-line ${textSizeClass(
          block.textSize
        )}`}
        dangerouslySetInnerHTML={{ __html: text }}
      />
    );
  }

  /* IMAGE */
  if (block.type === "image") {
    if (!block.src) return null;

    return wrapWithCaption({
      caption: block.caption,
      captionPosition: block.captionPosition,
      captionAlign: block.captionAlign,
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

  /* VIDEO */
  if (block.type === "video") {
    const embed = toEmbedUrl(block.embedUrl);
    if (!embed) {
      return (
        <div className="text-sm text-muted-foreground text-center">
          home.block.video.invalid_url
        </div>
      );
    }

    return wrapWithCaption({
      caption: block.caption,
      captionPosition: block.captionPosition ?? "bottom",
      captionAlign: block.captionAlign,
      lang,
      fallbackKey: "home.block.video.caption",
      children: (
        <div className="aspect-video">
          <iframe
            src={embed}
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
