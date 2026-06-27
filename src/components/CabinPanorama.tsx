import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode
} from 'react';
import {
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  RepeatWrapping,
  Scene,
  SRGBColorSpace,
  SphereGeometry,
  Texture,
  TextureLoader,
  WebGLRenderer
} from 'three';

export type CabinStationId = 'map' | 'cockpit' | 'radio' | 'ship';

export interface CabinStationDefinition {
  id: CabinStationId;
  yaw: number;
  interactiveAngle: number;
}

export interface CabinSceneDefinition {
  id: string;
  panorama: {
    standard: string;
    highResolution: string;
  };
  fallbackByStation: Record<CabinStationId, string>;
  verticalFov: number;
  textureRotation: number;
  initialStation: CabinStationId;
  stations: Record<CabinStationId, CabinStationDefinition>;
}

interface CabinPanoramaProps {
  activeStation: CabinStationId;
  children: ReactNode;
  className?: string;
  onStationChange: (station: CabinStationId) => void;
  scene: CabinSceneDefinition;
}

interface DragState {
  pointerId: number;
  startX: number;
  startYaw: number;
  moved: boolean;
}

const normalizeDegrees = (degrees: number) => {
  let normalized = degrees % 360;
  if (normalized > 180) normalized -= 360;
  if (normalized <= -180) normalized += 360;
  return normalized;
};

const nearestEquivalentYaw = (target: number, current: number) =>
  current + normalizeDegrees(target - current);

const angularDistance = (left: number, right: number) =>
  Math.abs(normalizeDegrees(left - right));

export function CabinPanorama({
  activeStation,
  children,
  className = '',
  onStationChange,
  scene
}: CabinPanoramaProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const yawRef = useRef(scene.stations[scene.initialStation].yaw);
  const targetYawRef = useRef(scene.stations[scene.initialStation].yaw);
  const lastFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const onStationChangeRef = useRef(onStationChange);

  useEffect(() => {
    onStationChangeRef.current = onStationChange;
  }, [onStationChange]);

  const updateStationPresentation = (yaw: number, dragging: boolean) => {
    const root = rootRef.current;
    if (!root) return;

    root.style.setProperty('--cabin-yaw', `${yaw}deg`);
    root.dataset.dragging = dragging ? 'true' : 'false';

    root.querySelectorAll<HTMLElement>('[data-cabin-station]').forEach((stationElement) => {
      const stationId = stationElement.dataset.cabinStation as CabinStationId | undefined;
      if (!stationId) return;

      const station = scene.stations[stationId];
      const distance = angularDistance(station.yaw, yaw);
      stationElement.style.visibility =
        distance <= station.interactiveAngle + 4 ? 'visible' : 'hidden';
      stationElement.style.pointerEvents =
        !dragging && distance <= station.interactiveAngle ? 'auto' : 'none';

      if (stationId === 'cockpit') {
        const liveWindow = stationElement.querySelector<HTMLElement>(
          '.scene-cockpit-window-hotspot'
        );
        if (liveWindow) liveWindow.style.visibility = distance < 24 ? 'visible' : 'hidden';
      }
    });
  };

  const renderFrame = (time: number) => {
    const previous = lastFrameRef.current ?? time;
    const elapsed = Math.min(34, time - previous);
    lastFrameRef.current = time;

    if (!dragRef.current) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const difference = targetYawRef.current - yawRef.current;
      const blend = reducedMotion ? 1 : 1 - Math.exp(-elapsed / 145);
      yawRef.current += difference * blend;
      if (Math.abs(difference) < 0.015) yawRef.current = targetYawRef.current;
    }

    const yawRadians = (yawRef.current * Math.PI) / 180;
    const camera = cameraRef.current;
    if (camera) {
      camera.lookAt(Math.sin(yawRadians), 0, -Math.cos(yawRadians));
      rendererRef.current?.render(camera.userData.scene as Scene, camera);
    }

    updateStationPresentation(yawRef.current, Boolean(dragRef.current));
    frameRef.current = window.requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    const stationYaw = scene.stations[activeStation].yaw;
    targetYawRef.current = nearestEquivalentYaw(stationYaw, yawRef.current);
  }, [activeStation, scene]);

  useEffect(() => {
    const root = rootRef.current;
    const canvasHost = canvasHostRef.current;
    if (!root || !canvasHost) return;

    const threeScene = new Scene();
    const camera = new PerspectiveCamera(scene.verticalFov, 1, 0.1, 1100);
    camera.userData.scene = threeScene;
    cameraRef.current = camera;

    let renderer: WebGLRenderer | null = null;
    let panoramaTexture: Texture | null = null;
    let sphere: Mesh<SphereGeometry, MeshBasicMaterial> | null = null;
    let disposed = false;

    const setFallback = () => {
      root.dataset.renderer = 'fallback';
    };

    try {
      renderer = new WebGLRenderer({
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance'
      });
      renderer.outputColorSpace = SRGBColorSpace;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      canvasHost.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      const maxTextureSize = renderer.capabilities.maxTextureSize;
      const useHighResolution = window.devicePixelRatio > 1.25 && maxTextureSize >= 4096;
      const textureUrl = useHighResolution
        ? scene.panorama.highResolution
        : scene.panorama.standard;

      new TextureLoader().load(
        textureUrl,
        (texture) => {
          if (disposed || !renderer) {
            texture.dispose();
            return;
          }

          panoramaTexture = texture;
          texture.colorSpace = SRGBColorSpace;
          texture.minFilter = LinearFilter;
          texture.magFilter = LinearFilter;
          texture.wrapS = RepeatWrapping;
          texture.offset.x = scene.textureRotation / 360;

          const geometry = new SphereGeometry(500, 64, 32);
          geometry.scale(-1, 1, 1);
          const material = new MeshBasicMaterial({ map: texture });
          sphere = new Mesh(geometry, material);
          threeScene.add(sphere);
          root.dataset.renderer = 'webgl';
        },
        undefined,
        setFallback
      );

      const handleContextLost = (event: Event) => {
        event.preventDefault();
        setFallback();
      };
      const handleContextRestored = () => {
        root.dataset.renderer = 'webgl';
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

      const resize = () => {
        if (!renderer || !root) return;
        const width = Math.max(1, root.clientWidth);
        const height = Math.max(1, root.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);

        const perspective = height / (2 * Math.tan((scene.verticalFov * Math.PI) / 360));
        root.style.setProperty('--cabin-perspective', `${perspective}px`);
        root.style.setProperty('--cabin-station-scale', `${(perspective + perspective) / perspective}`);
      };

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);
      resize();
      updateStationPresentation(yawRef.current, false);
      frameRef.current = window.requestAnimationFrame(renderFrame);

      return () => {
        disposed = true;
        resizeObserver.disconnect();
        if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
        renderer?.domElement.removeEventListener('webglcontextlost', handleContextLost);
        renderer?.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
        if (sphere) {
          sphere.geometry.dispose();
          sphere.material.dispose();
        }
        panoramaTexture?.dispose();
        renderer?.dispose();
        renderer?.domElement.remove();
        rendererRef.current = null;
        cameraRef.current = null;
      };
    } catch {
      setFallback();
      updateStationPresentation(yawRef.current, false);
      frameRef.current = window.requestAnimationFrame(renderFrame);
      return () => {
        disposed = true;
        if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      };
    }
  // The renderer lifecycle is intentionally keyed to the immutable scene definition.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [data-no-cabin-drag]')) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startYaw: yawRef.current,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    updateStationPresentation(yawRef.current, true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 5) drag.moved = true;
    const degreesPerPixel = 74 / Math.max(320, event.currentTarget.clientWidth);
    yawRef.current = drag.startYaw - deltaX * degreesPerPixel;
    targetYawRef.current = yawRef.current;
  };

  const finishDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    suppressClickRef.current = drag.moved;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 140);

    const nearestStation = Object.values(scene.stations).reduce((nearest, station) =>
      angularDistance(station.yaw, yawRef.current) <
      angularDistance(nearest.yaw, yawRef.current)
        ? station
        : nearest
    );
    targetYawRef.current = nearestEquivalentYaw(nearestStation.yaw, yawRef.current);
    onStationChangeRef.current(nearestStation.id);
    updateStationPresentation(yawRef.current, false);
  };

  const stationChildren = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    const stationId = (child as ReactElement<{ 'data-cabin-station'?: CabinStationId }>).props[
      'data-cabin-station'
    ];
    if (!stationId) return child;

    const stationStyle = {
      ...(child.props as { style?: CSSProperties }).style,
      '--station-yaw': `${-scene.stations[stationId].yaw}deg`
    } as CSSProperties;
    return cloneElement(child as ReactElement<{ style?: CSSProperties }>, { style: stationStyle });
  });

  const fallbackStyle = {
    '--cabin-fallback': `url(${scene.fallbackByStation[activeStation]})`
  } as CSSProperties;

  return (
    <div
      className={`cabin-360-root ${className}`.trim()}
      data-renderer="loading"
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
      onPointerCancel={finishDrag}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      ref={rootRef}
      style={fallbackStyle}
    >
      <div className="cabin-panorama-fallback" aria-hidden="true" />
      <div className="cabin-webgl-layer" aria-hidden="true" ref={canvasHostRef} />
      <div className="cabin-css3d-camera">
        <div className="cabin-css3d-world">{stationChildren}</div>
      </div>
    </div>
  );
}
