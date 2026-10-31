"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, Mail, AlertCircle } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn.email({
        email: email.trim(),
        password: password,
      });

      if (res.error) {
        throw new Error(
          res.error.message === "Invalid email or password"
            ? "البريد الإلكتروني أو كلمة المرور غير صحيحة"
            : res.error.message || "فشل تسجيل الدخول"
        );
      }

      router.push("/admin");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-slate-200/90 shadow-md bg-white">
        <CardHeader className="text-center pb-4">
          <div className="w-14 h-14 bg-blue-900 text-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <CardTitle className="text-2xl text-slate-900 font-bold">تسجيل دخول الإدارة</CardTitle>
          <CardDescription className="text-slate-500 text-xs mt-1">
            بوابة إدارة طلبات وشكاوى العاملين — الموارد البشرية
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                البريد الإلكتروني للإدارة
              </label>
              <div className="relative">
                <Input
                  type="email"
                  dir="ltr"
                  placeholder="admin@portal.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Input
                  type="password"
                  dir="ltr"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full text-sm font-bold shadow-xs mt-2"
              isLoading={isLoading}
            >
              <Lock className="w-4 h-4 ml-1" />
              تسجيل الدخول
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
            التسجيل العام غير متاح. يتم تعيين حسابات الإدارة بواسطة مسؤول النظام فقط.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
