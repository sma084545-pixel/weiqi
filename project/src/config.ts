// Defaults are planning assumptions, not verified school facts.
export const projectConfig = {
  displayName: '围棋社', schoolName: null as string|null, logoPath: null as string|null,
  participantCount: null as number|null, budget: null as number|null, confirmedEquipment: null as string|null,
  assumedAudience: '中学生', assumedSessionMinutes: 45, assumedPlayersPerBoard: 2,
  defaultBoardSize: 9 as const, defaultKomi: 0,
};
