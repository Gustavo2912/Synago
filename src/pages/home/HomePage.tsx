import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useHomePage } from "./useHomePage";
import HomeEditor from "./HomeEditor";
import HomeRenderer from "./HomeRenderer";
import { useUser } from "@/contexts/UserContext";

type ViewMode = "edit" | "preview" | "split";

export default function HomePage() {
  const {
    loading,

    title,
    setTitle,
    heroImage,
    setHeroImage,
    content,
    setContent,

    save,
    saveState,
    cloneFromGlobal,

    hasOrgPage,
    previewSource,
    canEdit,
    canClone,
    isViewOnly,
    isEditingGlobal,
  } = useHomePage();

  const { userLoading } = useUser();

  const [mode, setMode] = useState<ViewMode>("preview");

  if (loading || userLoading) {
    return <div className="p-6">Loading Home Page…</div>;
  }

  /**
   * 🧠 הגדרה ברורה:
   * Editor מוצג רק אם יש דף ארגוני בפועל
   */
  const canShowEditor =   canEdit && (isEditingGlobal || hasOrgPage);

  /**
   * Preview:
   * - תמיד מוצג
   * - גם כשאין דף ארגוני (תבנית גלובלית)
   */
  const showPreviewPane = true;

  /**
   * Editor Pane:
   * - רק אם יש דף ארגוני
   * - ורק במצבי edit / split
   */
  const showEditorPane =
    canShowEditor && (mode === "edit" || mode === "split");

  const isTemplatePreview =
    !isEditingGlobal && !hasOrgPage && previewSource === "global";


  return (
    <div className="p-6 space-y-6">
      {/* ---------- HEADER ---------- */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Home Page {isEditingGlobal && "(Global)"}
        </h1>

        <div className="flex gap-2 items-center">
          {/* MODE SWITCH – רק אם יש דף ארגוני */}
          {canShowEditor && (
            <div className="flex rounded-lg border overflow-hidden">
              <Button
                size="sm"
                variant={mode === "edit" ? "default" : "ghost"}
                onClick={() => setMode("edit")}
              >
                Edit
              </Button>
              <Button
                size="sm"
                variant={mode === "split" ? "default" : "ghost"}
                onClick={() => setMode("split")}
              >
                Split
              </Button>
              <Button
                size="sm"
                variant={mode === "preview" ? "default" : "ghost"}
                onClick={() => setMode("preview")}
              >
                Preview
              </Button>
            </div>
          )}

          {/* CLONE */}
          {canClone && (
            <Button variant="outline" onClick={cloneFromGlobal}>
              Clone Global
            </Button>
          )}

          {/* SAVE – רק אם יש דף ארגוני */}
          {canShowEditor && (
            <Button
              onClick={save}
              disabled={saveState.status === "saving"}
            >
              {saveState.status === "saving" ? "Saving…" : "Save"}
            </Button>
          )}
        </div>
      </div>

      {/* ---------- TEMPLATE BANNER ---------- */}
      {isTemplatePreview && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <div className="font-semibold mb-1">
            No Home Page defined for this organization
          </div>
          <div className="text-muted-foreground mb-3">
            You are previewing the <b>Global default template</b>.
            <br />
            To create a Home Page for this organization, clone the Global Home Page.
          </div>

          {canClone && (
            <Button onClick={cloneFromGlobal}>
              Clone Global Home Page
            </Button>
          )}
        </div>
      )}

      {/* ---------- CONTENT ---------- */}
      <div
        className={
          canShowEditor && mode === "split"
            ? "grid grid-cols-1 lg:grid-cols-2 gap-6"
            : "grid grid-cols-1"
        }
      >
        {/* ---------- EDITOR ---------- */}
        {showEditorPane && (
          <div>
            <HomeEditor
              title={title}
              setTitle={setTitle}
              heroImage={heroImage}
              setHeroImage={setHeroImage}
              content={content}
              setContent={setContent}
            />
          </div>
        )}

        {/* ---------- PREVIEW ---------- */}
        {showPreviewPane && (
          <div className="rounded-lg border p-4 bg-white">
            {!isEditingGlobal && !hasOrgPage && (
              <div className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
                Global Template Preview
              </div>
            )}

            <HomeRenderer
              title={title}
              heroImage={heroImage}
              content={content}
            />
          </div>
        )}
      </div>

      {/* ---------- VIEW ONLY NOTICE ---------- */}
      {isViewOnly && (
        <div className="text-xs text-muted-foreground">
          You have view-only access to this Home Page.
        </div>
      )}
    </div>
  );
}
