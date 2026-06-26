import { imageAssets } from '../assets/imageAssets';
import type { CabinSceneDefinition } from '../components/CabinPanorama';

export const primaryCabinScene: CabinSceneDefinition = {
  id: 'quiet-courier-v1',
  panorama: {
    standard: imageAssets.cabinPanorama2048,
    highResolution: imageAssets.cabinPanorama4096
  },
  fallbackByStation: {
    map: imageAssets.viewMapCeiling,
    cockpit: imageAssets.viewCockpitForward,
    radio: imageAssets.viewRadioConsole,
    ship: imageAssets.viewShipAft
  },
  verticalFov: 76,
  textureRotation: -90,
  initialStation: 'cockpit',
  stations: {
    cockpit: { id: 'cockpit', yaw: 0, interactiveAngle: 18 },
    radio: { id: 'radio', yaw: -100, interactiveAngle: 18 },
    ship: { id: 'ship', yaw: 112, interactiveAngle: 18 },
    map: { id: 'map', yaw: 180, interactiveAngle: 18 }
  }
};
