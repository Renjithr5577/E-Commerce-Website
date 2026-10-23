require('dotenv').config();

const crypto = require('crypto');
const cors = require('cors');
const express = require('express');

const db = require('./db');
const { legacySeedImageUrls, productSeed } = require('./data/product-seed');

const app = express();
const port = Number(process.env.PORT || 3000);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
const legacySeedImageUrlSet = new Set(
  legacySeedImageUrls.map((imageUrl) => String(imageUrl || '').trim()).filter(Boolean)
);

app.use(
  cors({
    origin: frontendUrl
  })
);
app.use(express.json({ limit: '8mb' }));

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function isValidPhone(phone) {
  return /^\d{10}$/.test(String(phone || ''));
}

function formatOrderReference(orderId) {
  const normalizedOrderId = Number(orderId);

  if (!Number.isInteger(normalizedOrderId) || normalizedOrderId <= 0) {
    return '';
  }

  return `LC-${String(normalizedOrderId).padStart(6, '0')}`;
}

function normalizeOrderReference(value) {
  const normalizedValue = String(value || '').trim().toUpperCase().replace(/\s+/g, '');

  if (!normalizedValue) {
    return '';
  }

  if (/^#?\d+$/.test(normalizedValue)) {
    return formatOrderReference(Number(normalizedValue.replace('#', '')));
  }

  const prefixedMatch = normalizedValue.match(/^(?:LC|ORD|ORDER)[-#]?0*(\d+)$/);

  if (prefixedMatch) {
    return formatOrderReference(Number(prefixedMatch[1]));
  }

  return normalizedValue;
}

function isValidOrderReference(orderReference) {
  return /^LC-\d{6}$/.test(String(orderReference || ''));
}

function normalizeSectionName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAdminName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCustomerName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCardholderName(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePasswordHint(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isValidCustomerName(name) {
  return /^[A-Za-z][A-Za-z\s'.-]{2,}$/.test(String(name || ''));
}

function isValidCardholderName(name) {
  return /^[A-Za-z][A-Za-z\s'.-]{1,}$/.test(String(name || ''));
}

function isValidPasswordHint(passwordHint) {
  return normalizePasswordHint(passwordHint).length >= 3;
}

function isValidSectionName(sectionName) {
  return sectionName.length >= 2 && sectionName.length <= 80;
}

function isValidCardExpiry(expiry) {
  return /^(0[1-9]|1[0-2])\/\d{2}$/.test(String(expiry || ''));
}

function normalizeCardBrand(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim() || 'Card';
}

function normalizePaymentCardSnapshot(paymentCard) {
  if (!paymentCard || typeof paymentCard !== 'object') {
    return null;
  }

  const cardNumber = String(paymentCard.cardNumber || '')
    .replace(/\D/g, '')
    .slice(0, 16);
  const last4 = (cardNumber || String(paymentCard.last4 || ''))
    .replace(/\D/g, '')
    .slice(-4);

  return {
    cardHolderName: normalizeCardholderName(paymentCard.cardHolderName),
    cardNumber,
    last4,
    expiry: String(paymentCard.expiry || '')
      .replace(/\s+/g, '')
      .replace(/[^0-9/]/g, '')
      .slice(0, 5),
    brand: normalizeCardBrand(paymentCard.brand)
  };
}

function isValidPaymentCardSnapshot(paymentCard) {
  return (
    Boolean(paymentCard) &&
    isValidCardholderName(paymentCard.cardHolderName) &&
    /^\d{16}$/.test(paymentCard.cardNumber) &&
    /^\d{4}$/.test(paymentCard.last4) &&
    paymentCard.cardNumber.slice(-4) === paymentCard.last4 &&
    isValidCardExpiry(paymentCard.expiry)
  );
}

function buildSeedProductKey(name, category) {
  return `${normalizeSectionName(category).toLowerCase()}|${normalizeSectionName(name).toLowerCase()}`;
}

function shouldRefreshSeedProductImage(currentImageUrl, nextImageUrl) {
  const normalizedCurrentImageUrl = String(currentImageUrl || '').trim();
  const normalizedNextImageUrl = String(nextImageUrl || '').trim();

  if (!normalizedCurrentImageUrl) {
    return true;
  }

  if (!normalizedNextImageUrl || normalizedCurrentImageUrl === normalizedNextImageUrl) {
    return false;
  }

  return (
    legacySeedImageUrlSet.has(normalizedCurrentImageUrl) ||
    normalizedCurrentImageUrl.includes('luxe-cart-seed') ||
    normalizedCurrentImageUrl.includes('crop=focalpoint') ||
    normalizedCurrentImageUrl.includes('fp-x=')
  );
}

function mapStoreSectionRow(section) {
  return {
    ...section,
    id: Number(section.id || 0),
    name: normalizeSectionName(section.name),
    sortOrder: Number(section.sortOrder || 0)
  };
}

function mapAdminAccountRow(account) {
  return {
    id: Number(account.id || 0),
    name: normalizeAdminName(account.name),
    email: normalizeEmail(account.email),
    phone: normalizePhone(account.phone),
    role: String(account.role || 'sub_admin'),
    createdByAdminId:
      account.createdByAdminId === null || account.createdByAdminId === undefined
        ? null
        : Number(account.createdByAdminId),
    createdByEmail: account.createdByEmail ? normalizeEmail(account.createdByEmail) : null,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

function mapAdminCustomerUserRow(customer) {
  return {
    accountId:
      customer.accountId === null || customer.accountId === undefined
        ? null
        : Number(customer.accountId),
    hasAccount: Boolean(Number(customer.hasAccount || 0)),
    name: String(customer.name || '')
      .replace(/\s+/g, ' ')
      .trim(),
    email: normalizeEmail(customer.email),
    phone: normalizePhone(customer.phone),
    latestOrderReference: normalizeOrderReference(customer.latestOrderReference),
    orderCount: Number(customer.orderCount || 0),
    ticketCount: Number(customer.ticketCount || 0),
    openTicketCount: Number(customer.openTicketCount || 0),
    totalSpent: Number(customer.totalSpent || 0),
    accountCreatedAt: customer.accountCreatedAt || null,
    accountUpdatedAt: customer.accountUpdatedAt || null,
    lastOrderAt: customer.lastOrderAt || null,
    lastTicketAt: customer.lastTicketAt || null,
    lastActivityAt: customer.lastActivityAt || null
  };
}

function mapCustomerAccountRow(account) {
  return {
    id: Number(account.id || 0),
    name: normalizeCustomerName(account.name),
    email: normalizeEmail(account.email),
    phone: normalizePhone(account.phone),
    passwordHint: normalizePasswordHint(account.passwordHint),
    createdAt: account.createdAt || '',
    updatedAt: account.updatedAt || ''
  };
}

const adminRoles = new Set(['main_admin', 'sub_admin']);
const supportTicketStatuses = new Set(['open', 'in_progress', 'resolved', 'closed']);
const adminSessions = new Map();
const adminSessionDurationMs = 12 * 60 * 60 * 1000;
const legacyMainAdminEmail = normalizeEmail('renjithr5577@gmail.com');
const mainAdminEmail = normalizeEmail(
  process.env.MAIN_ADMIN_EMAIL || 'admin@gmail.com'
);
const mainAdminPassword = String(process.env.MAIN_ADMIN_PASSWORD || '123456');
const configuredMainAdminPhone = normalizePhone(
  process.env.MAIN_ADMIN_PHONE || '8072178664'
);
const mainAdminPhone = isValidPhone(configuredMainAdminPhone)
  ? configuredMainAdminPhone
  : '8072178664';
const mainAdminName = normalizeAdminName(process.env.MAIN_ADMIN_NAME || 'Renjith R');

function createPasswordSalt() {
  return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password || ''), salt, 64).toString('hex');
}

function isValidAdminPassword(password) {
  return String(password || '').trim().length >= 6;
}

function purgeExpiredAdminSessions() {
  const now = Date.now();

  for (const [token, session] of adminSessions.entries()) {
    if (!session || Number(session.expiresAt || 0) <= now) {
      adminSessions.delete(token);
    }
  }
}

function createAdminSession(account) {
  purgeExpiredAdminSessions();

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + adminSessionDurationMs;

  adminSessions.set(token, {
    adminId: Number(account.id),
    expiresAt
  });

  return {
    token,
    admin: mapAdminAccountRow(account)
  };
}

function getAdminSessionToken(request) {
  const authorizationHeader = String(request.get('authorization') || '').trim();

  if (authorizationHeader.toLowerCase().startsWith('bearer ')) {
    return authorizationHeader.slice(7).trim();
  }

  return String(request.get('x-admin-token') || '').trim();
}

function getActionableTicketCount(rows) {
  return Number(rows[0]?.actionableTicketCount || 0);
}

async function getActionableSupportTicketCount() {
  const [rows] = await db.query(`
    SELECT
      COUNT(*) AS actionableTicketCount
    FROM support_tickets
    WHERE status IN ('open', 'in_progress')
  `);

  return getActionableTicketCount(rows);
}

async function getTableColumnNames(tableName) {
  const [rows] = await db.query(
    `
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
    `,
    [tableName]
  );

  return new Set(rows.map((row) => row.columnName));
}

async function getRuntimeSettingValue(settingKey) {
  const [rows] = await db.query(
    `
      SELECT setting_value AS settingValue
      FROM app_runtime_settings
      WHERE setting_key = ?
      LIMIT 1
    `,
    [settingKey]
  );

  return rows[0] ? String(rows[0].settingValue || '') : null;
}

async function setRuntimeSettingValue(settingKey, settingValue) {
  await db.query(
    `
      INSERT INTO app_runtime_settings (setting_key, setting_value)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE
        setting_value = VALUES(setting_value),
        updated_at = CURRENT_TIMESTAMP
    `,
    [settingKey, settingValue]
  );
}

async function hasUniqueIndexOnColumn(tableName, columnName) {
  const [rows] = await db.query(
    `
      SELECT 1
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
        AND NON_UNIQUE = 0
      LIMIT 1
    `,
    [tableName, columnName]
  );

  return rows.length > 0;
}

async function getSupportTicketColumnNames() {
  const [rows] = await db.query(
    `
      SELECT COLUMN_NAME AS columnName
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'support_tickets'
    `
  );

  return new Set(rows.map((row) => row.columnName));
}

async function ensureRuntimeTables() {
  await db.query('ALTER TABLE products MODIFY COLUMN image_url LONGTEXT NOT NULL');
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_runtime_settings (
      setting_key VARCHAR(120) NOT NULL PRIMARY KEY,
      setting_value TEXT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS store_sections (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      sort_order INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(120) NOT NULL,
      email VARCHAR(140) NOT NULL,
      order_reference VARCHAR(80) NOT NULL DEFAULT '',
      issue_type VARCHAR(60) NOT NULL,
      subject VARCHAR(160) NOT NULL,
      message TEXT NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'open',
      admin_response TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS admin_accounts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(140) NOT NULL UNIQUE,
      phone VARCHAR(20) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      role VARCHAR(40) NOT NULL DEFAULT 'sub_admin',
      created_by_admin_id INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS customer_accounts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(140) NOT NULL UNIQUE,
      phone VARCHAR(20) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      password_salt VARCHAR(64) NOT NULL,
      password_hint VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS card_details (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      account_email VARCHAR(140) NOT NULL,
      cardholder_name VARCHAR(120) NOT NULL,
      card_number VARCHAR(16) NOT NULL,
      expiry VARCHAR(5) NOT NULL,
      card_brand VARCHAR(40) NOT NULL DEFAULT 'Card',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY ux_card_details_account_card (
        account_email,
        card_number,
        expiry,
        cardholder_name
      )
    )
  `);

  const columnNames = await getSupportTicketColumnNames();
  const adminAccountColumnNames = await getTableColumnNames('admin_accounts');
  const customerAccountColumnNames = await getTableColumnNames('customer_accounts');
  const orderColumnNames = await getTableColumnNames('orders');
  const cardDetailColumnNames = await getTableColumnNames('card_details');

  if (!columnNames.has('admin_response')) {
    await db.query('ALTER TABLE support_tickets ADD COLUMN admin_response TEXT NULL AFTER status');
  }

  if (!columnNames.has('updated_at')) {
    await db.query(
      `
        ALTER TABLE support_tickets
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        AFTER created_at
      `
    );
  }

  if (!adminAccountColumnNames.has('phone')) {
    await db.query('ALTER TABLE admin_accounts ADD COLUMN phone VARCHAR(20) NULL AFTER email');
  }

  if (!(await hasUniqueIndexOnColumn('admin_accounts', 'phone'))) {
    await db.query('CREATE UNIQUE INDEX ux_admin_accounts_phone ON admin_accounts (phone)');
  }

  if (!customerAccountColumnNames.has('phone')) {
    await db.query('ALTER TABLE customer_accounts ADD COLUMN phone VARCHAR(20) NULL AFTER email');
  }

  if (!customerAccountColumnNames.has('password_hint')) {
    await db.query(
      "ALTER TABLE customer_accounts ADD COLUMN password_hint VARCHAR(255) NOT NULL DEFAULT '' AFTER password_salt"
    );
  }

  if (!customerAccountColumnNames.has('updated_at')) {
    await db.query(
      `
        ALTER TABLE customer_accounts
        ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        AFTER created_at
      `
    );
  }

  if (!cardDetailColumnNames.has('card_number')) {
    if (cardDetailColumnNames.has('card_last4')) {
      await db.query(
        `
          ALTER TABLE card_details
          CHANGE COLUMN card_last4 card_number VARCHAR(16) NOT NULL
        `
      );
    } else {
      await db.query(
        `
          ALTER TABLE card_details
          ADD COLUMN card_number VARCHAR(16) NOT NULL AFTER cardholder_name
        `
      );
    }
  }

  await db.query('ALTER TABLE card_details MODIFY COLUMN card_number VARCHAR(16) NOT NULL');

  if (!(await hasUniqueIndexOnColumn('customer_accounts', 'phone'))) {
    await db.query('CREATE UNIQUE INDEX ux_customer_accounts_phone ON customer_accounts (phone)');
  }

  if (!orderColumnNames.has('order_reference')) {
    await db.query('ALTER TABLE orders ADD COLUMN order_reference VARCHAR(32) NULL AFTER id');
  }

  await syncExistingOrderReferences();

  if (!(await hasUniqueIndexOnColumn('orders', 'order_reference'))) {
    await db.query('CREATE UNIQUE INDEX ux_orders_order_reference ON orders(order_reference)');
  }
}

async function syncExistingOrderReferences() {
  const [rows] = await db.query(`
    SELECT
      id,
      order_reference AS orderReference
    FROM orders
    ORDER BY id ASC
  `);

  for (const row of rows) {
    const nextOrderReference = formatOrderReference(row.id);

    if (!nextOrderReference || normalizeOrderReference(row.orderReference) === nextOrderReference) {
      continue;
    }

    await db.query(
      `
        UPDATE orders
        SET order_reference = ?
        WHERE id = ?
      `,
      [nextOrderReference, row.id]
    );
  }
}

async function getAdminAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        admin.id,
        admin.name,
        admin.email,
        admin.phone,
        admin.password_hash AS passwordHash,
        admin.password_salt AS passwordSalt,
        admin.role,
        admin.created_by_admin_id AS createdByAdminId,
        creator.email AS createdByEmail,
        admin.created_at AS createdAt,
        admin.updated_at AS updatedAt
      FROM admin_accounts admin
      LEFT JOIN admin_accounts creator ON creator.id = admin.created_by_admin_id
      WHERE LOWER(admin.email) = LOWER(?)
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return rows[0] || null;
}

async function getAdminAccountByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidPhone(normalizedPhone)) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        admin.id,
        admin.name,
        admin.email,
        admin.phone,
        admin.password_hash AS passwordHash,
        admin.password_salt AS passwordSalt,
        admin.role,
        admin.created_by_admin_id AS createdByAdminId,
        creator.email AS createdByEmail,
        admin.created_at AS createdAt,
        admin.updated_at AS updatedAt
      FROM admin_accounts admin
      LEFT JOIN admin_accounts creator ON creator.id = admin.created_by_admin_id
      WHERE admin.phone = ?
      LIMIT 1
    `,
    [normalizedPhone]
  );

  return rows[0] || null;
}

async function getAdminAccountByIdentifier(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier) {
    return null;
  }

  if (normalizedIdentifier.includes('@')) {
    return getAdminAccountByEmail(normalizedIdentifier);
  }

  return getAdminAccountByPhone(normalizedIdentifier);
}

async function getAdminAccountById(adminId) {
  const normalizedAdminId = Number(adminId);

  if (!Number.isInteger(normalizedAdminId) || normalizedAdminId <= 0) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        admin.id,
        admin.name,
        admin.email,
        admin.phone,
        admin.password_hash AS passwordHash,
        admin.password_salt AS passwordSalt,
        admin.role,
        admin.created_by_admin_id AS createdByAdminId,
        creator.email AS createdByEmail,
        admin.created_at AS createdAt,
        admin.updated_at AS updatedAt
      FROM admin_accounts admin
      LEFT JOIN admin_accounts creator ON creator.id = admin.created_by_admin_id
      WHERE admin.id = ?
      LIMIT 1
    `,
    [normalizedAdminId]
  );

  return rows[0] || null;
}

async function getCustomerAccountByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash AS passwordHash,
        password_salt AS passwordSalt,
        password_hint AS passwordHint,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM customer_accounts
      WHERE LOWER(email) = LOWER(?)
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return rows[0] || null;
}

async function getCustomerAccountByPhone(phone) {
  const normalizedPhone = normalizePhone(phone);

  if (!isValidPhone(normalizedPhone)) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash AS passwordHash,
        password_salt AS passwordSalt,
        password_hint AS passwordHint,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM customer_accounts
      WHERE phone = ?
      LIMIT 1
    `,
    [normalizedPhone]
  );

  return rows[0] || null;
}

async function getCustomerAccountByIdentifier(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier) {
    return null;
  }

  if (normalizedIdentifier.includes('@')) {
    return getCustomerAccountByEmail(normalizedIdentifier);
  }

  return getCustomerAccountByPhone(normalizedIdentifier);
}

async function getCustomerAccountById(customerAccountId) {
  const normalizedCustomerAccountId = Number(customerAccountId);

  if (!Number.isInteger(normalizedCustomerAccountId) || normalizedCustomerAccountId <= 0) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        email,
        phone,
        password_hash AS passwordHash,
        password_salt AS passwordSalt,
        password_hint AS passwordHint,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM customer_accounts
      WHERE id = ?
      LIMIT 1
    `,
    [normalizedCustomerAccountId]
  );

  return rows[0] || null;
}

async function getCustomerSavedPaymentCards(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return [];
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        account_email AS accountEmail,
        cardholder_name AS cardHolderName,
        card_number AS cardNumber,
        expiry,
        card_brand AS brand,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM card_details
      WHERE LOWER(account_email) = LOWER(?)
      ORDER BY updated_at DESC, id DESC
    `,
    [normalizedEmail]
  );

  return rows.map((card) => ({
    id: `db-card-${Number(card.id || 0)}`,
    accountEmail: normalizeEmail(card.accountEmail),
    cardHolderName: normalizeCardholderName(card.cardHolderName),
    cardNumber: String(card.cardNumber || '').replace(/\D/g, '').slice(0, 16),
    last4: String(card.cardNumber || '').replace(/\D/g, '').slice(-4),
    expiry: String(card.expiry || '').trim(),
    brand: normalizeCardBrand(card.brand),
    createdAt: String(card.createdAt || ''),
    updatedAt: String(card.updatedAt || '')
  }));
}

async function getAdminAccounts() {
  const [rows] = await db.query(`
    SELECT
      admin.id,
      admin.name,
      admin.email,
      admin.phone,
      admin.role,
      admin.created_by_admin_id AS createdByAdminId,
      creator.email AS createdByEmail,
      admin.created_at AS createdAt,
      admin.updated_at AS updatedAt
    FROM admin_accounts admin
    LEFT JOIN admin_accounts creator ON creator.id = admin.created_by_admin_id
    ORDER BY
      CASE
        WHEN admin.role = 'main_admin' THEN 0
        ELSE 1
      END,
      admin.created_at ASC,
      admin.id ASC
  `);

  return rows.map((account) => mapAdminAccountRow(account));
}

async function getAdminCustomerUsers() {
  const [rows] = await db.query(`
    SELECT
      customer_base.email,
      customer_account.id AS accountId,
      CASE
        WHEN customer_account.id IS NULL THEN 0
        ELSE 1
      END AS hasAccount,
      COALESCE(
        NULLIF(customer_account.name, ''),
        NULLIF((
          SELECT o.customer_name
          FROM orders o
          WHERE LOWER(o.email) = customer_base.email
          ORDER BY o.created_at DESC, o.id DESC
          LIMIT 1
        ), ''),
        NULLIF((
          SELECT t.customer_name
          FROM support_tickets t
          WHERE LOWER(t.email) = customer_base.email
          ORDER BY t.created_at DESC, t.id DESC
          LIMIT 1
        ), ''),
        customer_base.email
      ) AS name,
      COALESCE(
        NULLIF(customer_account.phone, ''),
        COALESCE((
          SELECT o.phone
          FROM orders o
          WHERE LOWER(o.email) = customer_base.email
          ORDER BY o.created_at DESC, o.id DESC
          LIMIT 1
        ), '')
      ) AS phone,
      customer_account.created_at AS accountCreatedAt,
      customer_account.updated_at AS accountUpdatedAt,
      COALESCE((
        SELECT o.order_reference
        FROM orders o
        WHERE LOWER(o.email) = customer_base.email
        ORDER BY o.created_at DESC, o.id DESC
        LIMIT 1
      ), '') AS latestOrderReference,
      COALESCE(order_stats.orderCount, 0) AS orderCount,
      COALESCE(order_stats.totalSpent, 0) AS totalSpent,
      order_stats.lastOrderAt,
      COALESCE(ticket_stats.ticketCount, 0) AS ticketCount,
      COALESCE(ticket_stats.openTicketCount, 0) AS openTicketCount,
      ticket_stats.lastTicketAt,
      CASE
        WHEN order_stats.lastOrderAt IS NULL AND ticket_stats.lastTicketAt IS NULL
          THEN COALESCE(customer_account.updated_at, customer_account.created_at)
        WHEN order_stats.lastOrderAt IS NULL THEN ticket_stats.lastTicketAt
        WHEN ticket_stats.lastTicketAt IS NULL THEN order_stats.lastOrderAt
        WHEN order_stats.lastOrderAt >= ticket_stats.lastTicketAt THEN order_stats.lastOrderAt
        ELSE ticket_stats.lastTicketAt
      END AS lastActivityAt
    FROM (
      SELECT LOWER(email) AS email
      FROM customer_accounts
      UNION
      SELECT LOWER(email) AS email
      FROM orders
      UNION
      SELECT LOWER(email) AS email
      FROM support_tickets
    ) customer_base
    LEFT JOIN customer_accounts customer_account ON LOWER(customer_account.email) = customer_base.email
    LEFT JOIN (
      SELECT
        LOWER(email) AS email,
        COUNT(*) AS orderCount,
        CAST(COALESCE(SUM(total_amount), 0) AS DOUBLE) AS totalSpent,
        MAX(created_at) AS lastOrderAt
      FROM orders
      GROUP BY LOWER(email)
    ) order_stats ON order_stats.email = customer_base.email
    LEFT JOIN (
      SELECT
        LOWER(email) AS email,
        COUNT(*) AS ticketCount,
        SUM(CASE WHEN status IN ('open', 'in_progress') THEN 1 ELSE 0 END) AS openTicketCount,
        MAX(created_at) AS lastTicketAt
      FROM support_tickets
      GROUP BY LOWER(email)
    ) ticket_stats ON ticket_stats.email = customer_base.email
    ORDER BY
      COALESCE(lastActivityAt, customer_account.updated_at, customer_account.created_at) DESC,
      orderCount DESC,
      customer_base.email ASC
  `);

  return rows.map((customer) => mapAdminCustomerUserRow(customer));
}

async function getAdminCustomerUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return null;
  }

  const customerUsers = await getAdminCustomerUsers();
  return customerUsers.find((customer) => customer.email === normalizedEmail) || null;
}

async function getAdminCustomerOrders(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return [];
  }

  const [rows] = await db.query(
    `
      SELECT
        o.id AS orderId,
        o.order_reference AS orderReference,
        o.item_count AS itemCount,
        CAST(o.total_amount AS DOUBLE) AS totalAmount,
        o.status,
        o.created_at AS createdAt,
        COALESCE(oi.product_name, '') AS leadProductName,
        COALESCE(p.category, '') AS leadCategory,
        COALESCE(p.image_url, '') AS leadImageUrl
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
        AND oi.id = (
          SELECT MIN(oi2.id)
          FROM order_items oi2
          WHERE oi2.order_id = o.id
        )
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE LOWER(o.email) = LOWER(?)
      ORDER BY o.created_at DESC, o.id DESC
    `,
    [normalizedEmail]
  );

  return rows.map((order) => ({
    ...order,
    orderId: Number(order.orderId || 0),
    orderReference: normalizeOrderReference(order.orderReference),
    itemCount: Number(order.itemCount || 0),
    totalAmount: Number(order.totalAmount || 0),
    status: String(order.status || '').trim(),
    createdAt: order.createdAt || '',
    leadProductName: String(order.leadProductName || '').trim(),
    leadCategory: String(order.leadCategory || '').trim(),
    leadImageUrl: String(order.leadImageUrl || '').trim()
  }));
}

async function ensureMainAdminAccount() {
  const passwordSalt = createPasswordSalt();
  const passwordHash = hashPassword(mainAdminPassword, passwordSalt);
  const existingConfiguredMainAdmin = await getAdminAccountByEmail(mainAdminEmail);
  let targetMainAdmin = existingConfiguredMainAdmin;

  if (!targetMainAdmin) {
    const [rows] = await db.query(
      `
        SELECT
          id,
          name,
          email,
          phone,
          password_hash AS passwordHash,
          password_salt AS passwordSalt,
          role,
          created_by_admin_id AS createdByAdminId,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM admin_accounts
        WHERE role = 'main_admin'
        ORDER BY id ASC
        LIMIT 1
      `
    );

    targetMainAdmin = rows[0] || null;
  }

  if (targetMainAdmin) {
    await db.query(
      `
        UPDATE admin_accounts
        SET phone = NULL
        WHERE phone = ?
          AND id <> ?
      `,
      [mainAdminPhone, targetMainAdmin.id]
    );

    await db.query(
      `
        UPDATE admin_accounts
        SET
          name = ?,
          email = ?,
          phone = ?,
          password_hash = ?,
          password_salt = ?,
          role = 'main_admin',
          created_by_admin_id = NULL
        WHERE id = ?
      `,
      [mainAdminName, mainAdminEmail, mainAdminPhone, passwordHash, passwordSalt, targetMainAdmin.id]
    );

    await db.query(
      `
        UPDATE admin_accounts
        SET role = 'sub_admin'
        WHERE role = 'main_admin'
          AND id <> ?
      `,
      [targetMainAdmin.id]
    );

    return;
  }

  await db.query(
    `
      UPDATE admin_accounts
      SET phone = NULL
      WHERE phone = ?
    `,
    [mainAdminPhone]
  );

  const [insertResult] = await db.query(
    `
      INSERT INTO admin_accounts (
        name,
        email,
        phone,
        password_hash,
        password_salt,
        role,
        created_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, 'main_admin', NULL)
    `,
    [mainAdminName, mainAdminEmail, mainAdminPhone, passwordHash, passwordSalt]
  );

  await db.query(
    `
      UPDATE admin_accounts
      SET role = 'sub_admin'
      WHERE role = 'main_admin'
        AND id <> ?
    `,
    [insertResult.insertId]
  );
}

async function authenticateAdmin(request, response, next) {
  const token = getAdminSessionToken(request);

  if (!token) {
    response.status(401).json({
      message: 'Admin session missing. Please sign in again.'
    });
    return;
  }

  purgeExpiredAdminSessions();
  const session = adminSessions.get(token);

  if (!session) {
    response.status(401).json({
      message: 'Admin session expired. Please sign in again.'
    });
    return;
  }

  try {
    const adminAccount = await getAdminAccountById(session.adminId);

    if (!adminAccount) {
      adminSessions.delete(token);
      response.status(401).json({
        message: 'Admin account was not found. Please sign in again.'
      });
      return;
    }

    if (!adminRoles.has(String(adminAccount.role))) {
      adminSessions.delete(token);
      response.status(403).json({
        message: 'This admin account does not have a valid role.'
      });
      return;
    }

    request.admin = mapAdminAccountRow(adminAccount);
    request.adminToken = token;
    next();
  } catch (error) {
    next(error);
  }
}

function requireMainAdmin(request, response, next) {
  if (request.admin?.role !== 'main_admin') {
    response.status(403).json({
      message: 'Only the main admin can perform this action.'
    });
    return;
  }

  next();
}

async function getStoreSectionByName(name) {
  const normalizedName = normalizeSectionName(name);

  if (!normalizedName) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        sort_order AS sortOrder
      FROM store_sections
      WHERE LOWER(name) = LOWER(?)
      LIMIT 1
    `,
    [normalizedName]
  );

  return rows[0] ? mapStoreSectionRow(rows[0]) : null;
}

async function getStoreSectionById(sectionId) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        sort_order AS sortOrder
      FROM store_sections
      WHERE id = ?
      LIMIT 1
    `,
    [sectionId]
  );

  return rows[0] ? mapStoreSectionRow(rows[0]) : null;
}

async function getStoreSections() {
  const [rows] = await db.query(`
    SELECT
      id,
      name,
      sort_order AS sortOrder
    FROM store_sections
    ORDER BY sort_order ASC, name ASC
  `);

  return rows.map((section) => mapStoreSectionRow(section));
}

async function ensureStoreSectionExists(name) {
  const normalizedName = normalizeSectionName(name);

  if (!normalizedName) {
    return null;
  }

  const existingSection = await getStoreSectionByName(normalizedName);

  if (existingSection) {
    return existingSection;
  }

  const [maxRows] = await db.query(`
    SELECT COALESCE(MAX(sort_order), 0) AS maxSortOrder
    FROM store_sections
  `);
  const nextSortOrder = Number(maxRows[0]?.maxSortOrder || 0) + 1;
  const [result] = await db.query(
    `
      INSERT INTO store_sections (name, sort_order)
      VALUES (?, ?)
    `,
    [normalizedName, nextSortOrder]
  );

  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        sort_order AS sortOrder
      FROM store_sections
      WHERE id = ?
      LIMIT 1
    `,
    [result.insertId]
  );

  return rows[0] ? mapStoreSectionRow(rows[0]) : null;
}

async function ensureSeedProducts() {
  const [countRows] = await db.query(`
    SELECT COUNT(*) AS productCount
    FROM products
  `);
  const productCount = Number(countRows[0]?.productCount || 0);

  if (productCount > 0) {
    return;
  }

  await db.query(
    `
      INSERT INTO products (name, category, description, image_url, price, rating, stock, featured, badge)
      VALUES ?
    `,
    [
      productSeed.map((product) => [
        product.name,
        product.category,
        product.description,
        product.imageUrl,
        product.price,
        product.rating,
        product.stock,
        product.featured,
        product.badge
      ])
    ]
  );

  console.log(`Seeded ${productSeed.length} catalog products.`);
}

async function migrateSavedPaymentMethodsToCardDetails() {
  const migrationFlagKey = 'saved_payment_methods_to_card_details_complete';
  const isMigrationComplete = await getRuntimeSettingValue(migrationFlagKey);

  if (isMigrationComplete === 'true') {
    return;
  }

  const savedPaymentMethodColumnNames = await getTableColumnNames('saved_payment_methods');

  if (!savedPaymentMethodColumnNames.size) {
    await setRuntimeSettingValue(migrationFlagKey, 'true');
    return;
  }

  const [cardDetailCountRows] = await db.query(`
    SELECT COUNT(*) AS cardDetailCount
    FROM card_details
  `);

  if (Number(cardDetailCountRows[0]?.cardDetailCount || 0) > 0) {
    await setRuntimeSettingValue(migrationFlagKey, 'true');
    return;
  }

  const sourceCardNumberColumn = savedPaymentMethodColumnNames.has('card_number')
    ? 'card_number'
    : 'card_last4';

  await db.query(`
    INSERT INTO card_details (
      account_email,
      cardholder_name,
      card_number,
      expiry,
      card_brand,
      created_at,
      updated_at
    )
    SELECT
      account_email,
      cardholder_name,
      ${sourceCardNumberColumn},
      expiry,
      card_brand,
      created_at,
      updated_at
    FROM saved_payment_methods
    ON DUPLICATE KEY UPDATE
      cardholder_name = VALUES(cardholder_name),
      card_brand = VALUES(card_brand),
      updated_at = VALUES(updated_at)
  `);

  await setRuntimeSettingValue(migrationFlagKey, 'true');
}

async function migrateSeedProductImages() {
  const seededProductImageMap = new Map(
    productSeed.map((product) => [buildSeedProductKey(product.name, product.category), product.imageUrl])
  );
  const [rows] = await db.query(`
    SELECT
      id,
      name,
      category,
      image_url AS imageUrl
    FROM products
  `);
  let updatedCount = 0;

  for (const row of rows) {
    const nextImageUrl = seededProductImageMap.get(buildSeedProductKey(row.name, row.category));

    if (!nextImageUrl || !shouldRefreshSeedProductImage(row.imageUrl, nextImageUrl)) {
      continue;
    }

    await db.query(
      `
        UPDATE products
        SET image_url = ?
        WHERE id = ?
      `,
      [nextImageUrl, row.id]
    );
    updatedCount += 1;
  }

  if (updatedCount) {
    console.log(`Updated ${updatedCount} seeded product images.`);
  }
}

async function syncStoreSectionsFromCatalog() {
  const [productCategoryRows] = await db.query(`
    SELECT DISTINCT TRIM(category) AS name
    FROM products
    WHERE TRIM(category) <> ''
    ORDER BY name ASC
  `);
  const sectionNames = [
    ...new Set(productCategoryRows.map((row) => normalizeSectionName(row.name)).filter(Boolean))
  ];

  for (const sectionName of sectionNames) {
    await ensureStoreSectionExists(sectionName);
  }
}

async function getOrderDetail(orderId) {
  const [orderRows] = await db.query(
    `
      SELECT
        id AS orderId,
        order_reference AS orderReference,
        customer_name AS customerName,
        email,
        phone,
        address_line AS addressLine,
        city,
        state,
        postal_code AS postalCode,
        payment_method AS paymentMethod,
        notes,
        item_count AS itemCount,
        CAST(subtotal AS DOUBLE) AS subtotal,
        CAST(delivery_fee AS DOUBLE) AS deliveryFee,
        CAST(total_amount AS DOUBLE) AS totalAmount,
        status,
        created_at AS createdAt
      FROM orders
      WHERE id = ?
      LIMIT 1
    `,
    [orderId]
  );

  if (!orderRows.length) {
    return null;
  }

  const [itemRows] = await db.query(
    `
      SELECT
        oi.product_id AS productId,
        oi.product_name AS productName,
        p.category,
        p.image_url AS imageUrl,
        oi.quantity,
        CAST(oi.unit_price AS DOUBLE) AS unitPrice,
        CAST(oi.line_total AS DOUBLE) AS lineTotal
      FROM order_items oi
      INNER JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id ASC
    `,
    [orderId]
  );

  const [cardRows] = await db.query(
    `
      SELECT
        cardholder_name AS cardHolderName,
        card_number AS cardNumber,
        expiry,
        card_brand AS brand
      FROM card_details
      WHERE LOWER(account_email) = LOWER(?)
      ORDER BY updated_at DESC, id DESC
      LIMIT 1
    `,
    [orderRows[0].email]
  );

  return {
    ...orderRows[0],
    orderReference: normalizeOrderReference(orderRows[0].orderReference),
    paymentCard: cardRows[0] ? normalizePaymentCardSnapshot(cardRows[0]) : null,
    itemCount: Number(orderRows[0].itemCount || 0),
    subtotal: Number(orderRows[0].subtotal || 0),
    deliveryFee: Number(orderRows[0].deliveryFee || 0),
    totalAmount: Number(orderRows[0].totalAmount || 0),
    items: itemRows.map((item) => ({
      ...item,
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      lineTotal: Number(item.lineTotal || 0)
    }))
  };
}

async function getLatestCustomerOrder(email) {
  const [orderRows] = await db.query(
    `
      SELECT id AS orderId
      FROM orders
      WHERE email = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [email]
  );

  if (!orderRows.length) {
    return null;
  }

  return getOrderDetail(Number(orderRows[0].orderId));
}

async function getCustomerOrderByReference(email, orderReference) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedOrderReference = normalizeOrderReference(orderReference);

  if (!isValidEmail(normalizedEmail) || !isValidOrderReference(normalizedOrderReference)) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT
        id AS orderId,
        order_reference AS orderReference
      FROM orders
      WHERE email = ?
        AND order_reference = ?
      LIMIT 1
    `,
    [normalizedEmail, normalizedOrderReference]
  );

  return rows[0] || null;
}

async function getLatestCustomerOrderIdByEmail(email) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    return null;
  }

  const [rows] = await db.query(
    `
      SELECT id AS latestOrderId
      FROM orders
      WHERE email = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [normalizedEmail]
  );

  return rows.length ? Number(rows[0].latestOrderId || 0) || null : null;
}

async function getCustomerRecoveryProfile(identifier) {
  const normalizedIdentifier = String(identifier || '').trim();

  if (!normalizedIdentifier) {
    return null;
  }

  let lookupColumn = 'phone';
  let lookupValue = normalizePhone(normalizedIdentifier);

  if (normalizedIdentifier.includes('@')) {
    lookupColumn = 'email';
    lookupValue = normalizeEmail(normalizedIdentifier);

    if (!isValidEmail(lookupValue)) {
      return null;
    }
  } else if (!/^\d{10}$/.test(lookupValue)) {
    return null;
  }

  const existingCustomerAccount = await getCustomerAccountByIdentifier(normalizedIdentifier);

  if (existingCustomerAccount) {
    return {
      name: normalizeCustomerName(existingCustomerAccount.name),
      email: normalizeEmail(existingCustomerAccount.email),
      phone: normalizePhone(existingCustomerAccount.phone),
      latestOrderId: await getLatestCustomerOrderIdByEmail(existingCustomerAccount.email)
    };
  }

  const [rows] = await db.query(
    `
      SELECT
        customer_name AS name,
        email,
        phone,
        id AS latestOrderId
      FROM orders
      WHERE ${lookupColumn} = ?
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    `,
    [lookupValue]
  );

  if (!rows.length) {
    return null;
  }

  return {
    name: String(rows[0].name || '').trim(),
    email: normalizeEmail(rows[0].email),
    phone: normalizePhone(rows[0].phone),
    latestOrderId: Number(rows[0].latestOrderId || 0) || null
  };
}

async function getProductDetail(productId) {
  const [rows] = await db.query(
    `
      SELECT
        id,
        name,
        category,
        description,
        image_url AS imageUrl,
        CAST(price AS DOUBLE) AS price,
        CAST(rating AS DOUBLE) AS rating,
        stock,
        featured,
        badge
      FROM products
      WHERE id = ?
      LIMIT 1
    `,
    [productId]
  );

  return rows[0] || null;
}

function normalizeProductPayload(payload) {
  const {
    name,
    category,
    description,
    imageUrl,
    price,
    rating,
    stock,
    featured,
    badge
  } = payload || {};

  return {
    normalizedName: String(name || '').trim(),
    normalizedCategory: normalizeSectionName(category),
    normalizedDescription: String(description || '').trim(),
    normalizedImageUrl: String(imageUrl || '').trim(),
    normalizedBadge: String(badge || '').trim(),
    normalizedPrice: Number(price),
    normalizedRating: Number(rating),
    normalizedStock: Number(stock),
    normalizedFeatured: featured ? 1 : 0
  };
}

function isValidProductPayload(productPayload) {
  return !(
    !productPayload.normalizedName ||
    !productPayload.normalizedCategory ||
    !productPayload.normalizedDescription ||
    !productPayload.normalizedImageUrl ||
    !Number.isFinite(productPayload.normalizedPrice) ||
    productPayload.normalizedPrice <= 0 ||
    !Number.isFinite(productPayload.normalizedRating) ||
    productPayload.normalizedRating < 1 ||
    productPayload.normalizedRating > 5 ||
    !Number.isInteger(productPayload.normalizedStock) ||
    productPayload.normalizedStock < 0
  );
}

app.post('/api/admin/login', async (request, response, next) => {
  const identifier = String(request.body?.identifier ?? request.body?.email ?? '').trim();
  const password = String(request.body?.password || '');
  const normalizedIdentifier = identifier.includes('@')
    ? normalizeEmail(identifier)
    : normalizePhone(identifier);

  if (
    !password.trim() ||
    (identifier.includes('@') && !isValidEmail(normalizedIdentifier)) ||
    (!identifier.includes('@') && !isValidPhone(normalizedIdentifier))
  ) {
    response.status(400).json({
      message: 'Enter the admin email or 10-digit mobile number and password to continue.'
    });
    return;
  }

  try {
    if (
      identifier.includes('@') &&
      normalizedIdentifier === legacyMainAdminEmail &&
      legacyMainAdminEmail !== mainAdminEmail
    ) {
      response.status(401).json({
        message: `The old admin email is no longer active. Sign in with ${mainAdminEmail}.`
      });
      return;
    }

    const adminAccount = await getAdminAccountByIdentifier(normalizedIdentifier);

    if (!adminAccount) {
      response.status(404).json({
        message: 'No admin account was found for this email or mobile number.'
      });
      return;
    }

    if (hashPassword(password, adminAccount.passwordSalt) !== adminAccount.passwordHash) {
      response.status(401).json({
        message: 'The password is incorrect for this admin account.'
      });
      return;
    }

    response.json(createAdminSession(adminAccount));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/logout', authenticateAdmin, async (request, response) => {
  if (request.adminToken) {
    adminSessions.delete(request.adminToken);
  }

  response.json({
    signedOut: true
  });
});

app.post('/api/auth/register', async (request, response, next) => {
  const name = normalizeCustomerName(request.body?.name);
  const email = normalizeEmail(request.body?.email);
  const phone = normalizePhone(request.body?.phone);
  const password = String(request.body?.password || '').trim();
  const passwordHint = normalizePasswordHint(request.body?.passwordHint);

  if (!isValidCustomerName(name)) {
    response.status(400).json({
      message: 'Full name must be at least 3 letters.'
    });
    return;
  }

  if (!isValidEmail(email)) {
    response.status(400).json({
      message: 'Enter a valid email address before signing up.'
    });
    return;
  }

  if (!isValidPhone(phone)) {
    response.status(400).json({
      message: 'Mobile number must be exactly 10 digits.'
    });
    return;
  }

  if (!isValidAdminPassword(password)) {
    response.status(400).json({
      message: 'Password must be at least 6 characters long.'
    });
    return;
  }

  if (!isValidPasswordHint(passwordHint)) {
    response.status(400).json({
      message: 'Password hint must be at least 3 characters long.'
    });
    return;
  }

  try {
    const existingEmailAccount = await getCustomerAccountByEmail(email);
    const existingPhoneAccount = await getCustomerAccountByPhone(phone);

    if (existingEmailAccount) {
      response.status(409).json({
        message: 'This email is already registered. Please sign in instead.'
      });
      return;
    }

    if (existingPhoneAccount) {
      response.status(409).json({
        message: 'This mobile number is already registered. Please sign in instead.'
      });
      return;
    }

    const passwordSalt = createPasswordSalt();
    const passwordHash = hashPassword(password, passwordSalt);
    const [result] = await db.query(
      `
        INSERT INTO customer_accounts (
          name,
          email,
          phone,
          password_hash,
          password_salt,
          password_hint
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [name, email, phone, passwordHash, passwordSalt, passwordHint]
    );

    const createdAccount = await getCustomerAccountById(result.insertId);
    response.status(201).json(mapCustomerAccountRow(createdAccount));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/login', async (request, response, next) => {
  const identifier = String(request.body?.identifier || '').trim();
  const password = String(request.body?.password || '').trim();
  const normalizedIdentifier = identifier.includes('@')
    ? normalizeEmail(identifier)
    : normalizePhone(identifier);

  if (
    !password ||
    (identifier.includes('@') && !isValidEmail(normalizedIdentifier)) ||
    (!identifier.includes('@') && !isValidPhone(normalizedIdentifier))
  ) {
    response.status(400).json({
      message: 'Enter your mobile number or email and password to sign in.'
    });
    return;
  }

  try {
    const customerAccount = await getCustomerAccountByIdentifier(normalizedIdentifier);

    if (!customerAccount) {
      response.status(404).json({
        message: 'No customer account was found for this email or mobile number. Sign up first.'
      });
      return;
    }

    if (hashPassword(password, customerAccount.passwordSalt) !== customerAccount.passwordHash) {
      response.status(401).json({
        message: 'The password is incorrect for this account.'
      });
      return;
    }

    response.json(mapCustomerAccountRow(customerAccount));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/auth/profile', async (request, response, next) => {
  const email = normalizeEmail(request.body?.email);
  const currentPassword = String(request.body?.currentPassword || '').trim();
  const name = normalizeCustomerName(request.body?.name);
  const phone = normalizePhone(request.body?.phone);

  if (!isValidEmail(email)) {
    response.status(400).json({
      message: 'Use a valid account email address before saving.'
    });
    return;
  }

  if (!isValidCustomerName(name)) {
    response.status(400).json({
      message: 'Full name must be at least 3 letters.'
    });
    return;
  }

  if (!isValidPhone(phone)) {
    response.status(400).json({
      message: 'Mobile number must be exactly 10 digits.'
    });
    return;
  }

  if (!currentPassword) {
    response.status(400).json({
      message: 'Enter your current password before saving account details.'
    });
    return;
  }

  try {
    const customerAccount = await getCustomerAccountByEmail(email);

    if (!customerAccount) {
      response.status(404).json({
        message: 'Customer account not found.'
      });
      return;
    }

    if (hashPassword(currentPassword, customerAccount.passwordSalt) !== customerAccount.passwordHash) {
      response.status(401).json({
        message: 'Current password is incorrect. Profile details were not updated.'
      });
      return;
    }

    const existingPhoneAccount = await getCustomerAccountByPhone(phone);

    if (existingPhoneAccount && Number(existingPhoneAccount.id) !== Number(customerAccount.id)) {
      response.status(409).json({
        message: 'This mobile number is already registered to another account.'
      });
      return;
    }

    await db.query(
      `
        UPDATE customer_accounts
        SET
          name = ?,
          phone = ?
        WHERE id = ?
      `,
      [name, phone, customerAccount.id]
    );

    response.json(mapCustomerAccountRow(await getCustomerAccountById(customerAccount.id)));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/auth/password', async (request, response, next) => {
  const identifier = String(request.body?.identifier || '').trim();
  const currentPassword = String(request.body?.currentPassword || '').trim();
  const newPassword = String(request.body?.newPassword || '').trim();
  const normalizedIdentifier = identifier.includes('@')
    ? normalizeEmail(identifier)
    : normalizePhone(identifier);

  if (
    !identifier ||
    !currentPassword ||
    !isValidAdminPassword(newPassword) ||
    (identifier.includes('@') && !isValidEmail(normalizedIdentifier)) ||
    (!identifier.includes('@') && !isValidPhone(normalizedIdentifier))
  ) {
    response.status(400).json({
      message: 'Provide a valid email or mobile number, your current password, and a new password.'
    });
    return;
  }

  try {
    const customerAccount = await getCustomerAccountByIdentifier(normalizedIdentifier);

    if (!customerAccount) {
      response.status(404).json({
        message: 'Customer account not found.'
      });
      return;
    }

    if (hashPassword(currentPassword, customerAccount.passwordSalt) !== customerAccount.passwordHash) {
      response.status(401).json({
        message: 'Current password is incorrect.'
      });
      return;
    }

    if (currentPassword === newPassword) {
      response.status(400).json({
        message: 'New password must be different from the current password.'
      });
      return;
    }

    const nextPasswordSalt = createPasswordSalt();
    const nextPasswordHash = hashPassword(newPassword, nextPasswordSalt);

    await db.query(
      `
        UPDATE customer_accounts
        SET
          password_hash = ?,
          password_salt = ?
        WHERE id = ?
      `,
      [nextPasswordHash, nextPasswordSalt, customerAccount.id]
    );

    response.json(mapCustomerAccountRow(await getCustomerAccountById(customerAccount.id)));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/auth/password-reset', async (request, response, next) => {
  const identifier = String(request.body?.identifier || '').trim();
  const passwordHint = normalizePasswordHint(request.body?.passwordHint);
  const newPassword = String(request.body?.newPassword || '').trim();
  const normalizedIdentifier = identifier.includes('@')
    ? normalizeEmail(identifier)
    : normalizePhone(identifier);

  if (
    !identifier ||
    !isValidPasswordHint(passwordHint) ||
    !isValidAdminPassword(newPassword) ||
    (identifier.includes('@') && !isValidEmail(normalizedIdentifier)) ||
    (!identifier.includes('@') && !isValidPhone(normalizedIdentifier))
  ) {
    response.status(400).json({
      message: 'Provide a valid email or mobile number, the saved password hint, and a new password.'
    });
    return;
  }

  try {
    const customerAccount = await getCustomerAccountByIdentifier(normalizedIdentifier);

    if (!customerAccount) {
      response.status(404).json({
        message: 'Customer account not found.'
      });
      return;
    }

    if (normalizePasswordHint(customerAccount.passwordHint).toLowerCase() !== passwordHint.toLowerCase()) {
      response.status(401).json({
        message: 'The password hint is incorrect for this account.'
      });
      return;
    }

    if (hashPassword(newPassword, customerAccount.passwordSalt) === customerAccount.passwordHash) {
      response.status(400).json({
        message: 'New password must be different from the current password.'
      });
      return;
    }

    const nextPasswordSalt = createPasswordSalt();
    const nextPasswordHash = hashPassword(newPassword, nextPasswordSalt);

    await db.query(
      `
        UPDATE customer_accounts
        SET
          password_hash = ?,
          password_salt = ?
        WHERE id = ?
      `,
      [nextPasswordHash, nextPasswordSalt, customerAccount.id]
    );

    response.json(mapCustomerAccountRow(await getCustomerAccountById(customerAccount.id)));
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/accounts', authenticateAdmin, async (request, response, next) => {
  try {
    response.json(await getAdminAccounts());
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users', authenticateAdmin, async (request, response, next) => {
  try {
    response.json(await getAdminCustomerUsers());
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/users/orders', authenticateAdmin, async (request, response, next) => {
  const email = normalizeEmail(request.query?.email);

  if (!isValidEmail(email)) {
    response.status(400).json({
      message: 'Use a valid customer email before loading order history.'
    });
    return;
  }

  try {
    response.json(await getAdminCustomerOrders(email));
  } catch (error) {
    next(error);
  }
});

app.delete(
  '/api/admin/users',
  authenticateAdmin,
  requireMainAdmin,
  async (request, response, next) => {
    const email = normalizeEmail(request.query?.email);
    let connection;

    if (!isValidEmail(email)) {
      response.status(400).json({
        message: 'Use a valid store user email address before deleting.'
      });
      return;
    }

    try {
      const existingCustomer = await getAdminCustomerUserByEmail(email);

      if (!existingCustomer) {
        response.status(404).json({
          message: 'Store user not found.'
        });
        return;
      }

      connection = await db.getConnection();
      await connection.beginTransaction();

      const [deletedAccounts] = await connection.query(
        `
          DELETE FROM customer_accounts
          WHERE LOWER(email) = LOWER(?)
        `,
        [email]
      );
      const [deletedSupportTickets] = await connection.query(
        `
          DELETE FROM support_tickets
          WHERE LOWER(email) = LOWER(?)
        `,
        [email]
      );
      const [deletedOrders] = await connection.query(
        `
          DELETE FROM orders
          WHERE LOWER(email) = LOWER(?)
        `,
        [email]
      );

      await connection.commit();

      response.json({
        name: existingCustomer.name || email,
        email,
        deletedAccountCount: Number(deletedAccounts.affectedRows || 0),
        deletedOrderCount: Number(deletedOrders.affectedRows || 0),
        deletedTicketCount: Number(deletedSupportTickets.affectedRows || 0)
      });
    } catch (error) {
      if (connection) {
        await connection.rollback();
      }
      next(error);
    } finally {
      connection?.release();
    }
  }
);

app.delete(
  '/api/admin/sub-admins/:adminId',
  authenticateAdmin,
  requireMainAdmin,
  async (request, response, next) => {
    const adminId = Number(request.params.adminId);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      response.status(400).json({
        message: 'Sub-admin id is invalid.'
      });
      return;
    }

    try {
      const existingAdmin = await getAdminAccountById(adminId);

      if (!existingAdmin) {
        response.status(404).json({
          message: 'Sub-admin account not found.'
        });
        return;
      }

      if (existingAdmin.role !== 'sub_admin') {
        response.status(403).json({
          message: 'Only sub-admin accounts can be deleted here.'
        });
        return;
      }

      await db.query('DELETE FROM admin_accounts WHERE id = ? LIMIT 1', [adminId]);

      for (const [token, session] of adminSessions.entries()) {
        if (Number(session?.adminId || 0) === adminId) {
          adminSessions.delete(token);
        }
      }

      response.json({
        adminId,
        name: normalizeAdminName(existingAdmin.name),
        email: normalizeEmail(existingAdmin.email),
        phone: normalizePhone(existingAdmin.phone),
        role: 'sub_admin'
      });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  '/api/admin/sub-admins',
  authenticateAdmin,
  requireMainAdmin,
  async (request, response, next) => {
    const name = normalizeAdminName(request.body?.name);
    const email = normalizeEmail(request.body?.email);
    const phone = normalizePhone(request.body?.phone);
    const password = String(request.body?.password || '').trim();

    if (name.length < 2) {
      response.status(400).json({
        message: 'Enter a sub-admin name with at least 2 characters.'
      });
      return;
    }

    if (!isValidEmail(email)) {
      response.status(400).json({
        message: 'Enter a valid sub-admin email address.'
      });
      return;
    }

    if (!isValidPhone(phone)) {
      response.status(400).json({
        message: 'Enter a valid 10-digit mobile number for the sub-admin.'
      });
      return;
    }

    if (!isValidAdminPassword(password)) {
      response.status(400).json({
        message: 'Sub-admin password must be at least 6 characters long.'
      });
      return;
    }

    try {
      const existingAdmin = await getAdminAccountByEmail(email);
      const existingPhoneAdmin = await getAdminAccountByPhone(phone);

      if (existingAdmin) {
        response.status(409).json({
          message: 'An admin account already exists for that email.'
        });
        return;
      }

      if (existingPhoneAdmin) {
        response.status(409).json({
          message: 'An admin account already exists for that mobile number.'
        });
        return;
      }

      const passwordSalt = createPasswordSalt();
      const passwordHash = hashPassword(password, passwordSalt);
      const [result] = await db.query(
        `
          INSERT INTO admin_accounts (
            name,
            email,
            phone,
            password_hash,
            password_salt,
            role,
            created_by_admin_id
          ) VALUES (?, ?, ?, ?, ?, 'sub_admin', ?)
        `,
        [name, email, phone, passwordHash, passwordSalt, request.admin.id]
      );

      const createdAdmin = await getAdminAccountById(result.insertId);
      response.status(201).json(mapAdminAccountRow(createdAdmin));
    } catch (error) {
      next(error);
    }
  }
);

app.get('/api/store-sections', async (request, response, next) => {
  try {
    response.json(await getStoreSections());
  } catch (error) {
    next(error);
  }
});

app.post('/api/store-sections', authenticateAdmin, async (request, response, next) => {
  const normalizedSectionName = normalizeSectionName(request.body?.name);

  if (!isValidSectionName(normalizedSectionName)) {
    response.status(400).json({
      message: 'Store section name must be between 2 and 80 characters.'
    });
    return;
  }

  try {
    const existingSection = await getStoreSectionByName(normalizedSectionName);

    if (existingSection) {
      response.status(409).json({
        message: 'This store section already exists.'
      });
      return;
    }

    response.status(201).json(await ensureStoreSectionExists(normalizedSectionName));
  } catch (error) {
    next(error);
  }
});

app.put('/api/store-sections/:id', authenticateAdmin, async (request, response, next) => {
  const sectionId = Number(request.params.id);
  const normalizedSectionName = normalizeSectionName(request.body?.name);

  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    response.status(400).json({
      message: 'Store section id is invalid.'
    });
    return;
  }

  if (!isValidSectionName(normalizedSectionName)) {
    response.status(400).json({
      message: 'Store section name must be between 2 and 80 characters.'
    });
    return;
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [sectionRows] = await connection.query(
      `
        SELECT
          id,
          name,
          sort_order AS sortOrder
        FROM store_sections
        WHERE id = ?
        LIMIT 1
      `,
      [sectionId]
    );

    if (!sectionRows.length) {
      await connection.rollback();
      response.status(404).json({
        message: 'Store section not found.'
      });
      return;
    }

    const existingSection = mapStoreSectionRow(sectionRows[0]);

    if (existingSection.name.toLowerCase() === normalizedSectionName.toLowerCase()) {
      await connection.commit();
      response.json(existingSection);
      return;
    }

    const [duplicateRows] = await connection.query(
      `
        SELECT id
        FROM store_sections
        WHERE LOWER(name) = LOWER(?)
          AND id <> ?
        LIMIT 1
      `,
      [normalizedSectionName, sectionId]
    );

    if (duplicateRows.length) {
      await connection.rollback();
      response.status(409).json({
        message: 'This store section already exists.'
      });
      return;
    }

    await connection.query(
      `
        UPDATE store_sections
        SET name = ?
        WHERE id = ?
      `,
      [normalizedSectionName, sectionId]
    );

    await connection.query(
      `
        UPDATE products
        SET category = ?
        WHERE LOWER(TRIM(category)) = LOWER(?)
      `,
      [normalizedSectionName, existingSection.name]
    );

    await connection.commit();
    response.json(await getStoreSectionById(sectionId));
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    next(error);
  } finally {
    connection?.release();
  }
});

app.delete(
  '/api/store-sections/:id',
  authenticateAdmin,
  requireMainAdmin,
  async (request, response, next) => {
  let connection;
  const sectionId = Number(request.params.id);

  if (!Number.isInteger(sectionId) || sectionId <= 0) {
    response.status(400).json({
      message: 'Store section id is invalid.'
    });
    return;
  }

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const existingSection = await getStoreSectionById(sectionId);

    if (!existingSection) {
      await connection.rollback();
      response.status(404).json({
        message: 'Store section not found.'
      });
      return;
    }

    const [productCountRows] = await connection.query(
      `
        SELECT COUNT(*) AS productCount
        FROM products
        WHERE LOWER(TRIM(category)) = LOWER(?)
      `,
      [existingSection.name]
    );
    const productCount = Number(productCountRows[0]?.productCount || 0);

    if (productCount > 0) {
      await connection.query(
        `
          DELETE FROM products
          WHERE LOWER(TRIM(category)) = LOWER(?)
        `,
        [existingSection.name]
      );
    }

    await connection.query('DELETE FROM store_sections WHERE id = ?', [sectionId]);
    await connection.commit();

    response.json({
      sectionId,
      name: existingSection.name,
      deletedProductCount: productCount
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    next(error);
  } finally {
    connection?.release();
  }
}
);

app.get('/api/health', async (request, response) => {
  try {
    await db.query('SELECT 1');
    response.json({
      status: 'ok',
      database: 'connected'
    });
  } catch (error) {
    response.status(500).json({
      status: 'error',
      message: 'Database connection failed.',
      details: error.code || error.message
    });
  }
});

app.get('/api/products', async (request, response, next) => {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        category,
        description,
        image_url AS imageUrl,
        CAST(price AS DOUBLE) AS price,
        CAST(rating AS DOUBLE) AS rating,
        stock,
        featured,
        badge
      FROM products
      ORDER BY featured DESC, id ASC
    `);

    response.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/products/:id', async (request, response, next) => {
  try {
    const product = await getProductDetail(request.params.id);

    if (!product) {
      response.status(404).json({
        message: 'Product not found.'
      });
      return;
    }

    response.json(product);
  } catch (error) {
    next(error);
  }
});

app.post('/api/products', authenticateAdmin, async (request, response, next) => {
  const productPayload = normalizeProductPayload(request.body);

  if (!isValidProductPayload(productPayload)) {
    response.status(400).json({
      message:
        'Product details are incomplete. Add name, category, description, image, price, rating, and stock before saving.'
    });
    return;
  }

  try {
    await ensureStoreSectionExists(productPayload.normalizedCategory);

    const [result] = await db.query(
      `
        INSERT INTO products (
          name,
          category,
          description,
          image_url,
          price,
          rating,
          stock,
          featured,
          badge
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productPayload.normalizedName,
        productPayload.normalizedCategory,
        productPayload.normalizedDescription,
        productPayload.normalizedImageUrl,
        productPayload.normalizedPrice,
        productPayload.normalizedRating,
        productPayload.normalizedStock,
        productPayload.normalizedFeatured,
        productPayload.normalizedBadge
      ]
    );

    response.status(201).json(await getProductDetail(result.insertId));
  } catch (error) {
    next(error);
  }
});

app.put('/api/products/:id', authenticateAdmin, async (request, response, next) => {
  const productId = Number(request.params.id);
  const productPayload = normalizeProductPayload(request.body);

  if (!Number.isInteger(productId) || productId <= 0) {
    response.status(400).json({
      message: 'Product id is invalid.'
    });
    return;
  }

  if (!isValidProductPayload(productPayload)) {
    response.status(400).json({
      message:
        'Product details are incomplete. Add name, category, description, image, price, rating, and stock before saving.'
    });
    return;
  }

  try {
    const existingProduct = await getProductDetail(productId);

    if (!existingProduct) {
      response.status(404).json({
        message: 'Product not found.'
      });
      return;
    }

    await ensureStoreSectionExists(productPayload.normalizedCategory);

    await db.query(
      `
        UPDATE products
        SET
          name = ?,
          category = ?,
          description = ?,
          image_url = ?,
          price = ?,
          rating = ?,
          stock = ?,
          featured = ?,
          badge = ?
        WHERE id = ?
      `,
      [
        productPayload.normalizedName,
        productPayload.normalizedCategory,
        productPayload.normalizedDescription,
        productPayload.normalizedImageUrl,
        productPayload.normalizedPrice,
        productPayload.normalizedRating,
        productPayload.normalizedStock,
        productPayload.normalizedFeatured,
        productPayload.normalizedBadge,
        productId
      ]
    );

    response.json(await getProductDetail(productId));
  } catch (error) {
    next(error);
  }
});

app.delete(
  '/api/products/:id',
  authenticateAdmin,
  requireMainAdmin,
  async (request, response, next) => {
  const productId = Number(request.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    response.status(400).json({
      message: 'Product id is invalid.'
    });
    return;
  }

  try {
    const existingProduct = await getProductDetail(productId);

    if (!existingProduct) {
      response.status(404).json({
        message: 'Product not found.'
      });
      return;
    }

    const [orderItemRows] = await db.query(
      `
        SELECT COUNT(*) AS orderItemCount
        FROM order_items
        WHERE product_id = ?
      `,
      [productId]
    );
    const orderItemCount = Number(orderItemRows[0]?.orderItemCount || 0);

    if (orderItemCount > 0) {
      response.status(409).json({
        message:
          'This product is already part of customer orders. Set its stock to 0 instead of deleting it.'
      });
      return;
    }

    await db.query('DELETE FROM products WHERE id = ?', [productId]);

    response.json({
      productId,
      name: existingProduct.name,
      category: existingProduct.category
    });
  } catch (error) {
    next(error);
  }
}
);

app.get('/api/admin/overview', authenticateAdmin, async (request, response, next) => {
  try {
    const [
      [productStatsRows],
      [orderStatsRows],
      [supportStatsRows],
      [recentOrderRows],
      [recentOrderedProductRows],
      [topProductRows],
      [outOfStockRows],
      [recentTicketRows]
    ] = await Promise.all([
      db.query(`
        SELECT
          COALESCE(SUM(CASE WHEN stock > 0 THEN 1 ELSE 0 END), 0) AS productCount,
          COALESCE(SUM(stock), 0) AS inventoryUnits,
          COALESCE(SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END), 0) AS lowStockCount
        FROM products
      `),
      db.query(`
        SELECT
          COUNT(*) AS orderCount,
          COALESCE(SUM(item_count), 0) AS soldUnits,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
      `),
      db.query(`
        SELECT
          COUNT(*) AS openTicketCount
        FROM support_tickets
        WHERE status IN ('open', 'in_progress')
      `),
      db.query(`
        SELECT
          id AS orderId,
          customer_name AS customerName,
          email,
          item_count AS itemCount,
          CAST(total_amount AS DOUBLE) AS totalAmount,
          status,
          created_at AS createdAt
        FROM orders
        ORDER BY created_at DESC, id DESC
        LIMIT 6
      `),
      db.query(`
        SELECT
          oi.order_id AS orderId,
          oi.product_id AS productId,
          oi.product_name AS productName,
          o.customer_name AS customerName,
          p.category,
          p.image_url AS imageUrl,
          oi.quantity,
          CAST(oi.line_total AS DOUBLE) AS lineTotal,
          o.created_at AS createdAt,
          p.badge
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        ORDER BY o.created_at DESC, oi.id DESC
        LIMIT 8
      `),
      db.query(`
        SELECT
          oi.product_id AS productId,
          oi.product_name AS productName,
          SUM(oi.quantity) AS unitsSold,
          CAST(SUM(oi.line_total) AS DOUBLE) AS revenue,
          p.stock AS currentStock
        FROM order_items oi
        INNER JOIN products p ON p.id = oi.product_id
        GROUP BY oi.product_id, oi.product_name, p.stock
        ORDER BY unitsSold DESC, revenue DESC
        LIMIT 6
      `),
      db.query(`
        SELECT
          id,
          name,
          category,
          image_url AS imageUrl,
          CAST(price AS DOUBLE) AS price,
          CAST(rating AS DOUBLE) AS rating,
          stock,
          badge
        FROM products
        WHERE stock = 0
        ORDER BY id DESC
        LIMIT 12
      `),
      db.query(`
        SELECT
          id,
          customer_name AS customerName,
          email,
          order_reference AS orderReference,
          issue_type AS issueType,
          subject,
          message,
          status,
          COALESCE(admin_response, '') AS adminResponse,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM support_tickets
        ORDER BY created_at DESC, id DESC
        LIMIT 6
      `)
    ]);

    const productStats = productStatsRows[0] || {
      productCount: 0,
      inventoryUnits: 0,
      lowStockCount: 0
    };
    const orderStats = orderStatsRows[0] || {
      orderCount: 0,
      soldUnits: 0,
      revenue: 0
    };
    const supportStats = supportStatsRows[0] || {
      openTicketCount: 0
    };

    response.json({
      productCount: Number(productStats.productCount || 0),
      inventoryUnits: Number(productStats.inventoryUnits || 0),
      lowStockCount: Number(productStats.lowStockCount || 0),
      orderCount: Number(orderStats.orderCount || 0),
      soldUnits: Number(orderStats.soldUnits || 0),
      revenue: Number(orderStats.revenue || 0),
      openTicketCount: Number(supportStats.openTicketCount || 0),
      recentOrders: recentOrderRows,
      recentOrderedProducts: recentOrderedProductRows.map((product) => ({
        ...product,
        quantity: Number(product.quantity || 0),
        lineTotal: Number(product.lineTotal || 0)
      })),
      topProducts: topProductRows.map((product) => ({
        ...product,
        unitsSold: Number(product.unitsSold || 0),
        revenue: Number(product.revenue || 0),
        currentStock: Number(product.currentStock || 0)
      })),
      outOfStockProducts: outOfStockRows.map((product) => ({
        ...product,
        price: Number(product.price || 0),
        rating: Number(product.rating || 0),
        stock: Number(product.stock || 0)
      })),
      recentTickets: recentTicketRows
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/orders/:orderId', authenticateAdmin, async (request, response, next) => {
  const orderId = Number(request.params.orderId);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    response.status(400).json({
      message: 'Order id is invalid.'
    });
    return;
  }

  try {
    const orderDetail = await getOrderDetail(orderId);

    if (!orderDetail) {
      response.status(404).json({
        message: 'Order not found.'
      });
      return;
    }

    response.json(orderDetail);
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders', async (request, response, next) => {
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to load your orders.'
    });
    return;
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          o.id AS orderId,
          o.order_reference AS orderReference,
          o.customer_name AS customerName,
          o.item_count AS itemCount,
          CAST(o.subtotal AS DOUBLE) AS subtotal,
          CAST(o.delivery_fee AS DOUBLE) AS deliveryFee,
          CAST(o.total_amount AS DOUBLE) AS totalAmount,
          o.status,
          o.created_at AS createdAt,
          oi.product_name AS leadProductName,
          p.category AS leadCategory,
          p.image_url AS leadImageUrl,
          COALESCE(p.badge, '') AS leadBadge
        FROM orders o
        INNER JOIN order_items oi ON oi.order_id = o.id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE o.email = ?
          AND oi.id = (
            SELECT MIN(oi2.id)
            FROM order_items oi2
            WHERE oi2.order_id = o.id
          )
        ORDER BY o.created_at DESC, o.id DESC
      `,
      [normalizedEmail]
    );

    response.json(
      rows.map((order) => ({
        ...order,
        orderId: Number(order.orderId || 0),
        orderReference: normalizeOrderReference(order.orderReference),
        itemCount: Number(order.itemCount || 0),
        subtotal: Number(order.subtotal || 0),
        deliveryFee: Number(order.deliveryFee || 0),
        totalAmount: Number(order.totalAmount || 0)
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.get('/api/payment-cards', async (request, response, next) => {
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to load your saved payment cards.'
    });
    return;
  }

  try {
    response.json(await getCustomerSavedPaymentCards(normalizedEmail));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/payment-cards/:cardId', async (request, response, next) => {
  const cardId = Number(request.params.cardId);
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!Number.isInteger(cardId) || cardId <= 0) {
    response.status(400).json({
      message: 'Saved payment card id is invalid.'
    });
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to delete the saved payment card.'
    });
    return;
  }

  try {
    const [result] = await db.query(
      `
        DELETE FROM card_details
        WHERE id = ?
          AND LOWER(account_email) = LOWER(?)
      `,
      [cardId, normalizedEmail]
    );

    if (!Number(result.affectedRows || 0)) {
      response.status(404).json({
        message: 'The saved payment card was not found for this account.'
      });
      return;
    }

    response.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/latest', async (request, response, next) => {
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to load your latest order.'
    });
    return;
  }

  try {
    const orderDetail = await getLatestCustomerOrder(normalizedEmail);
    response.json(orderDetail);
  } catch (error) {
    next(error);
  }
});

app.get('/api/auth/recovery-profile', async (request, response, next) => {
  const identifier = String(request.query?.identifier || '').trim();

  if (!identifier) {
    response.status(400).json({
      message: 'Enter your registered email or 10-digit mobile number.'
    });
    return;
  }

  try {
    const profile = await getCustomerRecoveryProfile(identifier);

    if (!profile) {
      response.status(404).json({
        message:
          'We could not find an account or previous order for that email or mobile number. Sign up first or use the checkout details from your last order.'
      });
      return;
    }

    response.json(profile);
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/recent-products', async (request, response, next) => {
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to load your ordered products.'
    });
    return;
  }

  try {
    const [rows] = await db.query(
      `
        SELECT
          oi.order_id AS orderId,
          oi.product_id AS productId,
          oi.product_name AS productName,
          p.category,
          p.image_url AS imageUrl,
          oi.quantity,
          CAST(oi.unit_price AS DOUBLE) AS unitPrice,
          CAST(oi.line_total AS DOUBLE) AS lineTotal,
          o.status,
          o.created_at AS createdAt,
          p.badge
        FROM order_items oi
        INNER JOIN orders o ON o.id = oi.order_id
        INNER JOIN products p ON p.id = oi.product_id
        WHERE o.email = ?
        ORDER BY o.created_at DESC, oi.id DESC
        LIMIT 12
      `,
      [normalizedEmail]
    );

    response.json(
      rows.map((row) => ({
        ...row,
        quantity: Number(row.quantity || 0),
        unitPrice: Number(row.unitPrice || 0),
        lineTotal: Number(row.lineTotal || 0)
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.get('/api/orders/:orderId', async (request, response, next) => {
  const orderId = Number(request.params.orderId);
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    response.status(400).json({
      message: 'Order id is invalid.'
    });
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to load your full order detail.'
    });
    return;
  }

  try {
    const [matchingRows] = await db.query(
      `
        SELECT id
        FROM orders
        WHERE id = ? AND email = ?
        LIMIT 1
      `,
      [orderId, normalizedEmail]
    );

    if (!matchingRows.length) {
      response.status(404).json({
        message: 'Order not found for this account.'
      });
      return;
    }

    const orderDetail = await getOrderDetail(orderId);

    if (!orderDetail) {
      response.status(404).json({
        message: 'Order not found.'
      });
      return;
    }

    response.json(orderDetail);
  } catch (error) {
    next(error);
  }
});

app.post('/api/support', async (request, response, next) => {
  const {
    customerName,
    email,
    orderReference,
    issueType,
    subject,
    message
  } = request.body || {};

  const normalizedCustomerName = String(customerName || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedOrderReference = normalizeOrderReference(orderReference);
  const normalizedIssueType = String(issueType || '').trim();
  const normalizedSubject = String(subject || '').trim();
  const normalizedMessage = String(message || '').trim();

  if (
    normalizedCustomerName.length < 2 ||
    !isValidEmail(normalizedEmail) ||
    !isValidOrderReference(normalizedOrderReference) ||
    !normalizedIssueType ||
    normalizedSubject.length < 4 ||
    normalizedMessage.length < 15
  ) {
    response.status(400).json({
      message:
        'Support form is incomplete. Add your name, valid email, a valid order reference, issue type, subject, and at least 15 characters in the details box.'
    });
    return;
  }

  try {
    const matchingOrder = await getCustomerOrderByReference(
      normalizedEmail,
      normalizedOrderReference
    );

    if (!matchingOrder) {
      response.status(400).json({
        message:
          'Enter a valid order reference from your order history before sending the support request.'
      });
      return;
    }

    const [result] = await db.query(
      `
        INSERT INTO support_tickets (
          customer_name,
          email,
          order_reference,
          issue_type,
          subject,
          message
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedCustomerName,
        normalizedEmail,
        normalizedOrderReference,
        normalizedIssueType,
        normalizedSubject,
        normalizedMessage
      ]
    );

    response.status(201).json({
      ticketId: result.insertId,
      status: 'open',
      customerName: normalizedCustomerName,
      email: normalizedEmail,
      subject: normalizedSubject
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/support', async (request, response, next) => {
  const normalizedEmail = normalizeEmail(request.query?.email);

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Use a valid account email address to load your support updates.'
    });
    return;
  }

  try {
    const [ticketRows] = await db.query(
      `
        SELECT
          id,
          customer_name AS customerName,
          email,
          order_reference AS orderReference,
          issue_type AS issueType,
          subject,
          message,
          status,
          COALESCE(admin_response, '') AS adminResponse,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM support_tickets
        WHERE email = ?
        ORDER BY updated_at DESC, created_at DESC, id DESC
        LIMIT 10
      `,
      [normalizedEmail]
    );

    response.json(ticketRows);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/support/:ticketId', authenticateAdmin, async (request, response, next) => {
  const ticketId = Number(request.params.ticketId);
  const requestedStatus = String(request.body?.status || '').trim().toLowerCase();
  const adminResponse = String(request.body?.adminResponse || '').trim();

  if (!Number.isInteger(ticketId) || ticketId <= 0) {
    response.status(400).json({
      message: 'Support ticket id is invalid.'
    });
    return;
  }

  if (!supportTicketStatuses.has(requestedStatus)) {
    response.status(400).json({
      message: 'Choose a valid support ticket status.'
    });
    return;
  }

  try {
    const [existingRows] = await db.query(
      `
        SELECT id
        FROM support_tickets
        WHERE id = ?
        LIMIT 1
      `,
      [ticketId]
    );

    if (!existingRows.length) {
      response.status(404).json({
        message: 'Support ticket was not found.'
      });
      return;
    }

    await db.query(
      `
        UPDATE support_tickets
        SET
          status = ?,
          admin_response = ?
        WHERE id = ?
      `,
      [requestedStatus, adminResponse || null, ticketId]
    );

    const [ticketRows] = await db.query(
      `
        SELECT
          id,
          customer_name AS customerName,
          email,
          order_reference AS orderReference,
          issue_type AS issueType,
          subject,
          message,
          status,
          COALESCE(admin_response, '') AS adminResponse,
          created_at AS createdAt,
          updated_at AS updatedAt
        FROM support_tickets
        WHERE id = ?
        LIMIT 1
      `,
      [ticketId]
    );

    response.json({
      ticket: ticketRows[0],
      openTicketCount: await getActionableSupportTicketCount()
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/orders', async (request, response, next) => {
  const {
    customerName,
    email,
    phone,
    addressLine,
    city,
    state,
    postalCode,
    paymentMethod,
    paymentCard,
    notes,
    items
  } = request.body || {};

  const normalizedCustomerName = String(customerName || '').trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPhone = normalizePhone(phone);
  const normalizedAddressLine = String(addressLine || '').trim();
  const normalizedCity = String(city || '').trim();
  const normalizedState = String(state || '').trim();
  const normalizedPostalCode = String(postalCode || '').trim();
  const normalizedPaymentMethodInput = String(paymentMethod || '').trim();
  const normalizedPaymentMethod =
    normalizedPaymentMethodInput === 'Card on delivery'
      ? 'Card payment'
      : normalizedPaymentMethodInput;
  const normalizedPaymentCard = normalizePaymentCardSnapshot(paymentCard);
  const normalizedNotes = String(notes || '').trim();

  if (
    !normalizedCustomerName ||
    !normalizedEmail ||
    !normalizedPhone ||
    !normalizedAddressLine ||
    !normalizedCity ||
    !normalizedState ||
    !normalizedPostalCode ||
    !normalizedPaymentMethod ||
    !Array.isArray(items) ||
    !items.length
  ) {
    response.status(400).json({
      message: 'Checkout details are incomplete. Please complete the form and include at least one item.'
    });
    return;
  }

  if (!isValidEmail(normalizedEmail)) {
    response.status(400).json({
      message: 'Enter a valid email address before placing the order.'
    });
    return;
  }

  if (!/^\d{10}$/.test(normalizedPhone)) {
    response.status(400).json({
      message: 'Enter a valid 10-digit mobile number before placing the order.'
    });
    return;
  }

  if (!['Cash on delivery', 'Card payment'].includes(normalizedPaymentMethod)) {
    response.status(400).json({
      message: 'Choose a supported payment method before placing the order.'
    });
    return;
  }

  if (
    normalizedPaymentMethod === 'Card payment' &&
    paymentCard !== undefined &&
    !isValidPaymentCardSnapshot(normalizedPaymentCard)
  ) {
    response.status(400).json({
      message:
        'Card payment details are incomplete. Provide a valid cardholder name, 16-digit card number, and expiry.'
    });
    return;
  }

  const normalizedItems = items
    .map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity)
    }))
    .filter((item) => Number.isInteger(item.productId) && Number.isInteger(item.quantity) && item.quantity > 0);

  if (!normalizedItems.length) {
    response.status(400).json({
      message: 'The order does not contain valid items.'
    });
    return;
  }

  const placeholders = normalizedItems.map(() => '?').join(', ');
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [products] = await connection.query(
      `
        SELECT
          id,
          name,
          stock,
          CAST(price AS DOUBLE) AS price
        FROM products
        WHERE id IN (${placeholders})
        FOR UPDATE
      `,
      normalizedItems.map((item) => item.productId)
    );

    if (products.length !== normalizedItems.length) {
      await connection.rollback();
      response.status(400).json({
        message: 'One or more products in the cart could not be found.'
      });
      return;
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const orderItems = normalizedItems.map((item) => {
      const product = productMap.get(item.productId);

      if (!product) {
        throw new Error('Product not found during order preparation.');
      }

      if (product.stock < item.quantity) {
        const stockError = new Error(`Only ${product.stock} units are left for ${product.name}.`);
        stockError.statusCode = 400;
        throw stockError;
      }

      return {
        productId: product.id,
        productName: product.name,
        quantity: item.quantity,
        unitPrice: Number(product.price),
        lineTotal: Number(product.price) * item.quantity
      };
    });

    const itemCount = orderItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = orderItems.reduce((total, item) => total + item.lineTotal, 0);
    const deliveryFee = itemCount ? 12 : 0;
    const totalAmount = subtotal + deliveryFee;

    const [orderResult] = await connection.query(
      `
        INSERT INTO orders (
          customer_name,
          email,
          phone,
          address_line,
          city,
          state,
          postal_code,
          payment_method,
          notes,
          item_count,
          subtotal,
          delivery_fee,
          total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedCustomerName,
        normalizedEmail,
        normalizedPhone,
        normalizedAddressLine,
        normalizedCity,
        normalizedState,
        normalizedPostalCode,
        normalizedPaymentMethod,
        normalizedNotes,
        itemCount,
        subtotal,
        deliveryFee,
        totalAmount
      ]
    );

    const orderId = orderResult.insertId;
    const orderReference = formatOrderReference(orderId);

    await connection.query(
      `
        UPDATE orders
        SET order_reference = ?
        WHERE id = ?
      `,
      [orderReference, orderId]
    );

    if (normalizedPaymentMethod === 'Card payment' && isValidPaymentCardSnapshot(normalizedPaymentCard)) {
      // Store the full card number for the saved-card demo flow. CVV values are never persisted.
      const [legacyCardUpgradeResult] = await connection.query(
        `
          UPDATE card_details
          SET
            card_number = ?,
            card_brand = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE LOWER(account_email) = LOWER(?)
            AND cardholder_name = ?
            AND expiry = ?
            AND CHAR_LENGTH(card_number) < 16
            AND RIGHT(card_number, 4) = RIGHT(?, 4)
        `,
        [
          normalizedPaymentCard.cardNumber,
          normalizedPaymentCard.brand,
          normalizedEmail,
          normalizedPaymentCard.cardHolderName,
          normalizedPaymentCard.expiry,
          normalizedPaymentCard.cardNumber
        ]
      );

      if (!Number(legacyCardUpgradeResult.affectedRows || 0)) {
        await connection.query(
          `
            INSERT INTO card_details (
              account_email,
              cardholder_name,
              card_number,
              expiry,
              card_brand
            ) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              cardholder_name = VALUES(cardholder_name),
              card_number = VALUES(card_number),
              card_brand = VALUES(card_brand),
              updated_at = CURRENT_TIMESTAMP
          `,
          [
            normalizedEmail,
            normalizedPaymentCard.cardHolderName,
            normalizedPaymentCard.cardNumber,
            normalizedPaymentCard.expiry,
            normalizedPaymentCard.brand
          ]
        );
      }
    }

    await connection.query(
      `
        INSERT INTO order_items (
          order_id,
          product_id,
          product_name,
          quantity,
          unit_price,
          line_total
        ) VALUES ?
      `,
      [
        orderItems.map((item) => [
          orderId,
          item.productId,
          item.productName,
          item.quantity,
          item.unitPrice,
          item.lineTotal
        ])
      ]
    );

    for (const item of orderItems) {
      await connection.query('UPDATE products SET stock = stock - ? WHERE id = ?', [
        item.quantity,
        item.productId
      ]);
    }

    await connection.commit();

    const estimatedDelivery = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );

    response.status(201).json({
      orderId,
      orderReference,
      itemCount,
      totalAmount,
      customerName: normalizedCustomerName,
      email: normalizedEmail,
      estimatedDelivery
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

app.use((error, request, response, next) => {
  console.error(error);

  response.status(error.statusCode || 500).json({
    message: 'Server error while processing the request.',
    details: error.code || error.message
  });
});

async function startServer() {
  try {
    await ensureRuntimeTables();
    await migrateSavedPaymentMethodsToCardDetails();
    await ensureMainAdminAccount();
    await ensureSeedProducts();
    await migrateSeedProductImages();
    await syncStoreSectionsFromCatalog();

    app.listen(port, () => {
      console.log(`API running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to seed products before server start.', error);
    process.exit(1);
  }
}

startServer();
