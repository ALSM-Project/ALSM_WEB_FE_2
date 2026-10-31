import { describe, it, expect, beforeEach } from 'vitest';
import { crmStore } from '../services/crm-store';
import { crmApi } from '../api/crm.api';

describe('Section 3.11: CRM & Sales Lead-to-Customer Activation Workflow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Adds a new lead with required contact info, deal value, and rejects duplicate email', async () => {
    const testEmail = 'lead.workflow@cloudbank.com';
    const newLead = await crmApi.createLead({
      company: 'Cloud Bank International',
      contactName: 'David Sterling',
      email: testEmail,
      phone: '+1 555 987 6543',
      source: 'Inbound Demo',
      dealValue: 95000,
      score: 65,
      assignedToName: 'Sarah Jenkins',
      notes: 'COBOL mainframe modernization prospect',
    });

    expect(newLead).toBeDefined();
    expect(newLead.id).toBeDefined();
    expect(newLead.company).toBe('Cloud Bank International');
    expect(newLead.stage).toBe('NEW');
    expect(newLead.dealValue).toBe(95000);

    // Duplicate email check must throw an error
    await expect(
      crmApi.createLead({
        company: 'Duplicate Corp',
        contactName: 'Another Rep',
        email: testEmail,
      })
    ).rejects.toThrow(/already exists/i);
  });

  it('2. Logs phone calls and interactions, updating last contacted timestamp', async () => {
    const lead = await crmApi.createLead({
      company: 'Metro Insurance',
      contactName: 'Alice Wong',
      email: 'alice@metroins.com',
      dealValue: 60000,
    });

    expect(lead.lastContactAt).toBeUndefined();

    const interaction = await crmApi.logInteraction(lead.id, {
      type: 'PHONE_CALL',
      durationMinutes: 30,
      outcome: 'Interested in batch modernization',
      summary: 'Discovery call with VP of Engineering',
      actionItems: 'Schedule technical deep dive demo',
      details: 'Reviewed 85 batch jobs scheduled in BMC Control-M.',
    });

    expect(interaction.id).toBeDefined();
    expect(interaction.type).toBe('PHONE_CALL');

    const updated = await crmApi.getLeadById(lead.id);
    expect(updated.interactions.length).toBe(1);
    expect(updated.lastContactAt).toBeDefined();
    expect(updated.interactions[0].summary).toBe('Discovery call with VP of Engineering');
  });

  it('3. Schedules product demo and generates meeting link', async () => {
    const lead = await crmApi.createLead({
      company: 'Global Logistics Corp',
      contactName: 'Robert Vance',
      email: 'robert@globallogistics.com',
    });

    const demo = await crmApi.scheduleDemo(lead.id, {
      topic: 'COBOL Screen Conversion Demo',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
      durationMinutes: 45,
      attendees: ['robert@globallogistics.com', 'cto@globallogistics.com'],
      agenda: 'Walk through CICS BMS map parser and React UI generation.',
    });

    expect(demo.id).toBeDefined();
    expect(demo.meetingLink).toContain('meet.');

    const updated = await crmApi.getLeadById(lead.id);
    expect(updated.demos.length).toBe(1);
    expect(updated.demos[0].topic).toBe('COBOL Screen Conversion Demo');
  });

  it('4. Creates quote with discount rules (>15% requires approval)', async () => {
    const lead = await crmApi.createLead({
      company: 'Fintech Gateway',
      contactName: 'Elena Rostova',
      email: 'elena@fintechgateway.io',
    });

    // Standard quote: 10% discount -> no approval required
    const standardQuote = await crmApi.createQuote(lead.id, {
      plan: 'Enterprise Tier 1',
      basePrice: 80000,
      discountPercent: 10,
    });
    expect(standardQuote.requiresApproval).toBe(false);
    expect(standardQuote.approvalStatus).toBe('APPROVED');
    expect(standardQuote.finalPrice).toBe(72000);

    // High discount quote: 20% discount -> requires approval
    const highDiscountQuote = await crmApi.createQuote(lead.id, {
      plan: 'Enterprise Tier 2',
      basePrice: 120000,
      discountPercent: 20,
      discountReason: 'Competitive bid against AWS Mainframe Modernization',
    });
    expect(highDiscountQuote.requiresApproval).toBe(true);
    expect(highDiscountQuote.approvalStatus).toBe('PENDING');
    expect(highDiscountQuote.finalPrice).toBe(96000);
  });

  it('5. Strictly rejects manual transition of lead stage to WON', async () => {
    const lead = await crmApi.createLead({
      company: 'Security First Credit',
      contactName: 'Marcus Brown',
      email: 'marcus@secfirst.org',
    });

    // Legitimate pre-conversion transition to QUALIFIED
    const qualified = await crmApi.updateLeadStage(lead.id, {
      stage: 'QUALIFIED',
      notes: 'Technical qualification confirmed',
    });
    expect(qualified.stage).toBe('QUALIFIED');

    // Attempting to set WON manually must throw
    await expect(
      crmApi.updateLeadStage(lead.id, {
        stage: 'WON',
        notes: 'Trying to force Won without activation',
      })
    ).rejects.toThrow(/Closed Won cannot be selected manually/i);
  });

  it('6. Simulates failure during customer activation safely without state corruption', async () => {
    // apex-bank lead in seed store has accepted quote, signed contract, confirmed payment
    const lead = crmStore.getLeadById('lead-apex-bank');
    expect(lead).toBeDefined();

    // Run activation with simulateFailure = true
    await expect(
      crmApi.activateCustomer('lead-apex-bank', { simulateFailure: true })
    ).rejects.toThrow(/timeout during organization administrator provisioning/i);

    // Verify lead is NOT corrupted to WON
    const afterFailed = crmStore.getLeadById('lead-apex-bank');
    expect(afterFailed?.stage).toBe('PROPOSAL');
    expect(afterFailed?.provisioning?.status).toBe('FAILED');
    expect(afterFailed?.provisioning?.failureReason).toContain('Identity service connection timeout');
  });

  it('7. Successfully completes 7-point Customer Activation and graduates lead to WON', async () => {
    // Fresh complete test lead
    const lead = await crmApi.createLead({
      company: 'Zenith Holdings',
      contactName: 'Clara Oswald',
      email: 'clara@zenith.co',
      dealValue: 150000,
    });

    // Advance to PROPOSAL
    await crmApi.updateLeadStage(lead.id, { stage: 'PROPOSAL', notes: 'Entering negotiation' });

    // 1. Quote
    const quote = await crmApi.createQuote(lead.id, {
      plan: 'Enterprise Tier 2',
      basePrice: 150000,
      discountPercent: 10,
    });
    await crmApi.acceptQuote(lead.id, quote.id);

    // 2. Contract
    const contract = crmStore.createContract(lead.id, {
      title: 'Zenith Holdings Modernization Master Services Agreement',
      plan: 'Enterprise Tier 2',
      quoteId: quote.id,
      annualValue: 135000,
    });
    await crmApi.sendContractForSignature(lead.id, contract.id);
    await crmApi.simulateSignContract(lead.id, contract.id);

    // 3. Confirm Payment
    await crmApi.confirmPayment(lead.id, 'TX-WIRE-982314');

    // 4. Execute Automated Customer Activation
    const activationResult = await crmApi.activateCustomer(lead.id, {
      paymentRequired: true,
      simulateFailure: false,
    });

    expect(activationResult.organizationId).toMatch(/^org-zenith-holdings/);
    expect(activationResult.adminEmail).toBe('clara@zenith.co');
    expect(activationResult.web3Url).toContain('https://web3.alsm.io/tenant/');

    // 5. Verify Lead graduated to WON with complete 7-item checklist
    const wonLead = activationResult.lead;
    expect(wonLead.stage).toBe('WON');
    expect(wonLead.convertedAt).toBeDefined();
    expect(wonLead.provisioning?.status).toBe('COMPLETED');

    const checklist = wonLead.provisioning?.checklist;
    expect(checklist?.contractSigned).toBe(true);
    expect(checklist?.paymentConfirmed).toBe(true);
    expect(checklist?.organizationCreated).toBe(true);
    expect(checklist?.adminProvisioned).toBe(true);
    expect(checklist?.subscriptionActivated).toBe(true);
    expect(checklist?.web3AccessEnabled).toBe(true);
    expect(checklist?.welcomeNotificationSent).toBe(true);

    // Verify stage audit history logged the automated transition
    const auditEntry = wonLead.stageAudit?.find((a) => a.toStage === 'WON');
    expect(auditEntry).toBeDefined();
    expect(auditEntry?.notes).toContain('Lead successfully activated as Customer');
  });
});
