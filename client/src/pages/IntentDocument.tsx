import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Download,
  ArrowLeft,
  Eye,
  Code,
  Save,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, Link } from "wouter";

export default function IntentDocument() {
  const params = useParams<{ id: string }>();
  const recordingId = parseInt(params.id || "0", 10);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("preview");

  const { data: templates } = trpc.templates.list.useQuery();
  const { data: defaultTemplate } = trpc.templates.getDefault.useQuery();

  const {
    data: preview,
    isLoading: previewLoading,
    refetch: refetchPreview,
  } = trpc.intentDocuments.preview.useQuery(
    {
      recordingId,
      templateId: selectedTemplateId ? parseInt(selectedTemplateId, 10) : undefined,
    },
    {
      enabled: recordingId > 0,
    }
  );

  const saveMutation = trpc.intentDocuments.save.useMutation({
    onSuccess: () => {
      toast.success("意向確認書を保存しました");
    },
    onError: (err) => {
      toast.error("保存に失敗しました: " + err.message);
    },
  });

  const seedDefaultMutation = trpc.templates.seedDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルトテンプレートを作成しました");
      window.location.reload();
    },
  });

  // デフォルトテンプレートが設定されたら選択
  useEffect(() => {
    if (defaultTemplate && !selectedTemplateId) {
      setSelectedTemplateId(defaultTemplate.id.toString());
    }
  }, [defaultTemplate, selectedTemplateId]);

  // テンプレート変更時にプレビューを更新
  useEffect(() => {
    if (selectedTemplateId) {
      refetchPreview();
    }
  }, [selectedTemplateId, refetchPreview]);

  const handleDownloadPdf = () => {
    if (!preview?.html) return;

    // HTMLをBlobとして作成
    const blob = new Blob([preview.html], { type: "text/html" });
    const url = URL.createObjectURL(blob);

    // 新しいウィンドウで開いて印刷ダイアログを表示
    const printWindow = window.open(url, "_blank");
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }

    toast.info("印刷ダイアログが開きます。PDFとして保存してください。");
  };

  const handleSave = () => {
    if (!selectedTemplateId) {
      toast.error("テンプレートを選択してください");
      return;
    }
    saveMutation.mutate({
      recordingId,
      templateId: parseInt(selectedTemplateId, 10),
    });
  };

  if (!templates || templates.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
          <div className="container py-4">
            <div className="flex items-center gap-3">
              <Link href={`/recordings/${recordingId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">意向確認書</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="container py-8">
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              テンプレートがありません
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Button
                onClick={() => seedDefaultMutation.mutate()}
                disabled={seedDefaultMutation.isPending}
              >
                デフォルトテンプレートを生成
              </Button>
              <Link href="/settings/templates">
                <Button variant="outline">テンプレート管理へ</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link href={`/recordings/${recordingId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold">意向確認書</h1>
                {preview?.recording && (
                  <p className="text-xs text-muted-foreground">
                    {preview.recording.customerName}様
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                <Save className="h-4 w-4 mr-1" />
                保存
              </Button>
              <Button size="sm" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>

          {/* テンプレート選択 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">テンプレート:</span>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="テンプレートを選択" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map((template) => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.name}
                    {template.isDefault === 1 && " (デフォルト)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="container py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="preview">
              <Eye className="h-4 w-4 mr-1" />
              プレビュー
            </TabsTrigger>
            <TabsTrigger value="source">
              <Code className="h-4 w-4 mr-1" />
              ソース
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview">
            {previewLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-8 w-48 mb-4" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ) : preview?.html ? (
              <Card>
                <CardContent className="p-0">
                  <iframe
                    srcDoc={preview.html}
                    className="w-full min-h-[600px] border-0"
                    title="意向確認書プレビュー"
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  プレビューを生成できませんでした
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="source">
            {previewLoading ? (
              <Card>
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ) : preview?.markdown ? (
              <Card>
                <CardContent className="p-4">
                  <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                    {preview.markdown}
                  </pre>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                  ソースを表示できませんでした
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* 保存済み履歴 */}
        <SavedDocuments recordingId={recordingId} />
      </main>
    </div>
  );
}

function SavedDocuments({ recordingId }: { recordingId: number }) {
  const { data: documents, isLoading } = trpc.intentDocuments.list.useQuery({
    recordingId,
  });

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-sm">保存履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!documents || documents.length === 0) {
    return null;
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          保存履歴
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between text-sm p-2 bg-muted rounded"
            >
              <div>
                <span className="text-muted-foreground">
                  {new Date(doc.generatedAt).toLocaleString("ja-JP")}
                </span>
                <span className="ml-2">{doc.generatedByName}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
