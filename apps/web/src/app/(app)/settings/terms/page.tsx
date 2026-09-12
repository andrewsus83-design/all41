import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { TERMS_LEAD, TERMS_TITLE, TermsContent } from "@/components/legal/terms-content";

export const metadata = { title: "Terms and Conditions" };

export default function SettingsTermsPage() {
  return (
    <Card className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <CardTitle>{TERMS_TITLE}</CardTitle>
        <CardHint>{TERMS_LEAD}</CardHint>
      </div>
      <TermsContent />
    </Card>
  );
}
