
require('./api/src/config');
const supabase = require('./api/src/config/supabase');

async function testCheckFirstUser() {
    console.log('Testing /auth/check-first-user logic...');
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .limit(1);

        if (error) {
            console.error('Supabase Error:', error);
        } else {
            console.log('Supabase Success. Data:', data);
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testCheckFirstUser();
