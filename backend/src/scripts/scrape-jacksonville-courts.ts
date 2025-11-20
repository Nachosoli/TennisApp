import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

interface CourtInfo {
  name: string;
  address: string;
  courts?: number;
  features?: string[];
  popularity?: string;
}

async function scrapeJacksonvilleCourts(): Promise<CourtInfo[]> {
  const url = 'https://www.jacksonvilletennisleague.com/Jacksonville-Tennis-Courts';
  const courts: CourtInfo[] = [];

  try {
    console.log('🌐 Fetching Jacksonville Tennis League page...');
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    console.log('🔍 Parsing court data...');

    // The website structure may vary, so we need to inspect the HTML
    // Common patterns: tables, lists, divs with court info
    // Let's try multiple selectors

    // Try to find court entries in different ways
    // Pattern 1: Look for heading elements that might contain court names
    $('h2, h3, h4').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      // Check if this looks like a court name
      if (text.includes('Park') || text.includes('Court') || text.includes('Center') || 
          text.includes('Club') || text.includes('Recreation') || text.includes('Tennis')) {
        
        // Get the next sibling elements for address and details
        let address = '';
        let features: string[] = [];
        let courtsCount: number | undefined;
        
        let $next = $elem.next();
        let searchDepth = 0;
        
        while ($next.length && searchDepth < 5) {
          const nextText = $next.text().trim();
          
          // Look for address patterns
          if (nextText.match(/\d+\s+\w+.*Jacksonville.*FL/i)) {
            address = nextText;
          }
          
          // Look for number of courts
          const courtMatch = nextText.match(/(\d+)\s+courts?/i);
          if (courtMatch) {
            courtsCount = parseInt(courtMatch[1]);
          }
          
          // Look for features
          if (nextText.match(/lighted|public|private|clay|hard|surface/i)) {
            features.push(nextText);
          }
          
          $next = $next.next();
          searchDepth++;
        }
        
        if (address || courtsCount) {
          courts.push({
            name: text,
            address: address || `Jacksonville, FL`, // Default to Jacksonville if no specific address
            courts: courtsCount,
            features: features.length > 0 ? features : undefined,
          });
        }
      }
    });

    // Pattern 2: Look for list items
    $('li').each((i, elem) => {
      const $elem = $(elem);
      const text = $elem.text().trim();
      
      // Check if this looks like a court entry
      if ((text.includes('Park') || text.includes('Court') || text.includes('Center')) && 
          text.length > 10 && text.length < 200) {
        
        // Try to extract name and address
        const parts = text.split(/[-–—]/);
        if (parts.length >= 2) {
          courts.push({
            name: parts[0].trim(),
            address: parts[1].trim(),
          });
        }
      }
    });

    // Pattern 3: Look for table rows
    $('table tr').each((i, elem) => {
      const $row = $(elem);
      const cells = $row.find('td');
      
      if (cells.length >= 2) {
        const name = $(cells[0]).text().trim();
        const address = $(cells[1]).text().trim();
        
        if (name && address && (name.includes('Park') || name.includes('Court') || name.includes('Center'))) {
          courts.push({
            name,
            address,
          });
        }
      }
    });

    console.log(`✅ Found ${courts.length} courts`);

    // Remove duplicates
    const uniqueCourts = courts.filter((court, index, self) =>
      index === self.findIndex((c) => c.name === court.name)
    );

    console.log(`✅ Unique courts: ${uniqueCourts.length}`);
    return uniqueCourts;

  } catch (error: any) {
    console.error('❌ Failed to scrape courts:', error.message);
    throw error;
  }
}

async function saveToFile(courts: CourtInfo[]): Promise<void> {
  const outputPath = path.join(__dirname, 'jacksonville-courts.json');
  fs.writeFileSync(outputPath, JSON.stringify(courts, null, 2));
  console.log(`💾 Saved ${courts.length} courts to ${outputPath}`);
}

async function main() {
  try {
    const courts = await scrapeJacksonvilleCourts();
    await saveToFile(courts);
    
    // Print summary
    console.log('\n📊 Summary:');
    console.log(`Total courts: ${courts.length}`);
    console.log('\nSample courts:');
    courts.slice(0, 5).forEach(court => {
      console.log(`  - ${court.name}`);
      console.log(`    ${court.address}`);
      if (court.courts) console.log(`    Courts: ${court.courts}`);
      if (court.features) console.log(`    Features: ${court.features.join(', ')}`);
    });
    
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

main();





