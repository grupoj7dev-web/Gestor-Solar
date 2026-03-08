require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('./api/src/config/prisma');

async function createAdmin() {
    try {
        const existingUsers = await prisma.user.findMany();

        console.log('Existing users:', existingUsers);

        const adminUser = existingUsers?.find((u) => u.role === 'admin');
        if (adminUser) {
            console.log('\nAdmin user already exists:');
            console.log('Email:', adminUser.email);
            console.log('Name:', adminUser.name);
            console.log('Role:', adminUser.role);
            console.log('\nIf you forgot the password, you can reset it manually.');
            return;
        }

        const adminEmail = 'admin@solarman.com';
        const adminPassword = 'admin123';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminPassword, salt);

        await prisma.user.create({
            data: {
                name: 'Administrador',
                email: adminEmail,
                passwordHash,
                role: 'admin',
                permissions: {
                    modules: [
                        'dashboard',
                        'operation',
                        'monitoring',
                        'tickets',
                        'clients',
                        'inverters',
                        'branches',
                        'parameters',
                        'employees'
                    ]
                },
                isActive: true
            }
        });

        console.log('\nAdmin user created successfully!');
        console.log('\nEmail:', adminEmail);
        console.log('Password:', adminPassword);
        console.log('\nPlease change the password after first login.');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createAdmin();
