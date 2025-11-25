import { Brain, Edit, ScrollText, Search, MessageSquare, Mic, CheckCircle, Languages, Lock, Puzzle } from "lucide-react"

// Image dimensions constants
export const CARD_IMAGE_DIMENSIONS = {
    small: { width: 80, height: 80 },
    medium: { width: 112, height: 112 },
    large: { width: 128, height: 128 }
} as const;

// Preload image paths to improve performance
export const studyImages = {
    flashcards: "/Study-session/images.png",
    quiz: "/Study-session/pen.png",
    chat: "/Study-session/sen.png",
    drawing: "/Study-session/drawing.png",
    agent: "/Study-session/agent.png",
    speech: "/Study-session/mic.png",
    companion: "/Study-session/comp.png"
} as const;

// During the Postgres migration we only allow the new v2 flashcards (words & kanji).
// All other features are temporarily disabled and hidden or marked as such.
export const ENABLED_FEATURES = new Set(["words", "kanji", "grammar", "chat", "word-builder", "agent", "drawing"]);

export type StudyOption = {
    title: string;
    description: string;
    icon: React.ReactNode;
    image: string;
    type: string;
    disabled?: boolean;
    reason?: string;
};

export const studyOptions: StudyOption[] = [
    {
        title: "Word Flashcards",
        description: "Practice vocabulary with word flashcards",
        icon: <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />,
        image: studyImages.flashcards,
        type: "words"
    },
    {
        title: "Kanji Flashcards",
        description: "Practice kanji characters and meanings",
        icon: <Languages className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />,
        image: studyImages.flashcards,
        type: "kanji"
    },
    {
        title: "Grammar Quiz",
        description: "Practice Japanese grammar with interactive quizzes",
        icon: <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />,
        image: studyImages.quiz,
        type: "grammar"
    },
    {
        title: "Sentence Constructor",
        description: "Practice constructing sentences with AI assistance",
        icon: <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />,
        image: studyImages.chat,
        type: "chat"
    },
    {
        title: "Word Builder",
        description: "Build words from kanji in this fun timed game",
        icon: <Puzzle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />,
        image: studyImages.flashcards,
        type: "word-builder"
    },
    {
        title: "Writing Practice",
        description: "Practice writing kanji, words, and sentences with stroke guides",
        icon: <Edit className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />,
        image: studyImages.drawing,
        type: "drawing"
    },
    {
        title: "Learning Resources",
        description: "Get personalized learning plans based on your progress",
        icon: <Search className="h-4 w-4 sm:h-5 sm:w-5 text-teal-500" />,
        image: studyImages.agent,
        type: "agent"
    },
    {
        title: "Speech to Image",
        description: "Turn spoken words into images (coming soon)",
        icon: <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />,
        image: studyImages.speech,
        type: "speech",
        disabled: true,
        reason: "Migration in progress"
    },
    {
        title: "Companion",
        description: "Voice AI companion (coming soon)",
        icon: <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />,
        image: studyImages.companion,
        type: "companion-study",
        disabled: true,
        reason: "Migration in progress"
    }
] as const;