import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Trash2,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

type Priority = "low" | "medium" | "high";
type ReminderStatus = "pending" | "completed" | "cancelled";

const priorityLabels: Record<Priority, string> = {
  low: "低",
  medium: "中",
  high: "高",
};

const priorityColors: Record<Priority, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function Reminders() {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<Priority>("medium");
  const [filter, setFilter] = useState<ReminderStatus | "all">("pending");

  const utils = trpc.useUtils();

  const { data: reminders, isLoading } = trpc.reminders.list.useQuery(
    filter !== "all" ? { status: filter } : undefined
  );

  const createMutation = trpc.reminders.create.useMutation({
    onSuccess: () => {
      toast.success("リマインダーを作成しました");
      setShowAddDialog(false);
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      utils.reminders.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("作成に失敗しました: " + err.message);
    },
  });

  const updateMutation = trpc.reminders.update.useMutation({
    onSuccess: () => {
      toast.success("更新しました");
      utils.reminders.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("更新に失敗しました: " + err.message);
    },
  });

  const deleteMutation = trpc.reminders.delete.useMutation({
    onSuccess: () => {
      toast.success("削除しました");
      utils.reminders.list.invalidate();
    },
    onError: (err: any) => {
      toast.error("削除に失敗しました: " + err.message);
    },
  });

  const handleCreate = () => {
    if (!newTitle.trim()) {
      toast.error("タイトルを入力してください");
      return;
    }
    createMutation.mutate({
      title: newTitle,
      description: newDescription || undefined,
      priority: newPriority,
    });
  };

  const handleToggleComplete = (id: number, currentStatus: ReminderStatus) => {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    updateMutation.mutate({ id, status: newStatus });
  };

  const handleDelete = (id: number) => {
    if (confirm("このリマインダーを削除しますか？")) {
      deleteMutation.mutate({ id });
    }
  };

  const pendingCount = reminders?.filter((r: any) => r.status === "pending").length || 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">リマインダー</h1>
                <p className="text-xs text-muted-foreground">
                  {pendingCount}件の未完了タスク
                </p>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              追加
            </Button>
          </div>

          {/* フィルター */}
          <div className="flex gap-2 mt-4">
            <Button
              variant={filter === "pending" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("pending")}
            >
              未完了
            </Button>
            <Button
              variant={filter === "completed" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("completed")}
            >
              完了
            </Button>
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              すべて
            </Button>
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
        ) : reminders?.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">リマインダーがありません</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              リマインダーを追加
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {reminders?.map((reminder: any) => (
              <Card
                key={reminder.id}
                className={`transition-colors ${reminder.status === "completed" ? "opacity-60" : ""
                  }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={reminder.status === "completed"}
                      onCheckedChange={() =>
                        handleToggleComplete(reminder.id, reminder.status)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className={`font-medium text-sm ${reminder.status === "completed"
                            ? "line-through text-muted-foreground"
                            : ""
                            }`}
                        >
                          {reminder.title}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${(priorityColors as any)[reminder.priority]}`}
                        >
                          {(priorityLabels as any)[reminder.priority]}
                        </Badge>
                      </div>
                      {reminder.description && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {reminder.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(reminder.createdAt), "M/d(E)", {
                            locale: ja,
                          })}
                        </span>
                        {reminder.dueDate && (
                          <span className="flex items-center gap-1 text-orange-600">
                            <Clock className="h-3 w-3" />
                            期限: {format(new Date(reminder.dueDate), "M/d", {
                              locale: ja,
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 追加ダイアログ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>リマインダーを追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">タイトル</label>
              <Input
                placeholder="タスクのタイトル"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">詳細（任意）</label>
              <Textarea
                placeholder="詳細な内容"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">優先度</label>
              <Select
                value={newPriority}
                onValueChange={(v) => setNewPriority(v as Priority)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">低</SelectItem>
                  <SelectItem value="medium">中</SelectItem>
                  <SelectItem value="high">高</SelectItem>
                </SelectContent>
              </Select>
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
    </div>
  );
}
