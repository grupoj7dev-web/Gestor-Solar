/**
 * Validation utilities for customer data
 */

/**
 * Validates CPF (Brazilian individual taxpayer ID)
 * @param {string} cpf - CPF to validate (only numbers)
 * @returns {boolean} - True if valid
 */
function validateCPF(cpf) {
    if (!cpf) return false;

    // Remove non-digits
    cpf = cpf.replace(/\D/g, '');

    // Check length
    if (cpf.length !== 11) return false;

    // Check if all digits are the same
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    // Validate first check digit
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;
    if (checkDigit !== parseInt(cpf.charAt(9))) return false;

    // Validate second check digit
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    checkDigit = 11 - (sum % 11);
    if (checkDigit >= 10) checkDigit = 0;
    if (checkDigit !== parseInt(cpf.charAt(10))) return false;

    return true;
}

/**
 * Validates CNPJ (Brazilian company taxpayer ID)
 * @param {string} cnpj - CNPJ to validate (only numbers)
 * @returns {boolean} - True if valid
 */
function validateCNPJ(cnpj) {
    if (!cnpj) return false;

    // Remove non-digits
    cnpj = cnpj.replace(/\D/g, '');

    // Check length
    if (cnpj.length !== 14) return false;

    // Check if all digits are the same
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    // Validate first check digit
    let length = cnpj.length - 2;
    let numbers = cnpj.substring(0, length);
    let digits = cnpj.substring(length);
    let sum = 0;
    let pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;

    // Validate second check digit
    length = length + 1;
    numbers = cnpj.substring(0, length);
    sum = 0;
    pos = length - 7;

    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }

    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;

    return true;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validates phone format (Brazilian)
 * @param {string} phone - Phone to validate (only numbers)
 * @returns {boolean} - True if valid
 */
function validatePhone(phone) {
    if (!phone) return false;

    // Remove non-digits
    phone = phone.replace(/\D/g, '');

    // Check length (10 or 11 digits)
    return phone.length === 10 || phone.length === 11;
}

module.exports = {
    validateCPF,
    validateCNPJ,
    validateEmail,
    validatePhone
};
