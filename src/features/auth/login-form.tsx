"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/lib/app-config";

const schema = z.object({
  email: z.string().trim().email("Ingresá un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const callbackError = searchParams.get("error");

  async function login(values: FormValues) {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setServerError(
        error.message === "Invalid login credentials"
          ? "El correo o la contraseña no son correctos."
          : "No pudimos iniciar sesión. Intentá nuevamente.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function loginWithGoogle() {
    setGoogleLoading(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setGoogleLoading(false);
      setServerError(
        "Google todavía no está disponible. Revisá la configuración del proveedor.",
      );
    }
  }

  return (
    <main className="manageopy-login relative flex min-h-[100svh] items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
      <div aria-hidden="true" className="manageopy-orb manageopy-orb-one" />
      <div aria-hidden="true" className="manageopy-orb manageopy-orb-two" />
      <div className="relative z-10 w-full max-w-[440px] animate-enter">
        <section className="manageopy-login-card rounded-[22px] bg-white px-5 py-5 shadow-[0_24px_64px_rgba(0,0,0,.2)] sm:px-8 sm:py-6">
          <div className="flex flex-col items-center text-center">
            <div className="manageopy-login-mark grid size-16 place-items-center rounded-[18px] bg-[#f0f1ef] text-[30px] font-black tracking-[-.08em] text-[#173d2f]">
              KS
            </div>
            <p className="mt-2.5 text-[25px] font-extrabold leading-none tracking-[-.06em] text-[#14241b]">
              {appConfig.productName}
            </p>
            <p className="mt-2 text-[13px] font-semibold text-[#78847d]">
              {appConfig.productDescription}
            </p>
          </div>

          {(serverError || callbackError) && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium leading-5 text-danger"
            >
              {serverError ??
                "No pudimos completar el acceso con Google. Intentá nuevamente."}
            </div>
          )}

          <form
            onSubmit={handleSubmit(login)}
            className="manageopy-login-form mt-5 space-y-3"
          >
            <div>
              <Label
                htmlFor="login-email"
                className="mb-1.5 text-xs font-extrabold uppercase tracking-[.08em] text-[#596860]"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#839188]" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@empresa.com"
                  className="manageopy-login-field h-12 rounded-[14px] border-2 border-[#e0e7e2] bg-[#f7f9f7] pl-[50px] text-sm font-semibold placeholder:text-[#95a098] focus:border-[#275f45]"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-danger">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label
                htmlFor="login-password"
                className="mb-1.5 text-xs font-extrabold uppercase tracking-[.08em] text-[#596860]"
              >
                Contraseña
              </Label>
              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-[#839188]" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="manageopy-login-field h-12 rounded-[14px] border-2 border-[#e0e7e2] bg-[#f7f9f7] pl-[50px] pr-[88px] text-sm font-semibold tracking-[.15em] focus:border-[#275f45]"
                  {...register("password")}
                />
                <button
                  type="button"
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg px-1.5 py-2 text-sm font-bold text-[#356b50] hover:bg-[#eaf1ec]"
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-danger">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              className="mt-1 h-12 w-full rounded-[14px] bg-[#173d2f] text-sm font-extrabold shadow-[0_10px_16px_rgba(23,61,47,.2)] hover:bg-[#0e3023]"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting && <LoaderCircle className="size-4 animate-spin" />}
              Ingresar al sistema
            </Button>
          </form>
          <p className="manageopy-login-footer-gap mt-4 text-center text-xs font-bold text-[#7d8981]">
            · {appConfig.productName} ·
          </p>
          <div className="my-4 h-px w-full bg-[#edf0ed]" />
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-full rounded-xl border-[#e0e7e2] bg-white text-[13px] font-bold text-[#26392f]"
            onClick={loginWithGoogle}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <GoogleMark />
            )}
            Continuar con Google
          </Button>
          <div className="mt-4 flex items-center justify-center gap-2 text-center text-[9px] font-bold uppercase tracking-[.14em] text-[#89938d]">
            <ShieldCheck className="size-3.5 text-[#3d7157]" /> Acceso privado y
            seguro
          </div>
        </section>
        <footer className="manageopy-login-footer-gap mt-3 flex items-center justify-center gap-2.5 text-white">
          <span className="grid size-9 place-items-center overflow-hidden rounded-xl bg-white p-1.5">
            <Image
              src="/brand/manageopy-mark.png"
              alt=""
              width={32}
              height={32}
              className="size-full object-contain"
            />
          </span>
          <span className="leading-tight">
            <span className="block text-[9px] font-bold uppercase tracking-[.22em] text-white/55">
              Desarrollado por
            </span>
            <span className="mt-0.5 block text-sm font-extrabold tracking-[-.02em]">
              {appConfig.developerName} <span aria-hidden="true">↗</span>
            </span>
          </span>
          <span className="rounded-md bg-white/10 px-2 py-1 text-[10px] font-bold text-white/70">
            v{appConfig.version}
          </span>
        </footer>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.5-.2-2.2H12v4.3h5.4a4.6 4.6 0 0 1-2 3v2.8h3.3c1.9-1.8 2.9-4.5 2.9-7.9Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.8c-.9.6-2.1 1-3.4 1a5.9 5.9 0 0 1-5.5-4.1H3.1v2.9A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.5 13.7A6 6 0 0 1 6.2 12c0-.6.1-1.2.3-1.7V7.4H3.1A10 10 0 0 0 2 12c0 1.7.4 3.2 1.1 4.6l3.4-2.9Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.2c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.8 9.8 0 0 0 3.1 7.4l3.4 2.9A5.9 5.9 0 0 1 12 6.2Z"
      />
    </svg>
  );
}
