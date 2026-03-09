import json
import os
import sys
import threading

import keyboard
from dotenv import load_dotenv

load_dotenv()


class HotkeyListener:
    def __init__(self) -> None:
        self.hotkey = os.getenv("FLOW_HOTKEY", "ctrl+shift+space")
        self.stop_event = threading.Event()
        self.is_pressed = False
        self.state_lock = threading.Lock()
        self.event_hook = None
        self.suppress_hook = None
        self.pressed_scan_codes: set[int] = set()
        steps = keyboard.parse_hotkey_combinations(self.hotkey)
        if len(steps) != 1:
            raise RuntimeError("Apenas atalhos globais de uma etapa sao suportados.")
        self.hotkey_combinations = [set(combination) for combination in steps[0]]

    def emit(self, event_type: str, payload: dict | None = None) -> None:
        print(json.dumps({"type": event_type, "payload": payload or {}}, ensure_ascii=False), flush=True)

    def start(self) -> None:
        if not self.hotkey_combinations:
            raise RuntimeError(f"Atalho invalido: {self.hotkey}")

        self.suppress_hook = keyboard.add_hotkey(
            self.hotkey,
            lambda: None,
            suppress=True,
            trigger_on_release=False,
        )
        self.event_hook = keyboard.hook(self._handle_key_event)
        self.emit("ready", {"shortcut": self.hotkey})

    def shutdown(self) -> None:
        self.stop_event.set()

    def cleanup(self) -> None:
        keyboard.clear_all_hotkeys()
        if self.event_hook is not None:
            keyboard.unhook(self.event_hook)
        self.is_pressed = False
        self.pressed_scan_codes.clear()
        self.event_hook = None
        self.suppress_hook = None

    def _handle_key_event(self, event) -> None:
        with self.state_lock:
            if event.event_type == keyboard.KEY_DOWN:
                self.pressed_scan_codes.add(event.scan_code)
            elif event.event_type == keyboard.KEY_UP:
                self.pressed_scan_codes.discard(event.scan_code)
            else:
                return

            combo_active = any(
                combination.issubset(self.pressed_scan_codes) for combination in self.hotkey_combinations
            )

            if combo_active and not self.is_pressed:
                self.is_pressed = True
                self.emit("hotkey-pressed", {"shortcut": self.hotkey})
                return

            if not combo_active and self.is_pressed:
                self.is_pressed = False
                self.emit("hotkey-released", {"shortcut": self.hotkey})


def main() -> int:
    listener = HotkeyListener()

    try:
        listener.start()
    except Exception as error:
        listener.emit("error", {"message": f"Falha ao registrar o atalho global: {error}"})
        return 1

    def stdin_loop() -> None:
        for raw_line in sys.stdin:
            line = raw_line.strip()
            if not line:
                continue

            try:
                command = json.loads(line)
            except json.JSONDecodeError:
                listener.emit("error", {"message": "Comando JSON invalido recebido pelo listener."})
                continue

            if command.get("type") == "shutdown":
                listener.shutdown()
                break

    reader_thread = threading.Thread(target=stdin_loop, daemon=True)
    reader_thread.start()

    while not listener.stop_event.wait(0.2):
        pass

    listener.cleanup()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
