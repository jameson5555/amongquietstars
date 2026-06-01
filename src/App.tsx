import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getSystemThumbnail, getTravelVista } from './assets/imageAssets';
import { getEncounter } from './data/encounters';
import { getJournalEntry } from './data/journal';
import { getRadioMessage } from './data/radio';
import { getSystem } from './data/systems';
import { shipUpgrades } from './data/upgrades';
import { beginTravel, getMysteryLabel, getVisibleSystems, pickEncounterForSystem, resolveChoice } from './services/gameLogic';
import { getCurrentLead, getLeadDestinationName, type CurrentLead } from './services/leads';
import { createInitialState, loadPlayerState, resetPlayerState, savePlayerState } from './services/storage';
import type {
  Encounter,
  EncounterChoice,
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
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'map', label: 'Map' },
  { id: 'journal', label: 'Journal' },
  { id: 'ship', label: 'Ship' },
  { id: 'radio', label: 'Radio' }
];

const resourceLabels: Array<keyof PlayerState['resources']> = ['fuel', 'supplies', 'hull', 'credits'];

const sceneOffsets: Record<PrimaryViewId, { x: string; y: string; label: string; description: string }> = {
  cockpit: {
    x: '-33.333%',
    y: '-33.333%',
    label: 'Forward canopy',
    description: 'The forward glass opens onto the system beyond your bow.'
  },
  map: {
    x: '-33.333%',
    y: '0%',
    label: 'Overhead chart',
    description: 'The ceiling projector blooms into a navigational field.'
  },
  journal: {
    x: '-33.333%',
    y: '-66.666%',
    label: 'Lap console',
    description: 'A tablet settles into your hands for patient notes.'
  },
  ship: {
    x: '0%',
    y: '-33.333%',
    label: 'Aft cabin',
    description: 'Warm bunks, stores, and maintenance screens fill the stern view.'
  },
  radio: {
    x: '-66.666%',
    y: '-33.333%',
    label: 'Starboard radio',
    description: 'A side console hums with quiet traffic and strange edges.'
  }
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

  const currentSystem = getSystem(state.currentSystemId);
  const visibleSystems = useMemo(() => getVisibleSystems(state), [state]);
  const currentLead = useMemo(() => getCurrentLead(state), [state]);
  const journal = state.journalEntryIds.map(getJournalEntry).filter(isDefined);
  const radioHistory = state.radioHistoryIds.map(getRadioMessage).filter(isDefined);
  const activeEncounter = activeEncounterId ? getEncounter(activeEncounterId) : undefined;

  useEffect(() => {
    savePlayerState(state);
  }, [state]);

  const goTo = (nextView: ViewId) => {
    setChoiceResult(null);
    setView(nextView);
  };

  const startTravel = (destination: StarSystem) => {
    if (!destination.known || destination.id === state.currentSystemId) {
      return;
    }

    const encounter = pickEncounterForSystem(destination.id, state);
    setTravel({
      fromSystemId: state.currentSystemId,
      toSystemId: destination.id,
      encounterId: encounter.id
    });
    setChoiceResult(null);
    setView('travel');
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
    setState(nextState);
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
              currentLead={currentLead}
              state={state}
              systems={visibleSystems}
              recommendedSystemId={currentLead.destinationId}
              journal={journal}
              radioHistory={radioHistory}
              mysteryProgress={state.mysteryProgress}
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
  currentLead,
  state,
  systems,
  recommendedSystemId,
  journal,
  radioHistory,
  mysteryProgress,
  onLeadAction,
  onTravel,
  onReset
}: {
  activeView: PrimaryViewId;
  currentSystem: StarSystem;
  currentLead: CurrentLead;
  state: PlayerState;
  systems: StarSystem[];
  recommendedSystemId?: string;
  journal: JournalEntry[];
  radioHistory: RadioMessage[];
  mysteryProgress: number;
  onLeadAction: () => void;
  onTravel: (system: StarSystem) => void;
  onReset: () => void;
}) {
  const activeScene = sceneOffsets[activeView];
  const sceneStyle = {
    '--scene-offset-x': activeScene.x,
    '--scene-offset-y': activeScene.y,
    '--space-view': `url(${getSystemThumbnail(currentSystem.id)})`
  } as CSSProperties;

  return (
    <div className={`cabin-experience view-${activeView}`} style={sceneStyle}>
      <div className="cabin-viewport">
        <div className="cabin-stage" aria-hidden="true">
          <div className="scene-cell ambient-cell top-left" />
          <div className="scene-cell scene-map">
            <div className="ceiling-arch" />
            <div className="ceiling-projector" />
            <div className="ceiling-ribs" />
          </div>
          <div className="scene-cell ambient-cell top-right" />
          <div className="scene-cell scene-ship">
            <div className="ship-bunk" />
            <div className="ship-storage" />
            <div className="ship-monitor ship-monitor-stats" />
            <div className="ship-monitor ship-monitor-upgrades" />
          </div>
          <div className="scene-cell scene-cockpit">
            <div className="cockpit-band cockpit-band-top" />
            <div className="cockpit-window-frame">
              <div className="cockpit-window-view" />
            </div>
            <div className="cockpit-band cockpit-band-bottom" />
          </div>
          <div className="scene-cell scene-radio">
            <div className="radio-stack" />
            <div className="radio-screen-blank" />
            <div className="radio-knob-cluster" />
          </div>
          <div className="scene-cell ambient-cell bottom-left" />
          <div className="scene-cell scene-journal">
            <div className="journal-seat-edge" />
            <div className="journal-tablet-shell" />
            <div className="journal-hand-rest journal-hand-left" />
            <div className="journal-hand-rest journal-hand-right" />
          </div>
          <div className="scene-cell ambient-cell bottom-right" />
        </div>
        <div className="scene-vignette" />
      </div>

      <div className="scene-status" aria-live="polite">
        <span>{activeScene.label}</span>
        <strong>{activeScene.description}</strong>
      </div>

      <CabinOverlay
        activeView={activeView}
        currentSystem={currentSystem}
        currentLead={currentLead}
        state={state}
        systems={systems}
        recommendedSystemId={recommendedSystemId}
        journal={journal}
        radioHistory={radioHistory}
        mysteryProgress={mysteryProgress}
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
  currentLead,
  state,
  systems,
  recommendedSystemId,
  journal,
  radioHistory,
  mysteryProgress,
  onLeadAction,
  onTravel,
  onReset
}: {
  activeView: PrimaryViewId;
  currentSystem: StarSystem;
  currentLead: CurrentLead;
  state: PlayerState;
  systems: StarSystem[];
  recommendedSystemId?: string;
  journal: JournalEntry[];
  radioHistory: RadioMessage[];
  mysteryProgress: number;
  onLeadAction: () => void;
  onTravel: (system: StarSystem) => void;
  onReset: () => void;
}) {
  switch (activeView) {
    case 'cockpit':
      return (
        <div className="overlay-layer cockpit-overlay">
          <div className="overlay-band cockpit-top-band">
            <div className="holo-panel holo-compact">
              <p className="eyebrow">Orbit status</p>
              <h2>{currentSystem.name}</h2>
              <p>Stable orbit. Quiet lane. Survey windows open beyond the canopy.</p>
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
              <p className="eyebrow">Ship status</p>
              <ResourceStrip state={state} compact />
            </div>
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="overlay-layer map-overlay">
          <div className="overlay-shell map-shell">
            <div className="screen-heading overlay-heading">
              <p className="eyebrow">Star map</p>
              <h2>Choose the next quiet light</h2>
              <p>Recommended leads glow warmer. Unknown systems stay dim until rumors or readings uncover them.</p>
            </div>

            <div className="sector-map ceiling-map" aria-label="Star systems map">
              {systems.map((system) => (
                <button
                  className={`map-node ${system.known ? 'known' : 'unknown'} ${system.id === currentSystem.id ? 'current' : ''} ${
                    system.id === recommendedSystemId ? 'recommended' : ''
                  }`}
                  key={system.id}
                  type="button"
                  style={{ left: `${system.position.x}%`, top: `${system.position.y}%` }}
                  onClick={() => onTravel(system)}
                  disabled={!system.known || system.id === currentSystem.id}
                  aria-label={`${system.name}, ${system.known ? 'known' : 'unknown'} system`}
                >
                  <span />
                </button>
              ))}
            </div>

            <div className="system-list overlay-system-list">
              {systems.map((system) => {
                const isRecommended = system.id === recommendedSystemId;

                return (
                  <article className={`system-card ${!system.known ? 'muted' : ''} ${isRecommended ? 'recommended' : ''}`} key={system.id}>
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
                        disabled={!system.known || system.id === currentSystem.id}
                        onClick={() => onTravel(system)}
                      >
                        {system.id === currentSystem.id ? 'Here' : system.known ? 'Travel' : 'Unknown'}
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
            <div className="screen-heading overlay-heading tablet-heading">
              <p className="eyebrow">Journal of Wonders</p>
              <h2>{getMysteryLabel(mysteryProgress)} notes</h2>
              <p>Your notebook waits for the next quiet clue.</p>
            </div>

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
              <p>Aft systems run warm and quiet. Home is always one swivel behind you.</p>
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
              <p className="eyebrow">Future upgrades</p>
              <h2>Workshop queue</h2>
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
              <p className="eyebrow">Explorer Radio</p>
              <h2>Soft traffic, strange edges</h2>
              <p>The starboard set collects weather, work calls, and things stranger than either.</p>
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
