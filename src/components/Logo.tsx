interface LogoProps {
  size?: number;
  showText?: boolean;
}

const Logo = ({ size = 36, showText = true }: LogoProps) => (
  <div className="flex items-center gap-2.5">
    <svg width={size} height={size} viewBox="0 0 200 200" className="flex-shrink-0">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(222, 72%, 42%)' }} />
          <stop offset="100%" style={{ stopColor: 'hsl(244, 100%, 69%)' }} />
        </linearGradient>
      </defs>
      {[30, 45, 60, 75, 90, 105].map((y, i) => (
        <rect key={`left-${i}`} x="20" y={y} width={35 - i * 2.5} height="8" fill="url(#logoGradient)" rx="2" />
      ))}
      {[30, 45, 60, 75, 90, 105].map((y, i) => (
        <rect key={`right-${i}`} x={145 + i * 2.5} y={y} width={35 - i * 2.5} height="8" fill="url(#logoGradient)" rx="2" />
      ))}
      <text x="100" y="165" fontFamily="Inter, Arial" fontSize="40" fontWeight="bold" fill="hsl(222, 72%, 42%)" textAnchor="middle">
        Lean
      </text>
    </svg>
    {showText && (
      <div>
        <div className="font-bold text-foreground text-base leading-tight">Lean</div>
        <div className="text-[10px] text-muted-foreground leading-tight">Business Efficiency</div>
      </div>
    )}
  </div>
);

export default Logo;