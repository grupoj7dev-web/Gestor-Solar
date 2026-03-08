// Test the specific CPF from the user
function validateCPF(cpf) {
    if (!cpf) return false;

    // Remove non-digits
    cpf = cpf.replace(/\D/g, '');

    console.log('Testing CPF:', cpf);
    console.log('Length:', cpf.length);

    // Check length
    if (cpf.length !== 11) {
        console.log('❌ Invalid length');
        return false;
    }

    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cpf)) {
        console.log('❌ All digits are the same');
        return false;
    }

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;

    console.log('First check digit calculated:', checkDigit);
    console.log('First check digit in CPF:', parseInt(cpf.charAt(9)));

    if (checkDigit !== parseInt(cpf.charAt(9))) {
        console.log('❌ First check digit invalid');
        return false;
    }

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;

    console.log('Second check digit calculated:', checkDigit);
    console.log('Second check digit in CPF:', parseInt(cpf.charAt(10)));

    if (checkDigit !== parseInt(cpf.charAt(10))) {
        console.log('❌ Second check digit invalid');
        return false;
    }

    console.log('✅ CPF is valid!');
    return true;
}

// Test the user's CPF
const userCPF = '710.137.371-21';
console.log('\n=== Testing User CPF ===');
const result = validateCPF(userCPF);
console.log('\nFinal result:', result ? '✅ VALID' : '❌ INVALID');
