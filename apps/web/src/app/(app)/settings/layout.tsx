import { SettingsNav } from "./settings-nav";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <div className="max-w-4xl space-y-8">
      <header className="space-y-4">
        <h1 className="text-4xl font-semibold">Settings</h1>
        <SettingsNav />
      </header>
      {children}
    </div>
  );
}
