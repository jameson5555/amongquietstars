import { useEffect, useMemo, useState } from 'react';
import { getEncounter } from './data/encounters';
import { getJournalEntry } from './data/journal';
import { getRadioMessage } from './data/radio';
import { shipUpgrades } from './data/upgrades';
import { getSystem } from './data/systems';
import {
  beginTravel,
  getMysteryLabel,
  getVisibleSystems,
  pickEncounterForSystem,
  resolveChoice
} from './services/gameLogic';
import { createInitialState, loadPlayerState, resetPlayerState, savePlayerState } from './services/storage';
import type { Encounter, EncounterChoice, PlayerState, StarSystem, TravelState, ViewId } from './types/game';

const navItems: Array<{ id: ViewId; label: string }> = [
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'map', label: 'Star Map' },
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
    if (!destination.known) {
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
      <div className="starfield" aria-hidden="true" />
      <main className="game-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">Personal home-ship</p>
            <h1>Among Quiet Stars</h1>
          </div>
          <div className="location-pill">
            <span>Now orbiting</span>
            <strong>{currentSystem.name}</strong>
          </div>
        </header>

        <ResourceStrip state={state} />

        <section className="screen-panel">
          {view === 'cockpit' && <CockpitScreen state={state} currentSystem={currentSystem} onNavigate={goTo} />}
          {view === 'map' && (
            <StarMapScreen
              systems={visibleSystems}
              currentSystemId={state.currentSystemId}
              onTravel={startTravel}
            />
          )}
          {view === 'travel' && travel && (
            <TravelScreen travel={travel} onFinish={finishTravel} />
          )}
          {view === 'encounter' && activeEncounter && (
            <EncounterScreen
              encounter={activeEncounter}
              choiceResult={choiceResult}
              onChoose={chooseEncounterOption}
              onDone={() => goTo('cockpit')}
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

function ResourceStrip({ state }: { state: PlayerState }) {
  return (
    <div className="resource-strip" aria-label="Ship resources">
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
  onNavigate
}: {
  state: PlayerState;
  currentSystem: StarSystem;
  onNavigate: (view: ViewId) => void;
}) {
  return (
    <div className="cockpit-layout">
      <div className="cockpit-window">
        <div className="nebula-orb nebula-a" />
        <div className="nebula-orb nebula-b" />
        <div className="ship-silhouette">
          <span>Among Quiet Stars</span>
        </div>
      </div>

      <div className="cabin-details">
        <div className="plant" aria-label="A small cabin plant" />
        <div className="mug" aria-label="A warm mug" />
        <div className="blanket" aria-label="A folded blanket" />
        <div className="notes">pulse? / tea / charts</div>
      </div>

      <div className="cockpit-copy">
        <p className="eyebrow">Home is a ship with warm lights</p>
        <h2>{currentSystem.name}</h2>
        <p>{currentSystem.description}</p>
        <div className="tag-row">
          {currentSystem.tags.map((tag) => (
            <span className="system-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {state.emergencyTowUsed && (
        <div className="soft-alert">
          Emergency tow logged. The old safety network brought you back to Lumen Rest.
        </div>
      )}

      <div className="action-grid">
        <button className="primary-action" type="button" onClick={() => onNavigate('map')}>
          Star Map
        </button>
        <button type="button" onClick={() => onNavigate('journal')}>
          Journal
        </button>
        <button type="button" onClick={() => onNavigate('ship')}>
          Ship
        </button>
        <button type="button" onClick={() => onNavigate('radio')}>
          Radio
        </button>
      </div>
    </div>
  );
}

function StarMapScreen({
  systems,
  currentSystemId,
  onTravel
}: {
  systems: StarSystem[];
  currentSystemId: string;
  onTravel: (system: StarSystem) => void;
}) {
  return (
    <div className="map-screen">
      <div className="screen-heading">
        <p className="eyebrow">Starting sector</p>
        <h2>Choose one more system</h2>
      </div>

      <div className="sector-map" aria-label="Star systems map">
        {systems.map((system) => (
          <button
            className={`map-node ${system.known ? 'known' : 'unknown'} ${system.id === currentSystemId ? 'current' : ''}`}
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
        {systems.map((system) => (
          <article className={`system-card ${!system.known ? 'muted' : ''}`} key={system.id}>
            <div>
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
                className="btn btn-sm btn-light"
                type="button"
                disabled={!system.known || system.id === currentSystemId}
                onClick={() => onTravel(system)}
              >
                {system.id === currentSystemId ? 'Here' : system.known ? 'Travel' : 'Unknown'}
              </button>
            </div>
          </article>
        ))}
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
      <div className="voyage-window">
        <div className="drift-stars layer-one" />
        <div className="drift-stars layer-two" />
        <div className="voyage-ship" />
      </div>
      <div className="screen-heading">
        <p className="eyebrow">Voyage layer</p>
        <h2>{origin.name} to {destination.name}</h2>
        <p>Stars slide past the window. The cabin hum settles into your bones.</p>
      </div>
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
      <div className="screen-heading">
        <p className="eyebrow">Encounter</p>
        <h2>{encounter.title}</h2>
      </div>
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
          Return to Cockpit
        </button>
      )}
    </div>
  );
}

function JournalScreen({
  entries,
  mysteryProgress
}: {
  entries: NonNullable<ReturnType<typeof getJournalEntry>>[];
  mysteryProgress: number;
}) {
  return (
    <div className="journal-screen">
      <div className="screen-heading">
        <p className="eyebrow">Journal of Wonders</p>
        <h2>{getMysteryLabel(mysteryProgress)} notes</h2>
        <p>Your field notebook turns strange moments into patient questions.</p>
      </div>
      {entries.length === 0 ? (
        <div className="empty-state">
          No discoveries logged yet. The first odd reading will make this page feel less blank.
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
        <div className="ship-body">
          <span>Among Quiet Stars</span>
        </div>
      </div>
      <div className="resource-grid">
        {resourceLabels.map((resource) => (
          <div className="ship-resource" key={resource}>
            <span>{resource}</span>
            <strong>{state.resources[resource]}</strong>
          </div>
        ))}
      </div>
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

function RadioScreen({ messages }: { messages: NonNullable<ReturnType<typeof getRadioMessage>>[] }) {
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
