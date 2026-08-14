import { BREAKPOINTS } from "@ai-drama-studio/config";
import { useBreakpoints } from "@vueuse/core";

export function useViewport() {
  const breakpoints = useBreakpoints({
    tablet: BREAKPOINTS.tabletMin,
    desktop: BREAKPOINTS.desktopMin,
  });

  const isMobile = breakpoints.smaller("tablet");
  const isTablet = breakpoints.between("tablet", "desktop");
  const isDesktop = breakpoints.greaterOrEqual("desktop");

  return { isMobile, isTablet, isDesktop };
}
