const { faker } = require('@faker-js/faker');
const { PrismaClient } = require('@prisma/client');
const client = new PrismaClient();
const { hash } = require('bcryptjs');
const { randomUUID } = require('crypto');

let USER_COUNT = 10;
const TEAM_COUNT = 5;
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'admin@123';
const USER_EMAIL = 'user@example.com';
const USER_PASSWORD = 'user@123';
async function seedUsers() {
  const newUsers: any[] = [];
  await createRandomUser(ADMIN_EMAIL, ADMIN_PASSWORD);
  await createRandomUser(USER_EMAIL, USER_PASSWORD);
  await Promise.all(
    Array(USER_COUNT)
      .fill(0)
      .map(() => createRandomUser())
  );

  console.log('Seeded users', newUsers.length);

  return newUsers;

  async function createRandomUser(
    email: string | undefined = undefined,
    password: string | undefined = undefined
  ) {
    try {
      const originalPassword = password || faker.internet.password();
      email = email || faker.internet.email();
      password = await hash(originalPassword, 12);
      const user = await client.user.create({
        data: {
          email,
          name: faker.person.firstName(),
          password,
          emailVerified: new Date(),
        },
      });
      newUsers.push({
        ...user,
        password: originalPassword,
      });
      USER_COUNT--;
    } catch (ex: any) {
      if (ex.message.indexOf('Unique constraint failed') > -1) {
        console.error('Duplicate email', email);
      } else {
        console.log(ex);
      }
    }
  }
}

async function seedTeams() {
  const newTeams: any[] = [];

  await Promise.all(
    Array(TEAM_COUNT)
      .fill(0)
      .map(() => createRandomTeam())
  );
  console.log('Seeded teams', newTeams.length);
  return newTeams;

  async function createRandomTeam() {
    const name = faker.company.name();
    const team = await client.team.create({
      data: {
        name,
        slug: name
          .toString()
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^\w-]+/g, '')
          .replace(/--+/g, '-')
          .replace(/^-+/, '')
          .replace(/-+$/, ''),
      },
    });
    newTeams.push(team);
  }
}

async function seedTeamMembers(users: any[], teams: any[]) {
  const newTeamMembers: any[] = [];
  const roles = ['OWNER', 'MEMBER'];
  for (const user of users) {
    const count = Math.floor(Math.random() * (TEAM_COUNT - 1)) + 2;
    const teamUsed = new Set();
    for (let j = 0; j < count; j++) {
      try {
        let teamId;
        do {
          teamId = teams[Math.floor(Math.random() * TEAM_COUNT)].id;
        } while (teamUsed.has(teamId));
        teamUsed.add(teamId);
        newTeamMembers.push({
          role:
            user.email === ADMIN_EMAIL
              ? 'OWNER'
              : user.email === USER_EMAIL
                ? 'MEMBER'
                : roles[Math.floor(Math.random() * 2)],
          teamId,
          userId: user.id,
        });
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  await client.teamMember.createMany({
    data: newTeamMembers,
  });
  console.log('Seeded team members', newTeamMembers.length);
}

async function seedInvitations(teams: any[], users: any[]) {
  const newInvitations: any[] = [];
  for (const team of teams) {
    const count = Math.floor(Math.random() * users.length) + 2;
    for (let j = 0; j < count; j++) {
      try {
        const invitation = await client.invitation.create({
          data: {
            teamId: team.id,
            invitedBy: users[Math.floor(Math.random() * users.length)].id,
            email: faker.internet.email(),
            role: 'MEMBER',
            sentViaEmail: true,
            token: randomUUID(),
            allowedDomains: [],
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });
        newInvitations.push(invitation);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded invitations', newInvitations.length);

  return newInvitations;
}

async function seedContracts(teams: any[], users: any[]) {
  const newContracts: any[] = [];
  const statuses = ['DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED'];

  for (const team of teams) {
    const count = Math.floor(Math.random() * 3) + 1; // 1-3 contracts per team
    for (let i = 0; i < count; i++) {
      try {
        const startDate = faker.date.past({ years: 2 });
        const contract = await client.contract.create({
          data: {
            tenantId: team.id,
            name: `${faker.commerce.productName()} Supply Agreement`,
            description: faker.lorem.paragraph(),
            status: statuses[Math.floor(Math.random() * statuses.length)],
            startDate,
            endDate: faker.date.future({ years: 1, refDate: startDate }),
            createdBy: users[Math.floor(Math.random() * users.length)].id,
          },
        });
        newContracts.push(contract);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded contracts', newContracts.length);
  return newContracts;
}

async function seedPAMs(teams: any[], users: any[]) {
  const newPAMs: any[] = [];

  // Sample PAM graph structure
  const sampleGraphs = [
    {
      nodes: [
        {
          id: 'base',
          type: 'Factor',
          config: { series: 'PLATTS_BRENT', operation: 'value' },
        },
        {
          id: 'convert',
          type: 'Convert',
          config: { from: 'USD/bbl', to: 'USD/MT', density: 7.3 },
        },
        { id: 'premium', type: 'Factor', config: { value: 50.0 } },
        { id: 'combine', type: 'Combine', config: { operation: 'add' } },
        {
          id: 'cap',
          type: 'Controls',
          config: { cap: 1000.0, floor: 100.0 },
        },
      ],
      edges: [
        { from: 'base', to: 'convert' },
        { from: 'convert', to: 'combine' },
        { from: 'premium', to: 'combine' },
        { from: 'combine', to: 'cap' },
      ],
      output: 'cap',
    },
    {
      nodes: [
        {
          id: 'base',
          type: 'Factor',
          config: { series: 'LME_COPPER', operation: 'avg_3m' },
        },
        { id: 'multiplier', type: 'Factor', config: { value: 1.15 } },
        { id: 'multiply', type: 'Combine', config: { operation: 'multiply' } },
      ],
      edges: [
        { from: 'base', to: 'multiply' },
        { from: 'multiplier', to: 'multiply' },
      ],
      output: 'multiply',
    },
  ];

  for (const team of teams) {
    const count = Math.floor(Math.random() * 2) + 1; // 1-2 PAMs per team
    for (let i = 0; i < count; i++) {
      try {
        const pam = await client.pAM.create({
          data: {
            tenantId: team.id,
            name: `PAM-${faker.string.alphanumeric(6).toUpperCase()}`,
            description: `Price adjustment mechanism for ${faker.commerce.productMaterial()}`,
            version: 1,
            graph: sampleGraphs[Math.floor(Math.random() * sampleGraphs.length)],
            createdBy: users[Math.floor(Math.random() * users.length)].id,
          },
        });
        newPAMs.push(pam);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded PAMs', newPAMs.length);
  return newPAMs;
}

async function seedItems(contracts: any[], pams: any[]) {
  const newItems: any[] = [];
  const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
  const uoms = ['MT', 'kg', 'lb', 'bbl', 'gal'];

  for (const contract of contracts) {
    const count = Math.floor(Math.random() * 5) + 2; // 2-6 items per contract
    for (let i = 0; i < count; i++) {
      try {
        const teamPAMs = pams.filter((p) => p.tenantId === contract.tenantId);
        const item = await client.item.create({
          data: {
            tenantId: contract.tenantId,
            contractId: contract.id,
            sku: `SKU-${faker.string.alphanumeric(8).toUpperCase()}`,
            name: faker.commerce.productName(),
            description: faker.commerce.productDescription(),
            basePrice: faker.number.float({ min: 10, max: 1000, multipleOf: 0.01 }),
            baseCurrency: currencies[Math.floor(Math.random() * currencies.length)],
            uom: uoms[Math.floor(Math.random() * uoms.length)],
            pamId:
              teamPAMs.length > 0 && Math.random() > 0.3
                ? teamPAMs[Math.floor(Math.random() * teamPAMs.length)].id
                : null,
          },
        });
        newItems.push(item);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded items', newItems.length);
  return newItems;
}

async function seedIndexSeries(teams: any[]) {
  const newSeries: any[] = [];

  const seriesDefinitions = [
    {
      seriesCode: 'PLATTS_BRENT',
      name: 'Platts Brent Crude',
      provider: 'PLATTS',
      dataType: 'INDEX',
      unit: 'USD/bbl',
      frequency: 'DAILY',
    },
    {
      seriesCode: 'LME_COPPER',
      name: 'LME Copper 3M',
      provider: 'LME',
      dataType: 'INDEX',
      unit: 'USD/MT',
      frequency: 'DAILY',
    },
    {
      seriesCode: 'USD_EUR',
      name: 'USD to EUR Exchange Rate',
      provider: 'OANDA',
      dataType: 'FX',
      unit: 'EUR/USD',
      frequency: 'DAILY',
    },
    {
      seriesCode: 'USD_GBP',
      name: 'USD to GBP Exchange Rate',
      provider: 'OANDA',
      dataType: 'FX',
      unit: 'GBP/USD',
      frequency: 'DAILY',
    },
  ];

  for (const team of teams) {
    for (const seriesDef of seriesDefinitions) {
      try {
        const series = await client.indexSeries.create({
          data: {
            tenantId: team.id,
            ...seriesDef,
          },
        });
        newSeries.push(series);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded index series', newSeries.length);
  return newSeries;
}

async function seedIndexValues(series: any[]) {
  const newValues: any[] = [];
  const versionTags = ['PRELIMINARY', 'FINAL'];

  for (const s of series) {
    // Create 90 days of historical data
    const days = 90;
    for (let i = 0; i < days; i++) {
      const asOfDate = new Date();
      asOfDate.setDate(asOfDate.getDate() - i);

      // Create preliminary and final versions for some dates
      const versions = i < 30 ? ['PRELIMINARY'] : ['FINAL'];

      for (const versionTag of versions) {
        try {
          let baseValue = 0;
          if (s.seriesCode === 'PLATTS_BRENT') {
            baseValue = faker.number.float({ min: 60, max: 90, multipleOf: 0.01 });
          } else if (s.seriesCode === 'LME_COPPER') {
            baseValue = faker.number.float({ min: 7000, max: 9000, multipleOf: 0.01 });
          } else if (s.seriesCode.startsWith('USD_')) {
            baseValue = faker.number.float({ min: 0.8, max: 1.2, multipleOf: 0.0001 });
          }

          const value = await client.indexValue.create({
            data: {
              tenantId: s.tenantId,
              seriesId: s.id,
              asOfDate,
              value: baseValue,
              versionTag,
              providerTimestamp: new Date(asOfDate.getTime() + 8 * 60 * 60 * 1000), // 8am on that day
            },
          });
          newValues.push(value);
        } catch (ex) {
          // Ignore duplicates
        }
      }
    }
  }

  console.log('Seeded index values', newValues.length);
  return newValues;
}

async function seedCalcBatches(teams: any[], pams: any[], contracts: any[]) {
  const newBatches: any[] = [];
  const statuses = ['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'];

  for (const pam of pams) {
    const teamContracts = contracts.filter((c) => c.tenantId === pam.tenantId);
    if (teamContracts.length === 0) continue;

    const count = Math.floor(Math.random() * 3) + 1; // 1-3 batches per PAM
    for (let i = 0; i < count; i++) {
      try {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const startedAt = status !== 'QUEUED' ? faker.date.recent({ days: 7 }) : null;
        const completedAt =
          status === 'COMPLETED' || status === 'FAILED'
            ? new Date(startedAt!.getTime() + Math.random() * 60000)
            : null;

        const batch = await client.calcBatch.create({
          data: {
            tenantId: pam.tenantId,
            pamId: pam.id,
            contractId: teamContracts[Math.floor(Math.random() * teamContracts.length)].id,
            inputsHash: faker.string.hexadecimal({ length: 64, prefix: '' }),
            status,
            startedAt,
            completedAt,
            error: status === 'FAILED' ? 'Index data unavailable for date range' : null,
            metadata: {
              triggeredBy: 'scheduler',
              reason: 'daily_calculation',
            },
          },
        });
        newBatches.push(batch);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded calc batches', newBatches.length);
  return newBatches;
}

async function seedCalcResults(batches: any[], items: any[]) {
  const newResults: any[] = [];

  for (const batch of batches) {
    if (batch.status !== 'COMPLETED') continue;

    // Get items for this batch's contract
    const batchItems = items.filter(
      (i) => i.contractId === batch.contractId && i.tenantId === batch.tenantId
    );

    for (const item of batchItems) {
      try {
        const result = await client.calcResult.create({
          data: {
            tenantId: batch.tenantId,
            batchId: batch.id,
            itemId: item.id,
            adjustedPrice: faker.number.float({ min: 10, max: 1500, multipleOf: 0.01 }),
            adjustedCurrency: item.baseCurrency,
            contributions: {
              base: parseFloat(item.basePrice),
              indexAdjustment: faker.number.float({ min: -50, max: 100, multipleOf: 0.01 }),
              premium: faker.number.float({ min: 0, max: 50, multipleOf: 0.01 }),
              controls: faker.number.float({ min: -20, max: 20, multipleOf: 0.01 }),
            },
            effectiveDate: faker.date.recent({ days: 30 }),
          },
        });
        newResults.push(result);
      } catch (ex) {
        console.log(ex);
      }
    }
  }

  console.log('Seeded calc results', newResults.length);
  return newResults;
}

async function seedApprovalEvents(teams: any[], batches: any[], users: any[]) {
  const newEvents: any[] = [];
  const statuses = ['PENDING', 'APPROVED', 'REJECTED'];

  for (const batch of batches.slice(0, Math.min(10, batches.length))) {
    try {
      const teamUsers = users.filter((u) =>
        u.teamMembers?.some((tm: any) => tm.teamId === batch.tenantId)
      );
      const approver =
        teamUsers.length > 0 ? teamUsers[Math.floor(Math.random() * teamUsers.length)] : users[0];

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const approvedAt = status === 'APPROVED' ? faker.date.recent({ days: 3 }) : null;
      const rejectedAt = status === 'REJECTED' ? faker.date.recent({ days: 3 }) : null;

      const event = await client.approvalEvent.create({
        data: {
          tenantId: batch.tenantId,
          entityType: 'CALC_BATCH',
          entityId: batch.id,
          status,
          approvedBy: status === 'APPROVED' ? approver.id : null,
          rejectedBy: status === 'REJECTED' ? approver.id : null,
          comments:
            status !== 'PENDING'
              ? faker.lorem.sentence()
              : null,
          approvedAt,
          rejectedAt,
        },
      });
      newEvents.push(event);
    } catch (ex) {
      console.log(ex);
    }
  }

  console.log('Seeded approval events', newEvents.length);
  return newEvents;
}

async function seedAuditLogs(teams: any[], users: any[], contracts: any[], items: any[]) {
  const newLogs: any[] = [];
  const actions = ['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'CALCULATE'];
  const entityTypes = ['CONTRACT', 'ITEM', 'PAM', 'CALC_BATCH'];

  // Create 50 random audit log entries
  for (let i = 0; i < 50; i++) {
    try {
      const team = teams[Math.floor(Math.random() * teams.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];

      let entityId;
      if (entityType === 'CONTRACT') {
        const teamContracts = contracts.filter((c: any) => c.tenantId === team.id);
        entityId =
          teamContracts.length > 0
            ? teamContracts[Math.floor(Math.random() * teamContracts.length)].id
            : faker.string.uuid();
      } else if (entityType === 'ITEM') {
        const teamItems = items.filter((item: any) => item.tenantId === team.id);
        entityId =
          teamItems.length > 0
            ? teamItems[Math.floor(Math.random() * teamItems.length)].id
            : faker.string.uuid();
      } else {
        entityId = faker.string.uuid();
      }

      const log = await client.auditLog.create({
        data: {
          tenantId: team.id,
          userId: user.id,
          action: actions[Math.floor(Math.random() * actions.length)],
          entityType,
          entityId,
          changes: {
            before: { status: 'DRAFT' },
            after: { status: 'ACTIVE' },
          },
          ipAddress: faker.internet.ipv4(),
          userAgent: faker.internet.userAgent(),
          createdAt: faker.date.recent({ days: 30 }),
        },
      });
      newLogs.push(log);
    } catch (ex) {
      console.log(ex);
    }
  }

  console.log('Seeded audit logs', newLogs.length);
  return newLogs;
}

async function init() {
  console.log('\n🌱 Starting database seeding...\n');

  // Seed BoxyHQ baseline data
  const users = await seedUsers();
  const teams = await seedTeams();
  await seedTeamMembers(users, teams);
  await seedInvitations(teams, users);

  // Seed CPAM domain data
  const pams = await seedPAMs(teams, users);
  const contracts = await seedContracts(teams, users);
  const items = await seedItems(contracts, pams);
  const indexSeries = await seedIndexSeries(teams);
  const indexValues = await seedIndexValues(indexSeries);
  const calcBatches = await seedCalcBatches(teams, pams, contracts);
  const calcResults = await seedCalcResults(calcBatches, items);
  await seedApprovalEvents(teams, calcBatches, users);
  await seedAuditLogs(teams, users, contracts, items);

  console.log('\n✅ Database seeding completed successfully!\n');
}

init();
