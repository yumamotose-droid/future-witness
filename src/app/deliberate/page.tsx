import { ThemeScript } from "@/components/ThemeScript";
import { DeliberationApp } from "@/components/DeliberationApp";

export const metadata = {
  title: "審議 — FUTURE WITNESS",
  description:
    "ひとつの決定を、確認できる根拠、複数の未来シナリオ、2050年からの証言、そして反証とともに検討する。",
};

export default async function DeliberatePage({
  searchParams,
}: PageProps<"/deliberate">) {
  const params = await searchParams;
  const demo = params?.demo === "1";
  return (
    <>
      <ThemeScript />
      <DeliberationApp demo={demo} />
    </>
  );
}
