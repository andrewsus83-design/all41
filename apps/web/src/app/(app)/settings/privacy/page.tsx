import { Card, CardHint, CardTitle } from "@/components/ui/card";
import { PRIVACY_LEAD, PRIVACY_TITLE, PrivacyContent } from "@/components/legal/privacy-content";

export const metadata = { title: "Privacy Policy" };

export default function SettingsPrivacyPage() {
  return (
    <Card className="space-y-4 max-w-2xl">
      <div className="space-y-1">
        <CardTitle>{PRIVACY_TITLE}</CardTitle>
        <CardHint>{PRIVACY_LEAD}</CardHint>
      </div>
      <PrivacyContent />
    </Card>
  );
}
