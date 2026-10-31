import { describe, it, expect, beforeEach, vi } from 'vitest';
import { crmStore } from '../services/crm-store';
import { crmApi } from '../api/crm.api';
import { apiClient } from '@/services/api/apiClient';

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

  it('6. Propagates backend failure and does not change the local lead snapshot', async () => {
    const lead = crmStore.getLeadById('lead-apex-bank');
    expect(lead).toBeDefined();
    const post = vi.spyOn(apiClient, 'post').mockRejectedValueOnce({
      response: { status: 503, data: { code: 'CUSTOMER_CONVERSION_FAILED' } },
    });

    await expect(crmApi.activateCustomer('lead-apex-bank')).rejects.toMatchObject({
      response: { status: 503 },
    });

    expect(post).toHaveBeenCalledWith('/sales/crm/leads/lead-apex-bank/activate', {});
    expect(crmStore.getLeadById('lead-apex-bank')?.stage).toBe(lead?.stage);
    post.mockRestore();
  });

  it('7. Uses the persisted backend result and sends a single activation request', async () => {
    const lead = {
      id: '6ad586fe9f2215c9ebcac858',
      company: 'Zenith Holdings',
      stage: 'WON' as const,
      convertedOrganizationId: '6a9cdbda5e82fb42d449ac03',
      provisioning: {
        status: 'COMPLETED' as const,
        organizationId: '6a9cdbda5e82fb42d449ac03',
        organizationName: 'Zenith Holdings',
        adminLinked: true,
        completedAt: new Date().toISOString(),
      },
    } as any;
    const post = vi.spyOn(apiClient, 'post').mockResolvedValueOnce({
      lead,
      organizationId: lead.convertedOrganizationId,
      adminLinked: true,
      replayed: false,
    });

    const result = await crmApi.activateCustomer(lead.id);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith(`/sales/crm/leads/${lead.id}/activate`, {});
    expect(result).toMatchObject({ lead: { stage: 'WON' }, adminLinked: true, replayed: false });
    post.mockRestore();
  });
});
