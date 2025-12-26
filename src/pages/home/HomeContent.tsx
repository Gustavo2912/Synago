// src/pages/home/HomeContent.tsx

import { useUser } from "@/contexts/UserContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useHomePage } from "./useHomePage";

export function HomeContent() {
  const { organizationId, user } = useUser();
  const { t } = useLanguage();
  const hp = useHomePage(organizationId, user?.id ?? null);

  if (hp.loading) {
    return <div>{t("common.loading")}</div>;
  }

  return (
    <div className="space-y-6">
      {hp.title && (
        <h1 className="text-3xl font-bold text-center">
          {hp.title}
        </h1>
      )}

      {hp.heroImage && (
        <img
          src={hp.heroImage}
          className="w-full rounded-xl max-h-[400px] object-cover"
        />
      )}

      {hp.content.map((block) => {
        if (block.type === "text") {
          return <p key={block.id}>{block.value}</p>;
        }

        if (block.type === "image") {
          return (
            <img
              key={block.id}
              src={block.value}
              className="rounded-xl"
            />
          );
        }

        return (
          <iframe
            key={block.id}
            src={block.value}
            className="w-full aspect-video rounded-xl"
            allowFullScreen
          />
        );
      })}
    </div>
  );
}
