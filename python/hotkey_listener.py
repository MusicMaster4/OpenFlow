import json
import io
import os
import sys
import threading

from dotenv import load_dotenv
from pynput import keyboard

load_dotenv()

VK_SPACE = 0x20
VK_ESCAPE = 0x1B
WIN32_KEYDOWN_MESSAGES = {0x0100, 0x0104}
WIN32_KEYUP_MESSAGES = {0x0101, 0x0105}
DARWIN_SPACE_KEYCODE = 49
DARWIN_ESCAPE_KEYCODE = 53

if sys.platform == "darwin":
    from Quartz import (
        CGEventGetIntegerValueField,
        kCGEventKeyDown,
        kCGEventKeyUp,
        kCGKeyboardEventKeycode,
    )
else:
    CGEventGetIntegerValueField = None
    kCGEventKeyDown = None
    kCGEventKeyUp = None
    kCGKeyboardEventKeycode = None


def _configure_stdio() -> None:
    for stream_name in ("stdin", "stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream is None:
            continue

        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
            continue
        except (AttributeError, ValueError):
            pass

        buffer = getattr(stream, "buffer", None)
        if buffer is None:
            continue

        setattr(
            sys,
            stream_name,
            io.TextIOWrapper(
                buffer,
                encoding="utf-8",
                errors="replace",
                line_buffering=stream_name != "stdin",
            ),
        )


_configure_stdio()


class HotkeyListener:
    def __init__(self) -> None:
        self.hotkey = self._env_or_default("FLOW_HOTKEY", self._default_hotkey())
        self.hands_free_hotkey = f"{self.hotkey}+space"
        self.paste_last_hotkey = self._env_or_default(
            "FLOW_PASTE_LAST_HOTKEY",
            self._default_paste_hotkey(),
        )
        self.stop_event = threading.Event()
        self.is_pressed = False
        self.paste_last_active = False
        self.paste_last_pending_emit = False
        self.active_mode = "hold"
        self.state_lock = threading.Lock()
        self.listener = None
        self.pressed_tokens: set[str] = set()
        self.suppressed_action_tokens: set[str] = set()
        self.consume_space = False
        self.consume_escape = False
        self.hotkey_tokens = self._parse_shortcut(self.hotkey)
        self.paste_last_tokens = self._parse_shortcut(self.paste_last_hotkey)
        if not self.hotkey_tokens:
            raise RuntimeError("Atalho global invalido.")
        if not self.paste_last_tokens:
            raise RuntimeError("Atalho de colar a ultima transcricao invalido.")

    def emit(self, event_type: str, payload: dict | None = None) -> None:
        print(json.dumps({"type": event_type, "payload": payload or {}}, ensure_ascii=False), flush=True)

    def start(self) -> None:
        listener_kwargs = {
            "on_press": self._handle_press,
            "on_release": self._handle_release,
        }

        if sys.platform == "win32":
            listener_kwargs["win32_event_filter"] = self._win32_event_filter
        elif sys.platform == "darwin":
            listener_kwargs["darwin_intercept"] = self._darwin_intercept

        self.listener = keyboard.Listener(**listener_kwargs)
        self.listener.start()
        self.emit(
            "ready",
            {
                "shortcut": self.hotkey,
                "paste_last_shortcut": self.paste_last_hotkey,
            },
        )

    def shutdown(self) -> None:
        self.stop_event.set()

    def cleanup(self) -> None:
        if self.listener is not None:
            self.listener.stop()
        self.is_pressed = False
        self.paste_last_active = False
        self.paste_last_pending_emit = False
        self.active_mode = "hold"
        self.pressed_tokens.clear()
        self.suppressed_action_tokens.clear()
        self.listener = None

    @staticmethod
    def _default_hotkey() -> str:
        return "ctrl+command" if sys.platform == "darwin" else "ctrl+windows"

    @staticmethod
    def _default_paste_hotkey() -> str:
        return "command+option+v" if sys.platform == "darwin" else "ctrl+alt+v"

    @staticmethod
    def _env_or_default(name: str, fallback: str) -> str:
        value = str(os.getenv(name, "") or "").strip().lower()
        return value or fallback

    @staticmethod
    def _normalize_token(token: str) -> str:
        value = str(token or "").strip().lower()
        aliases = {
            "control": "ctrl",
            "ctrl_l": "ctrl",
            "ctrl_r": "ctrl",
            "shift_l": "shift",
            "shift_r": "shift",
            "cmd": "command",
            "cmd_l": "command",
            "cmd_r": "command",
            "super": "command" if sys.platform == "darwin" else "windows",
            "super_l": "command" if sys.platform == "darwin" else "windows",
            "super_r": "command" if sys.platform == "darwin" else "windows",
            "option": "alt",
            "option_l": "alt",
            "option_r": "alt",
            "alt_l": "alt",
            "alt_r": "alt",
            "esc": "escape",
            "return": "enter",
        }
        return aliases.get(value, value)

    @classmethod
    def _parse_shortcut(cls, shortcut: str) -> set[str]:
        return {
            cls._normalize_token(part)
            for part in str(shortcut or "").split("+")
            if cls._normalize_token(part)
        }

    @classmethod
    def _key_to_tokens(cls, key) -> set[str]:
        tokens: set[str] = set()

        if isinstance(key, keyboard.KeyCode) and key.char:
            tokens.add(cls._normalize_token(key.char))
            return tokens

        if not isinstance(key, keyboard.Key):
            return tokens

        special_map = {
            keyboard.Key.ctrl: "ctrl",
            keyboard.Key.ctrl_l: "ctrl",
            keyboard.Key.ctrl_r: "ctrl",
            keyboard.Key.shift: "shift",
            keyboard.Key.shift_l: "shift",
            keyboard.Key.shift_r: "shift",
            keyboard.Key.alt: "alt",
            keyboard.Key.alt_l: "alt",
            keyboard.Key.alt_r: "alt",
            keyboard.Key.alt_gr: "alt",
            keyboard.Key.cmd: "command" if sys.platform == "darwin" else "windows",
            keyboard.Key.cmd_l: "command" if sys.platform == "darwin" else "windows",
            keyboard.Key.cmd_r: "command" if sys.platform == "darwin" else "windows",
            keyboard.Key.space: "space",
            keyboard.Key.esc: "escape",
        }
        token = special_map.get(key)
        if token:
            tokens.add(token)
            if token == "command" and sys.platform != "darwin":
                tokens.add("windows")
        return tokens

    def _handle_press(self, key) -> None:
        self._handle_key_tokens(self._key_to_tokens(key), is_press=True)

    def _handle_release(self, key) -> None:
        self._handle_key_tokens(self._key_to_tokens(key), is_press=False)

    def _handle_key_tokens(self, key_tokens: set[str], is_press: bool) -> None:
        if not key_tokens:
            return

        with self.state_lock:
            if is_press:
                already_pressed = key_tokens.issubset(self.pressed_tokens)
                self.pressed_tokens.update(key_tokens)
            else:
                already_pressed = False
                self.pressed_tokens.difference_update(key_tokens)

            if is_press and "escape" in key_tokens and not already_pressed:
                self.emit("cancel-requested", {"source": "escape"})

            combo_active = self.hotkey_tokens.issubset(self.pressed_tokens)
            paste_last_active = self.paste_last_tokens.issubset(self.pressed_tokens)
            wants_hands_free = "space" in self.pressed_tokens

            if paste_last_active and not self.paste_last_active:
                self.paste_last_active = True
                self.paste_last_pending_emit = True
            elif not paste_last_active and self.paste_last_active:
                self.paste_last_active = False

            # Only trigger the paste-after-history shortcut after every key from
            # that shortcut has been released, avoiding modifier leakage such as
            # Ctrl/Alt still being held when the app injects Ctrl+V.
            if self.paste_last_pending_emit and not (self.paste_last_tokens & self.pressed_tokens):
                self.paste_last_pending_emit = False
                self.emit("paste-last-requested", {"shortcut": self.paste_last_hotkey})

            if combo_active and not self.is_pressed:
                self.is_pressed = True
                self.active_mode = "hands-free" if wants_hands_free else "hold"
                self.emit("hotkey-pressed", {"shortcut": self.hotkey, "mode": self.active_mode})
                return

            if combo_active and self.is_pressed and self.active_mode != "hands-free" and wants_hands_free:
                self.active_mode = "hands-free"
                self.emit("hotkey-mode-changed", {"shortcut": self.hotkey, "mode": self.active_mode})
                return

            if not combo_active and self.is_pressed:
                self.is_pressed = False
                released_mode = self.active_mode
                self.active_mode = "hold"
                self.emit("hotkey-released", {"shortcut": self.hotkey, "mode": released_mode})

    def _hotkey_space_active(self, *, include_current_press: bool = False) -> bool:
        active_tokens = set(self.pressed_tokens)
        if include_current_press:
            active_tokens.add("space")
        return "space" in self.hotkey_tokens and self.hotkey_tokens.issubset(active_tokens)

    def _should_consume_action_token(self, token: str, *, is_press: bool) -> bool:
        if token in self.suppressed_action_tokens:
            if is_press:
                return True

            self.suppressed_action_tokens.discard(token)
            return True

        if token == "space":
            wants_consume = (
                self.consume_space
                or self.is_pressed
                or self._hotkey_space_active(include_current_press=is_press)
            )
        elif token == "escape":
            wants_consume = self.consume_escape
        else:
            return False

        if is_press:
            if wants_consume:
                self.suppressed_action_tokens.add(token)
                return True
            return False

        return False

    def _win32_event_filter(self, msg, data) -> bool:
        key_token = None
        is_press = None

        if data.vkCode == VK_SPACE:
            key_token = "space"
        elif data.vkCode == VK_ESCAPE:
            key_token = "escape"

        if key_token is None:
            return True

        if msg in WIN32_KEYDOWN_MESSAGES:
            is_press = True
        elif msg in WIN32_KEYUP_MESSAGES:
            is_press = False
        else:
            return True

        with self.state_lock:
            should_consume = self._should_consume_action_token(key_token, is_press=is_press)

        if not should_consume:
            return True

        self._handle_key_tokens({key_token}, is_press=is_press)
        if self.listener is not None:
            self.listener.suppress_event()
        return False

    def _darwin_intercept(self, event_type, event):
        keycode = CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode)
        key_token = None

        if keycode == DARWIN_SPACE_KEYCODE:
            key_token = "space"
        elif keycode == DARWIN_ESCAPE_KEYCODE:
            key_token = "escape"

        if key_token is None:
            return event

        if event_type == kCGEventKeyDown:
            is_press = True
        elif event_type == kCGEventKeyUp:
            is_press = False
        else:
            return event

        with self.state_lock:
            should_consume = self._should_consume_action_token(key_token, is_press=is_press)

        return None if should_consume else event

    def set_action_key_handling(self, payload: dict | None = None) -> None:
        data = payload or {}
        with self.state_lock:
            self.consume_space = data.get("suppress_space") is True
            self.consume_escape = data.get("suppress_escape") is True


def main() -> int:
    listener = HotkeyListener()

    try:
        listener.start()
    except Exception as error:
        listener.emit("error", {"message": f"Failed to register the global shortcut: {error}"})
        return 1

    def stdin_loop() -> None:
        for raw_line in sys.stdin:
            line = raw_line.strip()
            if not line:
                continue

            try:
                command = json.loads(line)
            except json.JSONDecodeError:
                listener.emit("error", {"message": "Listener received an invalid JSON command."})
                continue

            if command.get("type") == "shutdown":
                listener.shutdown()
                break
            if command.get("type") == "set-action-key-handling":
                listener.set_action_key_handling(command.get("payload"))

    reader_thread = threading.Thread(target=stdin_loop, daemon=True)
    reader_thread.start()

    while not listener.stop_event.wait(0.2):
        pass

    listener.cleanup()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
