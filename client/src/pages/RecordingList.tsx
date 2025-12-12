import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, ChevronRight, Calendar, User, Clock, Mic, FileText, Play } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { format, isToday, isYesterday, startOfDay, endOfDay } from "date-fns";
import { ja } from "date-fns/locale";
import { AudioUploader } from "@/components/upload/AudioUploader";

type MeetingType = "initial" | "followup" | "proposal";
type Status = "pending" | "processing" | "completed" | "error";
type ProductCategory = "life" | "medical" | "savings" | "investment";

const meetingTypeLabels: Record<MeetingType, string> = {
  initial: "初回面談",
  followup: "フォローアップ",
  proposal: "提案",
};

const statusLabels: Record<Status, string> = {
  pending: "未処理",
  processing: "処理中",
  completed: "完了",
  error: "エラー",
};

const productCategoryLabels: Record<ProductCategory, string> = {
  life: "生命保険",
  medical: "医療保険",
  savings: "貯蓄型",
  investment: "投資型",
};

function getStatusClass(status: Status): string {
  const classes: Record<Status, string> = {
    pending: "status-pending",
    processing: "status-processing",
    completed: "status-completed",
    error: "status-error",
  };
  return classes[status];
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export default function RecordingList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [meetingTypeFilter, setMeetingTypeFilter] = useState<MeetingType | "all">("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [productCategoryFilter, setProductCategoryFilter] = useState<ProductCategory | "all">("all");
  const [sortBy, setSortBy] = useState<"recordedAt" | "customerName" | "status">("recordedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filters = useMemo(() => ({
    customerName: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    meetingType: meetingTypeFilter !== "all" ? meetingTypeFilter : undefined,
    productCategory: productCategoryFilter !== "all" ? productCategoryFilter : undefined,
    dateFrom: dateFrom ? startOfDay(new Date(dateFrom)) : undefined,
    dateTo: dateTo ? endOfDay(new Date(dateTo)) : undefined,
  }), [searchTerm, statusFilter, meetingTypeFilter, productCategoryFilter, dateFrom, dateTo]);

  const { data, isLoading, error } = trpc.recordings.list.useQuery({
    filters,
    sortBy,
    sortOrder,
    pageSize: 50,
  });

  const handleRecordingClick = (id: number) => {
    setLocation(`/recordings/${id}`);
  };

  const clearFilters = () => {
    setStatusFilter("all");
    setMeetingTypeFilter("all");
    setProductCategoryFilter("all");
    setDateFrom("");
    setDateTo("");
    setSortBy("recordedAt");
    setSortOrder("desc");
  };

  if (error) {
    return (
      <div className="container py-8">
        <div className="text-center text-destructive">
          <p>データの読み込みに失敗しました</p>
          <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  // 日付でグループ化
  type RecordingItem = NonNullable<typeof data>["data"][number];
  const groupedRecordings = useMemo(() => {
    if (!data?.data) return [];

    const groups: { date: Date; label: string; recordings: RecordingItem[] }[] = [];
    const dateMap = new Map<string, RecordingItem[]>();

    data.data.forEach((recording) => {
      const date = startOfDay(new Date(recording.recordedAt));
      const key = date.toISOString();
      if (!dateMap.has(key)) {
        dateMap.set(key, []);
      }
      dateMap.get(key)!.push(recording);
    });

    dateMap.forEach((recordings, key) => {
      const date = new Date(key);
      let label = format(date, "M月d日(E)", { locale: ja });
      if (isToday(date)) label = "今日";
      else if (isYesterday(date)) label = "昨日";
      groups.push({ date, label, recordings });
    });

    // グループ自体のソートは常に新しい順にするか、sortByに従うか要検討。
    // ここでは単純に日付順（降順）で表示
    return groups.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">ライフログ</h1>
                <p className="text-xs text-muted-foreground">
                  {data ? `${data.total}件の録音` : "読み込み中..."}
                </p>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="touch-button relative"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  絞り込み
                  {(statusFilter !== "all" || meetingTypeFilter !== "all" || productCategoryFilter !== "all" || dateFrom || dateTo) && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-primary rounded-full border border-background" />
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[90%] sm:max-w-[400px] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>絞り込み・並び替え</SheetTitle>
                  <SheetDescription>
                    条件を指定して録音データを絞り込みます
                  </SheetDescription>
                </SheetHeader>
                <div className="py-6 space-y-6">
                  {/* 並び替え */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium">並び替え</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="項目" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recordedAt">録音日時</SelectItem>
                          <SelectItem value="customerName">顧客名</SelectItem>
                          <SelectItem value="status">ステータス</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={sortOrder} onValueChange={(v: any) => setSortOrder(v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="順序" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">新しい順 (降順)</SelectItem>
                          <SelectItem value="asc">古い順 (昇順)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  {/* フィルタ */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">フィルター</h3>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">期間</label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="date"
                          value={dateFrom}
                          onChange={(e) => setDateFrom(e.target.value)}
                          className="text-xs"
                        />
                        <Input
                          type="date"
                          value={dateTo}
                          onChange={(e) => setDateTo(e.target.value)}
                          className="text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">ステータス</label>
                      <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
                        <SelectTrigger>
                          <SelectValue placeholder="すべて" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          <SelectItem value="pending">未処理</SelectItem>
                          <SelectItem value="processing">処理中</SelectItem>
                          <SelectItem value="completed">完了</SelectItem>
                          <SelectItem value="error">エラー</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">面談タイプ</label>
                      <Select value={meetingTypeFilter} onValueChange={(v) => setMeetingTypeFilter(v as MeetingType | "all")}>
                        <SelectTrigger>
                          <SelectValue placeholder="すべて" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          <SelectItem value="initial">初回面談</SelectItem>
                          <SelectItem value="followup">フォローアップ</SelectItem>
                          <SelectItem value="proposal">提案</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">商品カテゴリ</label>
                      <Select value={productCategoryFilter} onValueChange={(v) => setProductCategoryFilter(v as ProductCategory | "all")}>
                        <SelectTrigger>
                          <SelectValue placeholder="すべて" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">すべて</SelectItem>
                          <SelectItem value="life">生命保険</SelectItem>
                          <SelectItem value="medical">医療保険</SelectItem>
                          <SelectItem value="savings">貯蓄型</SelectItem>
                          <SelectItem value="investment">投資型</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <SheetFooter>
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1" onClick={clearFilters}>クリア</Button>
                    <SheetClose asChild>
                      <Button className="flex-1">適用する</Button>
                    </SheetClose>
                  </div>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>

          {/* 検索バー */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="顧客名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 touch-button"
            />
          </div>
        </div>
      </header>

      {/* 録音リスト */}
      <main className="container py-4">
        <div className="mb-6">
          <AudioUploader />
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48 mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-12">
            <Mic className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">条件に一致する録音が見つかりません</p>
            <Button variant="link" onClick={clearFilters}>検索条件をクリア</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {groupedRecordings.map((group) => (
              <div key={group.date.toISOString()}>
                {/* 日付ヘッダー */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs font-medium text-muted-foreground px-2">
                    {group.label}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                {/* タイムライン形式の録音リスト */}
                <div className="space-y-2">
                  {group.recordings.map((recording) => (
                    <Card
                      key={recording.id}
                      className="cursor-pointer hover:bg-accent/50 transition-colors active:bg-accent overflow-hidden"
                      onClick={() => handleRecordingClick(recording.id)}
                    >
                      <CardContent className="p-0">
                        <div className="flex">
                          {/* タイムラインインジケーター */}
                          <div className="w-1 bg-primary flex-shrink-0" />

                          <div className="flex-1 p-4">
                            {/* 時間とステータス */}
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(recording.recordedAt), "HH:mm")}
                              </span>
                              <span className={`status-badge ${getStatusClass(recording.status)}`}>
                                {statusLabels[recording.status]}
                              </span>
                            </div>

                            {/* タイトル（顧客名 + 面談タイプ） */}
                            <h3 className="font-semibold text-sm mb-1">
                              {recording.customerName}さんとの{meetingTypeLabels[recording.meetingType]}
                            </h3>

                            {/* 詳細情報 */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                              <span className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {recording.staffName}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDuration(recording.durationSeconds)}
                              </span>
                            </div>

                            {/* プレビューテキスト */}
                            {recording.transcription && (
                              <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded p-2">
                                {recording.transcription.substring(0, 100)}...
                              </p>
                            )}

                            {/* タグ */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex flex-wrap gap-1">
                                {recording.productCategory && (
                                  <Badge variant="secondary" className="text-xs">
                                    {productCategoryLabels[recording.productCategory]}
                                  </Badge>
                                )}
                              </div>
                              <Button variant="ghost" size="sm" className="h-7 px-2">
                                <Play className="h-3 w-3 mr-1" />
                                <span className="text-xs">再生</span>
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-center pr-2">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
