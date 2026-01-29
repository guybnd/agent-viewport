const socket = io();
const viewport = document.getElementById('viewport');
const cursorOverlay = document.getElementById('cursor-overlay');
const btnClickMode = document.getElementById('btn-click-mode');
const btnLockMode = document.getElementById('btn-lock-mode');
const modeInfo = document.getElementById('mode-info');

let currentMode = 'click'; // 'click' | 'lock'

// 1. Render Stream
socket.on('frame', (base64Image) => {
    viewport.src = `data:image/jpeg;base64,${base64Image}`;
});

// 2. Mode Switching
function setMode(mode) {
    currentMode = mode;

    // UI Updates
    btnClickMode.classList.toggle('active', mode === 'click');
    btnLockMode.classList.toggle('active', mode === 'lock');

    if (mode === 'click') {
        document.exitPointerLock();
        viewport.style.cursor = 'none'; // We use our custom cursor overlay
        cursorOverlay.style.display = 'block';
        modeInfo.textContent = "Move mouse to aim, Click to teleport & click. Keyboard active.";
    } else {
        viewport.style.cursor = 'default'; // Let pointer lock handle it (usually hidden)
        cursorOverlay.style.display = 'none';
        modeInfo.textContent = "Click video to Lock. ESC to unlock. Continuous movement.";
    }
}

btnClickMode.addEventListener('click', () => setMode('click'));
btnLockMode.addEventListener('click', () => {
    setMode('lock');
    viewport.requestPointerLock();
});

// Initialize
setMode('click');

// 3. Coordinate Helpers
function getNormalizedCoordinates(event, element) {
    const rect = element.getBoundingClientRect();

    // Handle "object-fit: contain" letterboxing
    // Real image dimensions
    const imgWidth = element.naturalWidth || 2560;
    const imgHeight = element.naturalHeight || 1440;

    // Scale factors
    const scale = Math.min(rect.width / imgWidth, rect.height / imgHeight);
    const displayedWidth = imgWidth * scale;
    const displayedHeight = imgHeight * scale;

    // Offsets (letterboxing)
    const offsetX = (rect.width - displayedWidth) / 2;
    const offsetY = (rect.height - displayedHeight) / 2;

    const relX = event.clientX - rect.left - offsetX;
    const relY = event.clientY - rect.top - offsetY;

    // Clamping to [0, 1]
    const normX = Math.max(0, Math.min(1, relX / displayedWidth));
    const normY = Math.max(0, Math.min(1, relY / displayedHeight));

    return { x: normX, y: normY, inside: (relX >= 0 && relX <= displayedWidth && relY >= 0 && relY <= displayedHeight) };
}


// 4. Input Handlers

// Movement
viewport.addEventListener('mousemove', (e) => {
    if (currentMode === 'click') {
        // Visual Update Only
        cursorOverlay.style.left = e.clientX + 'px';
        cursorOverlay.style.top = e.clientY + 'px';
    } else if (currentMode === 'lock' && document.pointerLockElement === viewport) {
        // Continuous server update
        socket.emit('input', {
            type: 'mousemove_relative',
            dx: e.movementX,
            dy: e.movementY
        });
    }
});

// Clicks
viewport.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (currentMode === 'click') {
        const { x, y, inside } = getNormalizedCoordinates(e, viewport);
        if (inside) {
            let button = 'left';
            if (e.button === 2) button = 'right';
            else if (e.button === 1) button = 'middle';

            // Send Teleport + Click
            socket.emit('input', { type: 'click_teleport', x, y, button });
        }
    } else if (currentMode === 'lock') {
        if (document.pointerLockElement !== viewport) {
            viewport.requestPointerLock();
        } else {
            let button = 'left';
            if (e.button === 2) button = 'right';
            else if (e.button === 1) button = 'middle';
            socket.emit('input', { type: 'mousedown', button });
        }
    }
});

viewport.addEventListener('mouseup', (e) => {
    if (currentMode === 'lock' && document.pointerLockElement === viewport) {
        let button = 'left';
        if (e.button === 2) button = 'right';
        else if (e.button === 1) button = 'middle';
        socket.emit('input', { type: 'mouseup', button });
    }
});

// Context Menu
viewport.addEventListener('contextmenu', (e) => e.preventDefault());

// Keyboard
window.addEventListener('keydown', (e) => {
    // Only send keys if we are focused on the viewport or in lock mode
    // (Simple heuristic: always send if likely valid key)

    // Mapping some keys
    const validKeys = [
        'backspace', 'delete', 'enter', 'tab', 'escape', 'up', 'down', 'right', 'left',
        'home', 'end', 'pageup', 'pagedown', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7',
        'f8', 'f9', 'f10', 'f11', 'f12', 'command', 'alt', 'control', 'shift',
        'right_shift', 'space', 'printscreen', 'insert',
        'audio_mute', 'audio_vol_down', 'audio_vol_up', 'audio_play', 'audio_stop',
        'audio_pause', 'audio_prev', 'audio_next', 'audio_rewind', 'audio_forward',
        'numpad_0', 'numpad_1', 'numpad_2', 'numpad_3', 'numpad_4', 'numpad_5', 'numpad_6', 'numpad_7', 'numpad_8', 'numpad_9',
        'lights_mon_up', 'lights_mon_down', 'lights_kbd_toggle', 'lights_kbd_up', 'lights_kbd_down'
    ];

    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';

    const isChar = key.length === 1;
    const isSpecial = validKeys.includes(key);

    if (isChar || isSpecial) {
        socket.emit('input', { type: 'keytap', key });
    }
});
