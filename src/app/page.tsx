import { ContactBand } from "@/components/marketing/contact";
import { Hero } from "@/components/marketing/hero";
import { Lifecycle } from "@/components/marketing/lifecycle";
import { Pricing } from "@/components/marketing/pricing";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Lifecycle />
        <Pricing />
        <ContactBand />
      </main>
      <SiteFooter />
    </>
  );
}
