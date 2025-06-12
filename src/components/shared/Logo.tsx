import Link from 'next/link';

const Logo = ({ className }: { className?: string }) => {
  return (
    <Link href="/dashboard" className={`text-2xl font-headline font-bold text-primary hover:text-primary/90 transition-colors ${className}`}>
      Mashup Music Hub
    </Link>
  );
};

export default Logo;
