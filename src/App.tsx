import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { getSystemThumbnail, getTravelVista, imageAssets } from './assets/imageAssets';
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

const navItems: Array<{ id: ViewId; label: string }> = [
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'map', label: 'Map' },
  { id: 'journal', label: 'Journal' },
  { id: 'ship', label: 'Ship' },
  { id: 'radio', label: 'Radio' }
];

const resourceLabels: Array<keyof PlayerState['resources']> = ['fuel', 'supplies', 'hull', 'credits'];

const isDefined = <T,>(value: T | undefined): value is T => value !== undefined;

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
    <div
      className="app-shell"
      style={{ '--title-backdrop': `url(${imageAssets.titleBackground})` } as CSSProperties}
    >
      <main className="game-frame">
        <header className="topbar">
          <div>
            <h1>Among Quiet Stars</h1>
          </div>
          <div className="location-pill">
            <span>Orbit</span>
            <strong>{currentSystem.name}</strong>
          </div>
        </header>

        <section className={`screen-panel ${view === 'cockpit' ? 'cockpit-panel' : ''}`}>
          {view === 'cockpit' && (
            <CockpitScreen
              state={state}
              currentSystem={currentSystem}
              currentLead={currentLead}
              onLeadAction={followLead}
            />
          )}
          {view === 'map' && (
            <StarMapScreen
              systems={visibleSystems}
              currentSystemId={state.currentSystemId}
              recommendedSystemId={currentLead.destinationId}
              onTravel={startTravel}
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
          {view === 'journal' && <JournalScreen entries={journal} mysteryProgress={state.mysteryProgress} />}
          {view === 'ship' && <ShipScreen state={state} onReset={resetSave} />}
          {view === 'radio' && <RadioScreen messages={radioHistory} />}
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

function CockpitScreen({
  state,
  currentSystem,
  currentLead,
  onLeadAction
}: {
  state: PlayerState;
  currentSystem: StarSystem;
  currentLead: CurrentLead;
  onLeadAction: () => void;
}) {
  return (
    <div className="cockpit-screen">
      <section className="cockpit-hero" aria-label="Cozy ship cockpit">
        <img src={imageAssets.cockpitBackground} alt="" className="hero-art" />
        <div className="hero-shade" />
        <div className="cockpit-console" aria-label="Ship dashboard">
          <div className="console-screen location-console">
            <p className="eyebrow">Orbit</p>
            <h2>{currentSystem.name}</h2>
          </div>
          <div className="console-screen current-lead">
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
          <div className="console-screen resource-console">
            <p className="eyebrow">Ship status</p>
            <ResourceStrip state={state} compact />
          </div>
        </div>
      </section>
    </div>
  );
}

function StarMapScreen({
  systems,
  currentSystemId,
  recommendedSystemId,
  onTravel
}: {
  systems: StarSystem[];
  currentSystemId: string;
  recommendedSystemId?: string;
  onTravel: (system: StarSystem) => void;
}) {
  return (
    <div className="map-screen">
      <div className="screen-heading">
        <p className="eyebrow">Star map</p>
        <h2>Choose the next quiet light</h2>
        <p>Recommended leads are marked in amber. Unknown systems wait for rumors, readings, or patient notes.</p>
      </div>

      <div
        className="sector-map"
        aria-label="Star systems map"
        style={{ '--map-vista': `url(${imageAssets.nebulaVista02})` } as CSSProperties}
      >
        {systems.map((system) => (
          <button
            className={`map-node ${system.known ? 'known' : 'unknown'} ${system.id === currentSystemId ? 'current' : ''} ${
              system.id === recommendedSystemId ? 'recommended' : ''
            }`}
            key={system.id}
            type="button"
            style={{ left: `${system.position.x}%`, top: `${system.position.y}%` }}
            onClick={() => onTravel(system)}
            disabled={!system.known || system.id === currentSystemId}
            aria-label={`${system.name}, ${system.known ? 'known' : 'unknown'} system`}
          >
            <span />
          </button>
        ))}
      </div>

      <div className="system-list">
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
                <p>{system.known ? system.description : 'A report or discovery may reveal this destination later.'}</p>
                <div className="tag-row">
                  {system.tags.map((tag) => (
                    <span className="system-tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="system-meta">
                <span>{system.distance} ly</span>
                <strong>{system.travelCost} fuel</strong>
                <button
                  className="small-action"
                  type="button"
                  disabled={!system.known || system.id === currentSystemId}
                  onClick={() => onTravel(system)}
                >
                  {system.id === currentSystemId ? 'Here' : system.known ? 'Travel' : 'Unknown'}
                </button>
              </div>
            </article>
          );
        })}
      </div>
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

function JournalScreen({ entries, mysteryProgress }: { entries: JournalEntry[]; mysteryProgress: number }) {
  return (
    <div className="journal-screen">
      <section className="journal-hero">
        <img src={imageAssets.journalPagesBackground} alt="" className="hero-art" />
        <div className="journal-title">
          <p className="eyebrow">Journal of Wonders</p>
          <h2>{getMysteryLabel(mysteryProgress)} notes</h2>
          <p>Your field notebook turns strange moments into patient questions.</p>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="empty-state notebook-empty">
          No discoveries logged yet. Follow the current lead from the cockpit; the first odd reading will give this page its first margin note.
        </div>
      ) : (
        <div className="journal-list">
          {entries.map((entry) => (
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
  );
}

function ShipScreen({ state, onReset }: { state: PlayerState; onReset: () => void }) {
  return (
    <div className="ship-screen">
      <div className="screen-heading">
        <p className="eyebrow">Ship registry</p>
        <h2>Among Quiet Stars</h2>
        <p>A small personal home-ship, warm enough to miss when you are standing on a dock.</p>
      </div>
      <div className="ship-portrait">
        <img src={imageAssets.spaceStationLumenRest} alt="" className="hero-art" />
        <div className="ship-body">
          <span>Among Quiet Stars</span>
        </div>
      </div>
      <ResourceStrip state={state} />
      <h3 className="section-title">Future upgrades</h3>
      <div className="upgrade-list">
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
  );
}

function RadioScreen({ messages }: { messages: RadioMessage[] }) {
  return (
    <div className="radio-screen">
      <div className="screen-heading">
        <p className="eyebrow">Explorer Radio</p>
        <h2>Soft traffic, strange edges</h2>
      </div>
      <div className="radio-dial">
        <div className="dial-core" />
      </div>
      <div className="radio-list">
        {messages.map((message) => (
          <article className={`radio-message ${message.tone}`} key={message.id}>
            <strong>{message.source}</strong>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

export default App;
