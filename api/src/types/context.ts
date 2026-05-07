import type { User } from './index';

export interface ContextVariables {
  user: User | null;
  sessionId: string | undefined;
}