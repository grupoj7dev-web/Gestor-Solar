require('dotenv').config({ path: './.env' });
const supabase = require('./api/src/config/supabase');

async function checkUsers() {
    try {
        console.log('Checking users table...');
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error fetching users:', error);
        } else {
            console.log('Users table columns:', data.length > 0 ? Object.keys(data[0]) : 'No users found');
            console.log('Sample user:', data[0]);
        }

        console.log('\nChecking employees table...');
        const { data: empData, error: empError } = await supabase
            .from('employees')
            .select('*')
            .limit(1);

        if (empError) {
            console.error('Error fetching employees:', empError);
        } else {
            console.log('Employees table columns:', empData.length > 0 ? Object.keys(empData[0]) : 'No employees found');
            console.log('Sample employee:', empData[0]);
        }

    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

checkUsers();
