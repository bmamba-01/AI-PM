export const METHODOLOGY_TYPES = ["WATERFALL", "SCRUM", "KANBAN", "HYBRID"] as const;
export type MethodologyType = typeof METHODOLOGY_TYPES[number];