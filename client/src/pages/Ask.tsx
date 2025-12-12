import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Send, Mic, Sparkles, FileText, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { Streamdown } from "streamdown";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  relatedRecordings?: Array<{
    id: number;
    customerName: string;
    recordedAt: Date;
  }>;
}

export default function Ask() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: recordingsData } = trpc.recordings.list.useQuery({
    pageSize: 50,
    filters: { status: "completed" },
  });

  const askMutation = trpc.ask.query.useMutation({
    onSuccess: (response) => {
      const answer = typeof response.answer === 'string' ? response.answer : '回答を取得できませんでした';
      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: answer,
        relatedRecordings: response.relatedRecordings,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    },
    onError: (error) => {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `エラーが発生しました: ${error.message}`,
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    askMutation.mutate({ question: input });
  };

  const suggestedQuestions = [
    "今日の面談で重要なポイントは？",
    "顧客が最も関心を持っていた保険は？",
    "フォローアップが必要な案件は？",
    "今週の成約見込み案件をまとめて",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-background">
      {/* ヘッダー */}
      <header className="flex-shrink-0 px-4 py-3 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Ask AI</h1>
            <p className="text-xs text-muted-foreground">
              録音内容について何でも質問できます
            </p>
          </div>
        </div>
      </header>

      {/* メッセージエリア */}
      <ScrollArea className="flex-1 px-4" ref={scrollRef}>
        <div className="py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-lg font-semibold mb-2">AIアシスタント</h2>
              <p className="text-sm text-muted-foreground mb-6">
                録音した会話について質問してみましょう
              </p>

              {/* 提案質問 */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">よくある質問:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setInput(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>

              {/* 関連ライフログ */}
              {recordingsData && recordingsData.data.length > 0 && (
                <div className="mt-8">
                  <p className="text-xs text-muted-foreground mb-2">
                    {recordingsData.total}件のライフログが利用可能
                  </p>
                </div>
              )}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2"
                      : "space-y-2"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <>
                      <Card>
                        <CardContent className="p-4">
                          <div className="prose prose-sm max-w-none">
                            <Streamdown>{message.content}</Streamdown>
                          </div>
                        </CardContent>
                      </Card>

                      {/* 関連録音 */}
                      {message.relatedRecordings && message.relatedRecordings.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground px-1">
                            関連するライフログ:
                          </p>
                          {message.relatedRecordings.map((rec) => (
                            <Card key={rec.id} className="cursor-pointer hover:bg-accent/50">
                              <CardContent className="p-2 flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{rec.customerName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(rec.recordedAt), "M/d", { locale: ja })}
                                </span>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="flex justify-start">
              <Card className="max-w-[85%]">
                <CardContent className="p-4 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-4 w-40" />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* 入力エリア */}
      <div className="flex-shrink-0 p-4 border-t bg-background">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="録音について質問する..."
              className="pr-10 touch-button"
              disabled={isLoading}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
              disabled
            >
              <Mic className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
          <Button type="submit" size="icon" className="touch-button" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
