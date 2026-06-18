export class StakeholderWorkflow {
  async viewDashboard(projectId: string): Promise<any> { return {}; }
  async approveDeliverable(deliverableId: string): Promise<void> {}
  async requestChange(projectId: string, description: string): Promise<any> { return {}; }
  async viewReports(projectId: string): Promise<any[]> { return []; }
}