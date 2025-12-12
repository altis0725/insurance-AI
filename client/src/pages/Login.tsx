
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Login() {
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();
    const [error, setError] = useState("");

    const loginMutation = trpc.auth.devLogin.useMutation({
        onSuccess: async () => {
            await utils.auth.me.invalidate();
            setLocation("/");
        },
        onError: (err: any) => {
            setError(err.message);
        },
    });

    const handleLogin = () => {
        loginMutation.mutate();
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Card className="w-[350px]">
                <CardHeader>
                    <CardTitle>Welcome</CardTitle>
                    <CardDescription>Sign in to Insurance Demo App</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4">
                        <Button onClick={handleLogin} disabled={loginMutation.isPending}>
                            {loginMutation.isPending ? "Signing in..." : "Dev Login"}
                        </Button>
                        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
