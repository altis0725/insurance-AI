import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

export function AudioUploader() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const utils = trpc.useUtils();

    const processMutation = trpc.recordings.process.useMutation({
        onSuccess: () => {
            toast.success("AI分析が完了しました");
            utils.recordings.invalidate();
        },
        onError: (error) => {
            toast.error(`AI分析失敗: ${error.message}`);
        },
    });

    const uploadMutation = trpc.recordings.upload.useMutation({
        onSuccess: (data) => {
            toast.success("録音ファイルをアップロードしました。AI分析を開始します...");
            setFile(null);
            utils.recordings.invalidate();
            processMutation.mutate({ id: data.recordingId });
        },
        onError: (error) => {
            toast.error(`アップロード失敗: ${error.message}`);
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64 = e.target?.result as string;
            try {
                await uploadMutation.mutateAsync({
                    fileName: file.name,
                    fileBase64: base64,
                    duration: 0,
                });
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">音声ファイルアップロード</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    disabled={isUploading}
                />
                <Button
                    onClick={handleUpload}
                    disabled={!file || isUploading}
                    className="w-full"
                >
                    {isUploading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            アップロード中...
                        </>
                    ) : (
                        <>
                            <Upload className="mr-2 h-4 w-4" />
                            アップロード
                        </>
                    )}
                </Button>
            </CardContent>
        </Card>
    );
}
