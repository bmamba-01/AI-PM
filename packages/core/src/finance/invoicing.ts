export class InvoicingService {
  async generateInvoice(projectId: string, period: { from: Date; to: Date }): Promise<any> { return {}; }
  async sendInvoice(invoiceId: string): Promise<void> {}
}