import type { CSSProperties, PointerEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { flybyShipAssets, getDestinationArt, getSystemThumbnail, getTravelVista, imageAssets } from './assets/imageAssets';
import { getEncounter } from './data/encounters';
import { getJournalEntry } from './data/journal';
import { getRadioMessage } from './data/radio';
import { getSystem } from './data/systems';
import { shipUpgrades } from './data/upgrades';
import { beginTravel, getTravelDurationMs, getVisibleSystems, pickEncounterForSystem, resolveChoice } from './services/gameLogic';
import { getCurrentLead, getLeadDestinationName, type CurrentLead } from './services/leads';
import { createInitialState, loadPlayerState, resetPlayerState, savePlayerState } from './services/storage';
import type {
  Encounter,
  EncounterChoice,
  ActiveTravelState,
  JournalEntry,
  PlayerState,
  RadioMessage,
  StarSystem,
  TravelState,
  ViewId
} from './types/game';

const primaryViewIds = ['map', 'cockpit', 'radio', 'ship'] as const;
type PrimaryViewId = (typeof primaryViewIds)[number];
type ScreenViewId = Exclude<ViewId, 'journal'>;
type ArrivalApproach = { systemId: string; encounterId: string };
type CockpitFlyby = {
  id: number;
  src: string;
  durationMs: number;
  style: CSSProperties;
};

const navItems: Array<{ id: PrimaryViewId; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'radio', label: 'Radio' },
  { id: 'ship', label: 'Ship' }
];

const resourceLabels: Array<keyof PlayerState['resources']> = ['fuel', 'supplies', 'hull', 'credits'];

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const isDefined = <T,>(value: T | undefined): value is T => value !== undefined;

const isPrimaryView = (view: ViewId | ScreenViewId): view is PrimaryViewId =>
  primaryViewIds.includes(view as PrimaryViewId);

const randomInRange = (min: number, max: number) => min + Math.random() * (max - min);

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const createCockpitFlyby = (id: number): CockpitFlyby => {
  const leftToRight = Math.random() > 0.5;
  const startY = randomInRange(8, 72);
  const endY = clamp(startY + randomInRange(-24, 24), -8, 88);
  const duration = randomInRange(11000, 23000);
  const size = randomInRange(42, 92);

  return {
    id,
    src: flybyShipAssets[Math.floor(Math.random() * flybyShipAssets.length)]!,
    durationMs: duration,
    style: {
      '--flyby-start-x': `${leftToRight ? -30 : 130}%`,
      '--flyby-end-x': `${leftToRight ? 130 : -30}%`,
      '--flyby-start-y': `${startY}%`,
      '--flyby-end-y': `${endY}%`,
      '--flyby-duration': `${duration}ms`,
      '--flyby-size': `${size}px`,
      '--flyby-facing': leftToRight ? 1 : -1,
      '--flyby-tilt': `${leftToRight ? randomInRange(-7, 7) : randomInRange(173, 187)}deg`,
      '--flyby-opacity': randomInRange(0.48, 0.82)
    } as CSSProperties
  };
};

function App() {
  const [state, setState] = useState<PlayerState>(() => loadPlayerState());
  const [view, setView] = useState<ScreenViewId>('cockpit');
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalClosing, setJournalClosing] = useState(false);
  const [travel, setTravel] = useState<TravelState | null>(null);
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
  const [choiceResult, setChoiceResult] = useState<string | null>(null);
  const [arrivalApproach, setArrivalApproach] = useState<ArrivalApproach | null>(null);
  const [pendingMapFocusSystemId, setPendingMapFocusSystemId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const currentSystem = getSystem(state.currentSystemId);
  const visibleSystems = useMemo(() => getVisibleSystems(state), [state]);
  const currentLead = useMemo(() => getCurrentLead(state), [state]);
  const journal = state.journalEntryIds.map(getJournalEntry).filter(isDefined);
  const radioHistory = state.radioHistoryIds.map(getRadioMessage).filter(isDefined);
  const activeEncounter = activeEncounterId ? getEncounter(activeEncounterId) : undefined;
  const activeTravel = state.activeTravel;
  const journalVisible = journalOpen || journalClosing;
  const unreadJournalCount = state.journalEntryIds.filter((id) => !state.readJournalEntryIds.includes(id)).length;

  useEffect(() => {
    savePlayerState(state);
  }, [state]);


  useEffect(() => {
    if (!activeTravel) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const currentTime = Date.now();
      setNow(currentTime);

      if (currentTime < activeTravel.arrivesAt) {
        return;
      }

      const destination = getSystem(activeTravel.toSystemId);
      const nextState = beginTravel(
        {
          ...state,
          activeTravel: undefined
        },
        destination
      );
      const arrived = nextState.currentSystemId === destination.id;

      setState(nextState);
      setTravel(null);
      setChoiceResult(null);

      if (arrived) {
        setActiveEncounterId(null);
        setArrivalApproach({
          systemId: destination.id,
          encounterId: activeTravel.encounterId
        });
        setView('cockpit');
        setJournalOpen(false);
        setJournalClosing(false);
      } else {
        setActiveEncounterId(null);
        setView('cockpit');
      }
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTravel, state]);

  useEffect(() => {
    if (!arrivalApproach) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveEncounterId(arrivalApproach.encounterId);
      setArrivalApproach(null);
      setChoiceResult(null);
      setView('encounter');
    }, 1500);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [arrivalApproach]);

  const markJournalRead = () => {
    if (state.journalEntryIds.length > 0) {
      const hasUnread = state.journalEntryIds.some(
        (id) => !state.readJournalEntryIds.includes(id)
      );
      if (hasUnread) {
        setState((current) => ({
          ...current,
          readJournalEntryIds: Array.from(
            new Set([...current.readJournalEntryIds, ...current.journalEntryIds])
          )
        }));
      }
    }
  };

  const openJournal = () => {
    setChoiceResult(null);
    markJournalRead();
    setJournalClosing(false);
    setJournalOpen(true);
    if (!isPrimaryView(view)) {
      setView('cockpit');
    }
  };

  const closeJournal = () => {
    if (!journalOpen) {
      return;
    }

    setJournalOpen(false);
    setJournalClosing(true);
  };

  const goTo = (nextView: ViewId) => {
    setChoiceResult(null);
    if (nextView === 'journal') {
      openJournal();
      return;
    }

    setJournalOpen(false);
    setJournalClosing(false);
    setView(nextView);
  };

  const navigateCabin = (direction: 1 | -1) => {
    if (!isPrimaryView(view)) {
      return;
    }

    const currentIndex = primaryViewIds.indexOf(view);
    const nextIndex = (currentIndex + direction + primaryViewIds.length) % primaryViewIds.length;
    goTo(primaryViewIds[nextIndex]!);
  };

  const startTravel = (destination: StarSystem) => {
    if (!destination.known || destination.id === state.currentSystemId || state.activeTravel) {
      return;
    }

    const encounter = pickEncounterForSystem(destination.id, state);
    const departedAt = Date.now();
    const durationMs = getTravelDurationMs(destination, state);
    const nextTravel: ActiveTravelState = {
      fromSystemId: state.currentSystemId,
      toSystemId: destination.id,
      encounterId: encounter.id,
      departedAt,
      arrivesAt: departedAt + durationMs,
      durationMs
    };

    setState((current) => ({
      ...current,
      activeTravel: nextTravel
    }));
    setTravel(nextTravel);
    setArrivalApproach(null);
    setNow(departedAt);
    setChoiceResult(null);
    setView('cockpit');
    setJournalOpen(false);
    setJournalClosing(false);
  };

  const followLead = () => {
    if (currentLead.destinationId) {
      setPendingMapFocusSystemId(currentLead.destinationId);
      goTo('map');
      return;
    }

    goTo(currentLead.actionView);
  };

  const finishTravel = () => {
    if (!travel) {
      return;
    }

    const destination = getSystem(travel.toSystemId);
    const nextState = beginTravel(state, destination);
    setState({
      ...nextState,
      activeTravel: undefined
    });
    setTravel(null);
    setArrivalApproach(null);

    if (nextState.currentSystemId !== destination.id) {
      setActiveEncounterId(null);
      setView('cockpit');
      setJournalOpen(false);
      setJournalClosing(false);
      return;
    }

    setActiveEncounterId(null);
    setArrivalApproach({
      systemId: destination.id,
      encounterId: travel.encounterId
    });
    setView('cockpit');
    setJournalOpen(false);
    setJournalClosing(false);
  };

  const chooseEncounterOption = (encounter: Encounter, choice: EncounterChoice) => {
    setState((current) => resolveChoice(current, encounter, choice));
    setChoiceResult(choice.resultText);
  };

  const resetSave = () => {
    resetPlayerState();
    setState(createInitialState());
    setTravel(null);
    setActiveEncounterId(null);
    setArrivalApproach(null);
    setChoiceResult(null);
    setView('cockpit');
    setJournalOpen(false);
    setJournalClosing(false);
  };

  return (
    <div className="app-shell">
      <main className="game-frame">
        <section className={`screen-panel ${isPrimaryView(view) ? 'cabin-panel' : 'narrative-panel'}`}>
          {isPrimaryView(view) && (
            <PanoramicCabinExperience
              activeView={view}
              currentSystem={currentSystem}
              activeTravel={activeTravel}
              arrivalApproach={arrivalApproach}
              now={now}
              currentLead={currentLead}
              state={state}
              systems={visibleSystems}
              recommendedSystemId={currentLead.destinationId}
              pendingMapFocusSystemId={pendingMapFocusSystemId}
              radioHistory={radioHistory}
              onLeadAction={followLead}
              onMapFocusHandled={() => setPendingMapFocusSystemId(null)}
              onTravel={startTravel}
              onReset={resetSave}
              onNavigate={navigateCabin}
            />
          )}
          {view === 'travel' && travel && <TravelScreen travel={travel} onFinish={finishTravel} />}
          {view === 'encounter' && activeEncounter && (
            <EncounterScreen
              encounter={activeEncounter}
              choiceResult={choiceResult}
              onChoose={chooseEncounterOption}
              onDone={openJournal}
            />
          )}
          {isPrimaryView(view) && journalVisible && (
            <JournalOverlay
              journal={journal}
              closing={journalClosing}
              onClose={closeJournal}
              onClosed={() => setJournalClosing(false)}
            />
          )}
        </section>

        {/* Floating Journal Button */}
        <button
          className={`journal-fab ${journalVisible ? 'active' : ''}`}
          type="button"
          onClick={() => (journalVisible ? closeJournal() : openJournal())}
          aria-label="Journal"
          aria-pressed={journalVisible}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="journal-icon"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            <line x1="10" y1="6" x2="16" y2="6" />
            <line x1="10" y1="10" x2="16" y2="10" />
            <line x1="10" y1="14" x2="16" y2="14" />
          </svg>
          {unreadJournalCount > 0 && !journalVisible && (
            <span className="journal-badge" aria-label={`${unreadJournalCount} unread entries`}>
              {unreadJournalCount}
            </span>
          )}
        </button>

        <nav className="bottom-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <button
              className={`nav-button ${view === item.id ? 'active' : ''}`}
              key={item.id}
              type="button"
              onClick={() => goTo(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
}

function PanoramicCabinExperience({
  activeView,
  currentSystem,
  activeTravel,
  arrivalApproach,
  now,
  currentLead,
  state,
  systems,
  recommendedSystemId,
  pendingMapFocusSystemId,
  radioHistory,
  onLeadAction,
  onMapFocusHandled,
  onTravel,
  onReset,
  onNavigate
}: {
  activeView: PrimaryViewId;
  currentSystem: StarSystem;
  activeTravel?: ActiveTravelState;
  arrivalApproach: ArrivalApproach | null;
  now: number;
  currentLead: CurrentLead;
  state: PlayerState;
  systems: StarSystem[];
  recommendedSystemId?: string;
  pendingMapFocusSystemId: string | null;
  radioHistory: RadioMessage[];
  onLeadAction: () => void;
  onMapFocusHandled: () => void;
  onTravel: (system: StarSystem) => void;
  onReset: () => void;
  onNavigate: (direction: 1 | -1) => void;
}) {
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const flybyIdRef = useRef(0);
  const [cockpitFlybys, setCockpitFlybys] = useState<CockpitFlyby[]>([]);

  const windowSystem = arrivalApproach ? getSystem(arrivalApproach.systemId) : currentSystem;
  const windowDestinationArt = getDestinationArt(windowSystem.id);
  const destinationStyle = {
    '--destination-size': `${windowDestinationArt.size}%`,
    '--destination-x': `${windowDestinationArt.x}%`,
    '--destination-y': `${windowDestinationArt.y}%`
  } as CSSProperties;

  const sceneStyle = {
    '--art-cockpit': `url(${imageAssets.viewCockpitForward})`,
    '--art-map': `url(${imageAssets.viewMapCeiling})`,
    '--art-ship': `url(${imageAssets.viewShipAft})`,
    '--art-radio': `url(${imageAssets.viewRadioConsole})`
  } as CSSProperties;

  useEffect(() => {
    if (activeView !== 'cockpit' || activeTravel) {
      return;
    }

    let cancelled = false;
    const timeoutIds: number[] = [];

    const scheduleNextFlyby = (initial: boolean) => {
      const delay = initial ? randomInRange(7000, 18000) : randomInRange(22000, 68000);
      const timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const flyby = createCockpitFlyby((flybyIdRef.current += 1));
        setCockpitFlybys((current) => [...current, flyby].slice(-2));

        const cleanupTimeoutId = window.setTimeout(() => {
          setCockpitFlybys((current) => current.filter((item) => item.id !== flyby.id));
        }, flyby.durationMs + 1200);
        timeoutIds.push(cleanupTimeoutId);

        scheduleNextFlyby(false);
      }, delay);
      timeoutIds.push(timeoutId);
    };

    scheduleNextFlyby(true);

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [activeTravel, activeView]);

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId
    };
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;

    if (!start || start.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;

    if (Math.abs(deltaX) < 48 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) {
      return;
    }

    onNavigate(deltaX < 0 ? 1 : -1);
  };

  return (
    <div
      className={`cabin-experience view-${activeView} ${activeTravel ? 'travel-active' : ''} ${
        arrivalApproach ? 'arrival-approach' : ''
      }`}
      style={sceneStyle}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={() => {
        swipeStartRef.current = null;
      }}
    >
      <div className="cabin-viewport">
        <div className="cabin-stage" aria-hidden="true">
          <div className="scene-art-plate art-cockpit" />
          <div className="scene-art-plate art-map" />
          <div className="scene-art-plate art-ship" />
          <div className="scene-art-plate art-radio" />
          <div className="scene-cockpit-window-hotspot" aria-hidden={activeView !== 'cockpit'}>
            <div className="cockpit-window-view">
              <div className="cockpit-starfield" />
              <div className="cockpit-flyby-layer" aria-hidden="true">
                {cockpitFlybys.map((flyby) => (
                  <img className="cockpit-flyby-ship" key={flyby.id} src={flyby.src} alt="" style={flyby.style} />
                ))}
              </div>
              <img
                src={windowDestinationArt.src}
                alt=""
                className={`cockpit-destination-art destination-${windowDestinationArt.kind}`}
                style={destinationStyle}
              />
              <img src={imageAssets.hyperdriveTunnel} alt="" className="cockpit-hyperdrive-art" />
            </div>
          </div>
        </div>
        <div className="scene-vignette" />
      </div>

      <div className="cabin-overlay-stage">
        {primaryViewIds.map((viewId) => (
          <div
            className={`cabin-overlay-plate controls-${viewId} view-${viewId}`}
            key={viewId}
            aria-hidden={viewId !== activeView}
            inert={viewId !== activeView}
          >
            <CabinOverlay
              activeView={viewId}
              currentSystem={currentSystem}
              activeTravel={activeTravel}
              arrivalApproach={arrivalApproach}
              now={now}
              currentLead={currentLead}
              state={state}
              systems={systems}
              recommendedSystemId={recommendedSystemId}
              pendingMapFocusSystemId={pendingMapFocusSystemId}
              radioHistory={radioHistory}
              onLeadAction={onLeadAction}
              onMapFocusHandled={onMapFocusHandled}
              onTravel={onTravel}
              onReset={onReset}
              visibleView={activeView}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function CabinOverlay({
  activeView,
  currentSystem,
  activeTravel,
  arrivalApproach,
  now,
  currentLead,
  state,
  systems,
  recommendedSystemId,
  pendingMapFocusSystemId,
  radioHistory,
  onLeadAction,
  onMapFocusHandled,
  onTravel,
  onReset,
  visibleView
}: {
  activeView: PrimaryViewId;
  currentSystem: StarSystem;
  activeTravel?: ActiveTravelState;
  arrivalApproach: ArrivalApproach | null;
  now: number;
  currentLead: CurrentLead;
  state: PlayerState;
  systems: StarSystem[];
  recommendedSystemId?: string;
  pendingMapFocusSystemId: string | null;
  radioHistory: RadioMessage[];
  onLeadAction: () => void;
  onMapFocusHandled: () => void;
  onTravel: (system: StarSystem) => void;
  onReset: () => void;
  visibleView: PrimaryViewId;
}) {
  const activeDestination = activeTravel ? getSystem(activeTravel.toSystemId) : undefined;
  const arrivingDestination = arrivalApproach ? getSystem(arrivalApproach.systemId) : undefined;
  const travelRemainingMs = activeTravel ? activeTravel.arrivesAt - now : 0;
  const [selectedMapSystemId, setSelectedMapSystemId] = useState<string>();
  const selectedSystemId = pendingMapFocusSystemId ?? selectedMapSystemId ?? recommendedSystemId ?? currentSystem.id;
  const systemCardRefs = useRef<Record<string, HTMLElement | null>>({});

  const selectMapSystem = (systemId: string) => {
    setSelectedMapSystemId(systemId);
    window.setTimeout(() => {
      systemCardRefs.current[systemId]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
    }, 0);
  };

  useEffect(() => {
    if (activeView !== 'map' || visibleView !== 'map' || !pendingMapFocusSystemId) {
      return;
    }

    window.setTimeout(() => {
      systemCardRefs.current[pendingMapFocusSystemId]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      });
      onMapFocusHandled();
    }, 0);
  }, [activeView, onMapFocusHandled, pendingMapFocusSystemId, visibleView]);

  switch (activeView) {
    case 'cockpit':
      return (
        <div className="overlay-layer cockpit-overlay">
          <div className="overlay-band cockpit-top-band">
            <div className="holo-panel holo-compact">
              <p className="eyebrow">
                {arrivalApproach && arrivingDestination
                  ? 'Final approach'
                  : activeTravel && activeDestination
                    ? 'In transit'
                    : 'Orbit status'}
              </p>
              <h2>
                {arrivalApproach && arrivingDestination
                  ? arrivingDestination.name
                  : activeTravel && activeDestination
                    ? `To ${activeDestination.name}`
                    : currentSystem.name}
              </h2>
              <p>
                {arrivalApproach && arrivingDestination
                  ? 'Completing approach. Stand by.'
                  : activeTravel && activeDestination
                    ? `Arriving in ${formatDuration(travelRemainingMs)}`
                    : 'Stable orbit. Survey windows open.'}
              </p>
            </div>
          </div>
          <div className="cockpit-holo-fields">
            <div className="holo-panel current-lead-panel">
              <p className="eyebrow">Current lead</p>
              <h3>{currentLead.title}</h3>
              <p>{currentLead.description}</p>
              <div className="lead-footer">
                <span>{getLeadDestinationName(currentLead)}</span>
              </div>
            </div>
            <div className="holo-panel resource-holo-panel">
              <p className="eyebrow">{activeTravel ? 'Travel systems' : 'Ship status'}</p>
              <ResourceStrip state={state} compact />
            </div>
          </div>
          <div className="cockpit-control-deck">
            <button className="plot-course-control" type="button" onClick={onLeadAction}>
              {currentLead.ctaLabel}
            </button>
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="overlay-layer map-overlay">
          <div className="overlay-shell map-shell">
            <div className="map-screen-panel">
              <div className="map-heading-row">
                <p className="eyebrow">Star map</p>
                <div className="map-legend" aria-label="Map legend">
                  <span>
                    <i className="map-legend-marker current" aria-hidden="true" />
                    You are here
                  </span>
                  {recommendedSystemId && (
                    <span>
                      <i className="map-legend-marker recommended" aria-hidden="true" />
                      Current lead
                    </span>
                  )}
                </div>
              </div>
              <div className="sector-map ceiling-map" aria-label="Star systems map">
                {systems.map((system) => (
                  <button
                    className={`map-node ${system.known ? 'known' : 'unknown'} ${system.id === currentSystem.id ? 'current' : ''} ${
                      system.id === recommendedSystemId ? 'recommended' : ''
                    } ${system.id === selectedSystemId ? 'selected' : ''}`}
                    key={system.id}
                    type="button"
                    style={{ left: `${system.position.x}%`, top: `${system.position.y}%` }}
                    onClick={() => selectMapSystem(system.id)}
                    aria-pressed={system.id === selectedSystemId}
                    aria-label={`${system.name}, ${system.known ? 'known' : 'unknown'} system${
                      system.id === currentSystem.id ? ', current location' : ''
                    }${system.id === recommendedSystemId ? ', current lead' : ''}`}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>

            <div className="system-list overlay-system-list route-list-panel">
              {systems.map((system) => {
                const isRecommended = system.id === recommendedSystemId;

                return (
                  <article
                    className={`system-card ${!system.known ? 'muted' : ''} ${isRecommended ? 'recommended' : ''} ${
                      system.id === selectedSystemId ? 'selected' : ''
                    }`}
                    key={system.id}
                    ref={(element) => {
                      systemCardRefs.current[system.id] = element;
                    }}
                  >
                    <img src={getSystemThumbnail(system.id)} alt="" className="system-thumb" />
                    <div className="system-main">
                      <div className="entry-topline">
                        <span>{system.known ? 'Known route' : 'Unconfirmed'}</span>
                        {isRecommended && <strong>Current lead</strong>}
                      </div>
                      <h3>{system.known ? system.name : 'Uncharted light'}</h3>
                      <p>{system.known ? system.description : 'A discovery may reveal this destination later.'}</p>
                    </div>
                    <div className="system-meta">
                      <span>{system.distance} ly</span>
                      <strong>{system.travelCost} fuel</strong>
                      <button
                        className="small-action"
                        type="button"
                        disabled={!system.known || system.id === currentSystem.id || Boolean(activeTravel)}
                        onClick={() => onTravel(system)}
                      >
                        {activeTravel
                          ? 'In transit'
                          : system.id === currentSystem.id
                            ? 'Here'
                            : system.known
                              ? 'Travel'
                              : 'Unknown'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      );
    case 'ship':
      return (
        <div className="overlay-layer ship-overlay">
          <div className="ship-screen-panel overlay-shell">
            <div className="screen-heading overlay-heading">
              <p className="eyebrow">Ship registry</p>
              <h2>Among Quiet Stars</h2>
            </div>
            <div className="ship-resources-grid" aria-label="Ship resources">
              {resourceLabels.map((resource) => (
                <div className="ship-resource" key={resource}>
                  <span>{resource}</span>
                  <strong>{state.resources[resource]}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="ship-upgrades-panel overlay-shell">
            <div className="screen-heading overlay-heading compact-heading">
              <p className="eyebrow">Available upgrades</p>
              <h2>Workshop queue</h2>
              <p>Preview modules for future installation.</p>
            </div>
            <div className="upgrade-list overlay-upgrade-list">
              {shipUpgrades.map((upgrade) => (
                <article className="upgrade-card" key={upgrade.id}>
                  <div>
                    <h4>{upgrade.name}</h4>
                    <p>{upgrade.description}</p>
                  </div>
                  <strong>{upgrade.cost} cr</strong>
                </article>
              ))}
            </div>
            <button className="reset-button" type="button" onClick={onReset}>
              Reset Save
            </button>
          </div>
        </div>
      );
    case 'radio':
      return (
        <div className="overlay-layer radio-overlay">
          <div className="radio-display overlay-shell">
            <div className="screen-heading overlay-heading compact-heading">
              <p className="eyebrow">Saved transmissions</p>
            </div>
            <div className="radio-list overlay-radio-list">
              {radioHistory.map((message) => (
                <article className={`radio-message ${message.tone}`} key={message.id}>
                  <strong>{message.source}</strong>
                  <p>{message.text}</p>
                </article>
              ))}
              {radioHistory.length === 0 && (
                <div className="empty-state radio-empty">
                  No saved messages yet. Encounters and leads will start feeding the receiver soon.
                </div>
              )}
            </div>
          </div>
        </div>
      );
  }
}

function JournalOverlay({
  journal,
  closing,
  onClose,
  onClosed
}: {
  journal: JournalEntry[];
  closing: boolean;
  onClose: () => void;
  onClosed: () => void;
}) {
  return (
    <div className={`journal-modal ${closing ? 'closing' : ''}`} role="dialog" aria-modal="true" aria-label="Journal">
      <button className="journal-backdrop" type="button" aria-label="Close journal" onClick={onClose} />
      <div
        className="journal-tablet-frame"
        onAnimationEnd={(event) => {
          if (event.animationName === 'journal-tablet-close') {
            onClosed();
          }
        }}
      >
        <img src={imageAssets.journalTabletOverlay} alt="" className="journal-tablet-art" />
        <div className="tablet-surface">
          {journal.length === 0 ? (
            <div className="empty-state tablet-empty">
              No discoveries logged yet. Follow the current lead from the cockpit and the first odd reading will mark this tablet.
            </div>
          ) : (
            <div className="journal-list tablet-journal-list">
              {journal.map((entry) => (
                <article className="journal-entry" key={entry.id}>
                  <div className="entry-topline">
                    <span>{entry.category}</span>
                    <strong>{entry.status}</strong>
                  </div>
                  <h3>{entry.title}</h3>
                  <p>{entry.observation}</p>
                  <footer>
                    <span>{entry.location}</span>
                    {entry.relatedDiscoveries.length > 0 && <span>{entry.relatedDiscoveries.length} linked note(s)</span>}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResourceStrip({ state, compact = false }: { state: PlayerState; compact?: boolean }) {
  return (
    <div className={`resource-strip ${compact ? 'compact' : ''}`} aria-label="Ship resources">
      {resourceLabels.map((resource) => (
        <div className="resource" key={resource}>
          <span>{resource}</span>
          <strong>{state.resources[resource]}</strong>
        </div>
      ))}
    </div>
  );
}

function TravelScreen({ travel, onFinish }: { travel: TravelState; onFinish: () => void }) {
  const origin = getSystem(travel.fromSystemId);
  const destination = getSystem(travel.toSystemId);
  const encounter = getEncounter(travel.encounterId);

  return (
    <div className="travel-screen">
      <section className="voyage-window">
        <img src={getTravelVista(destination.id)} alt="" className="hero-art voyage-art" />
        <div className="travel-parallax" />
        <div className="voyage-overlay">
          <p className="eyebrow">Among Quiet Stars in transit</p>
          <h2>
            {origin.name} to {destination.name}
          </h2>
          <p>Stars slide past the glass. The cabin hum settles into something almost like a song.</p>
          <div className="progress voyage-progress" role="progressbar" aria-label="Route progress">
            <div className="progress-bar" />
          </div>
          <div className="radio-slip">
            Incoming fragment: {encounter ? encounter.title.toLowerCase() : 'soft static'} near destination.
          </div>
          <button className="primary-action w-100" type="button" onClick={onFinish}>
            Complete Approach
          </button>
        </div>
      </section>
    </div>
  );
}

function EncounterScreen({
  encounter,
  choiceResult,
  onChoose,
  onDone
}: {
  encounter: Encounter;
  choiceResult: string | null;
  onChoose: (encounter: Encounter, choice: EncounterChoice) => void;
  onDone: () => void;
}) {
  return (
    <div className="encounter-screen">
      <img src={getSystemThumbnail(encounter.systemId)} alt="" className="encounter-art" />
      <div className="encounter-card">
        <p className="eyebrow">Encounter</p>
        <h2>{encounter.title}</h2>
        <p className="encounter-copy">{choiceResult ?? encounter.description}</p>
        {!choiceResult ? (
          <div className="choice-stack">
            {encounter.choices.map((choice) => (
              <button className="choice-button" key={choice.id} type="button" onClick={() => onChoose(encounter, choice)}>
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <button className="primary-action w-100" type="button" onClick={onDone}>
            Review Journal
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
