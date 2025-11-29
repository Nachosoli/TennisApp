import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailVerificationService } from '../src/auth/services/email-verification.service';

async function checkEmailVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const authService = app.get(AuthService);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const emailVerificationService = app.get(EmailVerificationService);
  
  const email = 'ignacio.solinas@hotmail.com';
  
  console.log(`\n=== Checking Email Verification for: ${email} ===\n`);
  
  // Check user in database
  const user = await userRepository.findOne({
    where: { email },
  });
  
  if (!user) {
    console.log('❌ User not found in database');
    await app.close();
    return;
  }
  
  console.log('✅ User found in database');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email Verified: ${user.emailVerified}`);
  console.log(`   Phone Verified: ${user.phoneVerified}`);
  console.log(`   Created At: ${user.createdAt}`);
  console.log(`   Updated At: ${user.updatedAt}`);
  
  // Check if there's a pending verification token
  const hasPendingVerification = await emailVerificationService.hasPendingVerification(email);
  console.log(`\n📧 Pending Verification Token: ${hasPendingVerification ? 'Yes' : 'No'}`);
  
  // Check recent logs would require access to log files or Railway logs
  console.log('\n📝 To check recent verification attempts, check Railway logs or backend logs');
  console.log('   Look for: "Email verified for user" or "Invalid or expired verification token"');
  
  await app.close();
}

checkEmailVerification().catch(console.error);

import { AppModule } from '../src/app.module';
import { AuthService } from '../src/auth/auth.service';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmailVerificationService } from '../src/auth/services/email-verification.service';

async function checkEmailVerification() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  const authService = app.get(AuthService);
  const userRepository = app.get<Repository<User>>(getRepositoryToken(User));
  const emailVerificationService = app.get(EmailVerificationService);
  
  const email = 'ignacio.solinas@hotmail.com';
  
  console.log(`\n=== Checking Email Verification for: ${email} ===\n`);
  
  // Check user in database
  const user = await userRepository.findOne({
    where: { email },
  });
  
  if (!user) {
    console.log('❌ User not found in database');
    await app.close();
    return;
  }
  
  console.log('✅ User found in database');
  console.log(`   ID: ${user.id}`);
  console.log(`   Email Verified: ${user.emailVerified}`);
  console.log(`   Phone Verified: ${user.phoneVerified}`);
  console.log(`   Created At: ${user.createdAt}`);
  console.log(`   Updated At: ${user.updatedAt}`);
  
  // Check if there's a pending verification token
  const hasPendingVerification = await emailVerificationService.hasPendingVerification(email);
  console.log(`\n📧 Pending Verification Token: ${hasPendingVerification ? 'Yes' : 'No'}`);
  
  // Check recent logs would require access to log files or Railway logs
  console.log('\n📝 To check recent verification attempts, check Railway logs or backend logs');
  console.log('   Look for: "Email verified for user" or "Invalid or expired verification token"');
  
  await app.close();
}

checkEmailVerification().catch(console.error);

