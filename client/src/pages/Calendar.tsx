import { useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

type Priority = "low" | "medium" | "high";

export default function Calendar() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newPriority, setNewPriority] = useState<Priority>("medium");
    const [newDueDate, setNewDueDate] = useState("");

    const utils = trpc.useUtils();

    // Fetch reminders for the current month view (plus buffer)
    const { data: reminders, isLoading } = trpc.reminders.list.useQuery({
        fromDate: startOfMonth(currentDate).toISOString(),
        toDate: endOfMonth(currentDate).toISOString(),
    });

    const createMutation = trpc.reminders.create.useMutation({
        onSuccess: () => {
            toast.success("リマインダーを作成しました");
            setShowAddDialog(false);
            setNewTitle("");
            setNewDescription("");
            setNewPriority("medium");
            setNewDueDate("");
            utils.reminders.list.invalidate();
        },
        onError: (err: any) => {
            toast.error("作成に失敗しました: " + err.message);
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
            dueDate: newDueDate ? new Date(newDueDate) : undefined,
        });
    };

    const handleDateClick = (arg: any) => {
        setNewDueDate(arg.dateStr);
        setShowAddDialog(true);
    };

    const events = reminders?.map((r: any) => ({
        id: r.id.toString(),
        title: r.title,
        start: r.dueDate || r.createdAt, // Fallback to createdAt if no dueDate, though logically calendar items should have dates
        backgroundColor: r.priority === "high" ? "#ef4444" : r.priority === "medium" ? "#eab308" : "#3b82f6",
        borderColor: "transparent",
        className: "text-xs font-medium cursor-pointer",
    })) || [];

    return (
        <div className="min-h-screen bg-background pb-20">
            <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
                <div className="container py-4 flex justify-between items-center">
                    <h1 className="text-lg font-semibold">カレンダー</h1>
                    <Button size="sm" onClick={() => setShowAddDialog(true)}>
                        <Plus className="h-4 w-4 mr-1" />
                        追加
                    </Button>
                </div>
            </header>

            <main className="container py-4">
                <Card>
                    <CardContent className="p-4">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            locale="ja"
                            headerToolbar={{
                                left: "prev,next today",
                                center: "title",
                                right: "dayGridMonth,timeGridWeek",
                            }}
                            events={events}
                            dateClick={handleDateClick}
                            height="auto"
                            // Update state when view changes to fetch new data
                            datesSet={(arg: any) => {
                                // Approximate checks, or use the view's start/end
                                // For simplicity now, we rely on currentDate which we might update here?
                                // Actually trpc query depends on currentDate. 
                                // Let's just update currentDate when user navigates.
                                const midDate = new Date((arg.start.getTime() + arg.end.getTime()) / 2);
                                if (midDate.getMonth() !== currentDate.getMonth()) {
                                    setCurrentDate(midDate);
                                }
                            }}
                        />
                    </CardContent>
                </Card>
            </main>

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
                            <label className="text-sm font-medium mb-1 block">日付</label>
                            <Input
                                type="date"
                                value={newDueDate}
                                onChange={(e) => setNewDueDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">詳細</label>
                            <Textarea
                                placeholder="詳細な内容"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-1 block">優先度</label>
                            <Select value={newPriority} onValueChange={(v: Priority) => setNewPriority(v)}>
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
                        <Button variant="outline" onClick={() => setShowAddDialog(false)}>キャンセル</Button>
                        <Button onClick={handleCreate}>作成</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
