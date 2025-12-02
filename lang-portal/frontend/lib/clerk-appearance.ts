/**
 * Restored Original Cohesive Dark Theme
 * 
 * Based on the original design with unique glass-card aesthetic,
 * consistent dark theme, and proper button styling.
 * Only removes development artifacts while preserving the original look.
 */

export const clerkAppearance = {
  elements: {
    // Base layout - restore original glass card styling
    rootBox: "w-full flex flex-col items-center",
    card: "glass-card rounded-2xl border border-blue-700/30 shadow-2xl bg-[#0A1120]/75 backdrop-blur-md p-12 w-full max-w-lg mx-auto min-h-[520px] relative",
    
    // Headers - restore original styling
    headerTitle: "text-3xl font-bold text-white text-center mb-4",
    headerSubtitle: "text-lg text-blue-200/80 text-center mb-8", 
    formHeaderTitle: "hidden",
    formHeaderSubtitle: "hidden",
    
    // Modal system - restore original backdrop
    modalBackdrop: "backdrop-blur-md bg-black/60 animate-none duration-0",
    modalContent: "bg-transparent animate-none duration-0 flex items-center justify-center p-4 min-h-full",
    modalCloseButton: "hidden",
    
    // User button styling - restore original
    userButtonBox: "animate-none duration-0 transition-none",
    userButtonPopoverCard: "glass-card bg-[#0A1120]/90 border border-blue-900/40 text-white animate-none transition-none duration-0 transform-none opacity-100",
    userButtonPopoverActionButton: "text-white hover:text-white hover:bg-blue-900/30 duration-0 transition-none",
    userButtonPopoverActionButtonText: "text-white",
    userButtonPopoverActionButtonIcon: "text-blue-200",
    userButtonPopoverFooter: "hidden",
    userButtonPopoverActions: "gap-1",
    
    // Form fields - restore original theming
    formFieldLabel: "text-blue-100/90 font-medium text-base mb-3",
    formFieldInput: "h-14 bg-[#0A1120]/60 text-white placeholder:text-blue-200/60 border border-blue-700/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 text-base rounded-lg backdrop-blur-sm px-4",
    formFieldError: "text-red-400 text-sm mt-2",
    formFieldSuccess: "text-green-400 text-sm mt-2", 
    formFieldWarning: "text-yellow-400 text-sm mt-2",
    formFieldInfo: "text-blue-400 text-sm mt-2",
    formFieldLabelRow: "text-blue-100/90 mb-3",
    
    // Buttons - restore original consistent styling
    formButtonPrimary: "h-14 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-900/30 text-base transition-all duration-200",
    formButtonSecondary: "h-14 rounded-lg bg-transparent border border-blue-900/50 text-blue-200 hover:bg-blue-900/30 hover:text-blue-100 font-medium transition-colors text-base",
    formButtonReset: "h-14 rounded-lg bg-transparent border border-blue-900/50 text-blue-200 hover:bg-blue-900/30 hover:text-blue-100 font-medium transition-colors text-base",
    
    // Social authentication - restore original consistent styling
    socialButtonsBlockButton: "h-14 w-full px-6 bg-[#0A1120]/40 border border-blue-700/40 text-white hover:bg-[#0A1120]/60 hover:border-blue-600/50 transition-all duration-200 flex items-center justify-center gap-3 rounded-lg backdrop-blur-sm mb-4",
    socialButtonsBlockButtonText: "text-white font-medium text-base leading-none",
    socialButtonsBlockButtonContainer: "gap-4 mt-4 mb-8",
    socialButtonsBlockButtonArrow: "text-blue-200/70",
    socialButtonsProviderIcon: "!text-white filter brightness-100 contrast-100 w-6 h-6",
    socialButtonsProviderIcon__github: "w-6 h-6 filter brightness-0 invert-1", 
    socialButtonsProviderIcon__google: "w-6 h-6",
    socialButtonsIconButton: "!text-white w-6 h-6",
    socialButtonsIconButton__github: "!text-white w-6 h-6",
    socialButtonsIconButton__google: "!text-white w-6 h-6",
    
    // Layout and spacing - restore original proportions
    card__main: "gap-8 flex flex-col w-full",
    main__signIn: "gap-6 w-full flex flex-col items-center",
    main__signUp: "gap-6 w-full flex flex-col items-center", 
    card__signIn: "gap-8 w-full",
    card__signUp: "gap-8 w-full",
    
    // Dividers - restore original styling
    dividerRow: "my-8",
    dividerLine: "bg-white/15",
    dividerText: "text-blue-100/85 text-base",
    
    // Footer - completely hide all footer elements
    footer: "hidden",
    footerText: "hidden",
    footerAction: "hidden",
    footerActionText: "hidden",
    footerActionLink: "hidden",
    
    // Identity preview - restore original theming
    identityPreview: "bg-[#0A1120]/60 border border-blue-700/40 rounded-lg backdrop-blur-sm p-4 mt-4",
    identityPreviewText: "text-white text-base",
    identityPreviewEditButton: "text-blue-300 hover:text-blue-200 transition-colors text-base",
    
    // OTP inputs - restore original theming
    otpCodeFieldInput: "bg-[#0A1120]/60 text-white border border-blue-700/40 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 rounded-lg backdrop-blur-sm h-14 text-base",
    
    // Hide navbar elements
    navbar: "hidden",
    navbarButton: "hidden",
    
    // Background consistency
    main: "bg-transparent w-full flex flex-col items-center",
    page: "bg-transparent w-full",
    
    // Hide development banners and debug elements
    footerActionLink__signUp: "hidden",
    footerActionLink__signIn: "hidden",
    developmentModeIndicator: "hidden",
    debugPanel: "hidden",
    debugInfo: "hidden",
  },
  layout: {
    socialButtonsPlacement: "top" as const,
    showOptionalFields: false,
    shimmer: false,
  },
  variables: {
    colorPrimary: "#2563eb",
    colorBackground: "transparent", 
    colorInputBackground: "#111827",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "rgba(148, 163, 184, 0.7)",
    borderRadius: "0.75rem",
    spacingUnit: "0.75rem",
    fontSize: "1rem",
  },
} as const;

export default clerkAppearance;
