<?php
/**
 * Shared project storage for installations that are served as plain files.
 *
 * The static export cannot write anything by itself - a web server handing out
 * files has nowhere to put them. This script is the small server-side piece
 * that gives those installations the same shared folder the Node build offers
 * through /api/shared-projects, and it answers with exactly the same JSON, so
 * the interface does not need to know which of the two it is talking to.
 *
 * It stays switched off until somebody creates a directory named "store" next
 * to this file, or the one LAYERLING_SHARED_PROJECTS_DIR names. That is deliberate: the folder has no login, so whoever can
 * reach the page can read, write and delete what is in it. Creating the folder
 * by hand is the decision to allow that.
 */

declare(strict_types=1);

const STORE_DIRECTORY     = 'store';
const THUMBNAILS_DIRECTORY = '.thumbnails';

/** Grenzen der Suche: so viele Treffer, so tief, so viele Ordner. */
const SEARCH_RESULT_LIMIT = 200;
const SEARCH_DEPTH_LIMIT = 12;
const SEARCH_FOLDER_LIMIT = 2000;
const MAX_PROJECT_BYTES   = 512 * 1024 * 1024;  // mirrors LYL_LIMITS.archiveBytes
/** The files an export may be called on the server (#779), as in route.ts. */
const EXPORT_FILE_EXTENSIONS = ['stl', '3mf', 'obj', 'step', 'stp', 'svg', 'dxf', 'png', 'pdf'];
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const LYL_MEDIA_TYPE      = 'application/vnd.layerling.project+zip';
/** A folder name may not look like a path, a hidden file, or carry control codes. */
const FOLDER_NAME_UNSAFE = "<>:\"|?*/\\";

/**
 * Apache serves nothing from the folder at all. The app never fetches a file there by its address -
 * projects, pictures and exports all go through this script - and a slicer that shares the folder
 * reads it on disk. An export is written as it comes (#779), so an SVG with a script in it, opened
 * from the folder, would run on the app's own address and reach every visitor's designs in their
 * browser (GHSA-wj5x-5r5v-89r3). Nothing in here may execute either. `php_flag` is deliberately
 * absent - it throws a 500 on servers running PHP as FPM rather than as a module, which would break
 * the whole directory. An existing store gets this guard on its next request (ensure_store_guard).
 */
const STORE_HTACCESS = <<<'HTACCESS'
# Written by store.php. Projects live here; nothing in here is served or may execute.
Options -ExecCGI -Indexes
RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar
RemoveType .php .phtml .phar
<IfModule mod_authz_core.c>
  Require all denied
</IfModule>
<IfModule !mod_authz_core.c>
  Order allow,deny
  Deny from all
</IfModule>
HTACCESS;

// ---------------------------------------------------------------- utilities

/**
 * Paths to remove when the request ends - lock files and half-written uploads.
 *
 * `finally` is no help here: send_json() and fail() end the script with exit,
 * and PHP skips finally blocks on exit. A left-over lock would make the next
 * save of the same project fail with "somebody else is writing" until it went
 * stale. A shutdown function runs in both cases, so the cleanup lives here.
 */
$GLOBALS['store_cleanup'] = [];

function cleanup_later(string $path): void
{
    $GLOBALS['store_cleanup'][] = $path;
}

function cleanup_now(string $path): void
{
    $GLOBALS['store_cleanup'] = array_values(array_filter(
        $GLOBALS['store_cleanup'],
        static fn(string $entry): bool => $entry !== $path,
    ));
}

register_shutdown_function(static function (): void {
    foreach ($GLOBALS['store_cleanup'] ?? [] as $path) {
        @unlink($path);
    }
});

function send_json(array $payload, int $status = 200, array $headers = []): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    foreach ($headers as $name => $value) {
        header($name . ': ' . $value);
    }
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(string $message, int $status, array $extra = []): void
{
    send_json(array_merge(['error' => $message], $extra), $status);
}

/**
 * Detects the authenticated user when configured with LAYERLING_USER_HEADER.
 * If the setting is unset or empty, header-based user isolation is disabled.
 *
 * Returns a sanitized folder name if authenticated, or null if disabled / unauthenticated.
 */
function authenticated_user_folder(): ?string
{
    $userHeader = getenv('LAYERLING_USER_HEADER');
    if (!is_string($userHeader) || trim($userHeader) === '') {
        $userHeader = $_ENV['LAYERLING_USER_HEADER'] ?? $_SERVER['LAYERLING_USER_HEADER'] ?? null;
    }
    if (!is_string($userHeader) || trim($userHeader) === '') {
        return null;
    }

    $headerName = trim($userHeader);
    $identity = null;

    $serverKey = 'HTTP_' . strtoupper(str_replace('-', '_', $headerName));
    if (isset($_SERVER[$serverKey]) && is_string($_SERVER[$serverKey])) {
        $identity = $_SERVER[$serverKey];
    } elseif (isset($_SERVER[$headerName]) && is_string($_SERVER[$headerName])) {
        $identity = $_SERVER[$headerName];
    } else {
        $upper = strtoupper(str_replace('-', '_', $headerName));
        if (isset($_SERVER[$upper]) && is_string($_SERVER[$upper])) {
            $identity = $_SERVER[$upper];
        } elseif ($upper === 'REMOTE_USER' && isset($_SERVER['REDIRECT_REMOTE_USER']) && is_string($_SERVER['REDIRECT_REMOTE_USER'])) {
            $identity = $_SERVER['REDIRECT_REMOTE_USER'];
        } elseif (function_exists('getallheaders')) {
            $all = getallheaders();
            if (is_array($all)) {
                foreach ($all as $k => $v) {
                    if (strcasecmp((string) $k, $headerName) === 0 && is_string($v)) {
                        $identity = $v;
                        break;
                    }
                }
            }
        }
    }

    if (!is_string($identity) || trim($identity) === '') {
        return null;
    }

    $safe = str_replace('@', '_at_', strtolower(trim($identity)));
    $safe = preg_replace('/[^a-z0-9_.-]/', '_', $safe);
    $safe = trim($safe, '._-');
    return $safe !== '' ? $safe : null;
}

/** The folder LAYERLING_SHARED_PROJECTS_DIR names, the setting the Node route reads too, or null without one. */
function configured_store_path(): ?string
{
    $configured = getenv('LAYERLING_SHARED_PROJECTS_DIR');
    if (!is_string($configured) || trim($configured) === '') {
        $configured = $_ENV['LAYERLING_SHARED_PROJECTS_DIR'] ?? $_SERVER['LAYERLING_SHARED_PROJECTS_DIR'] ?? null;
    }
    if (!is_string($configured) || trim($configured) === '') {
        return null;
    }
    $trimmed = rtrim(trim($configured), '/\\');
    return $trimmed === '' ? DIRECTORY_SEPARATOR : $trimmed;
}

/**
 * Where the store lives (#1050): the configured folder, which may lie outside the web root so no
 * address reaches it at all, or else "store" next to this file. Either way it has to exist.
 */
function store_base_path(): string
{
    return configured_store_path() ?? __DIR__ . DIRECTORY_SEPARATOR . STORE_DIRECTORY;
}

/** The store, or null while nobody has created it. */
function store_root(): ?string
{
    $base = store_base_path();
    if (!is_dir($base)) {
        return null;
    }

    $userFolder = authenticated_user_folder();

    // 1. Authenticated: Scope to the user's isolated subfolder inside .users/
    if ($userFolder !== null) {
        $usersBase = $base . DIRECTORY_SEPARATOR . '.users';
        $userRoot = $usersBase . DIRECTORY_SEPARATOR . $userFolder;
        if (!is_dir($userRoot) && !@mkdir($userRoot, 0775, true) && !is_dir($userRoot)) {
            return null;
        }
        $resolved = realpath($userRoot);
        return $resolved === false ? null : $resolved;
    }

    // 2. Unauthenticated: Preserve default behavior (shared /store/ directory)
    $resolved = realpath($base);
    return $resolved === false ? null : $resolved;
}

/** Keeps the guard file current without ever touching the projects. */
function ensure_store_guard(string $root): void
{
    $base = store_base_path();
    $directories = array_unique([$base, $root]);
    foreach ($directories as $dir) {
        if (is_dir($dir)) {
            $guard = $dir . DIRECTORY_SEPARATOR . '.htaccess';
            if (!is_file($guard) || file_get_contents($guard) !== STORE_HTACCESS) {
                @file_put_contents($guard, STORE_HTACCESS);
            }
        }
    }
}

/** The same sanitising the Node route applies, so both write identical names. */
function project_stem(string $requested): string
{
    $stem = preg_replace('/\.(lyl|skf)$/i', '', $requested);
    $stem = basename($stem);
    $stem = preg_replace('/[<>:"\/\\\\|?*\x00-\x1f]/', '_', $stem);
    $stem = preg_replace('/\s+/', ' ', $stem);
    $stem = trim($stem);
    if (function_exists('mb_substr')) {
        $stem = mb_substr($stem, 0, 115);
    } else {
        $stem = substr($stem, 0, 115);
    }
    return $stem === '' ? 'Untitled project' : $stem;
}

/** Saving always writes .lyl. */
function safe_project_file_name(string $requested): string
{
    return project_stem($requested) . '.lyl';
}

/** A project saved before the rename is an .skf and keeps that name. */
function existing_project_file_name(string $requested): string
{
    $extension = preg_match('/\.(lyl|skf)$/i', $requested, $match) === 1
        ? strtolower($match[0])
        : '.lyl';
    return project_stem($requested) . $extension;
}

/**
 * An opaque token that changes whenever the file does. PHP only reports whole
 * seconds for the modification time, so this is coarser than the Node version -
 * which does not matter, because the two never share a folder and the value is
 * only ever compared against itself.
 */
function revision_for(array $stat): string
{
    return dechex($stat['size']) . '-' . dechex((int) round($stat['mtime'] * 1000000));
}

/** Stat of a plain file - symbolic links and directories are refused. */
function regular_file_stat(string $path): ?array
{
    if (!is_file($path) || is_link($path)) {
        return null;
    }
    $stat = @stat($path);
    if ($stat === false) {
        return null;
    }
    return ['size' => (int) $stat['size'], 'mtime' => (int) $stat['mtime']];
}

/**
 * Written as a plain check rather than a pattern: a regular expression for this
 * needs escaped backslashes and a control-code range, and both are easy to get
 * silently wrong in a file that travels through several tools.
 */
function folder_name_ok(string $segment): bool
{
    if ($segment === '' || $segment === '.' || $segment === '..' || $segment[0] === '.') {
        return false;
    }
    if (strlen($segment) > 80) {
        return false;
    }
    if (strpbrk($segment, FOLDER_NAME_UNSAFE) !== false) {
        return false;
    }
    for ($index = 0, $length = strlen($segment); $index < $length; $index++) {
        if (ord($segment[$index]) < 32) {
            return false;
        }
    }
    return true;
}

/**
 * Turns the path from the query into a real directory inside the store, or
 * refuses it.
 *
 * This is the one place where something from the network chooses a location on
 * disk, so it is deliberately narrow: every segment is checked on its own, "."
 * and ".." never pass, names cannot start with a dot, and the resolved result
 * must still sit inside the store. Anything else is answered with 400 rather
 * than repaired, because a path that needs repairing is not one we wrote.
 */
function resolve_folder(string $root, string $requested, bool $mustExist = true): string
{
    $requested = str_replace(chr(92), '/', trim($requested));
    $requested = trim($requested, '/');
    if ($requested === '') {
        return $root;
    }
    $segments = [];
    foreach (explode('/', $requested) as $segment) {
        $segment = trim($segment);
        if (!folder_name_ok($segment)) {
            fail('That folder name is not allowed', 400);
        }
        $segments[] = $segment;
    }
    $candidate = $root . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $segments);
    if (!$mustExist) {
        return $candidate;
    }
    $resolved = realpath($candidate);
    if ($resolved === false || !is_dir($resolved)) {
        fail('That folder is not on the server', 404);
    }
    // realpath has followed every link by now, so this catches the ways out.
    if ($resolved !== $root && strpos($resolved, $root . DIRECTORY_SEPARATOR) !== 0) {
        fail('That folder is not allowed', 400);
    }
    return $resolved;
}

/** The part of a path that goes back to the browser, always with forward slashes. */
function folder_key(string $root, string $folder): string
{
    if ($folder === $root) {
        return '';
    }
    return str_replace(DIRECTORY_SEPARATOR, '/', substr($folder, strlen($root) + 1));
}

function thumbnail_path(string $root, string $fileName, string $revision): string
{
    return $root . DIRECTORY_SEPARATOR . THUMBNAILS_DIRECTORY . DIRECTORY_SEPARATOR . $fileName . '.' . $revision . '.png';
}

/** Relative on purpose: the app may be served from a sub-directory. */
function thumbnail_url(string $fileName, string $revision, string $path = ''): string
{
    $query = ['fileName' => $fileName, 'thumbnail' => '1', 'v' => $revision];
    if ($path !== '') {
        $query['path'] = $path;
    }
    return 'store.php?' . http_build_query($query);
}

function project_record(string $fileName, array $stat, bool $hasThumbnail, string $path = ''): array
{
    $revision = revision_for($stat);
    $record = [
        'fileName'  => $fileName,
        'path'      => $path,
        'name'      => preg_replace('/\.(lyl|skf)$/i', '', $fileName),
        'updatedAt' => $stat['mtime'] * 1000,
        'size'      => $stat['size'],
        'revision'  => $revision,
    ];
    if ($hasThumbnail) {
        $record['thumbnailUrl'] = thumbnail_url($fileName, $revision, $path);
    }
    return $record;
}

function unquote_etag(?string $value): ?string
{
    if ($value === null) {
        return null;
    }
    $value = trim($value);
    $value = preg_replace('/^W\//', '', $value);
    return trim($value, '"');
}

/** Writes from other sites are refused; a missing Origin is a plain navigation. */
function same_origin(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? null;
    if ($origin === null || $origin === '') {
        return true;
    }
    $forwardedHost  = isset($_SERVER['HTTP_X_FORWARDED_HOST']) ? trim(explode(',', $_SERVER['HTTP_X_FORWARDED_HOST'])[0]) : '';
    $forwardedProto = isset($_SERVER['HTTP_X_FORWARDED_PROTO']) ? trim(explode(',', $_SERVER['HTTP_X_FORWARDED_PROTO'])[0]) : '';
    $host = $forwardedHost !== '' ? $forwardedHost : ($_SERVER['HTTP_HOST'] ?? '');
    if ($forwardedProto !== '') {
        $scheme = $forwardedProto;
    } elseif ((!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')) {
        $scheme = 'https';
    } else {
        $scheme = 'http';
    }
    if (strcasecmp($origin, $scheme . '://' . $host) === 0) {
        return true;
    }
    // A proxy that closes HTTPS but does not say so: an https Origin on the very same host is this site.
    if ($forwardedProto === '' && strcasecmp($origin, 'https://' . $host) === 0) {
        return true;
    }
    // LAYERLING_ALLOWED_ORIGINS: full origins or bare hosts, for a proxy that rewrites the host.
    $listed = getenv('LAYERLING_ALLOWED_ORIGINS');
    if (is_string($listed) && $listed !== '') {
        $bare = preg_replace('#^https?://#i', '', $origin);
        foreach (explode(',', $listed) as $entry) {
            $entry = rtrim(trim($entry), '/');
            if ($entry !== '' && (strcasecmp($entry, $origin) === 0 || strcasecmp($entry, $bare) === 0)) {
                return true;
            }
        }
    }
    return false;
}

/**
 * The request body, streamed into a temporary file outside the store, or the file PHP already
 * received for a form upload. Never held in memory as a whole (#588): with a surface texture a
 * design runs to hundreds of MB, and reading that into a string was the slow part of a save on a
 * small server - or ran past memory_limit. Checked where it lies; only a file that passes reaches
 * the store folder.
 */
function received_file(?string $uploadedPath): string
{
    if ($uploadedPath !== null) {
        return $uploadedPath;
    }
    $path = tempnam(sys_get_temp_dir(), 'lyl');
    if ($path === false) {
        fail('The server has no temporary folder to receive the upload in', 500);
    }
    cleanup_later($path);
    $input = fopen('php://input', 'rb');
    $output = fopen($path, 'wb');
    if ($input === false || $output === false || stream_copy_to_stream($input, $output) === false) {
        fail('The upload could not be received', 500);
    }
    fclose($input);
    fclose($output);
    return $path;
}

function file_size_of(string $path): int
{
    clearstatcache(true, $path);
    return (int) @filesize($path);
}

/** The first bytes of a file, enough for every signature checked here. */
function file_head(string $path, int $length = 4096): string
{
    $handle = @fopen($path, 'rb');
    if ($handle === false) {
        return '';
    }
    $head = (string) fread($handle, $length);
    fclose($handle);
    return $head;
}

/**
 * Into the store folder: a form upload with move_uploaded_file, the streamed body with rename (both
 * copy across disks). tempnam made the latter readable by its owner alone; it gets the rights a file
 * written there would have, so a slicer sharing the folder can still read it.
 */
function move_received_file(string $from, string $to, bool $uploaded): bool
{
    if ($uploaded) {
        return @move_uploaded_file($from, $to);
    }
    if (!@rename($from, $to)) {
        return false;
    }
    @chmod($to, 0666 & ~umask());
    return true;
}

/** A .lyl is a ZIP. Anything else never reaches the disk. */
function looks_like_lyl(string $path): bool
{
    $signature = substr(file_head($path, 4), 0, 4);
    if ($signature !== "PK\x03\x04" && $signature !== "PK\x05\x06") {
        return false;
    }
    if (!class_exists('ZipArchive')) {
        return true;
    }
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
        return false;
    }
    $hasManifest = $zip->locateName('project.json') !== false;
    $zip->close();
    return $hasManifest;
}

function is_png(string $bytes): bool
{
    return strncmp($bytes, "\x89PNG\r\n\x1a\n", 8) === 0;
}

/** An exclusive lock file, so two browsers cannot write the same project at once. */
function acquire_lock(string $filePath): string
{
    $lockPath = $filePath . '.lock';
    $handle = @fopen($lockPath, 'x');
    if ($handle === false) {
        // A lock older than a minute is a leftover from a crashed request.
        $age = @filemtime($lockPath);
        if ($age !== false && time() - $age > 60) {
            @unlink($lockPath);
            $handle = @fopen($lockPath, 'x');
        }
    }
    if ($handle === false) {
        fail('This shared project is currently being changed by someone else', 409);
    }
    fclose($handle);
    cleanup_later($lockPath);
    return $lockPath;
}

/** What is inside a folder, without looking any deeper. */
function folder_contents_count(string $folder): array
{
    $projects = 0;
    $folders = 0;
    $files = 0;
    foreach (scandir($folder) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
            continue;
        }
        $full = $folder . DIRECTORY_SEPARATOR . $entry;
        if (is_dir($full) && !is_link($full)) {
            $folders += 1;
            continue;
        }
        if (preg_match('/\.(lyl|skf)$/i', $entry)) {
            $projects += 1;
        } elseif (is_file($full)) {
            $files += 1;
        }
    }
    return ['projects' => $projects, 'folders' => $folders, 'files' => $files];
}

/**
 * A folder and everything under it. Links are unlinked rather than followed,
 * so nothing outside the store can be reached through one.
 */
function remove_folder_tree(string $path): bool
{
    foreach (scandir($path) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..') {
            continue;
        }
        $full = $path . DIRECTORY_SEPARATOR . $entry;
        if (is_link($full) || !is_dir($full)) {
            if (!@unlink($full)) {
                return false;
            }
            continue;
        }
        if (!remove_folder_tree($full)) {
            return false;
        }
    }
    return @rmdir($path);
}

// ------------------------------------------------------------------ handlers

/**
 * Die Suche durch den ganzen Speicher, von oben.
 *
 * Eine Auflistung zeigt immer nur einen Ordner; wer etwas sucht, weiss aber
 * gerade nicht, in welchem es liegt. Deshalb laeuft die Suche ueber den ganzen
 * Baum und schreibt zu jedem Treffer den Ordner dazu, in dem er steht.
 *
 * Sie ist bewusst begrenzt - Treffer, Tiefe und Anzahl der Ordner -, damit ein
 * verirrter Baum die Antwort nicht aufhaelt; `truncated` sagt, dass abgebrochen
 * wurde. Verknuepfungen zaehlen nicht als Ordner, sonst liefe die Suche im
 * Kreis.
 */
function search_store(string $root, string $term): void
{
    $needle = function_exists('mb_strtolower') ? mb_strtolower($term) : strtolower($term);
    $projects = [];
    $folders = [];
    $truncated = false;
    $visited = 0;

    $contains = static function (string $haystack) use ($needle): bool {
        $lower = function_exists('mb_strtolower') ? mb_strtolower($haystack) : strtolower($haystack);
        return $needle === '' || strpos($lower, $needle) !== false;
    };

    $walk = static function (string $folder, int $depth) use (&$walk, $root, $contains, &$projects, &$folders, &$truncated, &$visited): void {
        if ($depth > SEARCH_DEPTH_LIMIT || $visited >= SEARCH_FOLDER_LIMIT) {
            $truncated = true;
            return;
        }
        $visited++;
        $folderKey = folder_key($root, $folder);
        foreach (scandir($folder) ?: [] as $entry) {
            if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
                continue;
            }
            if (count($projects) + count($folders) >= SEARCH_RESULT_LIMIT) {
                $truncated = true;
                return;
            }
            $full = $folder . DIRECTORY_SEPARATOR . $entry;
            if (is_dir($full) && !is_link($full)) {
                if ($contains($entry)) {
                    $folders[] = ['name' => $entry, 'path' => $folderKey] + folder_contents_count($full);
                }
                $walk($full, $depth + 1);
                continue;
            }
            if (!preg_match('/\.(lyl|skf)$/i', $entry)) {
                continue;
            }
            $name = preg_replace('/\.(lyl|skf)$/i', '', $entry);
            if (!$contains($name)) {
                continue;
            }
            $stat = regular_file_stat($full);
            if ($stat === null) {
                continue;
            }
            $revision = revision_for($stat);
            $hasThumbnail = regular_file_stat(thumbnail_path($folder, $entry, $revision)) !== null;
            $projects[] = project_record($entry, $stat, $hasThumbnail, $folderKey);
        }
    };

    $walk($root, 0);
    usort($projects, static fn(array $a, array $b): int => $b['updatedAt'] <=> $a['updatedAt']);
    usort($folders, static fn(array $a, array $b): int => strcasecmp($a['name'], $b['name']));
    send_json([
        'enabled'   => true,
        'search'    => $term,
        'truncated' => $truncated,
        'folders'   => array_values($folders),
        'projects'  => array_values($projects),
    ]);
}

/**
 * Every design in the store with the folder it is in, and the folders with nothing in them: what
 * "Back up all" on the start page's server tab packs. The same bounds as the search; the custom
 * shapes keep their own folder and are shapes, not designs.
 */
function handle_all_designs(string $root): void
{
    $projects = [];
    $emptyFolders = [];
    $truncated = false;
    $visited = 0;

    $walk = static function (string $folder, int $depth) use (&$walk, $root, &$projects, &$emptyFolders, &$truncated, &$visited): void {
        if ($depth > SEARCH_DEPTH_LIMIT || $visited >= SEARCH_FOLDER_LIMIT) {
            $truncated = true;
            return;
        }
        $visited++;
        $folderKey = folder_key($root, $folder);
        $entries = array_values(array_filter(scandir($folder) ?: [], static fn(string $entry): bool => $entry[0] !== '.'));
        if ($depth > 0 && $entries === []) {
            $emptyFolders[] = $folderKey;
        }
        foreach ($entries as $entry) {
            $full = $folder . DIRECTORY_SEPARATOR . $entry;
            if (is_dir($full) && !is_link($full)) {
                if ($depth === 0 && $entry === 'Custom shapes') {
                    continue;
                }
                $walk($full, $depth + 1);
                continue;
            }
            if (!preg_match('/\.(lyl|skf)$/i', $entry)) {
                continue;
            }
            $stat = regular_file_stat($full);
            if ($stat === null) {
                continue;
            }
            $hasThumbnail = regular_file_stat(thumbnail_path($folder, $entry, revision_for($stat))) !== null;
            $projects[] = project_record($entry, $stat, $hasThumbnail, $folderKey);
        }
    };

    $walk($root, 0);
    send_json([
        'enabled'      => true,
        'truncated'    => $truncated,
        'emptyFolders' => $emptyFolders,
        'projects'     => $projects,
    ]);
}

function handle_list(string $root, string $folder): void
{
    $projects = [];
    $folders = [];
    foreach (scandir($folder) ?: [] as $entry) {
        if ($entry === '.' || $entry === '..' || $entry[0] === '.') {
            continue;
        }
        $full = $folder . DIRECTORY_SEPARATOR . $entry;
        if (is_dir($full) && !is_link($full)) {
            $folders[] = ['name' => $entry] + folder_contents_count($full);
            continue;
        }
        if (!preg_match('/\.(lyl|skf)$/i', $entry)) {
            continue;
        }
        $stat = regular_file_stat($full);
        if ($stat === null) {
            continue;
        }
        $revision = revision_for($stat);
        $hasThumbnail = regular_file_stat(thumbnail_path($folder, $entry, $revision)) !== null;
        $projects[] = project_record($entry, $stat, $hasThumbnail, folder_key($root, $folder));
    }
    usort($projects, static fn(array $a, array $b): int => $b['updatedAt'] <=> $a['updatedAt']);
    usort($folders, static fn(array $a, array $b): int => strcasecmp($a['name'], $b['name']));
    send_json([
        'enabled'  => true,
        'path'     => folder_key($root, $folder),
        'folders'  => array_values($folders),
        'projects' => array_values($projects),
    ]);
}

/** Creating a folder is the one write that touches no project at all. */
function handle_create_folder(string $root, string $folder, string $name): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin changes', 403);
    }
    $name = trim($name);
    if (!folder_name_ok($name)) {
        fail('That folder name is not allowed', 400);
    }
    $target = $folder . DIRECTORY_SEPARATOR . $name;
    if (is_dir($target)) {
        fail('A folder of that name is already there', 409);
    }
    if (!@mkdir($target, 0775)) {
        fail('The folder could not be created', 500);
    }
    send_json(['created' => true, 'path' => folder_key($root, $target)], 201);
}

/**
 * Renaming a folder. The projects inside travel with it, and so do their
 * pictures - they live in the folder, not in a register somewhere else.
 */
function handle_rename_folder(string $root, string $folder, string $name): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin changes', 403);
    }
    if ($folder === $root) {
        fail('The store folder itself cannot be renamed', 400);
    }
    // The custom shapes are found by this folder's name.
    if (dirname($folder) === $root && basename($folder) === 'Custom shapes') {
        fail('The custom shapes folder cannot be renamed', 400);
    }
    $name = trim($name);
    if (!folder_name_ok($name)) {
        fail('That folder name is not allowed', 400);
    }
    $parent = dirname($folder);
    $current = basename($folder);
    if ($name === $current) {
        fail('That folder is already called that', 409);
    }
    $target = $parent . DIRECTORY_SEPARATOR . $name;
    // A file system that ignores case reports the folder itself as being in
    // the way when only the spelling of the name changes. That one is allowed.
    $sameFolderInOtherCase = strcasecmp($name, $current) === 0;
    if (!$sameFolderInOtherCase && (is_dir($target) || regular_file_stat($target) !== null)) {
        fail('A folder of that name is already there', 409);
    }
    if (!@rename($folder, $target)) {
        fail('The folder could not be renamed', 500);
    }
    $resolved = realpath($target);
    if ($resolved === false) {
        fail('The folder vanished right after it was renamed', 500);
    }
    send_json([
        'renamed' => true,
        'from'    => folder_key($root, $folder),
        'path'    => folder_key($root, $resolved),
    ]);
}

/**
 * Streams a file to the client in small chunks with output buffering cleared,
 * ensuring constant low memory usage (~64 KB) and immediate TTFB even for large files.
 */
function stream_file(string $path): void
{
    while (ob_get_level()) {
        ob_end_clean();
    }
    if (function_exists('ini_set')) {
        @ini_set('zlib.output_compression', 'Off');
    }
    if (function_exists('set_time_limit')) {
        @set_time_limit(0);
    }

    $handle = @fopen($path, 'rb');
    if ($handle === false) {
        return;
    }
    fpassthru($handle);
    fclose($handle);
}

function handle_download(string $root, string $folder, string $requested): void
{
    $fileName = existing_project_file_name($requested);
    if ($fileName !== $requested) {
        fail('Invalid shared project name', 400);
    }
    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    $stat = regular_file_stat($filePath);
    if ($stat === null) {
        fail('Shared project was not found', 404);
    }
    $revision = revision_for($stat);

    if (($_GET['thumbnail'] ?? '') === '1') {
        $requestedRevision = $_GET['v'] ?? '';
        if ($requestedRevision !== '' && $requestedRevision !== $revision) {
            fail('Shared project thumbnail revision is stale', 404);
        }
        $imagePath = thumbnail_path($folder, $fileName, $revision);
        if (regular_file_stat($imagePath) === null) {
            fail('Shared project thumbnail was not found', 404);
        }
        header('Content-Type: image/png');
        header('Cache-Control: public, max-age=31536000, immutable');
        header('ETag: "' . $revision . '"');
        header('Content-Length: ' . (string) filesize($imagePath));
        stream_file($imagePath);
        exit;
    }

    header('Content-Type: ' . LYL_MEDIA_TYPE);
    header('Cache-Control: no-store');
    header('ETag: "' . $revision . '"');
    header('Content-Length: ' . (string) $stat['size']);
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($fileName));
    stream_file($filePath);
    exit;
}

/**
 * What PHP's upload error code means, in words the person at the server can act on (#588): a limit
 * says which setting to raise and what it stands at, instead of "did not arrive completely".
 */
function upload_error_message(int $code, string $what): string
{
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
            return $what . ' is larger than upload_max_filesize allows here (' . ini_get('upload_max_filesize') . '). Raise upload_max_filesize and post_max_size (now ' . ini_get('post_max_size') . ') in php.ini.';
        case UPLOAD_ERR_FORM_SIZE:
            return $what . ' is larger than the form allows.';
        case UPLOAD_ERR_PARTIAL:
            return $what . ' arrived only in part. Try again; if it keeps failing, check max_execution_time and max_input_time in php.ini.';
        case UPLOAD_ERR_NO_FILE:
            return $what . ' did not arrive.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'The server has no temporary folder for uploads (upload_tmp_dir in php.ini).';
        case UPLOAD_ERR_CANT_WRITE:
            return 'The server could not write ' . $what . ' to disk. Check the free space and the rights of its temporary folder.';
        default:
            return $what . ' could not be received (PHP upload error ' . $code . ').';
    }
}

function handle_save(string $root, string $folder): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin saves', 403);
    }

    $thumbnailBytes = null;
    $uploaded = isset($_FILES['project']);
    if ($uploaded) {
        if ($_FILES['project']['error'] !== UPLOAD_ERR_OK) {
            $code = (int) $_FILES['project']['error'];
            fail(upload_error_message($code, 'The project'), in_array($code, [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true) ? 413 : 400);
        }
        $receivedPath = received_file((string) $_FILES['project']['tmp_name']);
        if (!isset($_FILES['thumbnail']) || $_FILES['thumbnail']['error'] !== UPLOAD_ERR_OK) {
            fail('Shared project upload is missing its thumbnail', 400);
        }
        $thumbnailBytes = (string) file_get_contents($_FILES['thumbnail']['tmp_name']);
        if (strlen($thumbnailBytes) > MAX_THUMBNAIL_BYTES) {
            fail('Shared project thumbnail exceeds the 5 MB size limit', 413);
        }
        if (!is_png($thumbnailBytes)) {
            fail('Shared project thumbnail must be a PNG image', 400);
        }
    } else {
        $receivedPath = received_file(null);
    }
    $receivedBytes = file_size_of($receivedPath);

    // PHP throws the whole body away when it is larger than post_max_size, and
    // then $_FILES is empty for a reason that has nothing to do with the file.
    $declaredLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declaredLength > 0 && empty($_FILES) && empty($_POST) && $receivedBytes === 0) {
        fail('The upload was larger than this server accepts (post_max_size is ' . ini_get('post_max_size') . '). Raise post_max_size and upload_max_filesize in php.ini.', 413);
    }
    if ($receivedBytes === 0) {
        fail('The project upload was empty', 400);
    }
    if ($receivedBytes > MAX_PROJECT_BYTES) {
        fail('.lyl file exceeds the shared storage size limit', 413);
    }
    if (!looks_like_lyl($receivedPath)) {
        fail('That is not a .lyl project package', 400);
    }

    $fileName = safe_project_file_name((string) ($_GET['fileName'] ?? ''));
    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    acquire_lock($filePath);

    $currentStat = regular_file_stat($filePath);
    $currentRevision = $currentStat === null ? null : revision_for($currentStat);
    $expectedRevision = unquote_etag($_SERVER['HTTP_IF_MATCH'] ?? null);
    $createOnly = ($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === '*';

    if ($currentStat !== null && ($createOnly || $expectedRevision === null || $expectedRevision !== $currentRevision)) {
        fail('The shared project changed after you opened it. Reload it or save under a different name.', 409, ['currentRevision' => $currentRevision]);
    }
    if ($currentStat === null && $expectedRevision !== null) {
        fail('The shared project no longer exists. Save it under a different name.', 409);
    }

    $temporaryPath = $folder . DIRECTORY_SEPARATOR . '.' . $fileName . '.' . bin2hex(random_bytes(8)) . '.tmp';
    cleanup_later($temporaryPath);
    if (!move_received_file($receivedPath, $temporaryPath, $uploaded)) {
        fail('The store folder is not writable by the web server', 500);
    }
    $pendingStat = regular_file_stat($temporaryPath);
    $savedRevision = $pendingStat === null ? '' : revision_for($pendingStat);

    if ($thumbnailBytes !== null) {
        $thumbnailsRoot = $folder . DIRECTORY_SEPARATOR . THUMBNAILS_DIRECTORY;
        if (!is_dir($thumbnailsRoot)) {
            @mkdir($thumbnailsRoot, 0775, true);
        }
        $pendingThumbnail = thumbnail_path($folder, $fileName, $savedRevision);
        // Removed again unless the project below makes it into place.
        cleanup_later($pendingThumbnail);
        @file_put_contents($pendingThumbnail, $thumbnailBytes);
    }

    if (!@rename($temporaryPath, $filePath)) {
        fail('The finished project could not be moved into place', 500);
    }
    cleanup_now($temporaryPath);
    if ($thumbnailBytes !== null) {
        cleanup_now(thumbnail_path($folder, $fileName, $savedRevision));
    }

    $savedStat = regular_file_stat($filePath);
    if ($savedStat === null) {
        fail('The project vanished right after it was written', 500);
    }
    // Moving the file can change its modification time, so the thumbnail is
    // named after the revision the project ended up with.
    $finalRevision = revision_for($savedStat);
    if ($thumbnailBytes !== null && $finalRevision !== $savedRevision) {
        @rename(thumbnail_path($folder, $fileName, $savedRevision), thumbnail_path($folder, $fileName, $finalRevision));
    }
    if ($currentRevision !== null && $currentRevision !== $finalRevision) {
        @unlink(thumbnail_path($folder, $fileName, $currentRevision));
    }

    $record = project_record($fileName, $savedStat, $thumbnailBytes !== null, folder_key($root, $folder));
    send_json(['project' => $record], $currentStat === null ? 201 : 200, ['ETag' => '"' . $record['revision'] . '"']);
}

/** The name an export is written under: a clean stem and one of the known extensions, or null. */
function export_file_name(string $requested): ?string
{
    if (preg_match('/\.([a-z0-9]+)$/i', $requested, $match) !== 1) {
        return null;
    }
    $extension = strtolower($match[1]);
    if (!in_array($extension, EXPORT_FILE_EXTENSIONS, true)) {
        return null;
    }
    $stem = substr($requested, 0, -(strlen($extension) + 1));
    $stem = basename($stem);
    $stem = preg_replace('/[<>:"\/\\\\|?*\x00-\x1f]/', '_', $stem);
    $stem = preg_replace('/\s+/', ' ', $stem);
    $stem = ltrim(trim($stem), '. ');
    $stem = function_exists('mb_substr') ? mb_substr($stem, 0, 115) : substr($stem, 0, 115);
    return ($stem === '' ? 'Untitled export' : $stem) . '.' . $extension;
}

/**
 * Whether an export file is what its name says and nothing a browser could run (GHSA-wj5x-5r5v-89r3).
 * The guard file keeps the folder from being served, but many servers never read it (Debian's Apache
 * ignores .htaccess under /var/www, nginx always does), so the bytes are checked as well: an SVG may hold
 * only plain drawing elements - what layerling's own SVG, drawing and section exports write - and no
 * event handler, link, script URL or DOCTYPE; the binary formats must start with their signature, STEP
 * with its header; STL, OBJ and DXF may not start with a tag, so a server that sends no type for them
 * cannot have the browser take them for a web page.
 */
function export_bytes_acceptable(string $extension, string $bytes): bool
{
    $head = ltrim(substr($bytes, 0, 4096), "\xEF\xBB\xBF \t\r\n\0");
    switch ($extension) {
        case 'png':
            return strncmp($bytes, "\x89PNG\r\n\x1a\n", 8) === 0;
        case 'pdf':
            return strncmp($bytes, '%PDF-', 5) === 0;
        case '3mf':
            return strncmp($bytes, "PK\x03\x04", 4) === 0;
        case 'step':
        case 'stp':
            return strncmp($head, 'ISO-10303-21', 12) === 0;
        case 'svg':
            return svg_is_plain_drawing($bytes);
        default:
            return $head !== '' && $head[0] !== '<';
    }
}

/** An SVG made only of shapes, text and their descriptions, with nothing in it that runs or loads. */
function svg_is_plain_drawing(string $svg): bool
{
    if (preg_match('/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|javascript\s*:|\son[a-z]+\s*=|href\s*=|url\s*\(/i', $svg) === 1) {
        return false;
    }
    $allowed = ['svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'title', 'desc', 'metadata'];
    if (preg_match_all('/<\s*([A-Za-z_][\w:.\-]*)/', $svg, $tags) === false) {
        return false;
    }
    foreach ($tags[1] as $tag) {
        if (!in_array(strtolower($tag), $allowed, true)) {
            return false;
        }
    }
    return in_array('svg', array_map('strtolower', $tags[1]), true);
}

/**
 * An export file - STL, 3MF, OBJ, STEP, SVG, DXF, PNG or PDF - written into a folder of the store (#779), so a
 * slicer that shares the folder can open it. It is no project: the list does not show it. A file of that
 * name is replaced only when the request says so (overwrite=1); otherwise the answer is 409 with `exists`.
 */
function handle_save_export(string $root, string $folder, string $requested): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin saves', 403);
    }
    $fileName = export_file_name($requested);
    if ($fileName === null) {
        fail('That file type cannot be saved on the server', 400);
    }
    $declaredLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    $receivedPath = received_file(null);
    $receivedBytes = file_size_of($receivedPath);
    if ($declaredLength > 0 && $receivedBytes === 0) {
        fail('The upload was larger than this server accepts (post_max_size is ' . ini_get('post_max_size') . '). Raise post_max_size in php.ini.', 413);
    }
    if ($receivedBytes === 0) {
        fail('The file was empty', 400);
    }
    if ($receivedBytes > MAX_PROJECT_BYTES) {
        fail('The file exceeds the shared storage size limit', 413);
    }
    $extension = strtolower((string) pathinfo($fileName, PATHINFO_EXTENSION));
    // An SVG is read whole, it is checked tag by tag; every other kind only needs its first bytes.
    $checked = $extension === 'svg' ? (string) file_get_contents($receivedPath) : file_head($receivedPath);
    if (!export_bytes_acceptable($extension, $checked)) {
        fail('That is not a ' . strtoupper($extension) . ' file layerling would write', 400);
    }

    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    acquire_lock($filePath);
    $exists = regular_file_stat($filePath) !== null;
    if ($exists && ($_GET['overwrite'] ?? '') !== '1') {
        fail($fileName . ' is already in that folder', 409, ['exists' => true, 'fileName' => $fileName]);
    }
    $temporaryPath = $folder . DIRECTORY_SEPARATOR . '.' . $fileName . '.' . bin2hex(random_bytes(8)) . '.tmp';
    cleanup_later($temporaryPath);
    if (!move_received_file($receivedPath, $temporaryPath, false)) {
        fail('The store folder is not writable by the web server', 500);
    }
    if (!@rename($temporaryPath, $filePath)) {
        fail('The finished file could not be moved into place', 500);
    }
    cleanup_now($temporaryPath);
    $savedStat = regular_file_stat($filePath);
    send_json(
        ['file' => ['fileName' => $fileName, 'path' => folder_key($root, $folder), 'size' => $savedStat === null ? $receivedBytes : $savedStat['size']]],
        $exists ? 200 : 201
    );
}

/**
 * The settings kept for every browser that uses this store: what "Make default" saved, so a new
 * design starts with it even after the browser forgot it. One JSON file in a hidden folder - a
 * listing skips names that begin with a dot - under a name taken from a fixed list, never from the
 * request. Only checked to be a JSON object; the app makes sense of the values, as in route.ts.
 */
const SETTINGS_DIRECTORY = '.settings';
const SETTINGS_NAMES = ['default'];
const MAX_SETTINGS_BYTES = 256 * 1024;

function settings_path(string $root, string $requested): string
{
    if (!in_array($requested, SETTINGS_NAMES, true)) {
        fail('Unknown settings', 400);
    }
    return $root . DIRECTORY_SEPARATOR . SETTINGS_DIRECTORY . DIRECTORY_SEPARATOR . $requested . '.json';
}

function handle_read_settings(string $root, string $requested): void
{
    $filePath = settings_path($root, $requested);
    $settings = null;
    if (regular_file_stat($filePath) !== null) {
        $decoded = json_decode((string) file_get_contents($filePath));
        if ($decoded instanceof stdClass) {
            $settings = $decoded;
        }
    }
    send_json(['enabled' => true, 'settings' => $settings]);
}

function handle_save_settings(string $root, string $requested): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin saves', 403);
    }
    $filePath = settings_path($root, $requested);
    $text = (string) file_get_contents('php://input');
    if (strlen($text) > MAX_SETTINGS_BYTES) {
        fail('The settings are too large', 413);
    }
    $decoded = json_decode($text);
    if (!($decoded instanceof stdClass)) {
        fail('The settings are not JSON', 400);
    }
    $folder = dirname($filePath);
    if (!is_dir($folder) && !@mkdir($folder, 0775, true) && !is_dir($folder)) {
        fail('The store folder is not writable by the web server', 500);
    }
    $temporaryPath = $folder . DIRECTORY_SEPARATOR . '.' . $requested . '.' . bin2hex(random_bytes(8)) . '.tmp';
    cleanup_later($temporaryPath);
    if (file_put_contents($temporaryPath, json_encode($decoded, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) === false) {
        fail('The store folder is not writable by the web server', 500);
    }
    if (!@rename($temporaryPath, $filePath)) {
        fail('The settings could not be moved into place', 500);
    }
    cleanup_now($temporaryPath);
    send_json(['saved' => true]);
}

/**
 * Removing a folder. An empty one goes without further ado; one that still
 * holds something needs `recursive=1`, so a request that lost its way cannot
 * take a tree of projects with it.
 */
function handle_delete_folder(string $root, string $folder, bool $recursive): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin deletes', 403);
    }
    if ($folder === $root) {
        fail('The store folder itself cannot be removed', 400);
    }
    if (dirname($folder) === $root && basename($folder) === 'Custom shapes') {
        fail('The custom shapes folder cannot be removed', 400);
    }
    $counts = folder_contents_count($folder);
    if (!$recursive && ($counts['projects'] > 0 || $counts['folders'] > 0 || $counts['files'] > 0)) {
        fail('That folder is not empty', 409, $counts);
    }
    if (!remove_folder_tree($folder)) {
        fail('The folder could not be removed', 500);
    }
    send_json(['deleted' => true, 'path' => folder_key($root, $folder)] + $counts);
}

function handle_delete(string $root, string $folder): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin deletes', 403);
    }
    $requested = (string) ($_GET['fileName'] ?? '');
    if ($requested === '') {
        fail('Shared project name is required', 400);
    }
    $fileName = existing_project_file_name($requested);
    if ($fileName !== $requested) {
        fail('Invalid shared project name', 400);
    }

    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    acquire_lock($filePath);

    $currentStat = regular_file_stat($filePath);
    if ($currentStat === null) {
        fail('Shared project was not found', 404);
    }
    $currentRevision = revision_for($currentStat);
    $expectedRevision = unquote_etag($_SERVER['HTTP_IF_MATCH'] ?? null);
    if ($expectedRevision === null) {
        fail('Reload shared projects before deleting so the current revision can be verified', 428, ['currentRevision' => $currentRevision]);
    }
    if ($expectedRevision !== $currentRevision) {
        fail('The shared project changed after you loaded it. Refresh the shared projects list and try again.', 409, ['currentRevision' => $currentRevision]);
    }
    if (!@unlink($filePath)) {
        fail('The project could not be removed', 500);
    }
    @unlink(thumbnail_path($folder, $fileName, $currentRevision));
    send_json(['deleted' => true, 'fileName' => $fileName]);
}

/**
 * Moving a project into another folder.
 *
 * Only the file and its picture travel; nothing is rewritten. rename() keeps
 * the modification time, so size and mtime - and with them the revision the
 * browser holds - survive the move, and the thumbnail keeps its name.
 */
function handle_move(string $root, string $folder, string $requestedTarget): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin changes', 403);
    }
    $requested = (string) ($_GET['fileName'] ?? '');
    if ($requested === '') {
        fail('Shared project name is required', 400);
    }
    $fileName = existing_project_file_name($requested);
    if ($fileName !== $requested) {
        fail('Invalid shared project name', 400);
    }

    $target = resolve_folder($root, $requestedTarget);
    if ($target === $folder) {
        fail('That project is already in this folder', 409);
    }

    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    acquire_lock($filePath);

    $currentStat = regular_file_stat($filePath);
    if ($currentStat === null) {
        fail('Shared project was not found', 404);
    }
    $currentRevision = revision_for($currentStat);
    $expectedRevision = unquote_etag($_SERVER['HTTP_IF_MATCH'] ?? null);
    if ($expectedRevision === null) {
        fail('Reload shared projects before moving so the current revision can be verified', 428, ['currentRevision' => $currentRevision]);
    }
    if ($expectedRevision !== $currentRevision) {
        fail('The shared project changed after you loaded it. Refresh the shared projects list and try again.', 409, ['currentRevision' => $currentRevision]);
    }

    $targetPath = $target . DIRECTORY_SEPARATOR . $fileName;
    if (regular_file_stat($targetPath) !== null || is_dir($targetPath)) {
        fail('A project of that name is already in that folder', 409);
    }
    acquire_lock($targetPath);
    if (!@rename($filePath, $targetPath)) {
        fail('The project could not be moved', 500);
    }

    $movedStat = regular_file_stat($targetPath);
    if ($movedStat === null) {
        fail('The project vanished right after it was moved', 500);
    }
    $movedRevision = revision_for($movedStat);
    $thumbnail = thumbnail_path($folder, $fileName, $currentRevision);
    $hasThumbnail = false;
    if (regular_file_stat($thumbnail) !== null) {
        $thumbnailsRoot = $target . DIRECTORY_SEPARATOR . THUMBNAILS_DIRECTORY;
        if (!is_dir($thumbnailsRoot)) {
            @mkdir($thumbnailsRoot, 0775, true);
        }
        $hasThumbnail = @rename($thumbnail, thumbnail_path($target, $fileName, $movedRevision));
    }

    $record = project_record($fileName, $movedStat, $hasThumbnail, folder_key($root, $target));
    send_json([
        'project'   => $record,
        'movedFrom' => folder_key($root, $folder),
    ], 200, ['ETag' => '"' . $record['revision'] . '"']);
}

/**
 * Giving a project another file name inside its own folder (#265): the file is renamed, its picture
 * goes with it, and nothing else changes - the revision stays the file's own, the bytes stay as they are.
 */
function handle_rename_file(string $root, string $folder, string $requestedName): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin changes', 403);
    }
    $requested = (string) ($_GET['fileName'] ?? '');
    if ($requested === '') {
        fail('Shared project name is required', 400);
    }
    $fileName = existing_project_file_name($requested);
    if ($fileName !== $requested) {
        fail('Invalid shared project name', 400);
    }

    $newFileName = safe_project_file_name($requestedName);
    if ($newFileName === $fileName) {
        fail('The project already has that name', 409);
    }

    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    $newPath = $folder . DIRECTORY_SEPARATOR . $newFileName;
    acquire_lock($filePath);

    $currentStat = regular_file_stat($filePath);
    if ($currentStat === null) {
        fail('Shared project was not found', 404);
    }
    $currentRevision = revision_for($currentStat);
    $expectedRevision = unquote_etag($_SERVER['HTTP_IF_MATCH'] ?? null);
    if ($expectedRevision === null) {
        fail('Reload shared projects before renaming so the current revision can be verified', 428, ['currentRevision' => $currentRevision]);
    }
    if ($expectedRevision !== $currentRevision) {
        fail('The shared project changed after you loaded it. Refresh the shared projects list and try again.', 409, ['currentRevision' => $currentRevision]);
    }
    if (regular_file_stat($newPath) !== null || is_dir($newPath)) {
        fail('A project of that name is already in this folder', 409);
    }
    acquire_lock($newPath);
    if (!@rename($filePath, $newPath)) {
        fail('The project could not be renamed', 500);
    }

    $renamedStat = regular_file_stat($newPath);
    if ($renamedStat === null) {
        fail('The project vanished right after it was renamed', 500);
    }
    $renamedRevision = revision_for($renamedStat);
    $thumbnail = thumbnail_path($folder, $fileName, $currentRevision);
    $hasThumbnail = false;
    if (regular_file_stat($thumbnail) !== null) {
        $hasThumbnail = @rename($thumbnail, thumbnail_path($folder, $newFileName, $renamedRevision));
    }

    $record = project_record($newFileName, $renamedStat, $hasThumbnail, folder_key($root, $folder));
    send_json([
        'project'     => $record,
        'renamedFrom' => $fileName,
    ], 200, ['ETag' => '"' . $record['revision'] . '"']);
}

/**
 * Duplicating a project inside its own folder.
 *
 * The file is copied, not repacked: the duplicate carries exactly the geometry
 * of the original, down to the byte, and its picture travels with it under the
 * new file's revision. The name inside the package still says the original - it
 * is put right by the first save, and until then the file name is what the
 * dashboard shows.
 */
function handle_copy(string $root, string $folder, string $requestedName): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin changes', 403);
    }
    $requested = (string) ($_GET['fileName'] ?? '');
    if ($requested === '') {
        fail('Shared project name is required', 400);
    }
    $fileName = existing_project_file_name($requested);
    if ($fileName !== $requested) {
        fail('Invalid shared project name', 400);
    }

    $copyFileName = safe_project_file_name($requestedName);
    if ($copyFileName === $fileName) {
        fail('The copy needs a name of its own', 409);
    }

    $filePath = $folder . DIRECTORY_SEPARATOR . $fileName;
    acquire_lock($filePath);

    $currentStat = regular_file_stat($filePath);
    if ($currentStat === null) {
        fail('Shared project was not found', 404);
    }
    $currentRevision = revision_for($currentStat);
    $expectedRevision = unquote_etag($_SERVER['HTTP_IF_MATCH'] ?? null);
    if ($expectedRevision === null) {
        fail('Reload shared projects before duplicating so the current revision can be verified', 428, ['currentRevision' => $currentRevision]);
    }
    if ($expectedRevision !== $currentRevision) {
        fail('The shared project changed after you loaded it. Refresh the shared projects list and try again.', 409, ['currentRevision' => $currentRevision]);
    }

    $copyPath = $folder . DIRECTORY_SEPARATOR . $copyFileName;
    if (regular_file_stat($copyPath) !== null || is_dir($copyPath)) {
        fail('A project of that name is already in that folder', 409);
    }
    // The lock is taken before the copy, so a save under the same name cannot
    // slip in between the question above and the write below.
    acquire_lock($copyPath);
    if (!@copy($filePath, $copyPath)) {
        fail('The project could not be duplicated', 500);
    }

    $copyStat = regular_file_stat($copyPath);
    if ($copyStat === null) {
        fail('The copy vanished right after it was written', 500);
    }
    $copyRevision = revision_for($copyStat);
    $thumbnail = thumbnail_path($folder, $fileName, $currentRevision);
    $hasThumbnail = false;
    if (regular_file_stat($thumbnail) !== null) {
        $thumbnailsRoot = $folder . DIRECTORY_SEPARATOR . THUMBNAILS_DIRECTORY;
        if (!is_dir($thumbnailsRoot)) {
            @mkdir($thumbnailsRoot, 0775, true);
        }
        $hasThumbnail = @copy($thumbnail, thumbnail_path($folder, $copyFileName, $copyRevision));
    }

    $record = project_record($copyFileName, $copyStat, $hasThumbnail, folder_key($root, $folder));
    send_json([
        'project'    => $record,
        'copiedFrom' => $fileName,
    ], 201, ['ETag' => '"' . $record['revision'] . '"']);
}

// --------------------------------------------------------------------- entry

// `name[]=...` arrives as an array, which every handler below would turn into
// the string "Array" with a warning. Nothing here takes one, so refuse it.
foreach ($_GET as $value) {
    if (!is_string($value)) {
        fail('Invalid request parameter', 400);
    }
}

$root = store_root();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($root === null) {
    // Not an error: the folder is the switch, and it is off.
    if ($method === 'GET') {
        send_json([
            'enabled'  => false,
            'projects' => [],
            'error'    => configured_store_path() !== null
                ? 'The folder named in LAYERLING_SHARED_PROJECTS_DIR does not exist. Create it, writable for the web server, to keep projects on this server.'
                : 'Create a folder named "' . STORE_DIRECTORY . '" next to store.php to keep projects on this server.',
        ]);
    }
    fail('Shared project storage is disabled', 404);
}

if (!is_writable($root)) {
    if ($method === 'GET' && !isset($_GET['fileName'])) {
        send_json([
            'enabled'  => true,
            'projects' => [],
            'error'    => configured_store_path() !== null
                ? 'The folder named in LAYERLING_SHARED_PROJECTS_DIR exists but the web server cannot write to it.'
                : 'The "' . STORE_DIRECTORY . '" folder exists but the web server cannot write to it.',
        ], 500);
    }
}

ensure_store_guard($root);

// Everything below works inside one folder of the store. Which one comes from
// the request and is resolved once, here, so no handler ever builds a path of
// its own from something the browser sent.
$folder = resolve_folder($root, (string) ($_GET['path'] ?? ''));

switch ($method) {
    case 'GET':
        // Eine Suche geht ueber den ganzen Speicher, nicht ueber einen Ordner -
        // `path` spielt dabei keine Rolle.
        $search = trim((string) ($_GET['search'] ?? ''));
        if ($search !== '') {
            search_store($root, $search);
        }
        $settings = $_GET['settings'] ?? null;
        if ($settings !== null && $settings !== '') {
            handle_read_settings($root, (string) $settings);
        }
        if (($_GET['all'] ?? '') === '1') {
            handle_all_designs($root);
        }
        $requested = $_GET['fileName'] ?? null;
        if ($requested !== null && $requested !== '') {
            handle_download($root, $folder, (string) $requested);
        }
        handle_list($root, $folder);
        break;
    case 'POST':
        $newFolder = $_GET['folder'] ?? null;
        if ($newFolder !== null && $newFolder !== '') {
            handle_create_folder($root, $folder, (string) $newFolder);
        }
        $renameTo = $_GET['renameTo'] ?? null;
        if ($renameTo !== null && $renameTo !== '') {
            handle_rename_folder($root, $folder, (string) $renameTo);
        }
        // An empty moveTo is the store's own root, so the key has to be asked
        // for by presence, not by value.
        if (isset($_GET['moveTo'])) {
            handle_move($root, $folder, (string) $_GET['moveTo']);
        }
        $copyTo = $_GET['copyTo'] ?? null;
        if ($copyTo !== null && $copyTo !== '') {
            handle_copy($root, $folder, (string) $copyTo);
        }
        $renameFileTo = $_GET['renameFileTo'] ?? null;
        if ($renameFileTo !== null && $renameFileTo !== '') {
            handle_rename_file($root, $folder, (string) $renameFileTo);
        }
        $exportFile = $_GET['exportFile'] ?? null;
        if ($exportFile !== null && $exportFile !== '') {
            handle_save_export($root, $folder, (string) $exportFile);
        }
        $settings = $_GET['settings'] ?? null;
        if ($settings !== null && $settings !== '') {
            handle_save_settings($root, (string) $settings);
        }
        handle_save($root, $folder);
        break;
    case 'DELETE':
        if (($_GET['deleteFolder'] ?? '') === '1') {
            handle_delete_folder($root, $folder, ($_GET['recursive'] ?? '') === '1');
        }
        handle_delete($root, $folder);
        break;
    case 'OPTIONS':
        header('Allow: GET, POST, DELETE, OPTIONS');
        http_response_code(204);
        break;
    default:
        fail('Unsupported request', 405);
}
