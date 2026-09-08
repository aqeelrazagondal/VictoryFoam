export const HEADER_BAND_PX = 96;

export type CinemaRect = {
  top: number;
  bottom: number;
};

export type CinemaHeaderState = {
  overCinema: boolean;
  headerVisible: boolean;
};

/**
 * Decide header visibility and cinema chrome from the cinema section's box.
 * Cinema chrome stays on for as long as any part of the cinema covers the header
 * band — including the last sticky stage and scrolling back up into it.
 * Desktop homepage keeps cinema chrome before the cinema node has mounted so
 * light-mode page chrome cannot flash over the dark stage.
 */
export function computeCinemaHeaderState(options: {
  isHome: boolean;
  isDesktop: boolean;
  cinemaRect: CinemaRect | null;
}): CinemaHeaderState {
  if (!options.isHome || !options.isDesktop) {
    return { overCinema: false, headerVisible: true };
  }

  if (!options.cinemaRect) {
    return { overCinema: true, headerVisible: true };
  }

  const { top, bottom } = options.cinemaRect;
  const overCinema = top < HEADER_BAND_PX && bottom > 0;

  return {
    overCinema,
    headerVisible: true,
  };
}
