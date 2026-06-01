import type { CSSProperties } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSystemThumbnail, getTravelVista, imageAssets } from './assets/imageAssets';
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

const primaryViewIds = ['cockpit', 'map', 'journal', 'ship', 'radio'] as const;
type PrimaryViewId = (typeof primaryViewIds)[number];

const navItems: Array<{ id: PrimaryViewId; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'ship', label: 'Ship' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'radio', label: 'Radio' },
  { id: 'journal', label: 'Journal' }
];

const resourceLabels: Array<keyof PlayerState['resources']> = ['fuel', 'supplies', 'hull', 'credits'];

const formatDuration = (ms: number) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const isDefined = <T,>(value: T | undefined): value is T => value !== undefined;

const isPrimaryView = (view: ViewId): view is PrimaryViewId =>
  primaryViewIds.includes(view as PrimaryViewId);

function App() {
  const [state, setState] = useState<PlayerState>(() => loadPlayerState());
  const [view, setView] = useState<ViewId>('cockpit');
  const [travel, setTravel] = useState<TravelState | null>(null);
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
  const [choiceResult, setChoiceResult] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const currentSystem = getSystem(state.currentSystemId);
  const visibleSystems = useMemo(() => getVisibleSystems(state), [state]);
  const currentLead = useMemo(() => getCurrentLead(state), [state]);
  const journal = state.journalEntryIds.map(getJournalEntry).filter(isDefined);
  const radioHistory = state.radioHistoryIds.map(getRadioMessage).filter(isDefined);
  const activeEncounter = activeEncounterId ? getEncounter(activeEncounterId) : undefined;
  const activeTravel = state.activeTravel;

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
      let arrivedAtDestination = false;

      setState((current) => {
        if (current.activeTravel?.arrivesAt !== activeTravel.arrivesAt) {
          return current;
        }

        const nextState = beginTravel(
          {
            ...current,
            activeTravel: undefined
          },
          destination
        );
        arrivedAtDestination = nextState.currentSystemId === destination.id;

        return {
          ...nextState,
          activeTravel: undefined
        };
      });
      setTravel(null);
      setChoiceResult(null);

      if (!arrivedAtDestination) {
        setActiveEncounterId(null);
        setView('cockpit');
        return;
      }

      setActiveEncounterId(activeTravel.encounterId);
      setView('encounter');
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeTravel]);

  const goTo = (nextView: ViewId) => {
    setChoiceResult(null);
    setView(nextView);
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
    setNow(departedAt);
    setChoiceResult(null);
    setView('cockpit');
  };

  const followLead = () => {
    setChoiceResult(null);
    setView(currentLead.actionView);
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

    if (nextState.currentSystemId !== destination.id) {
      setActiveEncounterId(null);
      setView('cockpit');
      return;
    }

    setActiveEncounterId(travel.encounterId);
    setView('encounter');
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
    setChoiceResult(null);
    setView('cockpit');
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
              now={now}
              currentLead={currentLead}
              state={state}
              systems={visibleSystems}
              recommendedSystemId={currentLead.destinationId}
              journal={journal}
              radioHistory={radioHistory}
              onLeadAction={followLead}
              onTravel={startTravel}
              onReset={resetSave}
            />
          )}
          {view === 'travel' && travel && <TravelScreen travel={travel} onFinish={finishTravel} />}
          {view === 'encounter' && activeEncounter && (
            <EncounterScreen
              encounter={activeEncounter}
              choiceResult={choiceResult}
              onChoose={chooseEncounterOption}
              onDone={() => goTo('journal')}
            />
          )}
        </section>

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
  now,
  currentLead,
  state,
  systems,
  recommendedSystemId,
  journal,
  radioHistory,
  onLeadAction,
  onTravel,
  onReset
}: {
  activeView: PrimaryViewId;
  currentSystem: StarSystem;
  activeTravel?: ActiveTravelState;
  now: number;
  currentLead: CurrentLead;
  state: PlayerState;
  systems: StarSystem[];
  recommendedSystemId?: string;
  journal: JournalEntry[];
  radioHistory: RadioMessage[];
  onLeadAction: () => void;
  onTravel: (system: StarSystem) => void;
  onReset: () => void;
}) {
  const [readyView, setReadyView] = useState<PrimaryViewId>(activeView);

  const overlaysReady = readyView === activeView;

  useEffect(() => {
    const delay = activeView === 'map' || activeView === 'journal' ? 360 : 760;
    const timeoutId = window.setTimeout(() => {
      setReadyView(activeView);
    }, delay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeView]);

  const sceneStyle = {
    '--art-cockpit': `url(${imageAssets.viewCockpitForward})`,
    '--art-map': `url(${imageAssets.viewMapCeiling})`,
    '--art-journal': `url(${imageAssets.viewJournalTablet})`,
    '--art-ship': `url(${imageAssets.viewShipAft})`,
    '--art-radio': `url(${imageAssets.viewRadioConsole})`,
    '--space-view': `url(${getSystemThumbnail(currentSystem.id)})`
  } as CSSProperties;

  return (
    <div
      className={`cabin-experience view-${activeView} ${activeTravel ? 'travel-active' : ''} ${
        overlaysReady ? 'overlays-ready' : 'overlays-transitioning'
      }`}
      style={sceneStyle}
    >
      <div className="cabin-viewport">
        <div className="cabin-stage" aria-hidden="true">
          <div className="scene-art-plate art-cockpit" />
          <div className="scene-art-plate art-map" />
          <div className="scene-art-plate art-journal" />
          <div className="scene-art-plate art-ship" />
          <div className="scene-art-plate art-radio" />
          <div className="scene-cockpit-window-hotspot" aria-hidden={activeView !== 'cockpit'}>
            <div className="cockpit-window-view" />
          </div>
        </div>
        <div className="scene-vignette" />
      </div>

      <CabinOverlay
        activeView={activeView}
        currentSystem={currentSystem}
        activeTravel={activeTravel}
        now={now}
        currentLead={currentLead}
        state={state}
        systems={systems}
        recommendedSystemId={recommendedSystemId}
        journal={journal}
        radioHistory={radioHistory}
        onLeadAction={onLeadAction}
        onTravel={onTravel}
        onReset={onReset}
      />
    </div>
  );
}

function CabinOverlay({
  activeView,
  currentSystem,
  activeTravel,
  now,
  currentLead,
  state,
  systems,
  recommendedSystemId,
  journal,
  radioHistory,
  onLeadAction,
  onTravel,
  onReset
}: {
  activeView: PrimaryViewId;
  currentSystem: StarSystem;
  activeTravel?: ActiveTravelState;
  now: number;
  currentLead: CurrentLead;
  state: PlayerState;
  systems: StarSystem[];
  recommendedSystemId?: string;
  journal: JournalEntry[];
  radioHistory: RadioMessage[];
  onLeadAction: () => void;
  onTravel: (system: StarSystem) => void;
  onReset: () => void;
}) {
  const activeDestination = activeTravel ? getSystem(activeTravel.toSystemId) : undefined;
  const travelRemainingMs = activeTravel ? activeTravel.arrivesAt - now : 0;
  const [selectedMapSystemId, setSelectedMapSystemId] = useState<string>();
  const selectedSystemId = selectedMapSystemId ?? recommendedSystemId ?? currentSystem.id;
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

  switch (activeView) {
    case 'cockpit':
      return (
        <div className="overlay-layer cockpit-overlay">
          <div className="overlay-band cockpit-top-band">
            <div className="holo-panel holo-compact">
              <p className="eyebrow">{activeTravel && activeDestination ? 'In transit' : 'Orbit status'}</p>
              <h2>{activeTravel && activeDestination ? `To ${activeDestination.name}` : currentSystem.name}</h2>
              <p>
                {activeTravel && activeDestination
                  ? `Arriving in ${formatDuration(travelRemainingMs)}`
                  : 'Stable orbit. Survey windows open.'}
              </p>
            </div>
          </div>
          <div className="overlay-band cockpit-bottom-band">
            <div className="holo-panel current-lead-panel">
              <p className="eyebrow">Current lead</p>
              <h3>{currentLead.title}</h3>
              <p>{currentLead.description}</p>
              <div className="lead-footer">
                <span>{getLeadDestinationName(currentLead)}</span>
                <button className="primary-action" type="button" onClick={onLeadAction}>
                  {currentLead.ctaLabel}
                </button>
              </div>
            </div>
            <div className="holo-panel resource-holo-panel">
              <p className="eyebrow">{activeTravel ? 'Travel systems' : 'Ship status'}</p>
              <ResourceStrip state={state} compact />
            </div>
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="overlay-layer map-overlay">
          <div className="overlay-shell map-shell">
            <div className="map-screen-panel">
              <p className="eyebrow">Star map</p>
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
                    aria-label={`${system.name}, ${system.known ? 'known' : 'unknown'} system`}
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
    case 'journal':
      return (
        <div className="overlay-layer journal-overlay">
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
