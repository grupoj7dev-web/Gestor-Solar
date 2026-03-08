require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetPassword() {
    try {
        const email = 'jheferson@gmail.com';
        const newPassword = 'admin123';

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        const { data, error } = await supabase
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('email', email)
            .select()
            .single();

        if (error) {
            console.error('Error updating password:', error);
            return;
        }

        console.log('\n✅ Password reset successfully!');
        console.log('\n📧 Email:', email);
        console.log('🔑 New Password:', newPassword);
        console.log('\n⚠️  Please change the password after login!');

    } catch (error) {
        console.error('Error:', error);
    }
}

resetPassword();
