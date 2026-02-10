import { useTheme } from '../../context/ThemeContext';

/**
 * BigWatts PNG logo.
 *
 * To switch logos, just change the file names below.
 * All 6 logo PNGs are available in /public/:
 *   logo-light.png, logo-dark.png
 *   logo-light-old.png, logo-dark-old.png
 *   1.png, 2.png
 *
 * The ?v= cache-buster forces browsers to reload after a swap.
 */
const LOGO_LIGHT = '/logo-light.png';
const LOGO_DARK  = '/logo-dark.png';
const CACHE_BUST = '?v=3';

export default function Logo({ className = 'h-8', forceDark = false }) {
  const { dark } = useTheme();
  const useDark = forceDark || dark;
  const src = (useDark ? LOGO_DARK : LOGO_LIGHT) + CACHE_BUST;

  return (
    <img
      src={src}
      alt="BigWatts"
      className={className}
    />
  );
}
