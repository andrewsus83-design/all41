import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";
import { JsonLd } from "@/components/marketing/json-ld";

const SITE_URL = "https://all41.app";

/** Site-wide structured data (Master §10). Organization + WebSite are correct at the site level. */
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "all41",
  url: SITE_URL,
  description:
    "all41 is an AI work engine for non-technical people. Describe a job and the right AI does it — no prompts, no keys, no subscription. Pay only when you use.",
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "all41",
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/apps?q={q}`,
    "query-input": "required name=q",
  },
};

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="premium grain min-h-screen flex flex-col overflow-x-clip">
      <JsonLd data={[organizationSchema, websiteSchema]} />
      {/* soft warm aurora over the whole storefront (behind content) */}
      <div className="aurora" aria-hidden />
      <MarketingHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}
