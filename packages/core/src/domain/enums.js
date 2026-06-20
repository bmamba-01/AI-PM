export var ProjectType;
(function (ProjectType) {
    ProjectType["SOFTWARE"] = "SOFTWARE";
    ProjectType["INFRASTRUCTURE"] = "INFRASTRUCTURE";
    ProjectType["DATA"] = "DATA";
    ProjectType["RESEARCH"] = "RESEARCH";
    ProjectType["MAINTENANCE"] = "MAINTENANCE";
})(ProjectType || (ProjectType = {}));
export var Methodology;
(function (Methodology) {
    Methodology["WATERFALL"] = "WATERFALL";
    Methodology["SCRUM"] = "SCRUM";
    Methodology["KANBAN"] = "KANBAN";
    Methodology["HYBRID"] = "HYBRID";
})(Methodology || (Methodology = {}));
export var CostModel;
(function (CostModel) {
    CostModel["TIME_MATERIAL"] = "TIME_MATERIAL";
    CostModel["FIXED_COST"] = "FIXED_COST";
    CostModel["MILESTONE"] = "MILESTONE";
})(CostModel || (CostModel = {}));
export var Priority;
(function (Priority) {
    Priority["P0"] = "P0";
    Priority["P1"] = "P1";
    Priority["P2"] = "P2";
    Priority["P3"] = "P3";
    Priority["P4"] = "P4";
})(Priority || (Priority = {}));
export var Status;
(function (Status) {
    Status["BACKLOG"] = "BACKLOG";
    Status["TODO"] = "TODO";
    Status["IN_PROGRESS"] = "IN_PROGRESS";
    Status["IN_REVIEW"] = "IN_REVIEW";
    Status["TESTING"] = "TESTING";
    Status["DONE"] = "DONE";
    Status["BLOCKED"] = "BLOCKED";
    Status["CANCELLED"] = "CANCELLED";
})(Status || (Status = {}));
export var RiskLevel;
(function (RiskLevel) {
    RiskLevel["LOW"] = "LOW";
    RiskLevel["MEDIUM"] = "MEDIUM";
    RiskLevel["HIGH"] = "HIGH";
    RiskLevel["CRITICAL"] = "CRITICAL";
})(RiskLevel || (RiskLevel = {}));
export var TaskType;
(function (TaskType) {
    TaskType["FEATURE"] = "FEATURE";
    TaskType["BUG"] = "BUG";
    TaskType["TECH_DEBT"] = "TECH_DEBT";
    TaskType["SPIKE"] = "SPIKE";
    TaskType["DOCUMENTATION"] = "DOCUMENTATION";
    TaskType["TESTING"] = "TESTING";
    TaskType["DEPLOYMENT"] = "DEPLOYMENT";
    TaskType["MEETING"] = "MEETING";
})(TaskType || (TaskType = {}));
export var RoleType;
(function (RoleType) {
    RoleType["PM"] = "PM";
    RoleType["TECH_LEAD"] = "TECH_LEAD";
    RoleType["DEVELOPER"] = "DEVELOPER";
    RoleType["QA"] = "QA";
    RoleType["BA"] = "BA";
    RoleType["DESIGNER"] = "DESIGNER";
    RoleType["DEVOPS"] = "DEVOPS";
    RoleType["STAKEHOLDER"] = "STAKEHOLDER";
})(RoleType || (RoleType = {}));
export var MeetingType;
(function (MeetingType) {
    MeetingType["DAILY_STANDUP"] = "DAILY_STANDUP";
    MeetingType["SPRINT_PLANNING"] = "SPRINT_PLANNING";
    MeetingType["SPRINT_REVIEW"] = "SPRINT_REVIEW";
    MeetingType["RETROSPECTIVE"] = "RETROSPECTIVE";
    MeetingType["GROOMING"] = "GROOMING";
    MeetingType["STAKEHOLDER_SYNC"] = "STAKEHOLDER_SYNC";
    MeetingType["ARCHITECTURE_REVIEW"] = "ARCHITECTURE_REVIEW";
    MeetingType["CODE_REVIEW"] = "CODE_REVIEW";
    MeetingType["INCIDENT_REVIEW"] = "INCIDENT_REVIEW";
    MeetingType["AD_HOC"] = "AD_HOC";
})(MeetingType || (MeetingType = {}));
export var GateStatus;
(function (GateStatus) {
    GateStatus["PENDING"] = "PENDING";
    GateStatus["IN_PROGRESS"] = "IN_PROGRESS";
    GateStatus["PASSED"] = "PASSED";
    GateStatus["FAILED"] = "FAILED";
    GateStatus["WAIVED"] = "WAIVED";
})(GateStatus || (GateStatus = {}));
export var BudgetAlertLevel;
(function (BudgetAlertLevel) {
    BudgetAlertLevel["INFO"] = "INFO";
    BudgetAlertLevel["WARNING"] = "WARNING";
    BudgetAlertLevel["CRITICAL"] = "CRITICAL";
})(BudgetAlertLevel || (BudgetAlertLevel = {}));
//# sourceMappingURL=enums.js.map