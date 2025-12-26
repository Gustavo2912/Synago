// src/pages/home/home.types.ts

export type LanguageCode = string; // "en" | "he" | וכו'

export type LocalizedText = Record<LanguageCode, string>;

export type CaptionPosition = "top" | "bottom" | "left" | "right";

export type RowLayout = "1" | "2" | "3" | "1-2" | "2-1";

export type TextFormat = "plain" | "html";

export type TextBlock = {
  id: string;
  type: "text";
  content: LocalizedText;     // נשאיר לתאימות אחורה (plain)
  format?: TextFormat;        // default: "plain"
  html?: LocalizedText;       // חדש: לשמירת Rich HTML לפי שפה
};

export type ImageBlock = {
  id: string;
  type: "image";
  src: string; // public URL (supabase)
  caption?: LocalizedText;
  captionPosition?: CaptionPosition;

  // כדי למנוע כפילויות העלאה: שמירת path דטרמיניסטי ל-upsert
  storagePath?: string;
};

export type VideoBlock = {
  id: string;
  type: "video";
  embedUrl: string; // YouTube embed URL
  caption?: LocalizedText;
  captionPosition?: "top" | "bottom";
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
