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
    // Base layout with proper card styling
    rootBox: "w-full flex flex-col items-center",
    card: "glass-card rounded-2xl border border-blue-700/30 shadow-2xl bg-[#0A1120]/75 backdrop-blur-md p-8 w-full max-w-md mx-auto",
    
    // Show headers since we removed the custom header
    headerTitle: "text-3xl font-bold text-white text-center mb-2",
    headerSubtitle: "text-base text-blue-200/80 text-center mb-6", 
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
    
    // Form fields with improved theming
    formFieldLabel: "text-blue-100/90 font-medium text-sm",
    formFieldInput: "h-12 bg-[#0A1120]/60 text-white placeholder:text-blue-200/60 border border-blue-700/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/60 text-sm rounded-md backdrop-blur-sm",
    formFieldError: "text-red-400 text-sm",
    formFieldSuccess: "text-green-400 text-sm", 
    formFieldWarning: "text-yellow-400 text-sm",
    formFieldInfo: "text-blue-400 text-sm",
    formFieldLabelRow: "text-blue-100/90",
    
    // Buttons - unified styling
    formButtonPrimary: "h-12 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-blue-900/30",
    formButtonSecondary: "h-12 rounded-md bg-transparent border border-blue-900/50 text-blue-200 hover:bg-blue-900/30 hover:text-blue-100 font-medium transition-colors",
    formButtonReset: "h-12 rounded-md bg-transparent border border-blue-900/50 text-blue-200 hover:bg-blue-900/30 hover:text-blue-100 font-medium transition-colors",
    
    // Social authentication with better theming
    socialButtonsBlockButton: "h-12 px-4 bg-[#0A1120]/40 border border-blue-700/40 text-white hover:bg-[#0A1120]/60 hover:border-blue-600/50 transition-all duration-200 flex items-center justify-center gap-2 rounded-md backdrop-blur-sm",
    socialButtonsBlockButtonText: "text-white font-medium text-sm leading-none",
    socialButtonsBlockButtonContainer: "gap-3 mt-2 mb-6",
    socialButtonsBlockButtonArrow: "text-blue-200/70",
    socialButtonsProviderIcon: "!text-white filter brightness-100 contrast-100 w-5 h-5",
    socialButtonsProviderIcon__github: "w-5 h-5 filter invert brightness-0 contrast-100", 
    socialButtonsProviderIcon__google: "w-5 h-5",
    socialButtonsIconButton: "!text-white w-5 h-5",
    socialButtonsIconButton__github: "!text-white w-5 h-5",
    socialButtonsIconButton__google: "!text-white w-5 h-5",
    
    // Layout and spacing
    card__main: "gap-6 flex flex-col w-full",
    main__signIn: "gap-5 w-full flex flex-col items-center",
    main__signUp: "gap-5 w-full flex flex-col items-center", 
    card__signIn: "gap-6 w-full",
    card__signUp: "gap-6 w-full",
    
    // Dividers
    dividerRow: "my-6",
    dividerLine: "bg-white/15",
    dividerText: "text-blue-100/85",
    
    // Footer with improved theming
    footer: "bg-transparent border-t border-blue-700/30 mt-6",
    footerText: "text-blue-200/70 text-sm",
    footerAction: "text-blue-300 hover:text-blue-200 font-medium underline underline-offset-2 transition-colors",
    footerActionText: "text-blue-200/70 text-sm",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-medium transition-colors",
    
    // Identity preview with better theming
    identityPreview: "bg-[#0A1120]/60 border border-blue-700/40 rounded-md backdrop-blur-sm",
    identityPreviewText: "text-white",
    identityPreviewEditButton: "text-blue-300 hover:text-blue-200 transition-colors",
    
    // OTP and additional inputs with consistent theming
    otpCodeFieldInput: "bg-[#0A1120]/60 text-white border border-blue-700/40 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 rounded-md backdrop-blur-sm",
    
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
    borderRadius: "0.5rem",
    spacingUnit: "0.5rem",
  },
} as const;

export default clerkAppearance;