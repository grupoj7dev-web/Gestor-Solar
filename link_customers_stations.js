require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { SolarmanClient } = require('./api/src/solarmanClient');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const client = new SolarmanClient();

// Normalize string for comparison
function normalize(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .trim();
}

// Calculate similarity between two strings
function similarity(s1, s2) {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = levenshtein(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

// Levenshtein distance
function levenshtein(s1, s2) {
    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
}

async function linkCustomersToStations() {
    console.log('🔗 Starting automatic customer-station linking...\n');

    try {
        // 1. Fetch all stations from Solarman
        console.log('📡 Fetching stations from Solarman...');
        const stationsData = await client.stationListAll({ size: 100 });
        const stations = stationsData.stationList || [];
        console.log(`✅ Found ${stations.length} stations\n`);

        // 2. Fetch all customers from database
        console.log('💾 Fetching customers from database...');
        const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('id, customer_type, full_name, company_name');

        if (customersError) throw customersError;
        console.log(`✅ Found ${customers.length} customers\n`);

        // 3. Fetch existing links
        console.log('🔍 Checking existing links...');
        const { data: existingLinks, error: linksError } = await supabase
            .from('customer_stations')
            .select('station_id, customer_id');

        if (linksError) throw linksError;
        const existingLinkSet = new Set(existingLinks.map(l => `${l.station_id}-${l.customer_id}`));
        console.log(`✅ Found ${existingLinks.length} existing links\n`);

        // 4. Match customers to stations
        console.log('🔎 Matching customers to stations...\n');
        const matches = [];
        const SIMILARITY_THRESHOLD = 0.85; // 85% similarity required

        for (const station of stations) {
            if (!station.ownerName) continue;

            const normalizedOwner = normalize(station.ownerName);
            let bestMatch = null;
            let bestScore = 0;

            for (const customer of customers) {
                const customerName = customer.customer_type === 'pj'
                    ? customer.company_name
                    : customer.full_name;

                if (!customerName) continue;

                const normalizedCustomer = normalize(customerName);
                const score = similarity(normalizedOwner, normalizedCustomer);

                if (score > bestScore && score >= SIMILARITY_THRESHOLD) {
                    bestScore = score;
                    bestMatch = customer;
                }
            }

            if (bestMatch) {
                const linkKey = `${station.id}-${bestMatch.id}`;
                if (!existingLinkSet.has(linkKey)) {
                    matches.push({
                        station_id: station.id,
                        customer_id: bestMatch.id,
                        station_name: station.name,
                        station_owner: station.ownerName,
                        customer_name: bestMatch.customer_type === 'pj' ? bestMatch.company_name : bestMatch.full_name,
                        similarity: bestScore
                    });
                }
            }
        }

        console.log(`✅ Found ${matches.length} new matches\n`);

        if (matches.length === 0) {
            console.log('ℹ️  No new links to create. All stations are already linked or no matches found.');
            return;
        }

        // 5. Display matches for review
        console.log('📋 Matches to be created:\n');
        matches.forEach((match, index) => {
            console.log(`${index + 1}. Station: "${match.station_name}" (Owner: "${match.station_owner}")`);
            console.log(`   → Customer: "${match.customer_name}" (${(match.similarity * 100).toFixed(1)}% match)`);
            console.log('');
        });

        // 6. Create links in database
        console.log('💾 Creating links in database...');
        const linksToInsert = matches.map(m => ({
            station_id: m.station_id,
            customer_id: m.customer_id
        }));

        const { data: insertedLinks, error: insertError } = await supabase
            .from('customer_stations')
            .insert(linksToInsert)
            .select();

        if (insertError) throw insertError;

        console.log(`✅ Successfully created ${insertedLinks.length} links!\n`);
        console.log('🎉 Linking complete!');

    } catch (error) {
        console.error('❌ Error during linking:', error);
        throw error;
    }
}

// Run the script
linkCustomersToStations()
    .then(() => process.exit(0))
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
