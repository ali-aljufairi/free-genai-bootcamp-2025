/**
 * Unified Clerk Appearance Configuration
 * 
 * This single configuration handles all Clerk components across the app:
 * - Auth dialogs (SignIn, SignUp)
 * - User button and popovers
 * - Global modal overlays
 * 
 * Replaces the conflicting configurations in:
 * - /components/auth/appearance.ts
 * - /components/navbar.tsx (clerkAppearance)
 */

export const clerkAppearance = {
  elements: {
    // Base layout with proper card styling - using golden ratio proportions
    rootBox: "w-full flex flex-col items-center",
    card: "glass-card rounded-2xl border border-blue-700/30 shadow-2xl bg-[#0A1120]/75 backdrop-blur-md p-12 w-full max-w-lg mx-auto min-h-[520px] relative",
    
    // Show headers since we removed the custom header - better spacing
    headerTitle: "text-4xl font-bold text-white text-center mb-4",
    headerSubtitle: "text-lg text-blue-200/80 text-center mb-8", 
    formHeaderTitle: "hidden",
    formHeaderSubtitle: "hidden",
    
    // Modal system
    modalBackdrop: "backdrop-blur-md bg-black/60 animate-none duration-0",
    modalContent: "bg-transparent animate-none duration-0 flex items-center justify-center p-4 min-h-full",
    modalCloseButton: "hidden", // Hide clerk's close button since we have our custom one
    
    // User button specific styling
    userButtonBox: "animate-none duration-0 transition-none",
    userButtonPopoverCard: "glass-card bg-[#0A1120]/90 border border-blue-900/40 text-white animate-none transition-none duration-0 transform-none opacity-100",
    userButtonPopoverActionButton: "text-blue-100 hover:text-white hover:bg-blue-900/30 duration-0 transition-none",
    userButtonPopoverActionButtonText: "text-blue-100",
    userButtonPopoverActionButtonIcon: "text-blue-200",
    userButtonPopoverFooter: "bg-transparent border-t border-blue-900/30 text-blue-200/80",
    userButtonPopoverActions: "gap-1",
    
    // Form fields with improved theming and golden ratio spacing
    formFieldLabel: "text-blue-100/90 font-medium text-base mb-3",
    formFieldInput: "h-14 bg-[#0A1120]/60 text-white placeholder:text-blue-200/60 border border-blue-700/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 text-base rounded-lg backdrop-blur-sm px-4",
    formFieldError: "text-red-400 text-sm mt-2",
    formFieldSuccess: "text-green-400 text-sm mt-2", 
    formFieldWarning: "text-yellow-400 text-sm mt-2",
    formFieldInfo: "text-blue-400 text-sm mt-2",
    formFieldLabelRow: "text-blue-100/90 mb-3",
    
    // Buttons - unified styling with better proportions
    formButtonPrimary: "h-14 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-900/30 text-base mt-6",
    formButtonSecondary: "h-14 rounded-lg bg-transparent border border-blue-900/50 text-blue-200 hover:bg-blue-900/30 hover:text-blue-100 font-medium transition-colors text-base",
    formButtonReset: "h-14 rounded-lg bg-transparent border border-blue-900/50 text-blue-200 hover:bg-blue-900/30 hover:text-blue-100 font-medium transition-colors text-base",
    
    // Social authentication with better theming and spacing
    socialButtonsBlockButton: "h-14 px-6 bg-[#0A1120]/40 border border-blue-700/40 text-white hover:bg-[#0A1120]/60 hover:border-blue-600/50 transition-all duration-200 flex items-center justify-center gap-3 rounded-lg backdrop-blur-sm mb-4",
    socialButtonsBlockButtonText: "text-white font-medium text-base leading-none",
    socialButtonsBlockButtonContainer: "gap-4 mt-4 mb-8",
    socialButtonsBlockButtonArrow: "text-blue-200/70",
    socialButtonsProviderIcon: "!text-white filter brightness-100 contrast-100 w-6 h-6",
    socialButtonsProviderIcon__github: "w-6 h-6 filter invert brightness-0 contrast-100", 
    socialButtonsProviderIcon__google: "w-6 h-6",
    socialButtonsIconButton: "!text-white w-6 h-6",
    socialButtonsIconButton__github: "!text-white w-6 h-6",
    socialButtonsIconButton__google: "!text-white w-6 h-6",
    
    // Layout and spacing using golden ratio proportions
    card__main: "gap-8 flex flex-col w-full",
    main__signIn: "gap-6 w-full flex flex-col items-center",
    main__signUp: "gap-6 w-full flex flex-col items-center", 
    card__signIn: "gap-8 w-full",
    card__signUp: "gap-8 w-full",
    
    // Dividers with better spacing
    dividerRow: "my-8",
    dividerLine: "bg-white/15",
    dividerText: "text-blue-100/85 text-base",
    
    // Footer with improved theming
    footer: "bg-transparent border-t border-blue-700/30 mt-8 pt-6",
    footerText: "text-blue-200/70 text-base",
    footerAction: "text-blue-300 hover:text-blue-200 font-medium underline underline-offset-2 transition-colors text-base",
    footerActionText: "text-blue-200/70 text-base",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-medium transition-colors text-base",
    
    // Identity preview with better theming
    identityPreview: "bg-[#0A1120]/60 border border-blue-700/40 rounded-lg backdrop-blur-sm p-4 mt-4",
    identityPreviewText: "text-white text-base",
    identityPreviewEditButton: "text-blue-300 hover:text-blue-200 transition-colors text-base",
    
    // OTP and additional inputs with consistent theming
    otpCodeFieldInput: "bg-[#0A1120]/60 text-white border border-blue-700/40 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 rounded-lg backdrop-blur-sm h-14 text-base",
    
    // Hide navbar elements in modals
    navbar: "hidden",
    navbarButton: "hidden",
    
    // Background consistency
    main: "bg-transparent w-full flex flex-col items-center",
    page: "bg-transparent w-full",
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
    borderRadius: "0.75rem", // Larger border radius
    spacingUnit: "0.75rem", // Golden ratio based spacing (12px base)
    fontSize: "1rem", // Base font size
  },
} as const;

export default clerkAppearance;