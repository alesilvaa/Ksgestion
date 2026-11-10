import { Suspense } from "react";
import { LoginForm } from "@/features/auth/login-form";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f2f4f0]" />}>
      <LoginForm />
    </Suspense>
  );
}
