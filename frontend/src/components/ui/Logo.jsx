import { Zap } from 'lucide-react';

/**
 * BigWatts SVG text logo.
 * Adapts to dark/light mode automatically.
 * No external image dependency — always renders correctly.
 */
export default function Logo({ className = 'h-8' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="bg-brand-400 rounded-lg p-1.5 flex items-center justify-center">
        <Zap className="h-4 w-4 text-black fill-black" />
      </span>
      <span className="font-display font-extrabold text-xl tracking-tight text-black dark:text-white">
        Big<span className="text-brand-500">Watts</span>
      </span>
    </span>
  );
}
