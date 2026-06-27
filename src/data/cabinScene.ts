import { imageAssets } from '../assets/imageAssets';
import type { CabinSceneDefinition } from '../components/CabinPanorama';

export const primaryCabinScene: CabinSceneDefinition = {
  id: 'quiet-courier-strip-v1',
  strip: {
    standard: imageAssets.cabinStrip2304,
    highResolution: imageAssets.cabinStrip4608
  },
  fallbackByStation: {
    map: imageAssets.viewMapCeiling,
    cockpit: imageAssets.viewCockpitForward,
    radio: imageAssets.viewRadioConsole,
    ship: imageAssets.viewShipAft
  },
  cockpitWindowClipPath:
    'polygon(10% 16%, 90% 16%, 94% 22%, 91% 50.5%, 84% 56%, 16% 56%, 9% 50.5%, 6% 22%)',
  initialStation: 'cockpit',
  stations: {
    map: { id: 'map', index: 0, interactiveDistance: 0.035 },
    cockpit: { id: 'cockpit', index: 1, interactiveDistance: 0.035 },
    radio: { id: 'radio', index: 2, interactiveDistance: 0.035 },
    ship: { id: 'ship', index: 3, interactiveDistance: 0.035 }
  }
};
