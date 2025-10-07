import Image from 'next/image'

interface LogoProps {
    width?: number;
    height?: number;
    className?: string;
}

export default function Logo({ width = 32, height = 32, className }: LogoProps) {
    return (
        <Image
            src="/logo.svg"
            alt="website logo"
            width={width}
            height={height}
            className={className}
        />
    );
}