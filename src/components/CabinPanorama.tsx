import {
  useEffect,
  useRef,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react';

export type CabinStationId = 'map' | 'cockpit' | 'radio' | 'ship';

export interface CabinStationDefinition {
  id: CabinStationId;
  index: number;
  interactiveDistance: number;
}

export interface CabinSceneDefinition {
  id: string;
  strip: {
    standard: string;
    highResolution: string;
  };
  fallbackByStation: Record<CabinStationId, string>;
  cockpitWindowClipPath: string;
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
  startPosition: number;
  moved: boolean;
}

const STATION_COUNT = 4;

const positiveModulo = (value: number, divisor: number) =>
  ((value % divisor) + divisor) % divisor;

const nearestEquivalentPosition = (targetIndex: number, currentPosition: number) => {
  const forwardDistance = positiveModulo(targetIndex - currentPosition, STATION_COUNT);
  const distance = forwardDistance > STATION_COUNT / 2
    ? forwardDistance - STATION_COUNT
    : forwardDistance;
  return currentPosition + distance;
};

const normalizePosition = (position: number) => {
  let normalized = position;
  while (normalized >= STATION_COUNT) normalized -= STATION_COUNT;
  while (normalized < 0) normalized += STATION_COUNT;
  return normalized;
};

export function CabinPanorama({
  activeStation,
  children,
  className = '',
  onStationChange,
  scene
}: CabinPanoramaProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stripTrackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const initialPosition = scene.stations[scene.initialStation].index;
  const positionRef = useRef(initialPosition);
  const targetPositionRef = useRef(initialPosition);
  const lastFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const onStationChangeRef = useRef(onStationChange);

  useEffect(() => {
    onStationChangeRef.current = onStationChange;
  }, [onStationChange]);

  const updatePresentation = (position: number, dragging: boolean) => {
    const root = rootRef.current;
    const stripTrack = stripTrackRef.current;
    if (!root || !stripTrack) return;

    const viewportWidth = Math.max(1, root.clientWidth);
    stripTrack.style.transform = `translate3d(${-(position + STATION_COUNT) * viewportWidth}px, 0, 0)`;
    root.style.setProperty('--cabin-position', `${position}`);
    root.dataset.dragging = dragging ? 'true' : 'false';
    root.dataset.moving =
      dragging || Math.abs(targetPositionRef.current - position) > 0.01 ? 'true' : 'false';
    const fallbackActive = root.dataset.renderer === 'fallback';

    root.querySelectorAll<HTMLElement>('[data-cabin-station]').forEach((stationElement) => {
      const stationId = stationElement.dataset.cabinStation as CabinStationId | undefined;
      if (!stationId) return;

      const station = scene.stations[stationId];
      const stationPosition = nearestEquivalentPosition(station.index, position);
      const distance = stationPosition - position;
      const absoluteDistance = Math.abs(distance);

      stationElement.style.transform = `translate3d(${distance * viewportWidth}px, 0, 0)`;
      stationElement.style.visibility =
        fallbackActive
          ? absoluteDistance <= station.interactiveDistance ? 'visible' : 'hidden'
          : absoluteDistance < 1.02 ? 'visible' : 'hidden';
      stationElement.style.pointerEvents =
        !dragging && absoluteDistance <= station.interactiveDistance ? 'auto' : 'none';
    });
  };

  const renderFrame = (time: number) => {
    const previous = lastFrameRef.current ?? time;
    const elapsed = Math.min(34, time - previous);
    lastFrameRef.current = time;

    if (!dragRef.current) {
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const difference = targetPositionRef.current - positionRef.current;
      const blend = reducedMotion ? 1 : 1 - Math.exp(-elapsed / 135);
      positionRef.current += difference * blend;

      if (Math.abs(difference) < 0.0005) {
        positionRef.current = targetPositionRef.current;
        const normalized = normalizePosition(positionRef.current);
        if (normalized !== positionRef.current) {
          positionRef.current = normalized;
          targetPositionRef.current = normalized;
        }
      }
    }

    updatePresentation(positionRef.current, Boolean(dragRef.current));
    frameRef.current = window.requestAnimationFrame(renderFrame);
  };

  useEffect(() => {
    targetPositionRef.current = nearestEquivalentPosition(
      scene.stations[activeStation].index,
      positionRef.current
    );
  }, [activeStation, scene]);

  useEffect(() => {
    updatePresentation(positionRef.current, false);
    frameRef.current = window.requestAnimationFrame(renderFrame);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  // The animation loop intentionally reads mutable refs and the immutable scene definition.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, [data-no-cabin-drag]')) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startPosition: positionRef.current,
      moved: false
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePresentation(positionRef.current, true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    if (Math.abs(deltaX) > 5) drag.moved = true;
    positionRef.current = drag.startPosition - deltaX / Math.max(1, event.currentTarget.clientWidth);
    targetPositionRef.current = positionRef.current;
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

    const snappedPosition = Math.round(positionRef.current);
    targetPositionRef.current = snappedPosition;
    const snappedIndex = positiveModulo(snappedPosition, STATION_COUNT);
    const snappedStation = Object.values(scene.stations).find(
      (station) => station.index === snappedIndex
    );
    if (snappedStation) onStationChangeRef.current(snappedStation.id);
    updatePresentation(positionRef.current, false);
  };

  const rootStyle = {
    '--cabin-fallback': `url(${scene.fallbackByStation[activeStation]})`,
    '--cockpit-window-clip': scene.cockpitWindowClipPath
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
      style={rootStyle}
    >
      <div className="cabin-panorama-fallback" aria-hidden="true" />
      <div className="cabin-strip-viewport" aria-hidden="true">
        <div className="cabin-strip-track" ref={stripTrackRef}>
          {[-1, 0, 1].map((copy) => (
            <img
              alt=""
              className="cabin-strip-image"
              decoding="async"
              draggable={false}
              key={copy}
              onError={() => {
                if (rootRef.current) rootRef.current.dataset.renderer = 'fallback';
              }}
              onLoad={() => {
                if (rootRef.current) rootRef.current.dataset.renderer = 'strip';
              }}
              sizes="400vw"
              src={scene.strip.standard}
              srcSet={`${scene.strip.standard} 2304w, ${scene.strip.highResolution} 4608w`}
            />
          ))}
        </div>
      </div>
      <div className="cabin-strip-overlays">{children}</div>
    </div>
  );
}
