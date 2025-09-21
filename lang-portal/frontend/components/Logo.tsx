interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
}

export default function Logo({ width = 32, height = 32, className }: LogoProps) {
    return (
        <img
            src="/logo.svg"
            alt="Logo"
            width={width}
            height={height}
            className={className}
        />
    );
}