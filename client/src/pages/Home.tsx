import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Mic,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  TrendingUp,
  ChevronRight,
  LogIn,
  Loader2,
  Sparkles,
  MessageCircle,
  Bell,
} from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // モックデータをシード
  const seedMutation = trpc.seed.run.useMutation();

  // 認証済みの場合のみ録音データを取得
  const { data: recordingsData, isLoading: recordingsLoading } = trpc.recordings.list.useQuery(
    { pageSize: 5, sortBy: "recordedAt", sortOrder: "desc" },
    { enabled: isAuthenticated }
  );

  // 初回ロード時にモックデータをシード
  useEffect(() => {
    if (isAuthenticated && !seedMutation.isPending && !seedMutation.isSuccess) {
      seedMutation.mutate();
    }
  }, [isAuthenticated]);

  // 認証中の表示
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合のランディングページ
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        {/* ヒーローセクション */}
        <div className="bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container py-12 md:py-20">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-6">
                <Mic className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold mb-4">
                保険営業音声録音・AI分析システム
              </h1>
              <p className="text-muted-foreground mb-8 text-sm md:text-base">
                営業会話を自動録音・文字起こしし、AIが重要情報を抽出。
                コンプライアンス対応と営業効率化を同時に実現します。
              </p>
              <Button size="lg" className="touch-button" asChild>
                <a href={getLoginUrl()}>
                  <LogIn className="h-5 w-5 mr-2" />
                  ログインして始める
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* 機能紹介 */}
        <div className="container py-12">
          <h2 className="text-xl font-bold text-center mb-8">主な機能</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-100 text-blue-600 mb-4">
                  <Mic className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">自動録音・同期</h3>
                <p className="text-sm text-muted-foreground">
                  小型デバイスで営業会話を録音し、クラウドに自動同期
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-green-100 text-green-600 mb-4">
                  <FileText className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">AI文字起こし</h3>
                <p className="text-sm text-muted-foreground">
                  高精度な音声認識で会話を自動テキスト化
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-100 text-purple-600 mb-4">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <h3 className="font-semibold mb-2">情報自動抽出</h3>
                <p className="text-sm text-muted-foreground">
                  顧客ニーズや契約情報をAIが自動で抽出・整理
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* フッター */}
        <footer className="border-t py-6">
          <div className="container text-center text-sm text-muted-foreground">
            <p>保険営業音声録音・AI分析システム デモアプリケーション</p>
          </div>
        </footer>
      </div>
    );
  }

  // 認証済みのダッシュボード
  const stats = {
    total: recordingsData?.total || 0,
    completed: recordingsData?.data.filter((r) => r.status === "completed").length || 0,
    processing: recordingsData?.data.filter((r) => r.status === "processing").length || 0,
    pending: recordingsData?.data.filter((r) => r.status === "pending").length || 0,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="bg-primary text-primary-foreground">
        <div className="container py-6">
          <p className="text-sm opacity-80">ようこそ</p>
          <h1 className="text-xl font-bold">{user?.name || "ユーザー"}さん</h1>
        </div>
      </header>

      <main className="container py-4 space-y-4 -mt-4">
        {/* 統計カード */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card shadow-md -mt-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mic className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">総録音数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card shadow-md -mt-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                  <p className="text-xs text-muted-foreground">処理完了</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* クイックアクション */}
        <div className="grid grid-cols-3 gap-2">
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setLocation("/recordings")}
          >
            <CardContent className="p-3 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">ライフログ</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setLocation("/ask")}
          >
            <CardContent className="p-3 text-center">
              <MessageCircle className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">Ask AI</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => setLocation("/reminders")}
          >
            <CardContent className="p-3 text-center">
              <Bell className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-xs font-medium">リマインダー</p>
            </CardContent>
          </Card>
        </div>

        {/* スマートサマリー */}
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              今日のサマリー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {stats.total > 0 
                ? `${stats.total}件の録音からAIが要約を生成します`
                : "録音データがあると、AIが自動で要約を生成します"
              }
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => setLocation("/ask")}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AIに質問する
            </Button>
          </CardContent>
        </Card>

        {/* 最近の録音 */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">最近の録音</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/recordings")}>
                すべて見る
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recordingsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-24 mb-1" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recordingsData?.data.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Mic className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">録音データがありません</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recordingsData?.data.slice(0, 5).map((recording) => (
                  <div
                    key={recording.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => setLocation(`/recordings/${recording.id}`)}
                  >
                    <div className={`p-2 rounded-lg ${
                      recording.status === "completed" ? "bg-green-100" :
                      recording.status === "processing" ? "bg-blue-100" :
                      recording.status === "error" ? "bg-red-100" : "bg-gray-100"
                    }`}>
                      {recording.status === "completed" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : recording.status === "processing" ? (
                        <Clock className="h-5 w-5 text-blue-600" />
                      ) : recording.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{recording.customerName}</p>
                      <p className="text-xs text-muted-foreground">{recording.staffName}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
