// public/images assets for Among Quiet Stars
// Place these files in /public/images and import/reference these paths directly.

export const imageAssets = {
  cabinPanoramaPlaceholder: '/images/cabin_panorama_placeholder.svg',
  viewCockpitForward: '/images/view_cockpit_forward.webp',
  viewMapCeiling: '/images/view_map_ceiling.webp',
  viewJournalTablet: '/images/view_journal_tablet.webp',
  journalTabletOverlay: '/images/journal_tablet_overlay.webp',
  viewShipAft: '/images/view_ship_aft.webp',
  viewRadioConsole: '/images/view_radio_console.webp',
  cockpitBackground: '/images/cockpit_background.webp',
  nebulaVista01: '/images/nebula_vista_01.webp',
  nebulaVista02: '/images/nebula_vista_02.webp',
  nebulaVista03: '/images/nebula_vista_03.webp',
  spaceStationLumenRest: '/images/space_station_lumen_rest.webp',
  asteroidBeltOutpost: '/images/asteroid_belt_outpost.webp',
  planetLumenRest: '/images/planet_lumen_rest.webp',
  planetVelaRest: '/images/planet_vela_rest.webp',
  planetMarrowlight: '/images/planet_marrowlight.webp',
  planetBluewake: '/images/planet_bluewake.webp',
  journalPagesBackground: '/images/journal_pages_background.webp',
  titleBackground: '/images/title_background.webp',
} as const;

export type ImageAssetKey = keyof typeof imageAssets;
