import { ReferenceBrowser } from "@/components/ReferenceBrowser";
import { getReference } from "@/lib/api";

export default async function ReferencePage() {
  const catalog = await getReference();
  return <ReferenceBrowser catalog={catalog} />;
}
