import { MarketingHeader } from "@/components/marketing/header";
import { MarketingFooter } from "@/components/marketing/footer";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="premium grain min-h-screen flex flex-col overflow-x-clip">
      {/* soft warm aurora over the whole storefront (behind content) */}
      <div className="aurora" aria-hidden />
      <MarketingHeader />
      <main className="flex-1 flex flex-col">{children}</main>
      <MarketingFooter />
    </div>
  );
}
