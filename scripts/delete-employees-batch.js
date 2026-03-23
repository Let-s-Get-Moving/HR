import pkg from 'pg';
const { Client } = pkg;

const employees = [
  'Abir Ahmet',
  'Ahmed Moustofa',
  'Aisha Rahman',
  'Akbar Tamim',
  'Arefin Hossain',
  'Artem Artamonov',
  'Asif Khan',
  'Azijul Islam',
  'Daniel Azza',
  'Enola Le Goff',
  'Esteban Flores',
  'Fabiha Rahman',
  'Faiyaz Waiz Saad',
  'Ibrahim Khalil',
  'Jamie Serieux',
  'Jason Trottman',
  'Jawad Anjum Neil',
  'John Mades',
  'Josephine Orji',
  'Junaid Shamsi',
  'Lawrence Wasin',
  'Merajul Haque',
  'Mijanur Rahman',
  'Mohammad Hanzala Rafi',
  'Muaz Bin Giash',
  'Nitya Sharma',
  'Omar Ibne Mostafa Raisan',
  'Punmeet Kaur',
  'Raeeda Ahmed',
  'Reethu Ramareddi',
  'Rhona Dizon',
  'Rhythm Kalyan',
  'Said Elmi',
  'Saiyed Mohammad Saadat Ullah',
  'Sawmic Tafazoli',
  'Sayeda Maymona Hasan Aabani',
  'Syed Tahreem Mustafa',
  'Tasnim Hayat Chowdhury',
  'Vanshika Tiwari',
  'Vivian Onyango',
  'Zahin Hossain Molla'
];

async function deleteEmployees() {
  const client = new Client({
    host: 'dpg-d2ngrh75r7bs73fj3uig-a.oregon-postgres.render.com',
    user: 'hr',
    password: 'bv4mVLhdQz9bRQCriS6RN5AiQjFU4AUn',
    database: 'hrcore_42l4',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database\n');
    console.log('Employees to delete:');
    console.log('='.repeat(50));
    employees.forEach((name, idx) => console.log(`${idx + 1}. ${name}`));
    console.log('='.repeat(50));
    console.log(`\nTotal: ${employees.length} employees\n`);

    let deletedCount = 0;
    let notFoundCount = 0;
    const notFound = [];

    for (const fullName of employees) {
      const parts = fullName.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ');

      const empResult = await client.query(
        'SELECT id, first_name, last_name, email FROM employees WHERE first_name = $1 AND last_name = $2',
        [firstName, lastName]
      );

      if (empResult.rowCount > 0) {
        const empId = empResult.rows[0].id;
        
        await client.query('DELETE FROM users WHERE employee_id = $1', [empId]);
        await client.query('DELETE FROM employees WHERE id = $1', [empId]);
        
        deletedCount++;
        console.log(`✓ Deleted: ${fullName} (ID: ${empId})`);
      } else {
        notFoundCount++;
        notFound.push(fullName);
        console.log(`✗ Not found: ${fullName}`);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`Summary:`);
    console.log(`  Deleted: ${deletedCount}`);
    console.log(`  Not found: ${notFoundCount}`);
    console.log('='.repeat(50));

    if (notFound.length > 0) {
      console.log('\nNot found employees:');
      notFound.forEach(name => console.log(`  - ${name}`));
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

deleteEmployees();
