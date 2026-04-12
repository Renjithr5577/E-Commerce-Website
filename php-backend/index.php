<?php
declare(strict_types=1);

$config = require __DIR__ . '/config.php';

function jsonResponse(int $statusCode, $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function createPdo(array $config): PDO
{
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4',
        $config['db_host'],
        $config['db_port'],
        $config['db_name']
    );

    return new PDO(
        $dsn,
        $config['db_user'],
        $config['db_password'],
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]
    );
}

function readJsonBody(): array
{
    $rawBody = file_get_contents('php://input');

    if ($rawBody === false || trim($rawBody) === '') {
        return [];
    }

    $decodedBody = json_decode($rawBody, true);

    return is_array($decodedBody) ? $decodedBody : [];
}

function isValidEmail(string $email): bool
{
    return (bool) preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $email);
}

function numericString(float $value): float
{
    return round($value, 2);
}

function normalizeSectionName(string $value): string
{
    return preg_replace('/\s+/', ' ', trim($value)) ?: '';
}

function ensureStoreSectionsTable(PDO $pdo): void
{
    $pdo->exec(
        '
            CREATE TABLE IF NOT EXISTS store_sections (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(80) NOT NULL UNIQUE,
                sort_order INT NOT NULL DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        '
    );
}

function fetchStoreSections(PDO $pdo): array
{
    $statement = $pdo->query(
        '
            SELECT
                id,
                name,
                sort_order AS sortOrder
            FROM store_sections
            ORDER BY sort_order ASC, name ASC
        '
    );

    return array_map(
        static function (array $section): array {
            $section['id'] = (int) $section['id'];
            $section['name'] = normalizeSectionName((string) ($section['name'] ?? ''));
            $section['sortOrder'] = (int) $section['sortOrder'];
            return $section;
        },
        $statement->fetchAll()
    );
}

function fetchStoreSectionByName(PDO $pdo, string $sectionName): ?array
{
    $normalizedSectionName = normalizeSectionName($sectionName);

    if ($normalizedSectionName === '') {
        return null;
    }

    $statement = $pdo->prepare(
        '
            SELECT
                id,
                name,
                sort_order AS sortOrder
            FROM store_sections
            WHERE LOWER(name) = LOWER(?)
            LIMIT 1
        '
    );
    $statement->execute([$normalizedSectionName]);
    $section = $statement->fetch();

    if ($section === false) {
        return null;
    }

    $section['id'] = (int) $section['id'];
    $section['name'] = normalizeSectionName((string) ($section['name'] ?? ''));
    $section['sortOrder'] = (int) $section['sortOrder'];

    return $section;
}

function ensureStoreSectionExists(PDO $pdo, string $sectionName): ?array
{
    $normalizedSectionName = normalizeSectionName($sectionName);

    if ($normalizedSectionName === '') {
        return null;
    }

    $existingSection = fetchStoreSectionByName($pdo, $normalizedSectionName);

    if ($existingSection !== null) {
        return $existingSection;
    }

    $maxSortOrder = $pdo->query(
        '
            SELECT COALESCE(MAX(sort_order), 0) AS maxSortOrder
            FROM store_sections
        '
    )->fetch();
    $nextSortOrder = (int) ($maxSortOrder['maxSortOrder'] ?? 0) + 1;

    $statement = $pdo->prepare(
        '
            INSERT INTO store_sections (name, sort_order)
            VALUES (?, ?)
        '
    );
    $statement->execute([$normalizedSectionName, $nextSortOrder]);

    return fetchStoreSectionByName($pdo, $normalizedSectionName);
}

function syncStoreSectionsFromCatalog(PDO $pdo): void
{
    $statement = $pdo->query(
        '
            SELECT DISTINCT TRIM(category) AS categoryName
            FROM products
            WHERE TRIM(category) <> ""
            ORDER BY categoryName ASC
        '
    );

    foreach ($statement->fetchAll() as $row) {
        ensureStoreSectionExists($pdo, (string) ($row['categoryName'] ?? ''));
    }
}

function fetchProductById(PDO $pdo, int $productId): ?array
{
    $statement = $pdo->prepare(
        '
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
        '
    );
    $statement->execute([$productId]);
    $product = $statement->fetch();

    if ($product === false) {
        return null;
    }

    $product['price'] = (float) $product['price'];
    $product['rating'] = (float) $product['rating'];
    $product['stock'] = (int) $product['stock'];
    $product['featured'] = (bool) $product['featured'];

    return $product;
}

function fetchAllProducts(PDO $pdo): array
{
    $statement = $pdo->query(
        '
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
        '
    );

    return array_map(
        static function (array $product): array {
            $product['price'] = (float) $product['price'];
            $product['rating'] = (float) $product['rating'];
            $product['stock'] = (int) $product['stock'];
            $product['featured'] = (bool) $product['featured'];
            return $product;
        },
        $statement->fetchAll()
    );
}

function fetchOrderItems(PDO $pdo, int $orderId): array
{
    $statement = $pdo->prepare(
        '
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
        '
    );
    $statement->execute([$orderId]);

    return array_map(
        static function (array $item): array {
            $item['quantity'] = (int) $item['quantity'];
            $item['unitPrice'] = (float) $item['unitPrice'];
            $item['lineTotal'] = (float) $item['lineTotal'];
            return $item;
        },
        $statement->fetchAll()
    );
}

function fetchOrderDetail(PDO $pdo, int $orderId): ?array
{
    $statement = $pdo->prepare(
        '
            SELECT
                id AS orderId,
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
        '
    );
    $statement->execute([$orderId]);
    $order = $statement->fetch();

    if ($order === false) {
        return null;
    }

    $order['itemCount'] = (int) $order['itemCount'];
    $order['subtotal'] = (float) $order['subtotal'];
    $order['deliveryFee'] = (float) $order['deliveryFee'];
    $order['totalAmount'] = (float) $order['totalAmount'];
    $order['items'] = fetchOrderItems($pdo, $orderId);

    return $order;
}

function fetchLatestCustomerOrder(PDO $pdo, string $email): ?array
{
    $statement = $pdo->prepare(
        '
            SELECT id AS orderId
            FROM orders
            WHERE email = ?
            ORDER BY created_at DESC, id DESC
            LIMIT 1
        '
    );
    $statement->execute([$email]);
    $row = $statement->fetch();

    if ($row === false) {
        return null;
    }

    return fetchOrderDetail($pdo, (int) $row['orderId']);
}

function fetchCustomerRecentOrderedProducts(PDO $pdo, string $email): array
{
    $statement = $pdo->prepare(
        '
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
        '
    );
    $statement->execute([$email]);

    return array_map(
        static function (array $product): array {
            $product['quantity'] = (int) $product['quantity'];
            $product['unitPrice'] = (float) $product['unitPrice'];
            $product['lineTotal'] = (float) $product['lineTotal'];
            return $product;
        },
        $statement->fetchAll()
    );
}

function fetchActionableSupportTicketCount(PDO $pdo): int
{
    $statement = $pdo->query(
        "
            SELECT COUNT(*) AS actionableTicketCount
            FROM support_tickets
            WHERE status IN ('open', 'in_progress')
        "
    );
    $row = $statement->fetch();

    return (int) ($row['actionableTicketCount'] ?? 0);
}

function fetchAdminOverview(PDO $pdo): array
{
    $productStats = $pdo->query(
        '
            SELECT
                COUNT(*) AS productCount,
                COALESCE(SUM(stock), 0) AS inventoryUnits,
                COALESCE(SUM(CASE WHEN stock <= 5 THEN 1 ELSE 0 END), 0) AS lowStockCount
            FROM products
        '
    )->fetch() ?: [];

    $orderStats = $pdo->query(
        '
            SELECT
                COUNT(*) AS orderCount,
                COALESCE(SUM(item_count), 0) AS soldUnits,
                COALESCE(SUM(total_amount), 0) AS revenue
            FROM orders
        '
    )->fetch() ?: [];

    $supportStats = $pdo->query(
        "
            SELECT
                COUNT(*) AS openTicketCount
            FROM support_tickets
            WHERE status IN ('open', 'in_progress')
        "
    )->fetch() ?: [];

    $recentOrders = $pdo->query(
        '
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
        '
    )->fetchAll();

    $recentOrderedProducts = $pdo->query(
        '
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
        '
    )->fetchAll();

    $topProducts = $pdo->query(
        '
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
        '
    )->fetchAll();

    $outOfStockProducts = $pdo->query(
        '
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
        '
    )->fetchAll();

    $recentTickets = $pdo->query(
        '
            SELECT
                id,
                customer_name AS customerName,
                email,
                order_reference AS orderReference,
                issue_type AS issueType,
                subject,
                message,
                status,
                COALESCE(admin_response, "") AS adminResponse,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM support_tickets
            ORDER BY created_at DESC, id DESC
            LIMIT 6
        '
    )->fetchAll();

    return [
        'productCount' => (int) ($productStats['productCount'] ?? 0),
        'inventoryUnits' => (int) ($productStats['inventoryUnits'] ?? 0),
        'lowStockCount' => (int) ($productStats['lowStockCount'] ?? 0),
        'orderCount' => (int) ($orderStats['orderCount'] ?? 0),
        'soldUnits' => (int) ($orderStats['soldUnits'] ?? 0),
        'revenue' => (float) ($orderStats['revenue'] ?? 0),
        'openTicketCount' => (int) ($supportStats['openTicketCount'] ?? 0),
        'recentOrders' => array_map(
            static function (array $order): array {
                $order['itemCount'] = (int) $order['itemCount'];
                $order['totalAmount'] = (float) $order['totalAmount'];
                return $order;
            },
            $recentOrders
        ),
        'recentOrderedProducts' => array_map(
            static function (array $product): array {
                $product['quantity'] = (int) $product['quantity'];
                $product['lineTotal'] = (float) $product['lineTotal'];
                return $product;
            },
            $recentOrderedProducts
        ),
        'topProducts' => array_map(
            static function (array $product): array {
                $product['unitsSold'] = (int) $product['unitsSold'];
                $product['revenue'] = (float) $product['revenue'];
                $product['currentStock'] = (int) $product['currentStock'];
                return $product;
            },
            $topProducts
        ),
        'outOfStockProducts' => array_map(
            static function (array $product): array {
                $product['price'] = (float) $product['price'];
                $product['rating'] = (float) $product['rating'];
                $product['stock'] = (int) $product['stock'];
                return $product;
            },
            $outOfStockProducts
        ),
        'recentTickets' => $recentTickets,
    ];
}

function fetchCustomerSupportTickets(PDO $pdo, string $email): array
{
    $statement = $pdo->prepare(
        '
            SELECT
                id,
                customer_name AS customerName,
                email,
                order_reference AS orderReference,
                issue_type AS issueType,
                subject,
                message,
                status,
                COALESCE(admin_response, "") AS adminResponse,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM support_tickets
            WHERE email = ?
            ORDER BY updated_at DESC, created_at DESC, id DESC
            LIMIT 10
        '
    );
    $statement->execute([$email]);

    return $statement->fetchAll();
}

function createProduct(PDO $pdo, array $payload): array
{
    $name = trim((string) ($payload['name'] ?? ''));
    $category = normalizeSectionName((string) ($payload['category'] ?? ''));
    $description = trim((string) ($payload['description'] ?? ''));
    $imageUrl = trim((string) ($payload['imageUrl'] ?? ''));
    $badge = trim((string) ($payload['badge'] ?? ''));
    $price = (float) ($payload['price'] ?? 0);
    $rating = (float) ($payload['rating'] ?? 0);
    $stock = filter_var($payload['stock'] ?? null, FILTER_VALIDATE_INT);
    $featured = !empty($payload['featured']) ? 1 : 0;

    if (
        $name === '' ||
        $category === '' ||
        $description === '' ||
        $imageUrl === '' ||
        $price <= 0 ||
        $rating < 1 ||
        $rating > 5 ||
        $stock === false ||
        $stock < 0
    ) {
        jsonResponse(
            400,
            [
                'message' => 'Product details are incomplete. Add name, category, description, image, price, rating, and stock before saving.',
            ]
        );
    }

    ensureStoreSectionExists($pdo, $category);

    $statement = $pdo->prepare(
        '
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
        '
    );
    $statement->execute([
        $name,
        $category,
        $description,
        $imageUrl,
        $price,
        $rating,
        $stock,
        $featured,
        $badge,
    ]);

    return fetchProductById($pdo, (int) $pdo->lastInsertId()) ?? [];
}

function updateProduct(PDO $pdo, int $productId, array $payload): array
{
    $name = trim((string) ($payload['name'] ?? ''));
    $category = normalizeSectionName((string) ($payload['category'] ?? ''));
    $description = trim((string) ($payload['description'] ?? ''));
    $imageUrl = trim((string) ($payload['imageUrl'] ?? ''));
    $badge = trim((string) ($payload['badge'] ?? ''));
    $price = (float) ($payload['price'] ?? 0);
    $rating = (float) ($payload['rating'] ?? 0);
    $stock = filter_var($payload['stock'] ?? null, FILTER_VALIDATE_INT);
    $featured = !empty($payload['featured']) ? 1 : 0;

    if (
        $name === '' ||
        $category === '' ||
        $description === '' ||
        $imageUrl === '' ||
        $price <= 0 ||
        $rating < 1 ||
        $rating > 5 ||
        $stock === false ||
        $stock < 0
    ) {
        jsonResponse(
            400,
            [
                'message' => 'Product details are incomplete. Add name, category, description, image, price, rating, and stock before saving.',
            ]
        );
    }

    $existingProduct = fetchProductById($pdo, $productId);

    if ($existingProduct === null) {
        jsonResponse(404, ['message' => 'Product not found.']);
    }

    ensureStoreSectionExists($pdo, $category);

    $statement = $pdo->prepare(
        '
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
        '
    );
    $statement->execute([
        $name,
        $category,
        $description,
        $imageUrl,
        $price,
        $rating,
        $stock,
        $featured,
        $badge,
        $productId,
    ]);

    return fetchProductById($pdo, $productId) ?? [];
}

function createSupportTicket(PDO $pdo, array $payload): array
{
    $customerName = trim((string) ($payload['customerName'] ?? ''));
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    $orderReference = trim((string) ($payload['orderReference'] ?? ''));
    $issueType = trim((string) ($payload['issueType'] ?? ''));
    $subject = trim((string) ($payload['subject'] ?? ''));
    $message = trim((string) ($payload['message'] ?? ''));

    if (
        strlen($customerName) < 2 ||
        !isValidEmail($email) ||
        $issueType === '' ||
        strlen($subject) < 4 ||
        strlen($message) < 15
    ) {
        jsonResponse(
            400,
            [
                'message' => 'Support form is incomplete. Add your name, valid email, issue type, subject, and at least 15 characters in the details box.',
            ]
        );
    }

    $statement = $pdo->prepare(
        '
            INSERT INTO support_tickets (
                customer_name,
                email,
                order_reference,
                issue_type,
                subject,
                message
            ) VALUES (?, ?, ?, ?, ?, ?)
        '
    );
    $statement->execute([
        $customerName,
        $email,
        $orderReference,
        $issueType,
        $subject,
        $message,
    ]);

    return [
        'ticketId' => (int) $pdo->lastInsertId(),
        'status' => 'open',
        'customerName' => $customerName,
        'email' => $email,
        'subject' => $subject,
    ];
}

function updateSupportTicket(PDO $pdo, int $ticketId, array $payload): array
{
    $validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    $status = strtolower(trim((string) ($payload['status'] ?? '')));
    $adminResponse = trim((string) ($payload['adminResponse'] ?? ''));

    if (!in_array($status, $validStatuses, true)) {
        jsonResponse(400, ['message' => 'Choose a valid support ticket status.']);
    }

    $existsStatement = $pdo->prepare('SELECT id FROM support_tickets WHERE id = ? LIMIT 1');
    $existsStatement->execute([$ticketId]);

    if ($existsStatement->fetch() === false) {
        jsonResponse(404, ['message' => 'Support ticket was not found.']);
    }

    $updateStatement = $pdo->prepare(
        '
            UPDATE support_tickets
            SET
                status = ?,
                admin_response = ?
            WHERE id = ?
        '
    );
    $updateStatement->execute([
        $status,
        $adminResponse !== '' ? $adminResponse : null,
        $ticketId,
    ]);

    $ticketStatement = $pdo->prepare(
        '
            SELECT
                id,
                customer_name AS customerName,
                email,
                order_reference AS orderReference,
                issue_type AS issueType,
                subject,
                message,
                status,
                COALESCE(admin_response, "") AS adminResponse,
                created_at AS createdAt,
                updated_at AS updatedAt
            FROM support_tickets
            WHERE id = ?
            LIMIT 1
        '
    );
    $ticketStatement->execute([$ticketId]);

    return [
        'ticket' => $ticketStatement->fetch(),
        'openTicketCount' => fetchActionableSupportTicketCount($pdo),
    ];
}

function createOrder(PDO $pdo, array $payload): array
{
    $customerName = trim((string) ($payload['customerName'] ?? ''));
    $email = strtolower(trim((string) ($payload['email'] ?? '')));
    $phone = trim((string) ($payload['phone'] ?? ''));
    $addressLine = trim((string) ($payload['addressLine'] ?? ''));
    $city = trim((string) ($payload['city'] ?? ''));
    $state = trim((string) ($payload['state'] ?? ''));
    $postalCode = trim((string) ($payload['postalCode'] ?? ''));
    $paymentMethod = trim((string) ($payload['paymentMethod'] ?? ''));
    $notes = trim((string) ($payload['notes'] ?? ''));
    $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];

    if (
        $customerName === '' ||
        $email === '' ||
        $phone === '' ||
        $addressLine === '' ||
        $city === '' ||
        $state === '' ||
        $postalCode === '' ||
        $paymentMethod === '' ||
        $items === []
    ) {
        jsonResponse(
            400,
            [
                'message' => 'Checkout details are incomplete. Please complete the form and include at least one item.',
            ]
        );
    }

    $normalizedItems = [];

    foreach ($items as $item) {
        $productId = filter_var($item['productId'] ?? null, FILTER_VALIDATE_INT);
        $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);

        if ($productId !== false && $quantity !== false && $quantity > 0) {
            $normalizedItems[] = [
                'productId' => $productId,
                'quantity' => $quantity,
            ];
        }
    }

    if ($normalizedItems === []) {
        jsonResponse(400, ['message' => 'The order does not contain valid items.']);
    }

    $placeholders = implode(', ', array_fill(0, count($normalizedItems), '?'));
    $productIds = array_map(static fn (array $item): int => $item['productId'], $normalizedItems);

    $pdo->beginTransaction();

    try {
        $productStatement = $pdo->prepare(
            "
                SELECT
                    id,
                    name,
                    stock,
                    CAST(price AS DOUBLE) AS price
                FROM products
                WHERE id IN ($placeholders)
                FOR UPDATE
            "
        );
        $productStatement->execute($productIds);
        $products = $productStatement->fetchAll();

        if (count($products) !== count($normalizedItems)) {
            $pdo->rollBack();
            jsonResponse(400, ['message' => 'One or more products in the cart could not be found.']);
        }

        $productMap = [];

        foreach ($products as $product) {
            $productMap[(int) $product['id']] = $product;
        }

        $orderItems = [];

        foreach ($normalizedItems as $item) {
            $product = $productMap[$item['productId']] ?? null;

            if ($product === null) {
                throw new RuntimeException('Product not found during order preparation.');
            }

            if ((int) $product['stock'] < $item['quantity']) {
                $pdo->rollBack();
                jsonResponse(400, ['message' => 'Only ' . $product['stock'] . ' units are left for ' . $product['name'] . '.']);
            }

            $unitPrice = (float) $product['price'];
            $lineTotal = $unitPrice * $item['quantity'];

            $orderItems[] = [
                'productId' => (int) $product['id'],
                'productName' => $product['name'],
                'quantity' => $item['quantity'],
                'unitPrice' => $unitPrice,
                'lineTotal' => $lineTotal,
            ];
        }

        $itemCount = array_sum(array_column($orderItems, 'quantity'));
        $subtotal = array_sum(array_column($orderItems, 'lineTotal'));
        $deliveryFee = $itemCount > 0 ? 12.0 : 0.0;
        $totalAmount = $subtotal + $deliveryFee;

        $orderStatement = $pdo->prepare(
            '
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
            '
        );
        $orderStatement->execute([
            $customerName,
            $email,
            $phone,
            $addressLine,
            $city,
            $state,
            $postalCode,
            $paymentMethod,
            $notes,
            $itemCount,
            numericString($subtotal),
            numericString($deliveryFee),
            numericString($totalAmount),
        ]);

        $orderId = (int) $pdo->lastInsertId();
        $itemInsertStatement = $pdo->prepare(
            '
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    product_name,
                    quantity,
                    unit_price,
                    line_total
                ) VALUES (?, ?, ?, ?, ?, ?)
            '
        );
        $stockUpdateStatement = $pdo->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

        foreach ($orderItems as $item) {
            $itemInsertStatement->execute([
                $orderId,
                $item['productId'],
                $item['productName'],
                $item['quantity'],
                numericString($item['unitPrice']),
                numericString($item['lineTotal']),
            ]);

            $stockUpdateStatement->execute([
                $item['quantity'],
                $item['productId'],
            ]);
        }

        $pdo->commit();

        return [
            'orderId' => $orderId,
            'itemCount' => $itemCount,
            'totalAmount' => numericString($totalAmount),
            'customerName' => $customerName,
            'email' => $email,
            'estimatedDelivery' => date('M j, Y', strtotime('+4 days')),
        ];
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $error;
    }
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . $config['frontend_url']);
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

set_exception_handler(
    static function (Throwable $error): void {
        error_log($error->getMessage());
        jsonResponse(
            500,
            [
                'message' => 'Server error while processing the request.',
                'details' => $error->getMessage(),
            ]
        );
    }
);

$pdo = createPdo($config);
ensureStoreSectionsTable($pdo);
syncStoreSectionsFromCatalog($pdo);
$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
$requestPath = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$routePath = preg_replace('#^/api#', '', $requestPath) ?: '/';
$body = readJsonBody();

if ($routePath === '/' && $method === 'GET') {
    jsonResponse(
        200,
        [
            'name' => 'LuxeCart PHP API',
            'status' => 'ok',
            'database' => 'mysql',
        ]
    );
}

if ($routePath === '/health' && $method === 'GET') {
    $pdo->query('SELECT 1');
    jsonResponse(200, ['status' => 'ok', 'database' => 'connected']);
}

if ($routePath === '/store-sections' && $method === 'GET') {
    jsonResponse(200, fetchStoreSections($pdo));
}

if ($routePath === '/store-sections' && $method === 'POST') {
    $sectionName = normalizeSectionName((string) ($body['name'] ?? ''));

    if (strlen($sectionName) < 2 || strlen($sectionName) > 80) {
        jsonResponse(400, ['message' => 'Store section name must be between 2 and 80 characters.']);
    }

    if (fetchStoreSectionByName($pdo, $sectionName) !== null) {
        jsonResponse(409, ['message' => 'This store section already exists.']);
    }

    jsonResponse(201, ensureStoreSectionExists($pdo, $sectionName));
}

if ($routePath === '/products' && $method === 'GET') {
    jsonResponse(200, fetchAllProducts($pdo));
}

if ($routePath === '/products' && $method === 'POST') {
    jsonResponse(201, createProduct($pdo, $body));
}

if (preg_match('#^/products/(\d+)$#', $routePath, $matches) === 1 && $method === 'GET') {
    $product = fetchProductById($pdo, (int) $matches[1]);

    if ($product === null) {
        jsonResponse(404, ['message' => 'Product not found.']);
    }

    jsonResponse(200, $product);
}

if (preg_match('#^/products/(\d+)$#', $routePath, $matches) === 1 && $method === 'PUT') {
    jsonResponse(200, updateProduct($pdo, (int) $matches[1], $body));
}

if ($routePath === '/admin/overview' && $method === 'GET') {
    jsonResponse(200, fetchAdminOverview($pdo));
}

if (preg_match('#^/admin/orders/(\d+)$#', $routePath, $matches) === 1 && $method === 'GET') {
    $order = fetchOrderDetail($pdo, (int) $matches[1]);

    if ($order === null) {
        jsonResponse(404, ['message' => 'Order not found.']);
    }

    jsonResponse(200, $order);
}

if ($routePath === '/orders/latest' && $method === 'GET') {
    $email = strtolower(trim((string) ($_GET['email'] ?? '')));

    if (!isValidEmail($email)) {
        jsonResponse(400, ['message' => 'Use a valid account email address to load your latest order.']);
    }

    jsonResponse(200, fetchLatestCustomerOrder($pdo, $email));
}

if ($routePath === '/orders/recent-products' && $method === 'GET') {
    $email = strtolower(trim((string) ($_GET['email'] ?? '')));

    if (!isValidEmail($email)) {
        jsonResponse(400, ['message' => 'Use a valid account email address to load your ordered products.']);
    }

    jsonResponse(200, fetchCustomerRecentOrderedProducts($pdo, $email));
}

if ($routePath === '/orders' && $method === 'POST') {
    jsonResponse(201, createOrder($pdo, $body));
}

if ($routePath === '/support' && $method === 'POST') {
    jsonResponse(201, createSupportTicket($pdo, $body));
}

if ($routePath === '/support' && $method === 'GET') {
    $email = strtolower(trim((string) ($_GET['email'] ?? '')));

    if (!isValidEmail($email)) {
        jsonResponse(400, ['message' => 'Use a valid account email address to load your support updates.']);
    }

    jsonResponse(200, fetchCustomerSupportTickets($pdo, $email));
}

if (preg_match('#^/admin/support/(\d+)$#', $routePath, $matches) === 1 && $method === 'PATCH') {
    jsonResponse(200, updateSupportTicket($pdo, (int) $matches[1], $body));
}

jsonResponse(404, ['message' => 'Route not found.']);
