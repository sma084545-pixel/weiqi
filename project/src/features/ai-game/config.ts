import type {AiDifficulty} from '../../core/analysis/ai-contract';
import {analysisOrigin} from '../katago-review/config';

/** Central, build-time service configuration. An unavailable extreme service never falls back. */
export function aiServiceOrigin(difficulty:AiDifficulty,extremeConfigured=import.meta.env.VITE_KATAGO_EXTREME_API_ORIGIN??'',pageOrigin=globalThis.location?.origin??''):string|null {
  return difficulty==='extreme'?analysisOrigin(extremeConfigured,pageOrigin):analysisOrigin(undefined,pageOrigin);
}
