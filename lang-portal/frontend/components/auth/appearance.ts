export const authAppearance = {
  elements: {
    rootBox: "w-full",
    card: "bg-transparent shadow-none border-0 p-0",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    // Footer and links
    footer: "bg-transparent border-t border-blue-900/30",
    footerText: "text-blue-200/80 mt-6",
    footerAction: "text-blue-300 hover:text-blue-200 font-semibold underline underline-offset-2",
    footerActionText: "text-blue-200/80",

    // Social buttons
    socialButtonsBlockButton:
      "h-12 px-4 bg-white/5 dark:bg-slate-800/60 border border-blue-900/40 text-white hover:bg-white/10 dark:hover:bg-slate-800/70 transition-colors flex items-center justify-center gap-2",
    socialButtonsBlockButtonText: "text-white font-medium text-sm leading-none",
    socialButtonsBlockButtonContainer: "gap-3 mt-2 mb-6",
    socialButtonsBlockButtonArrow: "text-blue-200/70",
    dividerRow: "my-4",
    dividerLine: "bg-blue-900/50",
    dividerText: "text-blue-200/70",
    // Ensure provider icons are visible in dark mode
    socialButtonsProviderIcon: "!text-white filter brightness-100 contrast-100 w-5 h-5",
    // Force visible GitHub mark on dark surfaces
    socialButtonsProviderIcon__github: "w-5 h-5 filter invert",
    socialButtonsProviderIcon__google: "w-5 h-5",
    socialButtonsIconButton: "!text-white w-5 h-5",
    socialButtonsIconButton__github: "!text-white w-5 h-5",
    socialButtonsIconButton__google: "!text-white w-5 h-5",

    // Form fields and button hierarchy
    formButtonPrimary:
      "h-12 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-900/30",
    formFieldInput:
      "h-12 bg-[#111827]/70 dark:bg-[#1A2333] text-white placeholder:text-blue-100/85 border border-blue-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm",
    formFieldLabel: "text-blue-100/90 font-medium",
    identityPreviewText: "text-blue-200/70",
    formHeaderTitle: "text-white",
    formHeaderSubtitle: "text-blue-200/70",

    // Layout tweaks
    card__main: "gap-6",
    main__signIn: "gap-5",
    main__signUp: "gap-5",
    // Divider balance
    dividerRow: "my-6",
    dividerLine: "bg-white/15",
    dividerText: "text-blue-100/85",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
    shimmer: false,
  },
} as const;
