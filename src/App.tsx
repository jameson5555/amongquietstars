import type { CSSProperties, PointerEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flybyShipAssets, getDestinationArt, getSystemThumbnail, getTravelVista, imageAssets } from './assets/imageAssets';
import { getEncounter } from './data/encounters';
import { getJournalEntry } from './data/journal';
import { getRadioMessage } from './data/radio';
import { songs } from './data/songs';
import { getSystem } from './data/systems';
import { shipUpgrades } from './data/upgrades';
import {
  beginTravel,
  acceptJob,
  applyService,
  canUseService,
  canComparePulseLogs,
  comparePulseLogs,
  getActivitiesForSystem,
  getAcceptedJobs,
  getAppliedResourceDelta,
  getAvailableJobs,
  getMissingResourceRequirement,
  getTravelDurationMs,
  getVisibleSystems,
  resolveChoice,
  serviceDefinitions,
} from './services/gameLogic';
import { getCurrentLead, getLeadDestinationName, type CurrentLead } from './services/leads';
import { createInitialState, loadPlayerState, resetPlayerState, savePlayerState } from './services/storage';
import type {
  Encounter,
  EncounterChoice,
  ActiveTravelState,
  Activity,
  JournalEntry,
  Job,
  PlayerState,
  RadioMessage,
  Resources,
  StarSystem,
  TravelState,
  ViewId
} from './types/game';

const primaryViewIds = ['map', 'cockpit', 'radio', 'ship'] as const;
type PrimaryViewId = (typeof primaryViewIds)[number];
type ScreenViewId = Exclude<ViewId, 'journal'>;
type ArrivalApproach = { systemId: string };
type ResourceDelta = Partial<Record<keyof Resources, number>>;
type ChoiceResult = { text: string; resourceDelta: ResourceDelta };
type RadioFeedItem =
  | { kind: 'message'; message: RadioMessage }
  | { kind: 'job'; job: Job };
type CockpitFlyby = {
  id: number;
  src: string;
  durationMs: number;
  foreground: boolean;
  style: CSSProperties;
};
type SteeringOffset = { x: number; y: number };
type CockpitPanel = 'lead' | 'music' | null;
type SteeringDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  maxX: number;
  maxY: number;
};

const navItems: Array<{ id: PrimaryViewId; label: string }> = [
  { id: 'map', label: 'Map' },
  { id: 'cockpit', label: 'Cockpit' },
  { id: 'radio', label: 'Radio' },
  { id: 'ship', label: 'Ship' }
];

const resourceLabels: Array<keyof PlayerState['resources']> = ['fuel', 'supplies', 'hull', 'credits'];
const resourceDescriptions: Record<keyof Resources, string> = {
  fuel: 'Spent whenever you travel. Refill at stations or through jobs.',
  supplies: 'Used for repairs, samples, and practical work in the field.',
  hull: 'The ship’s physical condition. Station tenders and some jobs can repair it.',
  credits: 'Paid by jobs and trade. Spend them on station services.'
};

const formatResourceDelta = (delta: ResourceDelta) =>
  resourceLabels
    .filter((resource) => delta[resource])
    .map((resource) => `${(delta[resource] ?? 0) > 0 ? '+' : ''}${delta[resource]} ${resource}`)
    .join(' · ');

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
  const depth = Math.random();
  const startY = randomInRange(8, 72);
  const endY = clamp(startY + randomInRange(-18, 18) * (0.65 + depth * 0.35), -8, 88);
  const duration = randomInRange(24000, 36000) - depth * randomInRange(11000, 19000);
  const foreground = depth >= 0.6;
  const size = foreground
    ? 38 + ((depth - 0.6) / 0.4) * 44
    : 10 + (depth / 0.6) * 22;

  return {
    id,
    src: flybyShipAssets[Math.floor(Math.random() * flybyShipAssets.length)]!,
    durationMs: duration,
    foreground,
    style: {
      '--flyby-start-x': `${leftToRight ? -30 : 130}%`,
      '--flyby-end-x': `${leftToRight ? 130 : -30}%`,
      '--flyby-start-y': `${startY}%`,
      '--flyby-end-y': `${endY}%`,
      '--flyby-duration': `${duration}ms`,
      '--flyby-size': `${size}px`,
      '--flyby-facing': leftToRight ? 1 : -1,
      '--flyby-tilt': `${randomInRange(-6, 6)}deg`,
      '--flyby-brightness': 0.55 + depth * 0.4,
      '--flyby-saturation': 0.55 + depth * 0.4,
      '--flyby-shadow-opacity': 0.08 + depth * 0.24,
      '--flyby-start-scale': 0.88 + depth * 0.04,
      '--flyby-end-scale': 0.94 + depth * 0.16
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
  const [choiceResult, setChoiceResult] = useState<ChoiceResult | null>(null);
  const [activitySystemId, setActivitySystemId] = useState<string | null>(null);
  const [activityNotice, setActivityNotice] = useState<ChoiceResult | null>(null);
  const [arrivalApproach, setArrivalApproach] = useState<ArrivalApproach | null>(null);
  const [pendingMapFocusSystemId, setPendingMapFocusSystemId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [currentSongIndex, setCurrentSongIndex] = useState<number | null>(null);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentSongIndexRef = useRef<number | null>(null);

  const currentSystem = getSystem(state.currentSystemId);
  const visibleSystems = useMemo(() => getVisibleSystems(state), [state]);
  const currentLead = useMemo(() => getCurrentLead(state), [state]);
  const journal = [...state.journalEntryIds].reverse().map(getJournalEntry).filter(isDefined);
  const radioHistory = state.radioHistoryIds.map(getRadioMessage).filter(isDefined);
  const availableJobs = useMemo(() => getAvailableJobs(state), [state]);
  const acceptedJobs = useMemo(() => getAcceptedJobs(state), [state]);
  const activeEncounter = activeEncounterId ? getEncounter(activeEncounterId) : undefined;
  const activeTravel = state.activeTravel;
  const journalVisible = journalOpen || journalClosing;
  const unreadJournalCount = state.journalEntryIds.filter((id) => !state.readJournalEntryIds.includes(id)).length;

  useEffect(() => {
    savePlayerState(state);
  }, [state]);

  const playSongAtIndex = useCallback((index: number) => {
    const audio = audioRef.current;
    const song = songs[index];
    if (!audio || !song) {
      return;
    }

    currentSongIndexRef.current = index;
    setCurrentSongIndex(index);
    setMusicError(false);
    audio.src = song.src;
    audio.load();
    void audio.play().catch(() => {
      setIsMusicPlaying(false);
      setMusicError(true);
    });
  }, []);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handlePlay = () => {
      setIsMusicPlaying(true);
      setMusicError(false);
    };
    const handlePause = () => setIsMusicPlaying(false);
    const handleError = () => {
      setIsMusicPlaying(false);
      setMusicError(true);
    };
    const handleEnded = () => {
      const currentIndex = currentSongIndexRef.current ?? -1;
      playSongAtIndex((currentIndex + 1) % songs.length);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
      audioRef.current = null;
    };
  }, [playSongAtIndex]);

  const toggleMusicPlayback = () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isMusicPlaying) {
      audio.pause();
      return;
    }

    if (currentSongIndexRef.current === null) {
      playSongAtIndex(Math.floor(Math.random() * songs.length));
      return;
    }

    setMusicError(false);
    void audio.play().catch(() => {
      setIsMusicPlaying(false);
      setMusicError(true);
    });
  };

  const playNextSong = () => {
    const currentIndex = currentSongIndexRef.current;
    const nextIndex = currentIndex === null
      ? Math.floor(Math.random() * songs.length)
      : (currentIndex + 1) % songs.length;
    playSongAtIndex(nextIndex);
  };

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
          systemId: destination.id
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
      setActivitySystemId(arrivalApproach.systemId);
      setArrivalApproach(null);
      setChoiceResult(null);
      setActivityNotice(null);
      setView('activities');
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

  const completePulseComparison = () => {
    setState((current) => comparePulseLogs(current));
    closeJournal();
  };

  const markLeadViewed = (leadId: string) => {
    setState((current) =>
      current.viewedLeadIds.includes(leadId)
        ? current
        : {
            ...current,
            viewedLeadIds: [...current.viewedLeadIds, leadId]
          }
    );
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

    const departedAt = Date.now();
    const durationMs = getTravelDurationMs(destination, state);
    const nextTravel: ActiveTravelState = {
      fromSystemId: state.currentSystemId,
      toSystemId: destination.id,
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
      systemId: destination.id
    });
    setView('cockpit');
    setJournalOpen(false);
    setJournalClosing(false);
  };

  const chooseEncounterOption = (encounter: Encounter, choice: EncounterChoice) => {
    setState((current) => {
      const next = resolveChoice(current, encounter, choice);
      setChoiceResult({
        text: choice.resultText,
        resourceDelta: getAppliedResourceDelta(current.resources, next.resources)
      });
      return next;
    });
  };

  const openActivities = (systemId = state.currentSystemId) => {
    setActivitySystemId(systemId);
    setActivityNotice(null);
    setChoiceResult(null);
    setView('activities');
  };

  const selectActivity = (activity: Activity) => {
    if (activity.encounterId) {
      setActiveEncounterId(activity.encounterId);
      setChoiceResult(null);
      setView('encounter');
      return;
    }

    if (activity.serviceId) {
      setState((current) => {
        const next = applyService(current, activity.serviceId!);
        const service = serviceDefinitions[activity.serviceId!];
        setActivityNotice({
          text: next === current
            ? `Unable to use ${service.title.toLowerCase()} right now.`
            : `${service.title} complete. The ship feels a little more ready for the next stretch.`,
          resourceDelta: getAppliedResourceDelta(current.resources, next.resources)
        });
        return next;
      });
    }
  };

  const handleAcceptJob = (jobId: string) => {
    setState((current) => acceptJob(current, jobId));
  };

  const resetSave = () => {
    resetPlayerState();
    setState(createInitialState());
    setTravel(null);
    setActiveEncounterId(null);
    setActivitySystemId(null);
    setActivityNotice(null);
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
              availableJobs={availableJobs}
              acceptedJobs={acceptedJobs}
              currentSongTitle={currentSongIndex === null ? null : songs[currentSongIndex]?.title ?? null}
              isMusicPlaying={isMusicPlaying}
              musicError={musicError}
              onToggleMusicPlayback={toggleMusicPlayback}
              onNextSong={playNextSong}
              onLeadAction={followLead}
              onLeadViewed={markLeadViewed}
              onMapFocusHandled={() => setPendingMapFocusSystemId(null)}
              onTravel={startTravel}
              onOpenActivities={openActivities}
              onAcceptJob={handleAcceptJob}
              onReset={resetSave}
              onNavigate={navigateCabin}
            />
          )}
          {view === 'travel' && travel && <TravelScreen travel={travel} onFinish={finishTravel} />}
          {view === 'activities' && activitySystemId && (
            <ActivityScreen
              system={getSystem(activitySystemId)}
              activities={getActivitiesForSystem(activitySystemId, state, currentLead)}
              state={state}
              notice={activityNotice}
              onSelect={selectActivity}
              onLeave={() => goTo('cockpit')}
            />
          )}
          {view === 'encounter' && activeEncounter && (
            <EncounterScreen
              encounter={activeEncounter}
              choiceResult={choiceResult}
              state={state}
              onChoose={chooseEncounterOption}
              onDone={() => openActivities(activeEncounter.systemId)}
            />
          )}
          {isPrimaryView(view) && journalVisible && (
            <JournalOverlay
              journal={journal}
              pulseComparisonAvailable={canComparePulseLogs(state)}
              closing={journalClosing}
              onComparePulseLogs={completePulseComparison}
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
  availableJobs,
  acceptedJobs,
  currentSongTitle,
  isMusicPlaying,
  musicError,
  onToggleMusicPlayback,
  onNextSong,
  onLeadAction,
  onLeadViewed,
  onMapFocusHandled,
  onTravel,
  onOpenActivities,
  onAcceptJob,
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
  availableJobs: Job[];
  acceptedJobs: Job[];
  currentSongTitle: string | null;
  isMusicPlaying: boolean;
  musicError: boolean;
  onToggleMusicPlayback: () => void;
  onNextSong: () => void;
  onLeadAction: () => void;
  onLeadViewed: (leadId: string) => void;
  onMapFocusHandled: () => void;
  onTravel: (system: StarSystem) => void;
  onOpenActivities: (systemId?: string) => void;
  onAcceptJob: (jobId: string) => void;
  onReset: () => void;
  onNavigate: (direction: 1 | -1) => void;
}) {
  const swipeStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const suppressPanelToggleRef = useRef(false);
  const flybyIdRef = useRef(0);
  const steeringDragRef = useRef<SteeringDrag | null>(null);
  const steeringTargetRef = useRef<SteeringOffset>({ x: 0, y: 0 });
  const steeringCurrentRef = useRef<SteeringOffset>({ x: 0, y: 0 });
  const steeringFrameRef = useRef<number | null>(null);
  const steeringFrameTimeRef = useRef<number | null>(null);
  const [cockpitFlybys, setCockpitFlybys] = useState<CockpitFlyby[]>([]);
  const [openCockpitPanel, setOpenCockpitPanel] = useState<CockpitPanel>(null);
  const [hiddenStatusEventKey, setHiddenStatusEventKey] = useState<string | null>(null);
  const [steeringOffset, setSteeringOffset] = useState<SteeringOffset>({ x: 0, y: 0 });
  const leadExpanded = openCockpitPanel === 'lead';
  const musicExpanded = openCockpitPanel === 'music';
  const statusEventKey = arrivalApproach
    ? `arrival:${arrivalApproach.systemId}`
    : activeTravel
      ? `travel:${activeTravel.departedAt}`
      : `orbit:${currentSystem.id}`;
  const statusHologramVisible = hiddenStatusEventKey !== statusEventKey;

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
    '--art-radio': `url(${imageAssets.viewRadioConsole})`,
    '--steering-x': `${activeView === 'cockpit' && !activeTravel ? steeringOffset.x : 0}px`,
    '--steering-y': `${activeView === 'cockpit' && !activeTravel ? steeringOffset.y : 0}px`
  } as CSSProperties;

  useEffect(() => {
    if (activeView !== 'cockpit' || activeTravel) {
      return;
    }

    let cancelled = false;
    const timeoutIds: number[] = [];

    const scheduleNextFlyby = (initial: boolean) => {
      const delay = initial ? randomInRange(2000, 6000) : randomInRange(12000, 32000);
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

  useEffect(
    () => () => {
      if (steeringFrameRef.current !== null) {
        window.cancelAnimationFrame(steeringFrameRef.current);
      }
    },
    []
  );

  const animateSteeringOffset = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (steeringFrameRef.current !== null) {
        window.cancelAnimationFrame(steeringFrameRef.current);
        steeringFrameRef.current = null;
      }
      steeringCurrentRef.current = steeringTargetRef.current;
      steeringFrameTimeRef.current = null;
      setSteeringOffset(steeringTargetRef.current);
      return;
    }

    if (steeringFrameRef.current !== null) {
      return;
    }

    const updateSteeringOffset = (currentTime: number) => {
      const previousTime = steeringFrameTimeRef.current ?? currentTime;
      const elapsedMs = Math.min(34, currentTime - previousTime);
      const responseMs = steeringDragRef.current ? 150 : 280;
      const blend = 1 - Math.exp(-elapsedMs / responseMs);
      const target = steeringTargetRef.current;
      const current = steeringCurrentRef.current;
      const next = {
        x: current.x + (target.x - current.x) * blend,
        y: current.y + (target.y - current.y) * blend
      };
      const remainingX = Math.abs(target.x - next.x);
      const remainingY = Math.abs(target.y - next.y);

      steeringCurrentRef.current = next;
      steeringFrameTimeRef.current = currentTime;
      setSteeringOffset(next);

      if (steeringDragRef.current || remainingX > 0.05 || remainingY > 0.05) {
        steeringFrameRef.current = window.requestAnimationFrame(updateSteeringOffset);
        return;
      }

      steeringCurrentRef.current = target;
      steeringFrameTimeRef.current = null;
      steeringFrameRef.current = null;
      setSteeringOffset(target);
    };

    steeringFrameRef.current = window.requestAnimationFrame(updateSteeringOffset);
  };

  const resetSteering = () => {
    steeringDragRef.current = null;
    steeringTargetRef.current = { x: 0, y: 0 };
    animateSteeringOffset();
  };

  const handleSteeringPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (activeView !== 'cockpit' || activeTravel) {
      return;
    }

    event.stopPropagation();
    const cockpitBounds = event.currentTarget.closest('.cabin-experience')?.getBoundingClientRect();
    if (!cockpitBounds) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    steeringDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      maxX: cockpitBounds.width * 0.045,
      maxY: cockpitBounds.height * 0.045
    };
    steeringTargetRef.current = steeringCurrentRef.current;
    animateSteeringOffset();
  };

  const handleSteeringPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = steeringDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    steeringTargetRef.current = {
      x: clamp(-(event.clientX - drag.startX), -drag.maxX, drag.maxX),
      y: clamp(-(event.clientY - drag.startY), -drag.maxY, drag.maxY)
    };
    animateSteeringOffset();
  };

  const handleSteeringPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = steeringDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetSteering();
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    suppressPanelToggleRef.current = false;
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

    suppressPanelToggleRef.current = true;
    window.setTimeout(() => {
      suppressPanelToggleRef.current = false;
    }, 100);
    onNavigate(deltaX < 0 ? 1 : -1);
  };

  const toggleLeadExpanded = () => {
    if (suppressPanelToggleRef.current) {
      suppressPanelToggleRef.current = false;
      return;
    }

    setOpenCockpitPanel((openPanel) => {
      if (openPanel !== 'lead') {
        onLeadViewed(currentLead.id);
        return 'lead';
      }
      return null;
    });
  };

  const toggleMusicExpanded = () => {
    if (suppressPanelToggleRef.current) {
      suppressPanelToggleRef.current = false;
      return;
    }

    setOpenCockpitPanel((openPanel) => openPanel === 'music' ? null : 'music');
  };

  const toggleStatusHologram = () => {
    if (suppressPanelToggleRef.current) {
      suppressPanelToggleRef.current = false;
      return;
    }

    setHiddenStatusEventKey((hiddenKey) => hiddenKey === statusEventKey ? null : statusEventKey);
  };

  const handleLeadAction = () => {
    setOpenCockpitPanel(null);
    onLeadAction();
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
              <div className="cockpit-space-scene">
                <div className="cockpit-starfield" />
                <div className="cockpit-flyby-layer cockpit-flyby-layer-far" aria-hidden="true">
                  {cockpitFlybys.filter((flyby) => !flyby.foreground).map((flyby) => (
                    <img className="cockpit-flyby-ship" key={flyby.id} src={flyby.src} alt="" style={flyby.style} />
                  ))}
                </div>
                <img
                  src={windowDestinationArt.src}
                  alt=""
                  className={`cockpit-destination-art destination-${windowDestinationArt.kind}`}
                  style={destinationStyle}
                />
                <div className="cockpit-flyby-layer cockpit-flyby-layer-near" aria-hidden="true">
                  {cockpitFlybys.filter((flyby) => flyby.foreground).map((flyby) => (
                    <img className="cockpit-flyby-ship" key={flyby.id} src={flyby.src} alt="" style={flyby.style} />
                  ))}
                </div>
                <img src={imageAssets.hyperdriveTunnel} alt="" className="cockpit-hyperdrive-art" />
              </div>
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
              availableJobs={availableJobs}
              acceptedJobs={acceptedJobs}
              currentSongTitle={currentSongTitle}
              isMusicPlaying={isMusicPlaying}
              musicError={musicError}
              onToggleMusicPlayback={onToggleMusicPlayback}
              onNextSong={onNextSong}
              onLeadAction={handleLeadAction}
              onSteeringPointerDown={handleSteeringPointerDown}
              onSteeringPointerMove={handleSteeringPointerMove}
              onSteeringPointerEnd={handleSteeringPointerEnd}
              onMapFocusHandled={onMapFocusHandled}
              onTravel={onTravel}
              onOpenActivities={onOpenActivities}
              onAcceptJob={onAcceptJob}
              onReset={onReset}
              visibleView={activeView}
              statusHologramVisible={statusHologramVisible}
              leadExpanded={leadExpanded}
              musicExpanded={musicExpanded}
              onToggleStatusHologram={toggleStatusHologram}
              onToggleLead={toggleLeadExpanded}
              onToggleMusic={toggleMusicExpanded}
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
  availableJobs,
  acceptedJobs,
  currentSongTitle,
  isMusicPlaying,
  musicError,
  onToggleMusicPlayback,
  onNextSong,
  onLeadAction,
  onSteeringPointerDown,
  onSteeringPointerMove,
  onSteeringPointerEnd,
  onMapFocusHandled,
  onTravel,
  onOpenActivities,
  onAcceptJob,
  onReset,
  visibleView,
  statusHologramVisible,
  leadExpanded,
  musicExpanded,
  onToggleStatusHologram,
  onToggleLead,
  onToggleMusic
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
  availableJobs: Job[];
  acceptedJobs: Job[];
  currentSongTitle: string | null;
  isMusicPlaying: boolean;
  musicError: boolean;
  onToggleMusicPlayback: () => void;
  onNextSong: () => void;
  onLeadAction: () => void;
  onSteeringPointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  onSteeringPointerMove: (event: PointerEvent<HTMLButtonElement>) => void;
  onSteeringPointerEnd: (event: PointerEvent<HTMLButtonElement>) => void;
  onMapFocusHandled: () => void;
  onTravel: (system: StarSystem) => void;
  onOpenActivities: (systemId?: string) => void;
  onAcceptJob: (jobId: string) => void;
  onReset: () => void;
  visibleView: PrimaryViewId;
  statusHologramVisible: boolean;
  leadExpanded: boolean;
  musicExpanded: boolean;
  onToggleStatusHologram: () => void;
  onToggleLead: () => void;
  onToggleMusic: () => void;
}) {
  const activeDestination = activeTravel ? getSystem(activeTravel.toSystemId) : undefined;
  const arrivingDestination = arrivalApproach ? getSystem(arrivalApproach.systemId) : undefined;
  const travelRemainingMs = activeTravel ? activeTravel.arrivesAt - now : 0;
  const transmissionFeedRef = useRef<HTMLDivElement | null>(null);
  const [selectedMapSystemId, setSelectedMapSystemId] = useState<string>();
  const selectedSystemId = pendingMapFocusSystemId ?? selectedMapSystemId ?? recommendedSystemId ?? currentSystem.id;
  const leadUnread = !state.viewedLeadIds.includes(currentLead.id);
  const systemCardRefs = useRef<Record<string, HTMLElement | null>>({});
  const radioFeedItems: RadioFeedItem[] = [...radioHistory]
    .reverse()
    .map((message) => ({ kind: 'message', message }));
  const currentJobOffer = availableJobs[0];
  if (currentJobOffer) {
    const placementRange = Math.min(3, radioFeedItems.length + 1);
    const placementSeed = [...currentJobOffer.id].reduce((total, character) => total + character.charCodeAt(0), 0);
    radioFeedItems.splice(placementSeed % placementRange, 0, { kind: 'job', job: currentJobOffer });
  }

  useEffect(() => {
    if (activeView === 'radio' && visibleView === 'radio') {
      transmissionFeedRef.current?.scrollTo({ top: 0 });
    }
  }, [activeView, visibleView]);

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
            <ResourceStrip state={state} compact />
            <div
              id="cockpit-status-hologram"
              className={`holo-panel cockpit-status-hologram ${statusHologramVisible ? '' : 'hidden'}`}
              aria-hidden={!statusHologramVisible}
              inert={!statusHologramVisible}
            >
              <div className="cockpit-status-copy">
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
                {(arrivalApproach || activeTravel) && (
                  <p className="mb-0">
                    {arrivalApproach && arrivingDestination
                      ? 'Completing approach. Stand by.'
                      : activeTravel && activeDestination
                        ? `Arriving in ${formatDuration(travelRemainingMs)}`
                        : ''}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button
            className="status-console-trigger"
            type="button"
            aria-label={`${statusHologramVisible ? 'Hide' : 'Show'} orbit status`}
            aria-controls="cockpit-status-hologram"
            aria-expanded={statusHologramVisible}
            onClick={onToggleStatusHologram}
          >
            <span className="visually-hidden">Toggle orbit status</span>
          </button>
          <button
            className={`lead-console-trigger ${leadUnread ? 'unread' : ''}`}
            type="button"
            aria-label={`${leadExpanded ? 'Hide' : 'Show'} current lead: ${currentLead.title}`}
            aria-controls="current-lead-hologram"
            aria-expanded={leadExpanded}
            onClick={onToggleLead}
          >
            <span className="visually-hidden">Current lead</span>
          </button>
          <button
            className="music-console-trigger"
            type="button"
            aria-label={`${musicExpanded ? 'Hide' : 'Show'} cockpit music controls`}
            aria-controls="music-player-hologram"
            aria-expanded={musicExpanded}
            onClick={onToggleMusic}
          >
            <span className="visually-hidden">Cockpit music controls</span>
          </button>
          <button
            className="radar-steering-control"
            type="button"
            aria-label="Steer exterior view"
            disabled={Boolean(activeTravel)}
            onPointerDown={onSteeringPointerDown}
            onPointerMove={onSteeringPointerMove}
            onPointerUp={onSteeringPointerEnd}
            onPointerCancel={onSteeringPointerEnd}
            onLostPointerCapture={onSteeringPointerEnd}
          >
            <span className="visually-hidden">Drag to steer the ship view</span>
          </button>
          <div className="cockpit-holo-fields">
            <section
              id="current-lead-hologram"
              className={`holo-panel current-lead-panel ${leadExpanded ? 'expanded' : ''}`}
              aria-hidden={!leadExpanded}
              inert={!leadExpanded}
            >
              <span className="current-lead-heading">
                <span className="eyebrow">Current lead</span>
              </span>
              <span className="current-lead-details" aria-hidden={!leadExpanded}>
                <span className="current-lead-title">{currentLead.title}</span>
                <span className="current-lead-description">{currentLead.description}</span>
                <span className="lead-footer">
                  <span>{getLeadDestinationName(currentLead)}</span>
                </span>
                <button className="lead-action-button" type="button" onClick={onLeadAction}>
                  {currentLead.ctaLabel}
                </button>
              </span>
            </section>
            <section
              id="music-player-hologram"
              className={`holo-panel current-lead-panel music-player-panel ${musicExpanded ? 'expanded' : ''}`}
              aria-hidden={!musicExpanded}
              inert={!musicExpanded}
            >
              <span className="current-lead-heading">
                <span className="eyebrow">Cabin audio</span>
              </span>
              <span className="current-lead-details music-player-details" aria-hidden={!musicExpanded}>
                <span className={`music-track-title ${currentSongTitle ? '' : 'idle'}`}>
                  {musicError
                    ? 'Unable to play this track'
                    : currentSongTitle ?? 'Choose some traveling music'}
                </span>
                <span className="music-player-controls">
                  <button
                    className="music-control-button"
                    type="button"
                    onClick={onToggleMusicPlayback}
                    aria-label={isMusicPlaying ? 'Pause music' : 'Play music'}
                    aria-pressed={isMusicPlaying}
                  >
                    {isMusicPlaying ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="m8 5 11 7-11 7z" />
                      </svg>
                    )}
                  </button>
                  <button
                    className="music-control-button"
                    type="button"
                    onClick={onNextSong}
                    aria-label="Play next song"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m6 5 9 7-9 7zM16 5h3v14h-3z" />
                    </svg>
                  </button>
                </span>
              </span>
            </section>
          </div>
        </div>
      );
    case 'map':
      return (
        <div className="overlay-layer map-overlay">
          <div className="map-artwork-coordinate-space">
            <img src={imageAssets.viewMapCeiling} alt="" className="map-console-art" />
            <div className="overlay-shell map-shell">
              <div className="map-screen-viewport">
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
                      {state.acceptedJobIds.length > 0 && (
                        <span>
                          <i className="map-legend-marker job" aria-hidden="true" />
                          Active job
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="sector-map ceiling-map" aria-label="Star systems map">
                    {systems.map((system) => {
                      const hasActiveJob = acceptedJobs.some((job) => job.destinationId === system.id);
                      return (
                        <button
                          className={`map-node ${system.known ? 'known' : 'unknown'} ${
                            system.id === currentSystem.id ? 'current' : ''
                          } ${system.id === recommendedSystemId ? 'recommended' : ''} ${
                            hasActiveJob ? 'job' : ''
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
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="map-route-screen-viewport">
                <div className="system-list overlay-system-list route-list-panel">
                  {systems.map((system) => {
                    const isRecommended = system.id === recommendedSystemId;
                    const hasActiveJob = acceptedJobs.some((job) => job.destinationId === system.id);

                    return (
                      <article
                        className={`system-card ${!system.known ? 'muted' : ''} ${
                          isRecommended ? 'recommended' : ''
                        } ${system.id === selectedSystemId ? 'selected' : ''}`}
                        key={system.id}
                        ref={(element) => {
                          systemCardRefs.current[system.id] = element;
                        }}
                      >
                        <img src={getSystemThumbnail(system.id)} alt="" className="system-thumb" />
                        <div className="system-main">
                          <div className="entry-topline">
                            <span>{system.known ? 'Known route' : 'Unconfirmed'}</span>
                            {isRecommended ? (
                              <strong>Current lead</strong>
                            ) : hasActiveJob ? (
                              <strong>Active job</strong>
                            ) : null}
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
                            disabled={!system.known || Boolean(activeTravel)}
                            onClick={() => system.id === currentSystem.id ? onOpenActivities(system.id) : onTravel(system)}
                          >
                            {activeTravel
                              ? 'In transit'
                              : system.id === currentSystem.id
                                ? 'Activities'
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
          </div>
        </div>
      );
    case 'ship':
      return (
        <div className="overlay-layer ship-overlay">
          <div className="ship-artwork-coordinate-space">
            <img src={imageAssets.viewShipAft} alt="" className="ship-console-art" />
            <div className="ship-registry-screen-viewport">
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
                      <p>{resourceDescriptions[resource]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="ship-upgrades-screen-viewport">
              <div className="ship-upgrades-panel overlay-shell">
                <div className="screen-heading overlay-heading compact-heading">
                  <p className="eyebrow">Available upgrades</p>
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
                  Restart Game
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    case 'radio':
      return (
        <div className="overlay-layer radio-overlay">
          <div className="radio-artwork-coordinate-space">
            <img src={imageAssets.viewRadioConsole} alt="" className="radio-console-art" />
            <div className="radio-screen-viewport">
              <div className="transmission-feed" ref={transmissionFeedRef}>
                {radioFeedItems.map((item) => {
                  if (item.kind === 'message') {
                    return (
                      <article className={`radio-message ${item.message.tone}`} key={`message:${item.message.id}`}>
                        <strong>{item.message.source}</strong>
                        <p>{item.message.text}</p>
                      </article>
                    );
                  }

                  const destination = getSystem(item.job.destinationId);
                  return (
                    <article className="radio-message job job-offer" key={`job:${item.job.id}`}>
                      <div className="entry-topline">
                        <span>{item.job.source}</span>
                        <strong>{destination.name}</strong>
                      </div>
                      <h3>{item.job.title}</h3>
                      <p>{item.job.transmission}</p>
                      <div className="job-offer-footer">
                        <span>{formatResourceDelta(item.job.reward)}</span>
                        <button
                          className="small-action"
                          type="button"
                          disabled={state.acceptedJobIds.length >= 3}
                          onClick={() => onAcceptJob(item.job.id)}
                        >
                          {state.acceptedJobIds.length >= 3 ? 'Job list full' : 'Accept Job'}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {radioFeedItems.length === 0 && (
                  <div className="empty-state radio-empty">
                    No saved messages yet. Encounters and leads will start feeding the receiver soon.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
  }
}

function JournalOverlay({
  journal,
  pulseComparisonAvailable,
  closing,
  onComparePulseLogs,
  onClose,
  onClosed
}: {
  journal: JournalEntry[];
  pulseComparisonAvailable: boolean;
  closing: boolean;
  onComparePulseLogs: () => void;
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
              {pulseComparisonAvailable && (
                <section className="journal-task" aria-labelledby="pulse-comparison-title">
                  <div className="entry-topline">
                    <span>Current task</span>
                    <strong>Ready</strong>
                  </div>
                  <h3 id="pulse-comparison-title">Compare Pulse Logs</h3>
                  <p>
                    Lay the Vela Rest and Bluewake instrument traces over one another and follow the shared timestamp.
                  </p>
                  <button className="primary-action" type="button" onClick={onComparePulseLogs}>
                    Connect the Readings
                  </button>
                </section>
              )}
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
            Incoming fragments suggest more than one possible errand near the destination.
          </div>
          <button className="primary-action w-100" type="button" onClick={onFinish}>
            Complete Approach
          </button>
        </div>
      </section>
    </div>
  );
}

function ResourceChangeSummary({ delta, state }: { delta: ResourceDelta; state: PlayerState }) {
  const changes = resourceLabels.filter((resource) => delta[resource]);
  if (changes.length === 0) {
    return null;
  }

  return (
    <div className="resource-change-summary" aria-label="Resource changes">
      {changes.map((resource) => {
        const change = delta[resource] ?? 0;
        return (
          <div className={`resource-change ${change > 0 ? 'gain' : 'loss'}`} key={resource}>
            <span>{change > 0 ? '+' : ''}{change} {resource}</span>
            <strong>{state.resources[resource]} total</strong>
          </div>
        );
      })}
    </div>
  );
}

function ActivityScreen({
  system,
  activities,
  state,
  notice,
  onSelect,
  onLeave
}: {
  system: StarSystem;
  activities: Activity[];
  state: PlayerState;
  notice: ChoiceResult | null;
  onSelect: (activity: Activity) => void;
  onLeave: () => void;
}) {
  return (
    <div className="activity-screen">
      <img src={getSystemThumbnail(system.id)} alt="" className="encounter-art" />
      <div className="activity-card">
        <p className="eyebrow">Local activities</p>
        <h2>{system.name}</h2>
        <p>Choose what to give your attention to while you are here.</p>
        {notice && (
          <div className="activity-notice">
            <p>{notice.text}</p>
            <ResourceChangeSummary delta={notice.resourceDelta} state={state} />
          </div>
        )}
        <div className="activity-list">
          {activities.map((activity) => {
            const service = activity.serviceId ? serviceDefinitions[activity.serviceId] : undefined;
            const disabled = activity.serviceId ? !canUseService(state, activity.serviceId) : false;
            return (
              <button
                className={`activity-option ${activity.kind}`}
                type="button"
                key={activity.id}
                disabled={disabled}
                onClick={() => onSelect(activity)}
              >
                <span>
                  <small>{activity.kind}</small>
                  <strong>{activity.title}</strong>
                  <em>{activity.description}</em>
                </span>
                {service && <b>{service.cost} cr</b>}
              </button>
            );
          })}
          {activities.length === 0 && <p className="empty-state">There is no unfinished work here right now.</p>}
        </div>
        <button className="primary-action w-100" type="button" onClick={onLeave}>
          Return to Cockpit
        </button>
      </div>
    </div>
  );
}

function EncounterScreen({
  encounter,
  choiceResult,
  state,
  onChoose,
  onDone
}: {
  encounter: Encounter;
  choiceResult: ChoiceResult | null;
  state: PlayerState;
  onChoose: (encounter: Encounter, choice: EncounterChoice) => void;
  onDone: () => void;
}) {
  return (
    <div className="encounter-screen">
      <img src={getSystemThumbnail(encounter.systemId)} alt="" className="encounter-art" />
      <div className="encounter-card">
        <p className="eyebrow">Encounter</p>
        <h2>{encounter.title}</h2>
        <p className="encounter-copy">{choiceResult?.text ?? encounter.description}</p>
        {!choiceResult ? (
          <div className="choice-stack">
            {encounter.choices.map((choice) => {
              const missingRequirement = getMissingResourceRequirement(state.resources, choice);
              return (
                <button
                  className="choice-button"
                  key={choice.id}
                  type="button"
                  disabled={Boolean(missingRequirement)}
                  onClick={() => onChoose(encounter, choice)}
                >
                  <span>{choice.label}</span>
                  {missingRequirement && <small>{missingRequirement}</small>}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <ResourceChangeSummary delta={choiceResult.resourceDelta} state={state} />
            <button className="primary-action w-100" type="button" onClick={onDone}>
              Back to Local Activities
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
