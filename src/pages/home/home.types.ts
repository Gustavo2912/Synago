// src/pages/home/home.types.ts

export type LanguageCode = string; // "en" | "he" | וכו'

export type LocalizedText = Record<LanguageCode, string>;

export type CaptionPosition = "top" | "bottom" | "left" | "right";

export type RowLayout = "1" | "2" | "3" | "1-2" | "2-1";

export type TextFormat = "plain" | "html";

export type CaptionAlign = "center" | "left" | "right";

export type TextSize = "sm" | "md" | "lg" | "xl";

export type TextBlock = {
  id: string;
  type: "text";
  content: LocalizedText;

  /** editor-only settings */
  editor?: {
    rich?: boolean;        // true = rich editor, false = plain textarea
    size?: "sm" | "md" | "lg" | "xl";
    align?: "left" | "center" | "right";
  };
};

export type ImageBlock = {
  id: string;
  type: "image";
  src: string;
  caption?: LocalizedText;
  captionPosition?: CaptionPosition;
  captionAlign?: CaptionAlign;
  storagePath?: string;
};

export type VideoBlock = {
  id: string;
  type: "video";
  embedUrl: string;
  caption?: LocalizedText;
  captionPosition?: "top" | "bottom";
  captionAlign?: CaptionAlign;
};

export type HomeBlock = TextBlock | ImageBlock | VideoBlock;

export type HomeColumn = {
  id: string;
  blocks: HomeBlock[];
};

export type HomeRow = {
  id: string;
  layout: RowLayout;
  columns: HomeColumn[];
};

export type HomePageContent = {
  version: 1;
  rows: HomeRow[];
};

export function makeDefaultHomeContent(): HomePageContent {
  return {
    version: 1,
    rows: [
      {
        id: crypto.randomUUID(),
        layout: "1",
        columns: [
          {
            id: crypto.randomUUID(),
            blocks: [],
          },
        ],
      },
    ],
  };
}
