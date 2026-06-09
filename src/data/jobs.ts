import type { Encounter, Job } from '../types/game';

export const jobs: Job[] = [
  {
    id: 'greenhouse-fuses',
    title: 'Warm Light for the Greenhouse',
    source: 'Lumen Rest Garden Deck',
    transmission:
      'Our grow lamps keep blinking out. Bring a box of patient little fuses to Lumen Rest and we can spare some fuel from the garden tender.',
    destinationId: 'lumen-rest',
    encounterId: 'job-greenhouse-fuses',
    reward: { fuel: 18 },
    revealAfterCompletedJobs: 0
  },
  {
    id: 'marrowlight-sample',
    title: 'A Jar of Lantern Dust',
    source: 'Marrowlight Cooperative',
    transmission:
      'We need one careful dust sample, not a heroic one. Bring two units of supplies for the collector seals and we will stock your galley.',
    destinationId: 'marrowlight',
    encounterId: 'job-marrowlight-sample',
    reward: { supplies: 7 },
    revealAfterCompletedJobs: 0
  },
  {
    id: 'pale-current-beacon',
    title: 'Wake Beacon Calibration',
    source: 'Pale Current Lane Keeper',
    transmission:
      'A marker buoy has started following the current instead of marking it. Nudge it home and our repair tender will patch your hull.',
    destinationId: 'pale-current',
    encounterId: 'job-pale-current-beacon',
    reward: { hull: 16 },
    revealAfterCompletedJobs: 0
  },
  {
    id: 'kites-end-post',
    title: 'Letters for Kite\'s End',
    source: 'Route Tender Mallow',
    transmission:
      'Three letters missed the cargo shuttle. Nothing urgent, which is why they matter. Kite\'s End will pay on delivery.',
    destinationId: 'kites-end',
    encounterId: 'job-kites-end-post',
    reward: { credits: 42 },
    revealAfterCompletedJobs: 1
  },
  {
    id: 'orison-recorder',
    title: 'Retrieve a Quiet Recorder',
    source: 'Orison Listening Crew',
    transmission:
      'One of our recorders is singing under the ice. Bring it back intact. We can offer fuel and a few sealed meal packs.',
    destinationId: 'orison-belt',
    encounterId: 'job-orison-recorder',
    reward: { fuel: 12, supplies: 5 },
    revealAfterCompletedJobs: 2
  },
  {
    id: 'vela-buoy-patch',
    title: 'Patch Buoy Twelve',
    source: 'Survey Team Aster',
    transmission:
      'Buoy Twelve needs a proper antenna patch. Bring three units of supplies; the survey office has credits waiting.',
    destinationId: 'vela-rest',
    encounterId: 'job-vela-buoy-patch',
    reward: { credits: 55 },
    revealAfterCompletedJobs: 3
  }
];

export const jobEncounters: Encounter[] = [
  {
    id: 'job-greenhouse-fuses',
    title: 'Warm Light for the Greenhouse',
    systemId: 'lumen-rest',
    description: 'The garden deck smells of damp soil. A row of grow lamps waits in embarrassed darkness.',
    choices: [
      {
        id: 'replace-fuses',
        label: 'Replace the tired fuses',
        resultText: 'Warm light returns one row at a time. The garden tender transfers fuel with a grateful wave.',
        resourceDelta: { fuel: 18 }
      }
    ]
  },
  {
    id: 'job-marrowlight-sample',
    title: 'A Jar of Lantern Dust',
    systemId: 'marrowlight',
    description: 'Copper dust drifts beyond the airlock, bright enough to make the collector seals glow.',
    choices: [
      {
        id: 'collect-job-sample',
        label: 'Prepare the sealed collector',
        resultText: 'The sample settles like a tiny evening sky. The cooperative loads fresh provisions aboard.',
        resourceRequirements: { supplies: 2 },
        resourceDelta: { supplies: 7 }
      }
    ]
  },
  {
    id: 'job-pale-current-beacon',
    title: 'Wake Beacon Calibration',
    systemId: 'pale-current',
    description: 'The loose beacon drifts beside your ship, blinking as though nothing unusual has happened.',
    choices: [
      {
        id: 'guide-beacon',
        label: 'Guide it back into position',
        resultText: 'The lane keeper secures the beacon, then sends a repair tender across your scarred plating.',
        resourceDelta: { hull: 16 }
      }
    ]
  },
  {
    id: 'job-kites-end-post',
    title: 'Letters for Kite\'s End',
    systemId: 'kites-end',
    description: 'The station clerk recognizes every name on the envelopes before you set them down.',
    choices: [
      {
        id: 'deliver-letters',
        label: 'Deliver the missed post',
        resultText: 'The letters disappear into familiar hands. The clerk pays you and adds a paper star to your console.',
        resourceDelta: { credits: 42 }
      }
    ]
  },
  {
    id: 'job-orison-recorder',
    title: 'Retrieve a Quiet Recorder',
    systemId: 'orison-belt',
    description: 'The recorder is wedged beneath blue ice, humming three notes into the dark.',
    choices: [
      {
        id: 'free-recorder',
        label: 'Ease the recorder free',
        resultText: 'It comes loose without losing the song. The listening crew sends fuel and sealed meal packs.',
        resourceDelta: { fuel: 12, supplies: 5 }
      }
    ]
  },
  {
    id: 'job-vela-buoy-patch',
    title: 'Patch Buoy Twelve',
    systemId: 'vela-rest',
    description: 'Buoy Twelve rotates patiently while its split antenna catches fragments of distant conversations.',
    choices: [
      {
        id: 'patch-buoy',
        label: 'Install a proper antenna patch',
        resultText: 'The signal steadies into a clean, contented tone. Survey Team Aster transfers your payment.',
        resourceRequirements: { supplies: 3 },
        resourceDelta: { supplies: -3, credits: 55 }
      }
    ]
  }
];

export const getJob = (jobId: string) => jobs.find((job) => job.id === jobId);

export const getJobForEncounter = (encounterId: string) =>
  jobs.find((job) => job.encounterId === encounterId);
