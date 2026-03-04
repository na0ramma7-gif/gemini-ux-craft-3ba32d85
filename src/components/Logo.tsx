interface LogoProps {
  size?: number;
  showText?: boolean;
}

const Logo = ({ size = 36, showText = true }: LogoProps) => (
  <div className="flex items-center gap-2.5">
    <svg width={size} height={size} viewBox="0 0 200 200" className="flex-shrink-0">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(234, 55%, 30%)' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(222, 100%, 59%)' }} />
        </linearGradient>
      </defs>
      {/* Geometric M mark inspired by lean.sa */}
      <path d="M30 150 L30 50 L65 50 L100 100 L135 50 L170 50 L170 150 L145 150 L145 90 L110 140 L90 140 L55 90 L55 150 Z" fill="url(#logoGradient)" />
      {/* Arabic لين text below */}
      <text x="100" y="185" fontFamily="Tajawal, Arial" fontSize="30" fontWeight="700" fill="hsl(234, 55%, 30%)" textAnchor="middle">
        لين
      </text>
    </svg>
    {showText && (
      <div>
        <div className="font-bold text-foreground text-base leading-tight">Lean</div>
        <div className="text-[10px] text-muted-foreground leading-tight">لين</div>
      </div>
    )}
  </div>
);

export default Logo;
