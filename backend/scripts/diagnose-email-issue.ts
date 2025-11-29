import { DataSource } from 'typeorm';
import dataSource from '../src/config/data-source';
import { User } from '../src/entities/user.entity';
import { Match } from '../src/entities/match.entity';
import { Application } from '../src/entities/application.entity';
import { MatchSlot } from '../src/entities/match-slot.entity';
import { Notification } from '../src/entities/notification.entity';

async function diagnoseEmailIssue() {
  const targetEmail = 'serenarozen@gmail.com';

  try {
    await dataSource.initialize();
    console.log('📦 Database connected\n');

    const userRepository = dataSource.getRepository(User);
    const matchRepository = dataSource.getRepository(Match);
    const applicationRepository = dataSource.getRepository(Application);
    const notificationRepository = dataSource.getRepository(Notification);

    // Find the user
    const user = await userRepository.findOne({
      where: { email: targetEmail },
    });

    if (!user) {
      console.log(`❌ User with email ${targetEmail} not found`);
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Find all matches where this user is the creator
    const matchesAsCreator = await matchRepository.find({
      where: { creatorUserId: user.id },
      relations: ['court'],
      order: { createdAt: 'DESC' },
    });

    console.log(`📊 Matches where user is listed as creator: ${matchesAsCreator.length}\n`);

    if (matchesAsCreator.length > 0) {
      console.log('Matches created by this user:');
      for (const match of matchesAsCreator) {
        const slots = await dataSource.getRepository(MatchSlot).find({
          where: { matchId: match.id },
        });
        const applications = await applicationRepository.find({
          where: { matchSlotId: slots[0]?.id },
          relations: ['applicant'],
        });
        console.log(`  - Match ID: ${match.id}`);
        console.log(`    Court: ${match.court?.name || 'Unknown'}`);
        console.log(`    Date: ${match.date}`);
        console.log(`    Status: ${match.status}`);
        console.log(`    Created at: ${match.createdAt}`);
        console.log(`    Applications: ${applications.length}`);
        if (applications.length > 0) {
          console.log(`    Applicants:`);
          applications.forEach(app => {
            console.log(`      - ${app.applicant?.firstName} ${app.applicant?.lastName} (${app.applicant?.email})`);
          });
        }
        console.log('');
      }
    }

    // Find all applications to matches where this user is the creator
    const applicationsToUserMatches = await applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'match')
      .innerJoin('app.applicant', 'applicant')
      .where('match.creatorUserId = :userId', { userId: user.id })
      .select([
        'app.id',
        'app.status',
        'app.createdAt',
        'applicant.id',
        'applicant.email',
        'applicant.firstName',
        'applicant.lastName',
        'match.id',
        'match.date',
        'match.status',
      ])
      .orderBy('app.createdAt', 'DESC')
      .getMany();

    console.log(`📧 Applications to matches where user is creator: ${applicationsToUserMatches.length}\n`);

    // Find recent notifications sent to this user
    const recentNotifications = await notificationRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    console.log(`🔔 Recent notifications sent to this user: ${recentNotifications.length}\n`);
    if (recentNotifications.length > 0) {
      console.log('Recent notifications:');
      for (const notif of recentNotifications.slice(0, 10)) {
        console.log(`  - Type: ${notif.type}`);
        console.log(`    Content: ${notif.content.substring(0, 100)}...`);
        console.log(`    Channel: ${notif.channel}`);
        console.log(`    Status: ${notif.status}`);
        console.log(`    Created: ${notif.createdAt}`);
        console.log('');
      }
    }

    // Check if there are matches where this user is NOT the creator but is receiving notifications
    // This would indicate a bug
    console.log('🔍 Checking for potential issues...\n');

    // Find matches where this user has applications (they applied to)
    const matchesUserAppliedTo = await applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'match')
      .innerJoin('match.creator', 'creator')
      .where('app.applicantUserId = :userId', { userId: user.id })
      .select([
        'app.id',
        'app.applicantUserId',
        'match.id',
        'match.creatorUserId',
        'creator.id',
        'creator.email',
        'creator.firstName',
        'creator.lastName',
      ])
      .addSelect('slot.id', 'slot_id')
      .getRawMany();

    console.log(`📝 Matches this user applied to: ${matchesUserAppliedTo.length}`);
    if (matchesUserAppliedTo.length > 0) {
      const uniqueMatches = new Map();
      matchesUserAppliedTo.forEach((row: any) => {
        const matchId = row.match_id;
        const creatorId = row.match_creatorUserId;
        if (matchId && !uniqueMatches.has(matchId)) {
          uniqueMatches.set(matchId, {
            matchId: matchId,
            creatorId: creatorId,
            creatorEmail: row.creator_email || 'Unknown',
            creatorName: `${row.creator_firstName || ''} ${row.creator_lastName || ''}`.trim() || 'Unknown',
          });
        }
      });

      console.log('Matches this user applied to (should NOT receive notifications for these):');
      for (const [matchId, matchInfo] of uniqueMatches) {
        if (matchInfo.creatorId === user.id) {
          console.log(`  ⚠️  Match ${matchId}: User is listed as creator (this is wrong if they only applied)`);
        } else {
          console.log(`  ✅ Match ${matchId}: Creator is ${matchInfo.creatorName} (${matchInfo.creatorEmail})`);
        }
      }
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

diagnoseEmailIssue();


import { User } from '../src/entities/user.entity';
import { Match } from '../src/entities/match.entity';
import { Application } from '../src/entities/application.entity';
import { MatchSlot } from '../src/entities/match-slot.entity';
import { Notification } from '../src/entities/notification.entity';

async function diagnoseEmailIssue() {
  const targetEmail = 'serenarozen@gmail.com';

  try {
    await dataSource.initialize();
    console.log('📦 Database connected\n');

    const userRepository = dataSource.getRepository(User);
    const matchRepository = dataSource.getRepository(Match);
    const applicationRepository = dataSource.getRepository(Application);
    const notificationRepository = dataSource.getRepository(Notification);

    // Find the user
    const user = await userRepository.findOne({
      where: { email: targetEmail },
    });

    if (!user) {
      console.log(`❌ User with email ${targetEmail} not found`);
      return;
    }

    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.email})`);
    console.log(`   User ID: ${user.id}\n`);

    // Find all matches where this user is the creator
    const matchesAsCreator = await matchRepository.find({
      where: { creatorUserId: user.id },
      relations: ['court'],
      order: { createdAt: 'DESC' },
    });

    console.log(`📊 Matches where user is listed as creator: ${matchesAsCreator.length}\n`);

    if (matchesAsCreator.length > 0) {
      console.log('Matches created by this user:');
      for (const match of matchesAsCreator) {
        const slots = await dataSource.getRepository(MatchSlot).find({
          where: { matchId: match.id },
        });
        const applications = await applicationRepository.find({
          where: { matchSlotId: slots[0]?.id },
          relations: ['applicant'],
        });
        console.log(`  - Match ID: ${match.id}`);
        console.log(`    Court: ${match.court?.name || 'Unknown'}`);
        console.log(`    Date: ${match.date}`);
        console.log(`    Status: ${match.status}`);
        console.log(`    Created at: ${match.createdAt}`);
        console.log(`    Applications: ${applications.length}`);
        if (applications.length > 0) {
          console.log(`    Applicants:`);
          applications.forEach(app => {
            console.log(`      - ${app.applicant?.firstName} ${app.applicant?.lastName} (${app.applicant?.email})`);
          });
        }
        console.log('');
      }
    }

    // Find all applications to matches where this user is the creator
    const applicationsToUserMatches = await applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'match')
      .innerJoin('app.applicant', 'applicant')
      .where('match.creatorUserId = :userId', { userId: user.id })
      .select([
        'app.id',
        'app.status',
        'app.createdAt',
        'applicant.id',
        'applicant.email',
        'applicant.firstName',
        'applicant.lastName',
        'match.id',
        'match.date',
        'match.status',
      ])
      .orderBy('app.createdAt', 'DESC')
      .getMany();

    console.log(`📧 Applications to matches where user is creator: ${applicationsToUserMatches.length}\n`);

    // Find recent notifications sent to this user
    const recentNotifications = await notificationRepository.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take: 20,
    });

    console.log(`🔔 Recent notifications sent to this user: ${recentNotifications.length}\n`);
    if (recentNotifications.length > 0) {
      console.log('Recent notifications:');
      for (const notif of recentNotifications.slice(0, 10)) {
        console.log(`  - Type: ${notif.type}`);
        console.log(`    Content: ${notif.content.substring(0, 100)}...`);
        console.log(`    Channel: ${notif.channel}`);
        console.log(`    Status: ${notif.status}`);
        console.log(`    Created: ${notif.createdAt}`);
        console.log('');
      }
    }

    // Check if there are matches where this user is NOT the creator but is receiving notifications
    // This would indicate a bug
    console.log('🔍 Checking for potential issues...\n');

    // Find matches where this user has applications (they applied to)
    const matchesUserAppliedTo = await applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.matchSlot', 'slot')
      .innerJoin('slot.match', 'match')
      .innerJoin('match.creator', 'creator')
      .where('app.applicantUserId = :userId', { userId: user.id })
      .select([
        'app.id',
        'app.applicantUserId',
        'match.id',
        'match.creatorUserId',
        'creator.id',
        'creator.email',
        'creator.firstName',
        'creator.lastName',
      ])
      .addSelect('slot.id', 'slot_id')
      .getRawMany();

    console.log(`📝 Matches this user applied to: ${matchesUserAppliedTo.length}`);
    if (matchesUserAppliedTo.length > 0) {
      const uniqueMatches = new Map();
      matchesUserAppliedTo.forEach((row: any) => {
        const matchId = row.match_id;
        const creatorId = row.match_creatorUserId;
        if (matchId && !uniqueMatches.has(matchId)) {
          uniqueMatches.set(matchId, {
            matchId: matchId,
            creatorId: creatorId,
            creatorEmail: row.creator_email || 'Unknown',
            creatorName: `${row.creator_firstName || ''} ${row.creator_lastName || ''}`.trim() || 'Unknown',
          });
        }
      });

      console.log('Matches this user applied to (should NOT receive notifications for these):');
      for (const [matchId, matchInfo] of uniqueMatches) {
        if (matchInfo.creatorId === user.id) {
          console.log(`  ⚠️  Match ${matchId}: User is listed as creator (this is wrong if they only applied)`);
        } else {
          console.log(`  ✅ Match ${matchId}: Creator is ${matchInfo.creatorName} (${matchInfo.creatorEmail})`);
        }
      }
    }

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error);
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
    process.exit(1);
  }
}

diagnoseEmailIssue();

