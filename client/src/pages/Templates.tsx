import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  FileText,
  Plus,
  Upload,
  Download,
  Star,
  Trash2,
  Edit,
  ArrowLeft,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Link } from "wouter";

export default function Templates() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newContent, setNewContent] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  const { data: templates, isLoading } = trpc.templates.list.useQuery();

  const createMutation = trpc.templates.create.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを作成しました");
      setShowAddDialog(false);
      resetForm();
      utils.templates.list.invalidate();
    },
    onError: (err) => {
      toast.error("作成に失敗しました: " + err.message);
    },
  });

  const updateMutation = trpc.templates.update.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを更新しました");
      setShowEditDialog(false);
      setSelectedTemplate(null);
      utils.templates.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("更新に失敗しました: " + err.message);
    },
  });

  const deleteMutation = trpc.templates.delete.useMutation({
    onSuccess: () => {
      toast.success("テンプレートを削除しました");
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
      utils.templates.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("削除に失敗しました: " + err.message);
    },
  });

  const setDefaultMutation = trpc.templates.setDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルトテンプレートを設定しました");
      utils.templates.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("設定に失敗しました: " + err.message);
    },
  });

  const importMutation = trpc.templates.import.useMutation({
    onSuccess: (data: any) => {
      toast.success(`${data.count}件のテンプレートをインポートしました`);
      utils.templates.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("インポートに失敗しました: " + err.message);
    },
  });

  const seedDefaultMutation = trpc.templates.seedDefault.useMutation({
    onSuccess: () => {
      toast.success("デフォルトテンプレートを作成しました");
      utils.templates.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("作成に失敗しました: " + err.message);
    },
  });

  const resetForm = () => {
    setNewName("");
    setNewDescription("");
    setNewContent("");
  };

  const handleCreate = () => {
    if (!newName.trim() || !newContent.trim()) {
      toast.error("名前と内容は必須です");
      return;
    }
    createMutation.mutate({
      name: newName,
      description: newDescription || undefined,
      content: newContent,
    });
  };

  const handleUpdate = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({
      id: selectedTemplate.id,
      name: newName || undefined,
      description: newDescription || undefined,
      content: newContent || undefined,
    });
  };

  const handleDelete = () => {
    if (!selectedTemplate) return;
    deleteMutation.mutate({ id: selectedTemplate.id });
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate({ id });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (Array.isArray(data)) {
          importMutation.mutate({ templates: data });
        } else if (data.templates && Array.isArray(data.templates)) {
          importMutation.mutate({ templates: data.templates });
        } else if (data.name && data.content) {
          importMutation.mutate({ templates: [data] });
        } else {
          toast.error("無効なファイル形式です");
        }
      } catch (err) {
        toast.error("JSONの解析に失敗しました");
      }
    };
    reader.readAsText(file);

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleExport = (template: any) => {
    const data = {
      name: template.name,
      description: template.description,
      content: template.content,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `template-${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openEditDialog = (template: any) => {
    setSelectedTemplate(template);
    setNewName(template.name);
    setNewDescription(template.description || "");
    setNewContent(template.content);
    setShowEditDialog(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">テンプレート管理</h1>
                <p className="text-xs text-muted-foreground">
                  意向確認書のテンプレートを管理
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              新規作成
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-1" />
              インポート
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </div>
        </div>
      </header>

      <main className="container py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-5 w-48 mb-2" />
                  <Skeleton className="h-4 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              テンプレートがありません
            </p>
            <div className="flex flex-col gap-2 items-center">
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                テンプレートを作成
              </Button>
              <Button
                variant="outline"
                onClick={() => seedDefaultMutation.mutate()}
                disabled={seedDefaultMutation.isPending}
              >
                デフォルトテンプレートを生成
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {templates?.map((template: any) => (
              <Card key={template.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {template.name}
                        </h3>
                        {template.isDefault === 1 && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            デフォルト
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        作成日:{" "}
                        {format(new Date(template.createdAt), "yyyy/M/d", {
                          locale: ja,
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      {template.isDefault !== 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSetDefault(template.id)}
                          title="デフォルトに設定"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleExport(template)}
                        title="エクスポート"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditDialog(template)}
                        title="編集"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setShowDeleteDialog(true);
                        }}
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 新規作成ダイアログ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>テンプレートを作成</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                テンプレート名 *
              </label>
              <Input
                placeholder="例: 標準意向確認書"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                説明（任意）
              </label>
              <Input
                placeholder="テンプレートの説明"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                テンプレート内容 *
              </label>
              <p className="text-xs text-muted-foreground mb-2">
                プレースホルダー: {"{{customerName}}"}, {"{{staffName}}"},{" "}
                {"{{insurancePurpose}}"}, {"{{familyStructure}}"},{" "}
                {"{{incomeExpenses}}"}, {"{{existingContracts}}"},{" "}
                {"{{desiredConditions}}"}, {"{{confirmationDate}}"}
              </p>
              <Textarea
                placeholder="Markdown形式でテンプレートを記述..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "作成中..." : "作成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>テンプレートを編集</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">
                テンプレート名
              </label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">説明</label>
              <Input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">
                テンプレート内容
              </label>
              <Textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={15}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              キャンセル
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "更新中..." : "更新"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>テンプレートを削除</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedTemplate?.name}
              」を削除しますか？この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
