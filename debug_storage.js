require('dotenv').config();
const supabase = require('./api/src/config/supabase');

async function checkStorage() {
    console.log('Checking Supabase Storage...');

    try {
        // List buckets
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('Error listing buckets:', error);
            return;
        }

        console.log('Buckets found:', buckets.map(b => b.name));

        const documentsBucket = buckets.find(b => b.name === 'documents');

        if (!documentsBucket) {
            console.log('Bucket "documents" NOT found. Attempting to create...');
            const { data, error: createError } = await supabase.storage.createBucket('documents', {
                public: true
            });

            if (createError) {
                console.error('Error creating bucket:', createError);
            } else {
                console.log('Bucket "documents" created successfully!');
            }
        } else {
            console.log('Bucket "documents" exists.');
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkStorage();
