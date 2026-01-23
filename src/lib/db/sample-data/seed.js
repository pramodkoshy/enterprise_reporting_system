/**
 * Sample Database Seeder
 * Generates realistic enterprise data for reporting.sqlite
 */

const Database = require('better-sqlite3');
const path = require('path');
const { readFileSync } = require('fs');

const db = new Database(path.join(__dirname, 'reporting.sqlite'));
db.pragma('journal_mode = WAL');

// Read and execute schema
const schema = readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schema);

// Helper to generate random dates
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Helper to pick random item
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

console.log('Starting database seed...');

// 1. Regions (10 records)
console.log('Inserting regions...');
const regions = [];
const regionData = [
  { name: 'North America', code: 'NA', country: 'United States' },
  { name: 'Europe West', code: 'EUW', country: 'Germany' },
  { name: 'Europe East', code: 'EUE', country: 'Poland' },
  { name: 'Asia Pacific', code: 'APAC', country: 'Singapore' },
  { name: 'Latin America', code: 'LATAM', country: 'Brazil' },
  { name: 'Middle East', code: 'ME', country: 'UAE' },
  { name: 'Africa', code: 'AFR', country: 'South Africa' },
  { name: 'East Asia', code: 'EA', country: 'Japan' },
  { name: 'South Asia', code: 'SA', country: 'India' },
  { name: 'Oceania', code: 'OC', country: 'Australia' }
];

const insertRegion = db.prepare('INSERT INTO regions (name, code, country) VALUES (?, ?, ?)');
for (const region of regionData) {
  const info = insertRegion.run(region.name, region.code, region.country);
  regions.push({ id: info.lastInsertRowid, ...region });
}

// 2. Departments (15 records)
console.log('Inserting departments...');
const departments = [];
const departmentData = [
  { name: 'Sales', code: 'SAL', description: 'Sales and Business Development', budget: 5000000 },
  { name: 'Marketing', code: 'MKT', description: 'Marketing and Communications', budget: 3000000 },
  { name: 'Engineering', code: 'ENG', description: 'Product Engineering', budget: 8000000 },
  { name: 'Operations', code: 'OPS', description: 'Operations and Logistics', budget: 4000000 },
  { name: 'Finance', code: 'FIN', description: 'Finance and Accounting', budget: 2000000 },
  { name: 'Human Resources', code: 'HR', description: 'Human Resources', budget: 1500000 },
  { name: 'Customer Support', code: 'CS', description: 'Customer Success', budget: 2500000 },
  { name: 'Research & Development', code: 'RND', description: 'R&D', budget: 6000000 },
  { name: 'Quality Assurance', code: 'QA', description: 'QA and Testing', budget: 1800000 },
  { name: 'Legal', code: 'LEG', description: 'Legal Department', budget: 1200000 },
  { name: 'IT', code: 'IT', description: 'Information Technology', budget: 3500000 },
  { name: 'Procurement', code: 'PUR', description: 'Purchasing', budget: 1000000 },
  { name: 'Warehousing', code: 'WH', description: 'Warehouse Management', budget: 2000000 },
  { name: 'Logistics', code: 'LOG', description: 'Shipping and Distribution', budget: 2800000 },
  { name: 'Product Management', code: 'PM', description: 'Product Management', budget: 1500000 }
];

const insertDept = db.prepare('INSERT INTO departments (name, code, description, budget) VALUES (?, ?, ?, ?)');
for (const dept of departmentData) {
  const info = insertDept.run(dept.name, dept.code, dept.description, dept.budget);
  departments.push({ id: info.lastInsertRowid, ...dept, manager_id: null });
}

// 3. Employees (10,000 records)
console.log('Inserting 10,000 employees...');
const employees = [];
const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa', 'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley', 'Steven', 'Dorothy', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle', 'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Melissa', 'George', 'Deborah', 'Edward', 'Stephanie', 'Ronald', 'Rebecca', 'Timothy', 'Sharon', 'Jason', 'Laura', 'Jeffrey', 'Cynthia', 'Ryan', 'Kathleen', 'Jacob', 'Amy', 'Gary', 'Shirley', 'Nicholas', 'Angela', 'Eric', 'Helen', 'Jonathan', 'Anna', 'Stephen', 'Brenda', 'Larry', 'Pamela', 'Justin', 'Nicole', 'Scott', 'Emma', 'Brandon', 'Samantha', 'Benjamin', 'Katherine', 'Samuel', 'Christine', 'Gregory', 'Debra', 'Frank', 'Rachel', 'Alexander', 'Carolyn', 'Raymond', 'Janet', 'Patrick', 'Catherine', 'Jack', 'Maria', 'Dennis', 'Heather'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'];

const insertEmp = db.prepare('INSERT INTO employees (first_name, last_name, email, phone, hire_date, salary, department_id, manager_id, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const empMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const firstName = pickRandom(firstNames);
    const lastName = pickRandom(lastNames);
    const dept = pickRandom(departments);
    const hireDate = randomDate(new Date(2015, 0, 1), new Date(2024, 11, 31));
    const salary = 45000 + Math.floor(Math.random() * 150000);

    const email = firstName.toLowerCase() + '.' + lastName.toLowerCase() + i + '@company.com';
    const phone = '+1' + (Math.floor(Math.random() * 9000000000 + 1000000000));

    const info = insertEmp.run(
      firstName,
      lastName,
      email,
      phone,
      formatDate(hireDate),
      salary,
      dept.id,
      null,
      1
    );
    employees.push({
      id: info.lastInsertRowid,
      firstName,
      lastName,
      email,
      department_id: dept.id,
      manager_id: null
    });
  }
});
empMany(10000);

// Assign managers (first 100 employees as managers)
console.log('Assigning managers...');
const updateManager = db.prepare('UPDATE employees SET manager_id = ? WHERE id = ?');
const managers = employees.slice(0, 100);
for (let i = 100; i < employees.length; i++) {
  const manager = pickRandom(managers);
  updateManager.run(manager.id, employees[i].id);
}

// Update department managers
for (const dept of departments) {
  const deptEmployees = employees.filter(e => e.department_id === dept.id);
  if (deptEmployees.length > 0) {
    const manager = deptEmployees[Math.floor(Math.random() * Math.min(10, deptEmployees.length))];
    db.prepare('UPDATE departments SET manager_id = ? WHERE id = ?').run(manager.id, dept.id);
  }
}

// 4. Warehouses (20 records)
console.log('Inserting warehouses...');
const warehouses = [];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington'];
const insertWh = db.prepare('INSERT INTO warehouses (name, code, address, city, region_id, manager_id, capacity) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (let i = 0; i < 20; i++) {
  const region = pickRandom(regions);
  const manager = pickRandom(employees.filter(e => e.department_id === departments.find(d => d.name === 'Warehousing')?.id));
  const code = 'WH' + String(i + 1).padStart(3, '0');
  const info = insertWh.run(
    'Warehouse ' + (i + 1),
    code,
    String(Math.floor(Math.random() * 9999)) + ' ' + cities[i] + ' St',
    cities[i],
    region.id,
    manager ? manager.id : null,
    50000 + Math.floor(Math.random() * 100000)
  );
  warehouses.push({ id: info.lastInsertRowid, code });
}

// 5. Categories (30 records)
console.log('Inserting categories...');
const categories = [];
const categoryData = [
  { name: 'Electronics', code: 'ELEC', parent: null },
  { name: 'Computers', code: 'COMP', parent: 'Electronics' },
  { name: 'Laptops', code: 'LAPT', parent: 'Computers' },
  { name: 'Desktops', code: 'DESK', parent: 'Computers' },
  { name: 'Tablets', code: 'TABL', parent: 'Computers' },
  { name: 'Phones', code: 'PHON', parent: 'Electronics' },
  { name: 'Smartphones', code: 'SMAR', parent: 'Phones' },
  { name: 'Accessories', code: 'ACCE', parent: 'Electronics' },
  { name: 'Furniture', code: 'FURN', parent: null },
  { name: 'Office Furniture', code: 'OFFI', parent: 'Furniture' },
  { name: 'Chairs', code: 'CHAI', parent: 'Office Furniture' },
  { name: 'Desks', code: 'DESK2', parent: 'Office Furniture' },
  { name: 'Storage', code: 'STOR', parent: 'Furniture' },
  { name: 'Supplies', code: 'SUPP', parent: null },
  { name: 'Paper', code: 'PAPER', parent: 'Supplies' },
  { name: 'Writing Instruments', code: 'WRIT', parent: 'Supplies' },
  { name: 'Office Supplies', code: 'OFFS', parent: 'Supplies' },
  { name: 'Industrial', code: 'INDU', parent: null },
  { name: 'Tools', code: 'TOOL', parent: 'Industrial' },
  { name: 'Safety Equipment', code: 'SAFE', parent: 'Industrial' },
  { name: 'Materials', code: 'MATE', parent: 'Industrial' },
  { name: 'Technology', code: 'TECH', parent: null },
  { name: 'Software', code: 'SOFT', parent: 'Technology' },
  { name: 'Hardware', code: 'HARD', parent: 'Technology' },
  { name: 'Networking', code: 'NETW', parent: 'Technology' },
  { name: 'Appliances', code: 'APPL', parent: null },
  { name: 'Kitchen', code: 'KITC', parent: 'Appliances' },
  { name: 'Laundry', code: 'LAUN', parent: 'Appliances' },
  { name: 'Cleaning', code: 'CLEA', parent: 'Supplies' }
];

const insertCat = db.prepare('INSERT INTO categories (name, code, description, parent_id) VALUES (?, ?, ?, ?)');
for (const cat of categoryData) {
  const parent = cat.parent ? categories.find(c => c.name === cat.parent) : null;
  const info = insertCat.run(cat.name, cat.code, cat.name + ' and related products', parent ? parent.id : null);
  categories.push({ id: info.lastInsertRowid, name: cat.name, code: cat.code });
}

// 6. Suppliers (100 records)
console.log('Inserting 100 suppliers...');
const suppliers = [];
const supplierNames = ['Acme Corp', 'Global Supplies Inc', 'TechParts Ltd', 'Office Essentials', 'Industrial Tools Co', 'Pacific Trading', 'Atlantic Distributors', 'Mountain Products', 'Valley Goods', 'City Supplies', 'Metro Distribution', 'Universal Traders', 'Premium Goods', 'Standard Supplies', 'Elite Products', 'Prime Materials', 'FastTrack Inc', 'QuickDelivery Co', 'Reliable Parts', 'Quality First Inc', 'Value Plus Inc', 'Budget Supplies', 'Economy Goods', 'Discount Traders', 'Wholesale Direct', 'Bulk Suppliers', 'Master Distribution', 'ProSource Inc', 'Expert Supplies', 'Specialist Products'];
const insertSupp = db.prepare('INSERT INTO suppliers (name, code, contact_person, email, phone, address, city, region_id, rating) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
for (let i = 0; i < 100; i++) {
  const name = i < supplierNames.length ? supplierNames[i] : supplierNames[i % supplierNames.length] + ' ' + i;
  const region = pickRandom(regions);
  const contactPerson = pickRandom(firstNames) + ' ' + pickRandom(lastNames);
  const code = 'SUP' + String(i + 1).padStart(4, '0');
  const info = insertSupp.run(
    name,
    code,
    contactPerson,
    'contact@supplier' + i + '.com',
    '+1' + (Math.floor(Math.random() * 9000000000 + 1000000000)),
    String(Math.floor(Math.random() * 9999)) + ' Supplier St',
    pickRandom(cities),
    region.id,
    3 + Math.floor(Math.random() * 3)
  );
  suppliers.push({ id: info.lastInsertRowid });
}

// 7. Products (5,000 records)
console.log('Inserting 5,000 products...');
const products = [];
const productAdjectives = ['Professional', 'Premium', 'Standard', 'Deluxe', 'Basic', 'Advanced', 'Essential', 'Elite', 'Master', 'Expert', 'Industrial', 'Commercial', 'Digital', 'Smart', 'Portable', 'Compact', 'Heavy Duty', 'Lightweight', 'Wireless', 'Automatic'];
const productNouns = ['System', 'Device', 'Unit', 'Kit', 'Set', 'Package', 'Station', 'Center', 'Hub', 'Module', 'Processor', 'Controller', 'Monitor', 'Display', 'Terminal', 'Interface', 'Adapter', 'Connector', 'Cable', 'Assembly'];

const insertProd = db.prepare('INSERT INTO products (name, code, description, category_id, supplier_id, unit_price, cost_price, unit, weight, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const prodMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const category = pickRandom(categories);
    const supplier = pickRandom(suppliers);
    const adj = pickRandom(productAdjectives);
    const noun = pickRandom(productNouns);
    const unitPrice = 10 + Math.random() * 5000;
    const costPrice = unitPrice * (0.4 + Math.random() * 0.3);

    const info = insertProd.run(
      adj + ' ' + noun + ' ' + i,
      'PRD' + String(i + 1).padStart(5, '0'),
      'High-quality ' + adj.toLowerCase() + ' ' + noun.toLowerCase() + ' for professional use',
      category.id,
      supplier.id,
      unitPrice.toFixed(2),
      costPrice.toFixed(2),
      pickRandom(['pcs', 'kg', 'liters', 'meters', 'units']),
      (0.1 + Math.random() * 50).toFixed(2),
      1
    );
    products.push({ id: info.lastInsertRowid });
  }
});
prodMany(5000);

// 8. Customers (10,000 records)
console.log('Inserting 10,000 customers...');
const customers = [];
const companySuffixes = ['Inc', 'LLC', 'Corp', 'Ltd', 'Co', 'Group', 'Partners', 'Solutions', 'Systems', 'Services', 'Industries', 'International', 'Associates', 'Enterprises', 'Dynamics'];

const insertCust = db.prepare('INSERT INTO customers (name, code, email, phone, address, city, region_id, credit_limit, tier, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const custMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const companyName = pickRandom(firstNames) + ' ' + pickRandom(lastNames) + ' ' + pickRandom(companySuffixes);
    const region = pickRandom(regions);
    const creditLimit = 10000 + Math.floor(Math.random() * 100000);
    const tier = creditLimit > 80000 ? 'premium' : creditLimit > 40000 ? 'gold' : creditLimit > 20000 ? 'silver' : 'standard';

    const info = insertCust.run(
      companyName,
      'CUST' + String(i + 1).padStart(5, '0'),
      'contact@customer' + i + '.com',
      '+1' + (Math.floor(Math.random() * 9000000000 + 1000000000)),
      String(Math.floor(Math.random() * 9999)) + ' Customer Ave',
      pickRandom(cities),
      region.id,
      creditLimit,
      tier,
      1
    );
    customers.push({ id: info.lastInsertRowid });
  }
});
custMany(10000);

// 9. Inventory (50,000 records)
console.log('Inserting 50,000 inventory items...');
const insertInv = db.prepare('INSERT INTO inventory (product_id, warehouse_id, quantity, reorder_level, max_stock, last_restocked) VALUES (?, ?, ?, ?, ?, ?)');
const invMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const product = pickRandom(products);
    const warehouse = pickRandom(warehouses);
    const quantity = Math.floor(Math.random() * 5000);
    const lastRestocked = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));

    try {
      insertInv.run(
        product.id,
        warehouse.id,
        quantity,
        10 + Math.floor(Math.random() * 100),
        500 + Math.floor(Math.random() * 2000),
        formatDate(lastRestocked)
      );
    } catch (e) {
      // Skip duplicates
    }
  }
});
invMany(50000);

// 10. Orders (10,000 records)
console.log('Inserting 10,000 orders...');
const orders = [];
const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
const insertOrd = db.prepare('INSERT INTO orders (order_number, customer_id, order_date, required_date, shipment_date, status, total_amount, discount_percent, tax_amount, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const ordMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const customer = pickRandom(customers);
    const orderDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
    const requiredDate = new Date(orderDate.getTime() + (7 + Math.floor(Math.random() * 14)) * 24 * 60 * 60 * 1000);
    const status = pickRandom(statuses);
    const totalAmount = 100 + Math.random() * 50000;
    const discountPercent = Math.random() * 15;
    const taxAmount = totalAmount * 0.08;

    const shipmentDate = (status === 'delivered' || status === 'shipped')
      ? new Date(orderDate.getTime() + (1 + Math.floor(Math.random() * 5)) * 24 * 60 * 60 * 1000)
      : null;

    const info = insertOrd.run(
      'ORD' + String(i + 1).padStart(6, '0'),
      customer.id,
      formatDate(orderDate),
      formatDate(requiredDate),
      shipmentDate ? formatDate(shipmentDate) : null,
      status,
      totalAmount.toFixed(2),
      discountPercent.toFixed(2),
      taxAmount.toFixed(2),
      'Order notes ' + i,
      pickRandom(employees).id
    );
    orders.push({ id: info.lastInsertRowid });
  }
});
ordMany(10000);

// 11. Order Items (50,000 records)
console.log('Inserting 50,000 order items...');
const insertOrdItem = db.prepare('INSERT INTO order_items (order_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)');
const ordItemMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const order = pickRandom(orders);
    const product = pickRandom(products);
    const quantity = 1 + Math.floor(Math.random() * 100);
    const unitPrice = 10 + Math.random() * 1000;
    const discountPercent = Math.random() * 10;
    const totalPrice = quantity * unitPrice * (1 - discountPercent / 100);

    insertOrdItem.run(
      order.id,
      product.id,
      quantity,
      unitPrice.toFixed(2),
      discountPercent.toFixed(2),
      totalPrice.toFixed(2)
    );
  }
});
ordItemMany(50000);

// 12. Sales (10,000 records)
console.log('Inserting 10,000 sales...');
const sales = [];
const paymentMethods = ['credit_card', 'debit_card', 'wire_transfer', 'check', 'cash'];
const insertSale = db.prepare('INSERT INTO sales (sale_number, customer_id, sale_date, status, total_amount, discount_amount, tax_amount, paid_amount, payment_method, salesperson_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const saleMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const customer = pickRandom(customers);
    const saleDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
    const totalAmount = 50 + Math.random() * 30000;
    const discountAmount = Math.random() * 2000;
    const taxAmount = totalAmount * 0.08;
    const paidAmount = totalAmount - discountAmount + taxAmount;

    const info = insertSale.run(
      'SALE' + String(i + 1).padStart(6, '0'),
      customer.id,
      formatDate(saleDate),
      'completed',
      totalAmount.toFixed(2),
      discountAmount.toFixed(2),
      taxAmount.toFixed(2),
      paidAmount.toFixed(2),
      pickRandom(paymentMethods),
      pickRandom(employees).id
    );
    sales.push({ id: info.lastInsertRowid });
  }
});
saleMany(10000);

// 13. Sale Items (50,000 records)
console.log('Inserting 50,000 sale items...');
const insertSaleItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?)');
const saleItemMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const sale = pickRandom(sales);
    const product = pickRandom(products);
    const quantity = 1 + Math.floor(Math.random() * 50);
    const unitPrice = 10 + Math.random() * 1000;
    const discountPercent = Math.random() * 15;
    const totalPrice = quantity * unitPrice * (1 - discountPercent / 100);

    insertSaleItem.run(
      sale.id,
      product.id,
      quantity,
      unitPrice.toFixed(2),
      discountPercent.toFixed(2),
      totalPrice.toFixed(2)
    );
  }
});
saleItemMany(50000);

// 14. Invoices (8,000 records)
console.log('Inserting 8,000 invoices...');
const invoices = [];
const invStatuses = ['pending', 'paid', 'overdue', 'cancelled'];
const insertInvoiceHead = db.prepare('INSERT INTO invoices (invoice_number, customer_id, invoice_date, due_date, status, subtotal, tax_amount, discount_amount, total_amount, paid_amount, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const invoiceMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const customer = pickRandom(customers);
    const invoiceDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
    const dueDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const status = pickRandom(invStatuses);
    const subtotal = 100 + Math.random() * 20000;
    const taxAmount = subtotal * 0.08;
    const discountAmount = Math.random() * 1000;
    const totalAmount = subtotal + taxAmount - discountAmount;
    const paidAmount = status === 'paid' ? totalAmount : status === 'pending' ? Math.random() * totalAmount : 0;

    const info = insertInvoiceHead.run(
      'INV' + String(i + 1).padStart(6, '0'),
      customer.id,
      formatDate(invoiceDate),
      formatDate(dueDate),
      status,
      subtotal.toFixed(2),
      taxAmount.toFixed(2),
      discountAmount.toFixed(2),
      totalAmount.toFixed(2),
      paidAmount.toFixed(2),
      'Invoice ' + i + ' notes'
    );
    invoices.push({ id: info.lastInsertRowid });
  }
});
invoiceMany(8000);

// 15. Invoice Items (30,000 records)
console.log('Inserting 30,000 invoice items...');
const insertInvoiceItem = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, tax_rate, discount_percent, total_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const invoiceItemMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const invoice = pickRandom(invoices);
    const product = pickRandom(products);
    const quantity = 1 + Math.random() * 50;
    const unitPrice = 10 + Math.random() * 1000;
    const taxRate = 8;
    const discountPercent = Math.random() * 10;
    const totalPrice = quantity * unitPrice * (1 + taxRate / 100) * (1 - discountPercent / 100);

    insertInvoiceItem.run(
      invoice.id,
      product.id,
      'Line item ' + i,
      quantity,
      unitPrice.toFixed(2),
      taxRate.toFixed(2),
      discountPercent.toFixed(2),
      totalPrice.toFixed(2)
    );
  }
});
invoiceItemMany(30000);

// 16. Payments (12,000 records)
console.log('Inserting 12,000 payments...');
const insertPay = db.prepare('INSERT INTO payments (payment_number, customer_id, invoice_id, payment_date, amount, payment_method, reference, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
const payMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const customer = pickRandom(customers);
    const invoice = pickRandom(invoices);
    const paymentDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
    const amount = 100 + Math.random() * 15000;

    insertPay.run(
      'PAY' + String(i + 1).padStart(6, '0'),
      customer.id,
      invoice.id,
      formatDate(paymentDate),
      amount.toFixed(2),
      pickRandom(paymentMethods),
      'REF' + i,
      'Payment ' + i + ' notes'
    );
  }
});
payMany(12000);

// 17. Shipments (8,000 records)
console.log('Inserting 8,000 shipments...');
const carriers = ['FedEx', 'UPS', 'DHL', 'USPS', 'OnTrac', 'Amazon Logistics', 'LTL Freight'];
const shipmentStatuses = ['pending', 'in_transit', 'delivered', 'failed'];
const insertShip = db.prepare('INSERT INTO shipments (shipment_number, order_id, warehouse_id, ship_date, expected_date, delivery_date, carrier, tracking_number, status, shipping_cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const shipMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const order = pickRandom(orders);
    const warehouse = pickRandom(warehouses);
    const shipDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
    const expectedDate = new Date(shipDate.getTime() + (3 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000);
    const status = pickRandom(shipmentStatuses);
    const deliveryDate = status === 'delivered'
      ? new Date(shipDate.getTime() + (1 + Math.floor(Math.random() * 7)) * 24 * 60 * 60 * 1000)
      : null;

    insertShip.run(
      'SHP' + String(i + 1).padStart(6, '0'),
      order.id,
      warehouse.id,
      formatDate(shipDate),
      formatDate(expectedDate),
      deliveryDate ? formatDate(deliveryDate) : null,
      pickRandom(carriers),
      'TRK' + Math.random().toString(36).substring(2, 15).toUpperCase(),
      status,
      (10 + Math.random() * 200).toFixed(2),
      'Shipment ' + i + ' notes'
    );
  }
});
shipMany(8000);

// 18. Sales Targets (1,200 records - 100 employees × 12 months)
console.log('Inserting 1,200 sales targets...');
const insertTarget = db.prepare('INSERT INTO sales_targets (employee_id, year, month, target_amount, achieved_amount) VALUES (?, ?, ?, ?, ?)');
const salesDeptId = departments.find(d => d.name === 'Sales')?.id;
const salesEmployees = employees.filter(e => e.department_id === salesDeptId).slice(0, 100);
const targetMany = db.transaction(() => {
  for (const employee of salesEmployees) {
    for (let year = 2023; year <= 2024; year++) {
      for (let month = 1; month <= 12; month++) {
        const targetAmount = 20000 + Math.random() * 80000;
        const achievedAmount = Math.random() * targetAmount * 1.2;

        try {
          insertTarget.run(
            employee.id,
            year,
            month,
            targetAmount.toFixed(2),
            achievedAmount.toFixed(2)
          );
        } catch (e) {
          // Skip duplicates
        }
      }
    }
  }
});
targetMany();

// 19. Expenses (3,000 records)
console.log('Inserting 3,000 expenses...');
const expenseCategories = ['Travel', 'Meals', 'Office Supplies', 'Software', 'Equipment', 'Training', 'Marketing', 'Entertainment', 'Utilities', 'Maintenance'];
const expenseStatuses = ['pending', 'approved', 'rejected'];
const insertExp = db.prepare('INSERT INTO expenses (expense_number, department_id, category, description, amount, expense_date, status, submitted_by, approved_by, approved_at, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const expMany = db.transaction((count) => {
  for (let i = 0; i < count; i++) {
    const department = pickRandom(departments);
    const expenseDate = randomDate(new Date(2023, 0, 1), new Date(2024, 11, 31));
    const status = pickRandom(expenseStatuses);
    const amount = 50 + Math.random() * 5000;
    const submittedBy = pickRandom(employees);
    const approvedBy = status === 'approved' ? pickRandom(employees.filter(e => e.id !== submittedBy.id)) : null;
    const approvedAt = approvedBy ? new Date(expenseDate.getTime() + Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000) : null;

    insertExp.run(
      'EXP' + String(i + 1).padStart(6, '0'),
      department.id,
      pickRandom(expenseCategories),
      pickRandom(expenseCategories) + ' expense ' + i,
      amount.toFixed(2),
      formatDate(expenseDate),
      status,
      submittedBy.id,
      approvedBy ? approvedBy.id : null,
      approvedAt ? approvedAt.toISOString() : null,
      'Expense ' + i + ' notes'
    );
  }
});
expMany(3000);

// 20. Budgets (360 records - 15 departments × 2 years × 12 categories)
console.log('Inserting 360 budgets...');
const budgetCategories = ['Operations', 'Personnel', 'Marketing', 'R&D', 'IT', 'Training', 'Travel', 'Equipment', 'Supplies', 'Maintenance', 'Legal', 'Consulting'];
const insertBudg = db.prepare('INSERT INTO budgets (department_id, fiscal_year, category, allocated_amount, spent_amount, status) VALUES (?, ?, ?, ?, ?, ?)');
const budgMany = db.transaction(() => {
  for (const department of departments) {
    for (let year = 2023; year <= 2024; year++) {
      for (const category of budgetCategories) {
        const allocatedAmount = 50000 + Math.random() * 500000;
        const spentAmount = Math.random() * allocatedAmount;

        try {
          insertBudg.run(
            department.id,
            year,
            category,
            allocatedAmount.toFixed(2),
            spentAmount.toFixed(2),
            'active'
          );
        } catch (e) {
          // Skip duplicates
        }
      }
    }
  }
});
budgMany();

console.log('Database seeded successfully!');
console.log('Record counts:');

const tables = ['regions', 'departments', 'employees', 'warehouses', 'categories', 'suppliers', 'products', 'customers', 'inventory', 'orders', 'order_items', 'sales', 'sale_items', 'invoices', 'invoice_items', 'payments', 'shipments', 'sales_targets', 'expenses', 'budgets'];

for (const table of tables) {
  const count = db.prepare('SELECT COUNT(*) as count FROM ' + table).get();
  console.log('  ' + table + ': ' + count.count);
}

db.close();
console.log('Done!');
