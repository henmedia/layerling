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
 * to this file. That is deliberate: the folder has no login, so whoever can
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
const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
const LYL_MEDIA_TYPE      = 'application/vnd.layerling.project+zip';
/** A folder name may not look like a path, a hidden file, or carry control codes. */
const FOLDER_NAME_UNSAFE = "<>:\"|?*/\\";

/**
 * Apache stops serving anything executable from the folder. Belt and braces:
 * only .lyl and .png ever get written, and both under names we built ourselves.
 * `php_flag` is deliberately absent - it throws a 500 on servers running PHP as
 * FPM rather than as a module, which would break the whole directory.
 */
const STORE_HTACCESS = <<<'HTACCESS'
# Written by store.php. Projects live here; nothing in here may execute.
Options -ExecCGI -Indexes
RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar
RemoveType .php .phtml .phar
<IfModule mod_authz_core.c>
  <FilesMatch "\.(?i:ph(p[0-9]?|tml|ar))$">
    Require all denied
  </FilesMatch>
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

/** The store, or null while nobody has created it. */
function store_root(): ?string
{
    $root = __DIR__ . DIRECTORY_SEPARATOR . STORE_DIRECTORY;
    if (!is_dir($root)) {
        return null;
    }
    $resolved = realpath($root);
    return $resolved === false ? null : $resolved;
}

/** Keeps the guard file current without ever touching the projects. */
function ensure_store_guard(string $root): void
{
    $guard = $root . DIRECTORY_SEPARATOR . '.htaccess';
    if (is_file($guard) && file_get_contents($guard) === STORE_HTACCESS) {
        return;
    }
    @file_put_contents($guard, STORE_HTACCESS);
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
    return strcasecmp($origin, $scheme . '://' . $host) === 0;
}

/** A .lyl is a ZIP. Anything else never reaches the disk. */
function looks_like_lyl(string $bytes): bool
{
    if (strlen($bytes) < 4) {
        return false;
    }
    $signature = substr($bytes, 0, 4);
    if ($signature !== "PK\x03\x04" && $signature !== "PK\x05\x06") {
        return false;
    }
    if (!class_exists('ZipArchive')) {
        return true;
    }
    $probe = tempnam(sys_get_temp_dir(), 'lyl');
    if ($probe === false) {
        return true;
    }
    try {
        file_put_contents($probe, $bytes);
        $zip = new ZipArchive();
        if ($zip->open($probe) !== true) {
            return false;
        }
        $hasManifest = $zip->locateName('project.json') !== false;
        $zip->close();
        return $hasManifest;
    } finally {
        @unlink($probe);
    }
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
        }
    }
    return ['projects' => $projects, 'folders' => $folders];
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
        readfile($imagePath);
        exit;
    }

    header('Content-Type: ' . LYL_MEDIA_TYPE);
    header('Cache-Control: no-store');
    header('ETag: "' . $revision . '"');
    header('Content-Length: ' . (string) $stat['size']);
    header("Content-Disposition: attachment; filename*=UTF-8''" . rawurlencode($fileName));
    readfile($filePath);
    exit;
}

function handle_save(string $root, string $folder): void
{
    if (!same_origin()) {
        fail('Shared projects only accept same-origin saves', 403);
    }

    // PHP throws the whole body away when it is larger than post_max_size, and
    // then $_FILES is empty for a reason that has nothing to do with the file.
    $declaredLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($declaredLength > 0 && empty($_FILES) && empty($_POST) && file_get_contents('php://input') === '') {
        fail('The upload was larger than this server accepts. Raise post_max_size and upload_max_filesize in php.ini.', 413);
    }

    $thumbnailBytes = null;
    if (isset($_FILES['project'])) {
        if ($_FILES['project']['error'] !== UPLOAD_ERR_OK) {
            fail('The project upload did not arrive completely', 400);
        }
        $bytes = (string) file_get_contents($_FILES['project']['tmp_name']);
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
        $bytes = (string) file_get_contents('php://input');
    }

    if ($bytes === '') {
        fail('The project upload was empty', 400);
    }
    if (strlen($bytes) > MAX_PROJECT_BYTES) {
        fail('.lyl file exceeds the shared storage size limit', 413);
    }
    if (!looks_like_lyl($bytes)) {
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
    if (file_put_contents($temporaryPath, $bytes) === false) {
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
    $counts = folder_contents_count($folder);
    if (!$recursive && ($counts['projects'] > 0 || $counts['folders'] > 0)) {
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
            'error'    => 'Create a folder named "' . STORE_DIRECTORY . '" next to store.php to keep projects on this server.',
        ]);
    }
    fail('Shared project storage is disabled', 404);
}

if (!is_writable($root)) {
    if ($method === 'GET' && !isset($_GET['fileName'])) {
        send_json([
            'enabled'  => true,
            'projects' => [],
            'error'    => 'The "' . STORE_DIRECTORY . '" folder exists but the web server cannot write to it.',
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
