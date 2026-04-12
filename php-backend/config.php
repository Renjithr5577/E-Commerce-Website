<?php
declare(strict_types=1);

function phpBackendParseEnvFile(string $filePath): array
{
    if (!is_file($filePath)) {
        return [];
    }

    $values = [];
    $lines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);

    if ($lines === false) {
        return [];
    }

    foreach ($lines as $line) {
        $trimmedLine = trim($line);

        if ($trimmedLine === '' || str_starts_with($trimmedLine, '#') || !str_contains($trimmedLine, '=')) {
            continue;
        }

        [$key, $value] = explode('=', $trimmedLine, 2);
        $values[trim($key)] = trim($value);
    }

    return $values;
}

$repoRoot = dirname(__DIR__);
$sharedEnv = phpBackendParseEnvFile($repoRoot . DIRECTORY_SEPARATOR . 'backend' . DIRECTORY_SEPARATOR . '.env');

return [
    'frontend_url' => getenv('FRONTEND_URL') ?: ($sharedEnv['FRONTEND_URL'] ?? 'http://localhost:4200'),
    'db_host' => getenv('DB_HOST') ?: ($sharedEnv['DB_HOST'] ?? 'localhost'),
    'db_port' => (int) (getenv('DB_PORT') ?: ($sharedEnv['DB_PORT'] ?? 3306)),
    'db_name' => getenv('DB_NAME') ?: ($sharedEnv['DB_NAME'] ?? 'ecommerce_store'),
    'db_user' => getenv('DB_USER') ?: ($sharedEnv['DB_USER'] ?? 'root'),
    'db_password' => getenv('DB_PASSWORD') ?: ($sharedEnv['DB_PASSWORD'] ?? ''),
];
