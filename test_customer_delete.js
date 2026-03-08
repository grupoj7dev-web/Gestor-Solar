require('dotenv').config();
const supabase = require('./api/src/config/supabase');

async function testDelete() {
    try {
        // First, get a customer ID to test with
        const { data: customers, error: fetchError } = await supabase
            .from('customers')
            .select('id, full_name, company_name, customer_type')
            .limit(1);

        if (fetchError) {
            console.error('Error fetching customers:', fetchError);
            return;
        }

        if (!customers || customers.length === 0) {
            console.log('No customers found to test deletion');
            return;
        }

        const customer = customers[0];
        const customerId = customer.id;
        const customerName = customer.customer_type === 'pf' ? customer.full_name : customer.company_name;

        console.log('🔍 Testing deletion for customer:');
        console.log('  ID:', customerId);
        console.log('  Name:', customerName);
        console.log('  Type:', customer.customer_type);
        console.log('');

        // Try to delete related records one by one to see which fails
        console.log('Step 1: Deleting customer_inverters...');
        const { error: invError } = await supabase
            .from('customer_inverters')
            .delete()
            .eq('customer_id', customerId);
        if (invError) console.error('❌ Error:', invError);
        else console.log('✅ Success');

        console.log('Step 2: Deleting customer_stations...');
        const { error: stError } = await supabase
            .from('customer_stations')
            .delete()
            .eq('customer_id', customerId);
        if (stError) console.error('❌ Error:', stError);
        else console.log('✅ Success');

        console.log('Step 3: Deleting customer_units...');
        const { error: unitsError } = await supabase
            .from('customer_units')
            .delete()
            .eq('customer_id', customerId);
        if (unitsError) console.error('❌ Error:', unitsError);
        else console.log('✅ Success');

        console.log('Step 4: Deleting customer_contacts...');
        const { error: contactsError } = await supabase
            .from('customer_contacts')
            .delete()
            .eq('customer_id', customerId);
        if (contactsError) console.error('❌ Error:', contactsError);
        else console.log('✅ Success');

        console.log('Step 5: Deleting invoices...');
        const { error: invoicesError } = await supabase
            .from('invoices')
            .delete()
            .eq('customer_id', customerId);
        if (invoicesError) console.error('❌ Error:', invoicesError);
        else console.log('✅ Success');

        console.log('Step 6: Deleting tickets...');
        const { error: ticketsError } = await supabase
            .from('tickets')
            .delete()
            .eq('customer_id', customerId);
        if (ticketsError) console.error('❌ Error:', ticketsError);
        else console.log('✅ Success');

        console.log('Step 7: Deleting auto_ticket_settings...');
        const { error: autoError } = await supabase
            .from('auto_ticket_settings')
            .delete()
            .eq('customer_id', customerId);
        if (autoError) console.error('❌ Error:', autoError);
        else console.log('✅ Success');

        console.log('Step 8: Deleting customer...');
        const { error: customerError } = await supabase
            .from('customers')
            .delete()
            .eq('id', customerId);
        if (customerError) {
            console.error('❌ Error:', customerError);
            console.error('Full error:', JSON.stringify(customerError, null, 2));
        } else {
            console.log('✅ Success - Customer deleted!');
        }

    } catch (error) {
        console.error('💥 Unexpected error:', error);
    }
}

testDelete();
