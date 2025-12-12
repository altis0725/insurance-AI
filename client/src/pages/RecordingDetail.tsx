import { useState, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  ArrowLeft,
  Play,
  Pause,
  Volume2,
  Edit2,
  Save,
  X,
  History,
  FileText,
  Brain,
  Clock,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
  FileOutput,
  ShieldCheck,
  Check,
  XCircle,
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type MeetingType = "initial" | "followup" | "proposal";
type Status = "pending" | "processing" | "completed" | "error";

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

interface ExtractionItem {
  value: string;
  confidence: number;
}

interface ExtractionData {
  insurancePurpose?: ExtractionItem;
  familyStructure?: ExtractionItem;
  incomeExpenses?: ExtractionItem;
  existingContracts?: ExtractionItem;
  desiredConditions?: ExtractionItem;
}

const extractionLabels: Record<keyof ExtractionData, string> = {
  insurancePurpose: "保険目的",
  familyStructure: "家族構成",
  incomeExpenses: "収支情報",
  existingContracts: "既契約情報",
  desiredConditions: "希望条件",
};

function getConfidenceClass(confidence: number): string {
  if (confidence >= 80) return "confidence-high";
  if (confidence >= 50) return "confidence-medium";
  return "confidence-low";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 80) return "高";
  if (confidence >= 50) return "中";
  return "低";
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}分${secs}秒`;
}

export default function RecordingDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const recordingId = parseInt(params.id || "0", 10);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTranscription, setEditedTranscription] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editingExtraction, setEditingExtraction] = useState<keyof ExtractionData | null>(null);
  const [editedExtractionValue, setEditedExtractionValue] = useState("");
  const playbackIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data, isLoading, error, refetch } = trpc.recordings.getById.useQuery(
    { id: recordingId },
    { enabled: recordingId > 0 }
  );

  const { data: complianceResult } = trpc.compliance.getByRecordingId.useQuery(
    { recordingId },
    { enabled: recordingId > 0 }
  );

  const updateTranscriptionMutation = trpc.recordings.updateTranscription.useMutation({
    onSuccess: () => {
      toast.success("文字起こしを更新しました");
      setIsEditingTranscription(false);
      setEditMemo("");
      refetch();
    },
    onError: (err) => {
      toast.error("更新に失敗しました: " + err.message);
    },
  });

  const updateExtractionMutation = trpc.extractions.update.useMutation({
    onSuccess: () => {
      toast.success("抽出結果を更新しました");
      setEditingExtraction(null);
      setEditMemo("");
      refetch();
    },
    onError: (err) => {
      toast.error("更新に失敗しました: " + err.message);
    },
  });

  const handleBack = () => {
    setLocation("/recordings");
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    } else {
      setIsPlaying(true);
      // モック再生: 進捗を徐々に進める
      playbackIntervalRef.current = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            if (playbackIntervalRef.current) {
              clearInterval(playbackIntervalRef.current);
            }
            return 0;
          }
          return prev + 1;
        });
      }, (data?.recording.durationSeconds || 60) * 10);
    }
  };

  const handleStartEditTranscription = () => {
    setEditedTranscription(data?.recording.transcription || "");
    setIsEditingTranscription(true);
  };

  const handleSaveTranscription = () => {
    updateTranscriptionMutation.mutate({
      id: recordingId,
      transcription: editedTranscription,
      memo: editMemo || undefined,
    });
  };

  const handleStartEditExtraction = (key: keyof ExtractionData) => {
    const extractionData = data?.extraction?.extractionData as ExtractionData | undefined;
    setEditedExtractionValue(extractionData?.[key]?.value || "");
    setEditingExtraction(key);
  };

  const handleSaveExtraction = () => {
    if (!editingExtraction || !data?.extraction) return;

    const currentData = data.extraction.extractionData as ExtractionData;
    const updatedData: ExtractionData = {
      ...currentData,
      [editingExtraction]: {
        value: editedExtractionValue,
        confidence: currentData[editingExtraction]?.confidence || 100,
      },
    };

    updateExtractionMutation.mutate({
      id: data.extraction.id,
      recordingId: recordingId,
      extractionData: updatedData,
      memo: editMemo || undefined,
    });
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="container py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="touch-button">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">エラー</h1>
          </div>
        </header>
        <div className="container py-8 text-center text-destructive">
          <AlertCircle className="h-12 w-12 mx-auto mb-4" />
          <p>データの読み込みに失敗しました</p>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background border-b">
          <div className="container py-4 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="touch-button">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <div className="container py-4 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  const { recording, extraction, history } = data;
  const extractionData = extraction?.extractionData as ExtractionData | undefined;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack} className="touch-button">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{recording.customerName}</h1>
              <p className="text-sm text-muted-foreground">{recording.staffName}</p>
            </div>
            <Link href={`/recordings/${recordingId}/intent`}>
              <Button
                variant="default"
                size="sm"
                className="touch-button"
              >
                <FileOutput className="h-4 w-4 mr-1" />
                意向確認書
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryDialog(true)}
              className="touch-button"
            >
              <History className="h-4 w-4 mr-1" />
              履歴
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {/* 基本情報カード */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(recording.recordedAt), "yyyy/M/d(E) HH:mm", { locale: ja })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{formatDuration(recording.durationSeconds)}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{recording.staffName}</span>
              </div>
              <div>
                <Badge variant="secondary">{meetingTypeLabels[recording.meetingType]}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 音声プレーヤー（モック） */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePlayPause}
                className="h-12 w-12 rounded-full"
              >
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
              </Button>
              <div className="flex-1">
                <Progress value={playbackProgress} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatDuration(Math.floor(recording.durationSeconds * playbackProgress / 100))}</span>
                  <span>{formatDuration(recording.durationSeconds)}</span>
                </div>
              </div>
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              ※ デモ用のモック再生です
            </p>
          </CardContent>
        </Card>

        {/* タブコンテンツ */}
        <Tabs defaultValue="transcription" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transcription" className="touch-button">
              <FileText className="h-4 w-4 mr-2" />
              文字起こし
            </TabsTrigger>
            <TabsTrigger value="extraction" className="touch-button">
              <Brain className="h-4 w-4 mr-2" />
              AI抽出結果
            </TabsTrigger>
            <TabsTrigger value="compliance" className="touch-button">
              <ShieldCheck className="h-4 w-4 mr-2" />
              コンプライアンス
            </TabsTrigger>
          </TabsList>

          {/* 文字起こしタブ */}
          <TabsContent value="transcription" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">文字起こし</CardTitle>
                  {!isEditingTranscription && recording.transcription && (
                    <Button variant="ghost" size="sm" onClick={handleStartEditTranscription}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      編集
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingTranscription ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editedTranscription}
                      onChange={(e) => setEditedTranscription(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <Input
                      placeholder="変更理由・メモ（任意）"
                      value={editMemo}
                      onChange={(e) => setEditMemo(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSaveTranscription}
                        disabled={updateTranscriptionMutation.isPending}
                        className="flex-1"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        保存
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingTranscription(false)}
                      >
                        <X className="h-4 w-4 mr-2" />
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : recording.transcription ? (
                  <div className="space-y-3">
                    {/* 話者認識UI */}
                    {recording.transcription.split('\n').filter(line => line.trim()).map((line, index) => {
                      // モックの話者認識: 行の内容に応じて話者を推定
                      const isStaff = line.includes('ご提案') || line.includes('ご説明') || line.includes('お客様') || line.includes('ご検討') || index % 2 === 0;
                      const speaker = isStaff ? recording.staffName : recording.customerName;
                      const speakerColor = isStaff ? 'bg-primary/10 border-primary/30' : 'bg-secondary border-secondary/50';
                      const speakerTextColor = isStaff ? 'text-primary' : 'text-secondary-foreground';

                      return (
                        <div key={index} className={`rounded-lg border p-3 ${speakerColor}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium ${speakerTextColor}`}>
                              {speaker}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(recording.recordedAt).getTime() + index * 30000, 'HH:mm:ss')}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed">{line}</p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2" />
                    <p>文字起こしデータがありません</p>
                    <p className="text-xs mt-1">処理中または未処理の状態です</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI抽出結果タブ */}
          <TabsContent value="extraction" className="mt-4">
            {extractionData ? (
              <div className="space-y-3">
                {/* 全体信頼度 */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">全体信頼度</span>
                      <div className="flex items-center gap-2">
                        <Progress value={extraction?.overallConfidence || 0} className="w-24 h-2" />
                        <span className={`text-sm font-semibold ${getConfidenceClass(extraction?.overallConfidence || 0)}`}>
                          {extraction?.overallConfidence}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 各抽出項目 */}
                {(Object.keys(extractionLabels) as Array<keyof ExtractionData>).map((key) => {
                  const item = extractionData[key];
                  if (!item) return null;

                  return (
                    <Card key={key}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{extractionLabels[key]}</span>
                            <Badge
                              variant="outline"
                              className={`text-xs ${getConfidenceClass(item.confidence)}`}
                            >
                              信頼度: {item.confidence}%
                            </Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEditExtraction(key)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.value}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Brain className="h-8 w-8 mx-auto mb-2" />
                  <p>AI抽出結果がありません</p>
                  <p className="text-xs mt-1">処理完了後に表示されます</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* コンプライアンスタブ */}
          <TabsContent value="compliance" className="mt-4">
            {complianceResult ? (
              <div className="space-y-4">
                {/* 適合判定 */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">コンプライアンス診断</CardTitle>
                      <Badge variant={complianceResult.isCompliant ? "default" : "destructive"}>
                        {complianceResult.isCompliant ? "適合" : "要確認"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      必須説明項目の実施とNGワードの使用有無をチェックしています。
                    </p>
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">必須説明項目</h3>
                      {complianceResult.complianceData.mandatoryItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-2 border rounded-md bg-muted/40">
                          <div className="flex items-center gap-2">
                            {item.detected ? (
                              <Check className="text-green-500 h-4 w-4 shrink-0" />
                            ) : (
                              <XCircle className="text-red-500 h-4 w-4 shrink-0" />
                            )}
                            <span className="text-sm font-medium">{item.item}</span>
                          </div>
                          {item.reason && (
                            <span className="text-xs text-muted-foreground whitespace-pre-wrap text-right max-w-[200px]">
                              {item.reason}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* NGワード検出 */}
                {complianceResult.complianceData.ngWords.length > 0 ? (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        <CardTitle className="text-base text-destructive">検出されたNGワード</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {complianceResult.complianceData.ngWords.map((ng: any, idx: number) => (
                          <div key={idx} className="p-3 bg-white rounded-md border border-destructive/20 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-destructive">{ng.word}</span>
                              <Badge variant="outline" className="text-xs text-destructive border-destructive">NG</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {ng.context || "文脈情報なし"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardContent className="p-6 text-center text-green-700">
                      <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="font-medium">NGワードは検出されませんでした</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <ShieldCheck className="h-8 w-8 mx-auto mb-2" />
                  <p>コンプライアンス情報がありません</p>
                  <p className="text-xs mt-1">処理完了後に表示されます</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* 変更履歴ダイアログ */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>変更履歴</DialogTitle>
          </DialogHeader>
          {history && history.length > 0 ? (
            <div className="space-y-3">
              {history.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">
                        {item.changeType === "transcription" ? "文字起こし" : "AI抽出結果"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.changedAt), "M/d HH:mm", { locale: ja })}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="font-medium">{item.editorName}</span>が編集
                    </p>
                    {item.memo && (
                      <p className="text-xs text-muted-foreground mt-1">メモ: {item.memo}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2" />
              <p>変更履歴がありません</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 抽出結果編集ダイアログ */}
      <Dialog open={!!editingExtraction} onOpenChange={(open) => !open && setEditingExtraction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExtraction && extractionLabels[editingExtraction]}を編集
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={editedExtractionValue}
              onChange={(e) => setEditedExtractionValue(e.target.value)}
              rows={4}
            />
            <Input
              placeholder="変更理由・メモ（任意）"
              value={editMemo}
              onChange={(e) => setEditMemo(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingExtraction(null)}>
              キャンセル
            </Button>
            <Button onClick={handleSaveExtraction} disabled={updateExtractionMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
