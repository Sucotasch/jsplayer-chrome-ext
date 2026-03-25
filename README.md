# JSPlayer Chrome Extension - Technical Documentation

## English Version

### 1. Overview & Capabilities
**JSPlayer** is a Google Chrome Extension designed to function as a persistent local audio player. Unlike standard web players that lose state upon closing the tab, JSPlayer leverages Chrome's **Offscreen Documents** and **File System Access API** to maintain playback and playlist state across sessions.

**Key Capabilities:**
*   **Local File Playback:** Plays audio files directly from your hard drive without uploading them to a server.
*   **Supported Formats:** `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4v`, `.m4a`.
*   **Session Persistence (Ghost Mode):** Automatically saves playback position (track index + timestamp). Shows the last played track in a "Ghost" state for instant resumption.
*   **Playlist Catalog:** Save multiple named playlists as "Favorites" and switch between them via the Settings menu.
*   **Search & Filter:** Real-time search within the playlist to find specific tracks.
*   **Background Playback:** Continues playing audio even when the extension popup is closed (via Offscreen Document).
*   **Playlist Persistence:** Saves playlist structure and source folder references using IndexedDB.
*   **Folder Scanning:** Recursively scans selected directories with a robust, ACK-based protocol for large tracklists.
*   **Media Key Support:** Responds to global media keys (Play/Pause, Next, Prev) via Chrome Commands.
*   **Drag & Drop:** Supports adding files/folders via drag-and-drop in the popup.
*   **Shuffle & Repeat:** Built-in playback modes managed in the offscreen engine.

### 2. Architecture & Algorithm of Operation

#### System Architecture
The extension follows the **Manifest V3** architecture pattern, separating concerns into three main contexts:

1.  **Service Worker (`background.js`):**
    *   Manages the lifecycle of the Offscreen Document.
    *   Listens for global Chrome Media Key commands (`chrome.commands.onCommand`).
    *   Relays control signals to the Offscreen document via `BroadcastChannel`.
2.  **Offscreen Document (`offscreen.html` + `offscreen.js`):**
    *   **Audio Engine:** Hosts the hidden `<audio>` element.
    *   **State Management:** Maintains the `tracks` array, current index, volume, and repeat/shuffle state.
    *   **Reliability:** Uses an **ACK-based chunking protocol** when receiving large file lists (chunks of 50) to prevent IPC buffer overflows.
    *   **Communication:** Uses `BroadcastChannel ('audio_player_channel')` to broadcast state updates to the UI (Popup) and receive commands.
3.  **UI Contexts (`popup.html`, `picker.html`, `loader.html`):**
    *   **Popup:** Main control interface. Sends files to the background/offscreen.
    *   **Picker:** Initial folder selection interface using `window.showDirectoryPicker()`.
    *   **Loader:** Handles playlist restoration. Re-validates folder permissions and rescans directories to rebuild the playlist.

#### Data Persistence (IndexedDB)
The extension uses IndexedDB to store persistent data:
*   **Store `dirs`:** Stores `FileSystemDirectoryHandle` objects. This allows the extension to remember which folders were added without requiring the user to select them every time.
*   **Store `savedPlaylist`:** Stores the list of track names and the current playback index.

#### Playlist Restoration Algorithm (`loader.js`)
1.  **Retrieve State:** Reads `savedPlaylist` (keyed by `playlistId` or `session-last`) and `dirs` from IndexedDB.
2.  **Permission Request:** Iterates through stored directory handles and requests `read` permission (`handle.requestPermission`). This requires a user gesture (click).
3.  **Directory Scan:** Recursively scans granted directories for files matching audio extensions.
4.  **Matching:** Matches found files against saved track names to reconstruct the playlist order precisely.
5.  **Transmission & Resume:** Sends the reconstructed file list to the Offscreen document. If `autoplay` is enabled (e.g., during Ghost Resume), it jumps to the exact `currentTime` and `currentTrackIndex`.

### 3. Installation & Configuration

#### Prerequisites
*   Google Chrome Browser (Chromium-based).
*   Developer Mode enabled in Chrome Extensions.

#### Installation Steps
1.  **Clone/Download:** Download the repository source code.
2.  **Open Extensions:** Navigate to `chrome://extensions/`.
3.  **Enable Developer Mode:** Toggle the switch in the top-right corner.
4.  **Load Unpacked:** Click "Load unpacked" and select the root folder of the repository.
5.  **Verify:** The JSPlayer icon should appear in your toolbar.

#### Configuration
*   **Permissions:** Upon first use, the extension will request permission to access specific folders. You must click "Allow" in the Chrome system dialog.
*   **Media Keys:** Ensure no other application is hijacking global media keys if you intend to use keyboard shortcuts.

### 4. Usage Examples

#### Scenario A: Starting a New Playlist
1.  Click the extension icon to open the **Popup**.
2.  If no folders are added, you will be redirected to the **Picker**.
3.  Click "Select Folder" and choose a directory containing music.
4.  The system will scan for audio files. Once complete, playback begins automatically.
5.  Use the Popup controls to Play/Pause, Skip, or Adjust Volume.

#### Scenario B: Restoring a Saved Session
1.  Close the browser or extension popup after saving a playlist.
2.  Re-open the extension.
3.  The **Loader** interface will appear automatically.
4.  Click the **"Start"** button.
5.  Chrome will prompt you to **Allow Access** to the previously selected folders.
6.  The extension will rescan the folders, restore the track order, and resume playback from the last position.

#### Scenario C: Adding Files via Drag & Drop
1.  Open the **Popup**.
2.  Drag audio files or folders from your OS file explorer directly onto the Popup window.
3.  The files will be scanned and added to the current queue immediately.

---

## 🇷🇺 

### 1. Обзор и Возможности
**JSPlayer** — это расширение для Google Chrome, функционирующее как постоянный локальный аудиоплеер. В отличие от стандартных веб-плееров, которые теряют состояние при закрытии вкладки, JSPlayer использует **Offscreen Documents** и **File System Access API** для сохранения воспроизведения и состояния плейлиста между сессиями.

**Ключевые возможности:**
*   **Воспроизведение локальных файлов:** Проигрывает аудиофайлы напрямую с жесткого диска без загрузки на сервер.
*   **Поддерживаемые форматы:** `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4v`, `.m4a`.
*   **Сохранение сессий (Ghost Mode):** Автоматически запоминает позицию воспроизведения (индекс трека + секунда). Показывает последний трек в «призрачном» состоянии для мгновенного возобновления.
*   **Каталог плейлистов:** Возможность сохранять несколько именованных плейлистов в «Избранное» и переключаться между ними через меню настроек.
*   **Поиск и фильтрация:** Поиск по плейлисту в реальном времени.
*   **Фоновое воспроизведение:** Продолжает играть аудио даже при закрытом всплывающем окне расширения (через Offscreen Document).
*   **Сохранение плейлиста:** Сохраняет структуру плейлиста и ссылки на папки с помощью IndexedDB.
*   **Сканирование папок:** Рекурсивно сканирует выбранные директории с использованием надежного протокола подтверждения (ACK) для больших списков.
*   **Поддержка медиа-клавиш:** Реагирует на глобальные медиа-клавиши (Play/Pause, Next, Prev) через Chrome Commands.
*   **Drag & Drop:** Поддержка добавления файлов/папок через перетаскивание во всплывающем окне.
*   **Перемешивание и Повтор:** Встроенные режимы воспроизведения, управляемые в движке offscreen.

### 2. Архитектура и Алгоритм Работы

#### Архитектура Системы
Расширение следует архитектуре **Manifest V3**, разделяя ответственность на три основных контекста:

1.  **Service Worker (`background.js`):**
    *   Управляет жизненным циклом Offscreen Document.
    *   Слушает глобальные медиа-команды Chrome (`chrome.commands.onCommand`).
    *   Пересылает сигналы управления в Offscreen документ через `BroadcastChannel`.
2.  **Offscreen Document (`offscreen.html` + `offscreen.js`):**
    *   **Аудио Движок:** Содержит скрытый элемент `<audio>`.
    *   **Управление состоянием:** Хранит массив `tracks`, текущий индекс, громкость и режимы повтор/shuffle.
    *   **Коммуникация:** Использует `BroadcastChannel ('audio_player_channel')` для трансляции обновлений состояния в UI (Popup) и получения команд.
3.  **UI Контексты (`popup.html`, `picker.html`, `loader.html`):**
    *   **Popup:** Основной интерфейс управления. Отправляет файлы в background/offscreen.
    *   **Picker:** Интерфейс первоначального выбора папки через `window.showDirectoryPicker()`.
    *   **Loader:** Обрабатывает восстановление плейлиста. Повторно проверяет права доступа к папкам и сканирует директории для восстановления списка.

#### Хранение Данных (IndexedDB)
Расширение использует IndexedDB для хранения постоянных данных:
*   **Хранилище `dirs`:** Сохраняет объекты `FileSystemDirectoryHandle`. Это позволяет расширению помнить, какие папки были добавлены, без необходимости повторного выбора.
*   **Хранилище `savedPlaylist`:** Сохраняет список имен треков и текущий индекс воспроизведения.

#### Алгоритм Восстановления Плейлиста (`loader.js`)
1.  **Получение состояния:** Читает `savedPlaylist` (по ключу `playlistId` или `session-last`) и директории из IndexedDB.
2.  **Запрос прав:** Проходит по сохраненным-handle папок и запрашивает разрешение на чтение (`handle.requestPermission`). Это требует действия пользователя (клика).
3.  **Сканирование:** Рекурсивно сканирует одобренные директории на наличие аудиофайлов.
4.  **Сопоставление:** Сопоставляет найденные файлы с сохраненными именами треков для точного восстановления порядка.
5.  **Передача и Возобновление:** Отправляет список файлов в Offscreen. Если включен `autoplay` (например, при Resume), плеер мгновенно переходит к нужному треку и секунде (`currentTime`).

### 3. Установка и Настройка

#### Требования
*   Браузер Google Chrome (на базе Chromium).

#### Шаги по Установке
1.  **Клонирование/Загрузка:** Скачайте исходный код репозитория.
2.  **Открыть Расширения:** Перейдите по адресу `chrome://extensions/`.
3.  **Режим Разработчика:** Включите переключатель в правом верхнем углу.
4.  **Загрузить распакованное:** Нажмите "Load unpacked" (Загрузить распакованное) и выберите корневую папку репозитория.
5.  **Проверка:** Иконка JSPlayer должна появиться на панели инструментов.

#### Настройка
*   **Разрешения:** При первом использовании расширение запросит доступ к конкретным папкам. Необходимо нажать "Allow" (Разрешить) в системном диалоге Chrome.
*   **Медиа-клавиши:** Убедитесь, что другие приложения не перехватывают глобальные медиа-клавиши, если вы планируете использовать горячие клавиши.

### 4. Примеры Использования

#### Сценарий А: Запуск Нового Плейлиста
1.  Нажмите на иконку расширения, чтобы открыть **Popup**.
2.  Если папки не добавлены, вы будете перенаправлены в **Picker**.
3.  Нажмите "Select Folder" и выберите директорию с музыкой.
4.  Система просканирует аудиофайлы. После завершения воспроизведение начнется автоматически.
5.  Используйте элементы управления Popup для Play/Pause, Переключения треков или Регулировки громкости.

#### Сценарий Б: Восстановление Сохраненной Сессии
1.  Закройте браузер или всплывающее окно расширения после сохранения плейлиста.
2.  Снова откройте расширение.
3.  Автоматически появится интерфейс **Loader**.
4.  Нажмите кнопку **"Start"**.
5.  Chrome запросит **Разрешить Доступ** к ранее выбранным папкам.
6.  Расширение просканирует папки заново, восстановит порядок треков и возобновит воспроизведение с последней позиции.

#### Сценарий В: Добавление Файлов через Drag & Drop
1.  Откройте **Popup**.
2.  Перетащите аудиофайлы или папки из проводника вашей ОС прямо на окно Popup.
3.  Файлы будут просканированы и добавлены в текущую очередь немедленно.

---

## 🛠 Technical Appendix / Техническое Приложение

### Permissions Used / Используемые Разрешения
| Permission | Purpose / Назначение |
| :--- | :--- |
| `offscreen` | To host the audio player in background / Для запуска плеера в фоне |
| `storage` | To save playlist state (IndexedDB wrapper) / Для сохранения состояния плейлиста |
| `commands` | To listen for Media Keys / Для прослушивания медиа-клавиш |
| `fileSystemAccess` | To read local audio files securely / Для безопасного чтения локальных файлов |

### Key APIs / Ключевые API
*   **File System Access API:** `window.showDirectoryPicker()`, `handle.requestPermission()`.
*   **Broadcast Channel API:** Inter-context communication (Popup ↔ Offscreen).
*   **Chrome Offscreen API:** `chrome.offscreen.createDocument()`.
*   **IndexedDB:** Persistent storage for handles and playlist metadata.

### Known Limitations / Известные Ограничения
*   **Folder Access:** Access to folders is not permanent; users must re-grant permission via the Loader interface after browser restarts due to security policies.
*   **File Moves:** If files are moved or renamed outside the browser, the playlist restoration may mark them as "Missing".
*   **Mobile:** This extension is designed for Desktop Chrome and will not function on Chrome for Android/iOS.

### Структура Файлов / File Structure
```text
├── background.js          # Service Worker (Media Keys, Offscreen setup)
├── offscreen.html         # Hidden audio context
├── offscreen.js           # Audio Engine logic
├── popup.html             # Main UI
├── popup.js               # UI Logic & Drag/Drop
├── loader.html            # Playlist Restoration UI
├── loader.js              # Restoration Logic (Permissions & Scanning)
├── picker.html            # Initial Folder Selection UI
├── picker.js              # Folder Selection Logic
├── manifest.json          # Extension Configuration
└── icons/                 # Extension Assets
```
