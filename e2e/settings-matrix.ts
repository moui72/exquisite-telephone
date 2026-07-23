import type { LobbyPage } from './pages/lobby.js';

/**
 * A curated, typed matrix of lobby-setting combinations the core flow is
 * run across (infrastructure.md — Parametrized lobby settings). This is a
 * small NAMED set, NOT the full combinatorial cross product: each combo
 * earns its place by exercising a distinct setting or interaction, and the
 * justification is stated inline.
 *
 * On the turn timer: the shipped Lobby offers only the production options
 * (15m…12h), and this suite drives the real UI, so a combo here can only
 * set a production timer (long enough that it never expires during a fast
 * flow — enough to prove the setting plumbs through without derailing the
 * flow into a timeout vote). Exercising a SUB-FLOOR timer is what the T005
 * server-side seam is for, and it is covered by that seam's own unit test;
 * driving it end-to-end would require a non-UI host, out of scope here.
 */
export interface SettingsCombo {
  name: string;
  /** Browser player names; one observer seat is always added on top. */
  playerNames: [string, ...string[]];
  /** Tick the small-game acknowledgement when the active roster is below the floor. */
  acknowledgeSmallGame?: boolean;
  /** Why this combo is in the matrix. */
  rationale: string;
  apply: (lobby: LobbyPage) => Promise<void>;
}

export const SETTINGS_MATRIX: SettingsCombo[] = [
  {
    name: 'baseline-freeform',
    playerNames: ['Ada', 'Bo'],
    rationale:
      'The control: free-form prompts, colour on, a single lap — the default flow every other combo is a variation on.',
    apply: async (lobby) => {
      await lobby.setLapsPerBook(1);
    },
  },
  {
    name: 'curated-monochrome',
    playerNames: ['Ada', 'Bo'],
    rationale:
      'Exercises the curated opening-phrase selection (a radio hand instead of free text) together with monochrome drawing (palette hidden) — two orthogonal settings that both change turn UI.',
    apply: async (lobby) => {
      await lobby.setLapsPerBook(1);
      await lobby.setMonochrome(true);
      await lobby.setPromptMode('curated');
      await lobby.setCuratedPromptCount(2);
    },
  },
  {
    name: 'curated-writein-allowed',
    playerNames: ['Ada', 'Bo'],
    rationale:
      'Curated mode with the write-in escape hatch enabled — the deck is an offer, not a rule. Distinct from curated-monochrome because it changes whether the curated hand is binding.',
    apply: async (lobby) => {
      await lobby.setLapsPerBook(1);
      await lobby.setPromptMode('curated');
      await lobby.setCuratedPromptCount(2);
      await lobby.setAllowPromptWriteIn(true);
    },
  },
  {
    name: 'timer-configured',
    playerNames: ['Ada', 'Bo'],
    rationale:
      'A production turn timer is set (15m — never expires during a fast flow). Proves the timer setting plumbs through and the game still completes; sub-floor timer expiry is the T005 seam unit test.',
    apply: async (lobby) => {
      await lobby.setLapsPerBook(1);
      await lobby.setTurnTimerMinutes(15);
    },
  },
  {
    name: 'small-game-override',
    playerNames: ['Ada'],
    acknowledgeSmallGame: true,
    rationale:
      'One browser player plus the observer seat is two active players — below the recommended floor — starting only via the host override. Exercises the min-player override path.',
    apply: async (lobby) => {
      await lobby.setLapsPerBook(1);
    },
  },
];
