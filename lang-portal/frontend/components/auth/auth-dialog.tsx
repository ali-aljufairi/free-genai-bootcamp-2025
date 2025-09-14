"use client";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { SignIn, SignUp } from "@clerk/nextjs";
import { X } from "lucide-react";
import { clerkAppearance } from "@/lib/clerk-appearance";

type Mode = "sign-in" | "sign-up";

export interface AuthDialogProps {
  mode: Mode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ mode, open, onOpenChange }: AuthDialogProps) {
  const appearance = clerkAppearance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-transparent border-0 shadow-none p-0 rounded-none max-w-none w-full h-full animate-none duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none flex items-center justify-center"
        overlayClassName="bg-black/80 backdrop-blur-lg animate-none duration-0"
        hideClose
      >
        <div className="relative w-full max-w-md mx-auto">
          <DialogClose className="absolute -top-12 right-0 z-50 inline-flex items-center justify-center rounded-full w-10 h-10 bg-blue-900/20 backdrop-blur-sm text-blue-200/80 hover:text-white hover:bg-blue-800/30 focus:outline-none focus:ring-2 focus:ring-blue-500/40 border border-blue-700/40 transition-all duration-200 hover:scale-105">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthDialog;
