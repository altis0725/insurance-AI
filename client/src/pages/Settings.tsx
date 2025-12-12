import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Volume2,
  Languages,
  FileText,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    toast.success("ログアウトしました");
  };

  const menuItems = [
    {
      icon: FileText,
      label: "テンプレート管理",
      description: "意向確認書のテンプレートを管理",
      href: "/settings/templates",
    },
    {
      icon: Bell,
      label: "通知設定",
      description: "プッシュ通知とリマインダー",
      onClick: () => toast.info("この機能は準備中です"),
    },
    {
      icon: Volume2,
      label: "音声設定",
      description: "録音品質と自動文字起こし",
      onClick: () => toast.info("この機能は準備中です"),
    },
    {
      icon: Languages,
      label: "言語設定",
      description: "表示言語と文字起こし言語",
      onClick: () => toast.info("この機能は準備中です"),
    },
    {
      icon: Shield,
      label: "プライバシー",
      description: "データ管理とセキュリティ",
      onClick: () => toast.info("この機能は準備中です"),
    },
    {
      icon: HelpCircle,
      label: "ヘルプ",
      description: "使い方とサポート",
      onClick: () => toast.info("この機能は準備中です"),
    },
  ];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-primary/10">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-semibold">設定</h1>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-6">
        {/* プロフィールカード */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {user?.name?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="font-semibold text-lg">{user?.name || "ゲスト"}</h2>
                <p className="text-sm text-muted-foreground">{user?.email || "未ログイン"}</p>
                {user?.role === "admin" && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">
                    管理者
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {/* クイック設定 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              クイック設定
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Moon className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="dark-mode">ダークモード</Label>
              </div>
              <Switch id="dark-mode" disabled />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="notifications">通知</Label>
              </div>
              <Switch id="notifications" defaultChecked />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Volume2 className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="auto-transcribe">自動文字起こし</Label>
              </div>
              <Switch id="auto-transcribe" defaultChecked />
            </div>
          </CardContent>
        </Card>

        {/* メニュー項目 */}
        <Card>
          <CardContent className="p-0">
            {menuItems.map((item, index) => (
              <div key={item.label}>
                {item.href ? (
                  <Link href={item.href}>
                    <div className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors text-left cursor-pointer">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Link>
                ) : (
                  <button
                    onClick={item.onClick}
                    className="w-full flex items-center gap-4 p-4 hover:bg-accent/50 transition-colors text-left"
                  >
                    <item.icon className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </button>
                )}
                {index < menuItems.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* ログアウト */}
        {isAuthenticated && (
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            ログアウト
          </Button>
        )}

        {/* バージョン情報 */}
        <p className="text-center text-xs text-muted-foreground">
          保険営業AI アシスタント v1.0.0
        </p>
      </main>
    </div>
  );
}
