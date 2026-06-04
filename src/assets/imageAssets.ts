const publicAsset = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`;

export const imageAssets = {
  viewCockpitForward: publicAsset('images/view_cockpit_forward.webp'),
  viewMapCeiling: publicAsset('images/view_map_ceiling.webp'),
  journalTabletOverlay: publicAsset('images/journal_tablet_overlay.webp'),
  viewShipAft: publicAsset('images/view_ship_aft.webp'),
  viewRadioConsole: publicAsset('images/view_radio_console.webp'),
  nebulaVista01: publicAsset('images/nebula_vista_01.webp'),
  nebulaVista02: publicAsset('images/nebula_vista_02.webp'),
  nebulaVista03: publicAsset('images/nebula_vista_03.webp'),
  hyperdriveTunnel: publicAsset('images/hyperdrive.gif'),
  spaceStationLumenRest: publicAsset('images/space_station_lumen_rest.webp'),
  asteroidBeltOutpost: publicAsset('images/asteroid_belt_outpost.webp'),
  planetLumenRest: publicAsset('images/planet_lumen_rest.webp'),
  planetVelaRest: publicAsset('images/planet_vela_rest.webp'),
  planetMarrowlight: publicAsset('images/planet_marrowlight.webp'),
  planetBluewake: publicAsset('images/planet_bluewake.webp')
} as const;

interface DestinationArt {
  src: string;
  kind: 'object' | 'backdrop';
  size: number;
  x: number;
  y: number;
}

const systemThumbnails: Record<string, string> = {
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

const destinationArt: Record<string, DestinationArt> = {
  'lumen-rest': { src: imageAssets.planetLumenRest, kind: 'object', size: 36, x: 50, y: 37 },
  'vela-rest': { src: imageAssets.planetVelaRest, kind: 'object', size: 34, x: 50, y: 37 },
  marrowlight: { src: imageAssets.planetMarrowlight, kind: 'object', size: 34, x: 50, y: 37 },
  bluewake: { src: imageAssets.planetBluewake, kind: 'object', size: 34, x: 50, y: 37 },
  'kites-end': { src: imageAssets.asteroidBeltOutpost, kind: 'object', size: 42, x: 50, y: 38 },
  'orison-belt': { src: imageAssets.asteroidBeltOutpost, kind: 'object', size: 42, x: 50, y: 38 },
  'pale-current': { src: imageAssets.nebulaVista02, kind: 'backdrop', size: 100, x: 50, y: 50 },
  'tallow-star': { src: imageAssets.nebulaVista03, kind: 'backdrop', size: 100, x: 50, y: 50 },
  'glass-harbor': { src: imageAssets.spaceStationLumenRest, kind: 'object', size: 40, x: 50, y: 38 },
  'ember-shoal': { src: imageAssets.nebulaVista01, kind: 'backdrop', size: 100, x: 50, y: 50 }
};

export const getDestinationArt = (systemId: string) => destinationArt[systemId] ?? destinationArt['ember-shoal']!;

export const getTravelVista = (destinationId: string) => {
  const vistas = [imageAssets.nebulaVista01, imageAssets.nebulaVista02, imageAssets.nebulaVista03];
  const index = Math.abs([...destinationId].reduce((total, char) => total + char.charCodeAt(0), 0)) % vistas.length;
  return vistas[index]!;
};
