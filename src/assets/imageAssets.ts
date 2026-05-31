export const imageAssets = {
  cockpitBackground: '/images/cockpit_background.webp',
  titleBackground: '/images/title_background.webp',
  nebulaVista01: '/images/nebula_vista_01.webp',
  nebulaVista02: '/images/nebula_vista_02.webp',
  nebulaVista03: '/images/nebula_vista_03.webp',
  spaceStationLumenRest: '/images/space_station_lumen_rest.webp',
  asteroidBeltOutpost: '/images/asteroid_belt_outpost.webp',
  planetLumenRest: '/images/planet_lumen_rest.webp',
  planetVelaRest: '/images/planet_vela_rest.webp',
  planetMarrowlight: '/images/planet_marrowlight.webp',
  planetBluewake: '/images/planet_bluewake.webp',
  journalPagesBackground: '/images/journal_pages_background.webp'
} as const;

export type ImageAssetKey = keyof typeof imageAssets;

export const systemThumbnails: Record<string, string> = {
  'lumen-rest': imageAssets.planetLumenRest,
  'vela-rest': imageAssets.planetVelaRest,
  marrowlight: imageAssets.planetMarrowlight,
  bluewake: imageAssets.planetBluewake,
  'kites-end': imageAssets.asteroidBeltOutpost,
  'orison-belt': imageAssets.asteroidBeltOutpost,
  'pale-current': imageAssets.nebulaVista02,
  'tallow-star': imageAssets.nebulaVista03,
  'glass-harbor': imageAssets.spaceStationLumenRest,
  'ember-shoal': imageAssets.nebulaVista01
};

export const getSystemThumbnail = (systemId: string) => systemThumbnails[systemId] ?? imageAssets.nebulaVista01;

export const getTravelVista = (destinationId: string) => {
  const vistas = [imageAssets.nebulaVista01, imageAssets.nebulaVista02, imageAssets.nebulaVista03];
  const index = Math.abs([...destinationId].reduce((total, char) => total + char.charCodeAt(0), 0)) % vistas.length;
  return vistas[index]!;
};
