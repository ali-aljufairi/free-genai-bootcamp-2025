"use client";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { SignIn, SignUp } from "@clerk/nextjs";
import { BookOpen, GraduationCap, X } from "lucide-react";
import { authAppearance } from "@/components/auth/appearance";

type Mode = "sign-in" | "sign-up";

export interface AuthDialogProps {
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ mode, open, onOpenChange }: AuthDialogProps) {
  const HeaderIcon = mode === "sign-in" ? BookOpen : GraduationCap;

    const appearance = authAppearance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-transparent border-0 shadow-none p-0 rounded-none max-w-xl animate-none duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none"
        overlayClassName="bg-black/80 backdrop-blur-lg animate-none duration-0"
        hideClose
      >
        <Card className="relative glass-card rounded-2xl border border-blue-700/30 shadow-2xl bg-[#0A1120]/75 backdrop-blur-md w-full max-w-xl">
          <DialogClose className="absolute top-4 right-4 left-auto z-20 inline-flex items-center justify-center rounded-md p-2 text-blue-100/80 hover:text-white hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogClose>
          <CardContent className="p-10">
            <div className="mb-7 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-900/30">
                <HeaderIcon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white">
                {mode === "sign-in" ? "Sign in to Sorami" : "Create your account"}
              </h2>
              <p className="text-base text-blue-200/80">
                {mode === "sign-in"
                  ? "Welcome back! Please sign in to continue"
                  : "Welcome! Please fill in the details to get started."}
              </p>
            </div>
            {mode === "sign-in" ? (
              <SignIn
                appearance={appearance}
                afterSignInUrl="/study"
                signUpUrl="/sign-up"
                redirectUrl="/study"
              />
            ) : (
              <SignUp
                appearance={appearance}
                afterSignUpUrl="/study"
                signInUrl="/sign-in"
                redirectUrl="/study"
              />
            )}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}

export default AuthDialog;
