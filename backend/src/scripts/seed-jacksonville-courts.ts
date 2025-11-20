import { DataSource } from 'typeorm';
import { Court, SurfaceType } from '../entities/court.entity';
import { User, UserRole } from '../entities/user.entity';
import { Client } from '@googlemaps/google-maps-services-js';
import * as fs from 'fs';
import * as path from 'path';

interface CourtData {
  name: string;
  address: string;
  courts?: number;
  features?: string[];
  surfaceType?: SurfaceType;
  isPublic?: boolean;
}

// Fallback court data for Jacksonville area
const JACKSONVILLE_COURTS: CourtData[] = [
  {
    name: 'Burnett Park Tennis Complex',
    address: '8303 Merchants Way, Jacksonville, FL 32256',
    courts: 12,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Baymeadows Tennis Center',
    address: '8815 Baymeadows Rd, Jacksonville, FL 32256',
    courts: 8,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Gate Parkway Tennis Complex',
    address: '9750 Gate Parkway N, Jacksonville, FL 32246',
    courts: 6,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Boone Park Tennis Courts',
    address: '3700 Park St, Jacksonville, FL 32205',
    courts: 8,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'Southside Tennis Complex',
    address: '10605 Southside Blvd, Jacksonville, FL 32256',
    courts: 10,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Losco Regional Park',
    address: '10851 Hood Rd S, Jacksonville, FL 32257',
    courts: 6,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Mandarin Park Tennis Courts',
    address: '11270 San Jose Blvd, Jacksonville, FL 32223',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'Nocatee Spray Park and Tennis Courts',
    address: '245 Nocatee Center Way, Ponte Vedra, FL 32081',
    courts: 6,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Atlantic Beach Tennis Center',
    address: '1000 Seminole Rd, Atlantic Beach, FL 32233',
    courts: 6,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Jacksonville Beach Tennis Courts',
    address: '200 11th Ave S, Jacksonville Beach, FL 32250',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'St. Johns County Tennis Center',
    address: '490 State Road 207, St. Augustine, FL 32084',
    courts: 8,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Durbin Pavilion Tennis Courts',
    address: '185 Pavilion Dr, St. Johns, FL 32259',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Riverside Park Tennis Courts',
    address: '753 Park St, Jacksonville, FL 32204',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'Jacksonville Tennis Center at Patton Park',
    address: '7300 Wilson Blvd, Jacksonville, FL 32210',
    courts: 12,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Memorial Park Tennis Courts',
    address: '1620 Riverside Ave, Jacksonville, FL 32204',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'Hodges Tennis Center',
    address: '1170 Edgewood Ave W, Jacksonville, FL 32208',
    courts: 8,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Fleming Island Park Tennis Courts',
    address: '1510 Calico Jack Ln, Fleming Island, FL 32003',
    courts: 6,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Lighted', 'Public'],
  },
  {
    name: 'Orange Park Tennis Courts',
    address: '400 Park Ave, Orange Park, FL 32073',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'Brentwood Park Tennis Courts',
    address: '2135 Laura St, Jacksonville, FL 32206',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
  {
    name: 'Regency Square Tennis Courts',
    address: '9401 Arlington Expy, Jacksonville, FL 32225',
    courts: 4,
    surfaceType: SurfaceType.HARD,
    isPublic: true,
    features: ['Public'],
  },
];

async function geocodeCourt(
  client: Client,
  courtData: CourtData,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await client.geocode({
      params: {
        address: courtData.address,
        key: apiKey,
      },
    });

    if (response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error: any) {
    console.error(`❌ Geocoding failed for ${courtData.name}:`, error.message);
    return null;
  }
}

async function seedJacksonvilleCourts(dataSource: DataSource): Promise<void> {
  const courtRepository = dataSource.getRepository(Court);
  const userRepository = dataSource.getRepository(User);

  // Get or create admin user as creator
  let adminUser = await userRepository.findOne({
    where: { email: 'admin@courtmate.com' },
  });

  if (!adminUser) {
    console.log('⚠️ Admin user not found, using first user as creator');
    const users = await userRepository.find({ take: 1 });
    if (users.length === 0) {
      console.error('❌ No users found. Please run the main seed script first.');
      process.exit(1);
    }
    adminUser = users[0];
  }

  // Check for Google Maps API key
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!googleMapsApiKey) {
    console.warn('⚠️ GOOGLE_MAPS_API_KEY not set. Using default coordinates for Jacksonville.');
  }

  const client = new Client({});
  let courtsData = JACKSONVILLE_COURTS;

  // Try to load scraped data if available
  const scrapedDataPath = path.join(__dirname, 'jacksonville-courts.json');
  if (fs.existsSync(scrapedDataPath)) {
    try {
      const scrapedData = JSON.parse(fs.readFileSync(scrapedDataPath, 'utf8'));
      console.log(`📄 Found scraped data with ${scrapedData.length} courts`);
      
      // Merge scraped data with fallback data
      const scrapedCourts: CourtData[] = scrapedData.map((court: any) => ({
        name: court.name,
        address: court.address || 'Jacksonville, FL',
        courts: court.courts,
        features: court.features,
        surfaceType: SurfaceType.HARD,
        isPublic: true,
      }));
      
      // Use scraped data, but fall back to predefined if scraping didn't work well
      if (scrapedCourts.length > 5) {
        courtsData = scrapedCourts;
      } else {
        console.log('⚠️ Scraped data seems incomplete, using fallback data');
      }
    } catch (error) {
      console.warn('⚠️ Failed to load scraped data, using fallback data');
    }
  }

  console.log(`\n🏟️ Seeding ${courtsData.length} Jacksonville courts...`);
  
  const seededCourts: Court[] = [];
  const failedCourts: string[] = [];

  for (let i = 0; i < courtsData.length; i++) {
    const courtData = courtsData[i];
    console.log(`\n[${i + 1}/${courtsData.length}] Processing: ${courtData.name}`);

    // Geocode the address
    let coordinates: { lat: number; lng: number } | null = null;
    if (googleMapsApiKey) {
      console.log('  🌍 Geocoding address...');
      coordinates = await geocodeCourt(client, courtData, googleMapsApiKey);
      
      if (coordinates) {
        console.log(`  ✅ Coordinates: ${coordinates.lat}, ${coordinates.lng}`);
      } else {
        console.log('  ⚠️ Geocoding failed, using default Jacksonville coordinates');
      }
    }

    // Use default Jacksonville coordinates if geocoding failed
    const finalCoordinates = coordinates || {
      lat: 30.3322 + (Math.random() - 0.5) * 0.2,
      lng: -81.6557 + (Math.random() - 0.5) * 0.2,
    };

    // Create court entry
    try {
      const court = courtRepository.create({
        name: courtData.name,
        address: courtData.address,
        coordinates: {
          type: 'Point',
          coordinates: [finalCoordinates.lng, finalCoordinates.lat],
        } as any,
        surfaceType: courtData.surfaceType || SurfaceType.HARD,
        isPublic: courtData.isPublic !== undefined ? courtData.isPublic : true,
        createdByUserId: adminUser.id,
      } as any);

      const savedCourt = await courtRepository.save(court);
      seededCourts.push(Array.isArray(savedCourt) ? savedCourt[0] : savedCourt);
      console.log('  ✅ Court saved to database');
    } catch (error: any) {
      console.error(`  ❌ Failed to save court: ${error.message}`);
      failedCourts.push(courtData.name);
    }

    // Add a small delay to avoid rate limiting
    if (googleMapsApiKey) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log('\n\n📊 Seeding Summary:');
  console.log(`✅ Successfully seeded: ${seededCourts.length} courts`);
  if (failedCourts.length > 0) {
    console.log(`❌ Failed: ${failedCourts.length} courts`);
    console.log('Failed courts:', failedCourts.join(', '));
  }
}

async function main() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'courtmate',
    entities: [__dirname + '/../entities/*.entity{.ts,.js}'],
    synchronize: false,
    logging: false,
  });

  try {
    console.log('📦 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    await seedJacksonvilleCourts(dataSource);

    console.log('\n✨ Jacksonville courts seeded successfully!');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

main();

