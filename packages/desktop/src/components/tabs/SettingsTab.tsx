import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Settings, User, Bell, Palette, Globe, Shield } from "lucide-react";

export function SettingsTab() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">App configuration and preferences</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Profile</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Project Manager</p>
              <p className="text-xs text-muted-foreground">pm@example.com</p>
            </div>
            <Button variant="outline" size="sm">Edit</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {["Email notifications", "Push notifications", "In-app alerts", "Daily digest"].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <span className="text-sm text-foreground">{item}</span>
              <div className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${i < 3 ? "bg-[#34C759]" : "bg-muted"}`}>
                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform mt-0.5 ${i < 3 ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Palette className="w-4 h-4" /> Appearance</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Theme and display settings coming soon.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="w-4 h-4" /> Security</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Secrets vault and permissions coming soon.</p>
        </CardContent>
      </Card>
    </div>
  );
}
