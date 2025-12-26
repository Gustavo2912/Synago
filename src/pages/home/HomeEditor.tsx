import React, { useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import { uploadHomeImage, removeHomeImage } from "@/services/home.upload";
import {
  CaptionPosition,
  HomeBlock,
  HomePageContent,
  LocalizedText,
  RowLayout,
  makeDefaultHomeContent,
} from "./home.types";

type TextSize = "sm" | "md" | "lg" | "xl";
type TextAlign = "left" | "center" | "right";
type CaptionAlign = "left" | "center" | "right";

function ensureContent(content?: HomePageContent) {
  if (!content) return makeDefaultHomeContent();
  if (content.version !== 1 || !Array.isArray(content.rows)) return makeDefaultHomeContent();
  return content;
}

function layoutToColumns(layout: RowLayout) {
  if (layout === "1") return 1;
  if (layout === "2") return 2;
  if (layout === "3") return 3;
  if (layout === "1-2") return 2;
  if (layout === "2-1") return 2;
  return 1;
}

function safeT(t: (k: string) => string, key: string) {
  const v = t(key);
  // בהרבה מערכות i18n אם אין מפתח – מחזירים את המפתח עצמו
  return v && v !== key ? v : key;
}

function withLang(obj: LocalizedText | undefined, lang: string, value: string): LocalizedText {
  return { ...(obj ?? {}), [lang]: value };
}

function insertAroundSelection(
  el: HTMLTextAreaElement | null,
  left: string,
  right: string,
  onChangeValue: (next: string) => void
) {
  if (!el) return;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const text = el.value ?? "";
  const selected = text.slice(start, end);
  const next = text.slice(0, start) + left + selected + right + text.slice(end);
  onChangeValue(next);

  // שחזור selection אחרי setState async:
  requestAnimationFrame(() => {
    try {
      el.focus();
      const cursorStart = start + left.length;
      const cursorEnd = cursorStart + selected.length;
      el.setSelectionRange(cursorStart, cursorEnd);
    } catch {
      // ignore
    }
  });
}

export default function HomeEditor(props: {
  title: LocalizedText;
  setTitle: (v: LocalizedText) => void;
  heroImage: string | null;
  setHeroImage: (v: string | null) => void;
  content: HomePageContent;
  setContent: (v: HomePageContent) => void;
  language: string;
  organizationId: string | "all";
}) {
  const { t, language: contextLanguage } = useLanguage();

  const effectiveLanguage = props.language || contextLanguage || "en";

  const content = useMemo(() => ensureContent(props.content), [props.content]);

  // ✅ hooks לא בתוך map: מחזיקים מפה של refs לטקסט בלוקים
  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  function setContent(next: HomePageContent) {
    props.setContent(next);
  }

  async function handleHeroUpload(file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const base = props.organizationId === "all" ? "home/global" : `home/org/${props.organizationId}`;
    const path = `${base}/hero.${ext}`;
    const publicUrl = await uploadHomeImage({ file, path, upsert: true });
    props.setHeroImage(publicUrl);
  }

  async function handleHeroRemove() {
    // אם שמרת storagePath להירו בעתיד – אפשר למחוק גם מהבאקט.
    // כרגע אין לנו path, אז רק מנקים URL.
    props.setHeroImage(null);
  }

  function addRow() {
    const rowId = crypto.randomUUID();
    const cols = [{ id: crypto.randomUUID(), blocks: [] as HomeBlock[] }];
    setContent({
      ...content,
      rows: [...content.rows, { id: rowId, layout: "1", columns: cols }],
    });
  }

  function removeRow(rowId: string) {
    setContent({ ...content, rows: content.rows.filter((r) => r.id !== rowId) });
  }

  function changeRowLayout(rowId: string, layout: RowLayout) {
    const colsNeeded = layoutToColumns(layout);
    setContent({
      ...content,
      rows: content.rows.map((r) => {
        if (r.id !== rowId) return r;

        let cols = r.columns.slice(0, colsNeeded);
        while (cols.length < colsNeeded) cols.push({ id: crypto.randomUUID(), blocks: [] });

        return { ...r, layout, columns: cols };
      }),
    });
  }

  function addBlock(rowId: string, colId: string, block: HomeBlock) {
    setContent({
      ...content,
      rows: content.rows.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          columns: r.columns.map((c) => {
            if (c.id !== colId) return c;
            return { ...c, blocks: [...c.blocks, block] };
          }),
        };
      }),
    });
  }

  function removeBlock(rowId: string, colId: string, blockId: string) {
    setContent({
      ...content,
      rows: content.rows.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          columns: r.columns.map((c) => {
            if (c.id !== colId) return c;
            return { ...c, blocks: c.blocks.filter((b) => b.id !== blockId) };
          }),
        };
      }),
    });
  }

  function updateBlock(rowId: string, colId: string, blockId: string, patch: Partial<HomeBlock>) {
    setContent({
      ...content,
      rows: content.rows.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          columns: r.columns.map((c) => {
            if (c.id !== colId) return c;
            return {
              ...c,
              blocks: c.blocks.map((b) => (b.id === blockId ? ({ ...b, ...patch } as HomeBlock) : b)),
            };
          }),
        };
      }),
    });
  }

  async function uploadImageBlock(rowId: string, colId: string, blockId: string, file: File) {
    const ext = file.name.split(".").pop() || "jpg";
    const base = props.organizationId === "all" ? "home/global" : `home/org/${props.organizationId}`;
    const path = `${base}/blocks/${blockId}.${ext}`;
    const publicUrl = await uploadHomeImage({ file, path, upsert: true });

    updateBlock(rowId, colId, blockId, {
      src: publicUrl,
      storagePath: path,
    } as any);
  }

  async function removeImageBlock(rowId: string, colId: string, block: any) {
    // אם יש storagePath – נמחוק גם מהבאקט
    if (block.storagePath) {
      try {
        await removeHomeImage(block.storagePath);
      } catch {
        // ignore
      }
    }
    updateBlock(rowId, colId, block.id, { src: "", storagePath: undefined } as any);
  }

  return (
    <div className="space-y-6 border rounded-xl p-6 bg-card">
      {/* TITLE */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">
          {safeT(t, "home.title")}
        </div>

        <Input
          placeholder={safeT(t, "home.placeholders.title")}

          value={props.title?.[effectiveLanguage] ?? ""}
          onChange={(e) =>
            props.setTitle(
              withLang(props.title, effectiveLanguage, e.target.value)
            )
          }
        />
      </div>

      {/* HERO */}
      <div className="space-y-3">
        <div className="text-sm font-medium text-muted-foreground">
          {safeT(t, "home.hero_image")}
        </div>

        {props.heroImage && (
          <img src={props.heroImage} className="rounded-xl max-h-64 object-cover w-full" />
        )}

        <input
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            await handleHeroUpload(file);
            e.currentTarget.value = "";
          }}
        />

        {props.heroImage && (
          <Button variant="ghost" onClick={handleHeroRemove}>
            {safeT(t, "home.hero.remove")}
          </Button>
        )}
      </div>

      {/* ROWS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{safeT(t, "home.rows")}</div>
          <Button variant="outline" onClick={addRow}>
            + {safeT(t, "home.rows.add")}
          </Button>
        </div>

        {content.rows.map((row) => (
          <div key={row.id} className="border rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">{safeT(t, "home.row.layout")}</div>
                <select
                  className="border rounded-md px-2 py-1 text-sm bg-background"
                  value={row.layout}
                  onChange={(e) => changeRowLayout(row.id, e.target.value as RowLayout)}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="1-2">1-2</option>
                  <option value="2-1">2-1</option>
                </select>
              </div>

              <Button variant="ghost" onClick={() => removeRow(row.id)}>
                ✕ {safeT(t, "home.remove_row")}
              </Button>
            </div>

            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${row.columns.length}, minmax(0, 1fr))` }}
            >
              {row.columns.map((col) => (
                <div key={col.id} className="border rounded-lg p-3 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      onClick={() =>
                        addBlock(row.id, col.id, {
                          id: crypto.randomUUID(),
                          type: "text",
                          content: {},
                          rich: true,
                          // הרחבות לא שוברת DB
                          format: "markdown",
                          size: "md",
                          align: "left",
                        } as any)
                      }
                    >
                      {safeT(t, "home.block.add_text")}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        addBlock(row.id, col.id, {
                          id: crypto.randomUUID(),
                          type: "image",
                          src: "",
                          caption: {},
                          captionPosition: "bottom",
                          captionAlign: "center",
                        } as any)
                      }
                    >
                      {safeT(t, "home.block.add_image")}
                    </Button>

                    <Button
                      size="sm"
                      onClick={() =>
                        addBlock(row.id, col.id, {
                          id: crypto.randomUUID(),
                          type: "video",
                          embedUrl: "",
                          caption: {},
                          captionPosition: "bottom",
                          captionAlign: "center",
                        } as any)
                      }
                    >
                      {safeT(t, "home.block.add_video")}
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {col.blocks.map((block) => (
                      <div key={block.id} className="border rounded-lg p-3 relative space-y-3">
                        <button
                          onClick={() => removeBlock(row.id, col.id, block.id)}
                          className="absolute top-2 right-2 text-xs text-red-600"
                          title={safeT(t, "home.block.remove")}
                        >
                          × {safeT(t, "home.block.remove")}
                        </button>

                        {/* TEXT */}
                        {block.type === "text" && (() => {
                          const b: any = block;
                          const textValue = b.content?.[effectiveLanguage] ?? "";

                          const size: TextSize = b.size ?? "md";
                          const align: TextAlign = b.align ?? "left";

                          return (
                            <>
                              <div className="text-xs text-muted-foreground">{safeT(t, "home.block.text")}</div>

                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const el = textAreaRefs.current[block.id];
                                    insertAroundSelection(el, "**", "**", (next) => {
                                      updateBlock(row.id, col.id, block.id, {
                                        content: withLang(b.content, props.language, next),
                                      } as any);
                                    });
                                  }}
                                >
                                  B
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const el = textAreaRefs.current[block.id];
                                    insertAroundSelection(el, "*", "*", (next) => {
                                      updateBlock(row.id, col.id, block.id, {
                                        content: withLang(b.content, props.language, next),
                                      } as any);
                                    });
                                  }}
                                >
                                  I
                                </Button>

                                <div className="ml-2 flex items-center gap-2">
                                  <div className="text-xs text-muted-foreground">Size</div>
                                  <select
                                    className="border rounded-md px-2 py-1 text-sm bg-background"
                                    value={size}
                                    onChange={(e) =>
                                      updateBlock(row.id, col.id, block.id, { size: e.target.value as TextSize } as any)
                                    }
                                  >
                                    <option value="sm">S</option>
                                    <option value="md">M</option>
                                    <option value="lg">L</option>
                                    <option value="xl">XL</option>
                                  </select>
                                </div>

                                <div className="ml-2 flex items-center gap-2">
                                  <div className="text-xs text-muted-foreground">Align</div>
                                  <select
                                    className="border rounded-md px-2 py-1 text-sm bg-background"
                                    value={align}
                                    onChange={(e) =>
                                      updateBlock(row.id, col.id, block.id, { align: e.target.value as TextAlign } as any)
                                    }
                                  >
                                    <option value="left">Left</option>
                                    <option value="center">Center</option>
                                    <option value="right">Right</option>
                                  </select>
                                </div>
                              </div>

                              <Textarea
                                ref={(el) => {
                                  textAreaRefs.current[block.id] = el;
                                }}
                                placeholder={safeT(t, "home.placeholders.textBlock")}
                                value={textValue}
                                onChange={(e) =>
                                  updateBlock(row.id, col.id, block.id, {
                                    content: withLang(b.content, props.language, e.target.value),
                                  } as any)
                                }
                              />

                              <div className="text-xs text-muted-foreground">
                                {`Markdown-lite: **bold**, *italic*`}
                              </div>
                            </>
                          );
                        })()}

                        {/* IMAGE */}
                        {block.type === "image" && (() => {
                          const b: any = block;
                          const capAlign: CaptionAlign = b.captionAlign ?? "center";
                          return (
                            <>
                              <div className="text-xs text-muted-foreground">{safeT(t, "home.block.image")}</div>

                              {b.src ? (
                                <img src={b.src} className="rounded-lg max-h-64 object-cover w-full" />
                              ) : (
                                <div className="text-xs text-muted-foreground">
                                  {safeT(t, "home.block.image.no_src")}
                                </div>
                              )}

                              <input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  await uploadImageBlock(row.id, col.id, block.id, file);
                                  e.currentTarget.value = "";
                                }}
                              />

                              {b.src && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => removeImageBlock(row.id, col.id, b)}
                                >
                                  {safeT(t, "home.block.remove")}
                                </Button>
                              )}

                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground">
                                  {safeT(t, "home.block.caption_position")}
                                </div>
                                <select
                                  className="border rounded-md px-2 py-1 text-sm bg-background"
                                  value={(b.captionPosition ?? "bottom") as CaptionPosition}
                                  onChange={(e) =>
                                    updateBlock(row.id, col.id, block.id, {
                                      captionPosition: e.target.value as CaptionPosition,
                                    } as any)
                                  }
                                >
                                  <option value="top">{safeT(t, "home.block.caption_position.top")}</option>
                                  <option value="bottom">{safeT(t, "home.block.caption_position.bottom")}</option>
                                  <option value="left">{safeT(t, "home.block.caption_position.left")}</option>
                                  <option value="right">{safeT(t, "home.block.caption_position.right")}</option>
                                </select>

                                <div className="ml-2 flex items-center gap-2">
                                  <div className="text-xs text-muted-foreground">Align</div>
                                  <select
                                    className="border rounded-md px-2 py-1 text-sm bg-background"
                                    value={capAlign}
                                    onChange={(e) =>
                                      updateBlock(row.id, col.id, block.id, {
                                        captionAlign: e.target.value as CaptionAlign,
                                      } as any)
                                    }
                                  >
                                    <option value="center">Center</option>
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                  </select>
                                </div>
                              </div>

                              <Input
                                placeholder={safeT(t, "home.block.caption")}
                                value={b.caption?.[effectiveLanguage] ?? ""}
                                onChange={(e) =>
                                  updateBlock(row.id, col.id, block.id, {
                                    caption: withLang(b.caption, props.language, e.target.value),
                                  } as any)
                                }
                              />
                            </>
                          );
                        })()}

                        {/* VIDEO */}
                        {block.type === "video" && (() => {
                          const b: any = block;
                          const capAlign: CaptionAlign = b.captionAlign ?? "center";
                          return (
                            <>
                              <div className="text-xs text-muted-foreground">{safeT(t, "home.block.video")}</div>

                              <Input
                                placeholder={safeT(t, "home.block.video.url_placeholder")}
                                value={b.embedUrl ?? ""}
                                onChange={(e) =>
                                  updateBlock(row.id, col.id, block.id, { embedUrl: e.target.value } as any)
                                }
                              />

                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground">
                                  {safeT(t, "home.block.caption_position")}
                                </div>
                                <select
                                  className="border rounded-md px-2 py-1 text-sm bg-background"
                                  value={(b.captionPosition ?? "bottom") as any}
                                  onChange={(e) =>
                                    updateBlock(row.id, col.id, block.id, { captionPosition: e.target.value as any } as any)
                                  }
                                >
                                  <option value="top">{safeT(t, "home.block.caption_position.top")}</option>
                                  <option value="bottom">{safeT(t, "home.block.caption_position.bottom")}</option>
                                </select>

                                <div className="ml-2 flex items-center gap-2">
                                  <div className="text-xs text-muted-foreground">Align</div>
                                  <select
                                    className="border rounded-md px-2 py-1 text-sm bg-background"
                                    value={capAlign}
                                    onChange={(e) =>
                                      updateBlock(row.id, col.id, block.id, {
                                        captionAlign: e.target.value as CaptionAlign,
                                      } as any)
                                    }
                                  >
                                    <option value="center">Center</option>
                                    <option value="left">Left</option>
                                    <option value="right">Right</option>
                                  </select>
                                </div>
                              </div>

                              <Input
                                placeholder={safeT(t, "home.block.caption")}
                                value={b.caption?.[effectiveLanguage] ?? ""}
                                onChange={(e) =>
                                  updateBlock(row.id, col.id, block.id, {
                                    caption: withLang(b.caption, props.language, e.target.value),
                                  } as any)
                                }
                              />
                            </>
                          );
                        })()}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
