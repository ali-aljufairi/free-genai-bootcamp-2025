"use client";
import { Dialog, DialogContent, DialogClose, DialogTitle } from "@/components/ui/dialog";
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
        className="bg-transparent border-0 shadow-none p-4 sm:p-8 rounded-none max-w-none w-full h-full animate-none duration-0 data-[state=open]:!animate-none data-[state=closed]:!animate-none flex items-center justify-center"
        overlayClassName="bg-black/80 backdrop-blur-lg animate-none duration-0"
        hideClose
      >
        <DialogTitle className="sr-only">
          {mode === "sign-in" ? "Sign in to Sorami" : "Sign up for Sorami"}
        </DialogTitle>
        <div className="relative mx-auto w-full max-w-full sm:w-fit sm:max-w-lg min-h-[520px]">
          {mode === "sign-in" ? (
            <SignIn
              appearance={appearance}
              signUpUrl="/sign-up"
            />
          ) : (
            <SignUp
              appearance={appearance}
              signInUrl="/sign-in"
            />
          )}
          <DialogClose className="absolute top-3 right-3 sm:top-4 sm:right-4 z-50 inline-flex h-9 w-9 items-center justify-center text-blue-200/80 transition-colors duration-200 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthDialog;
