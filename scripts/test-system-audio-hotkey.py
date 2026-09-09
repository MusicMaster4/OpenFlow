import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "python"))

os.environ["FLOW_HOTKEY"] = "ctrl+windows"
os.environ["FLOW_PASTE_LAST_HOTKEY"] = "ctrl+alt+v"

from hotkey_listener import HotkeyListener  # noqa: E402


def collect_events(listener):
    events = []
    listener.emit = lambda event_type, payload=None: events.append((event_type, payload or {}))
    return events


def press(listener, *tokens):
    for token in tokens:
        listener._handle_key_tokens({token}, is_press=True)


def release(listener, *tokens):
    for token in tokens:
        listener._handle_key_tokens({token}, is_press=False)


def test_ctrl_win_stays_microphone_hold():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "ctrl", "windows")
    assert events[-1] == (
        "hotkey-pressed",
        {"shortcut": "ctrl+windows", "mode": "hold", "source": "microphone"},
    )


def test_ctrl_win_alt_starts_system_hold():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "alt", "ctrl", "windows")
    assert events[-1] == (
        "hotkey-pressed",
        {"shortcut": "ctrl+windows", "mode": "hold", "source": "system"},
    )


def test_alt_can_upgrade_an_active_hold():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "ctrl", "windows")
    press(listener, "alt")
    assert events[-1] == (
        "hotkey-mode-changed",
        {"shortcut": "ctrl+windows", "mode": "hold", "source": "system"},
    )


def test_space_on_system_combo_enables_hands_free():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "alt", "space", "ctrl", "windows")
    assert events[-1] == (
        "hotkey-pressed",
        {"shortcut": "ctrl+windows", "mode": "hands-free", "source": "system"},
    )


def test_space_can_upgrade_system_hold_to_hands_free():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "ctrl", "windows", "alt")
    press(listener, "space")
    assert events[-1] == (
        "hotkey-mode-changed",
        {"shortcut": "ctrl+windows", "mode": "hands-free", "source": "system"},
    )


def test_releasing_alt_does_not_drop_system_source():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "ctrl", "windows", "alt")
    release(listener, "alt")
    assert listener.active_source == "system"
    assert listener.is_pressed is True
    assert events[-1] == (
        "hotkey-mode-changed",
        {"shortcut": "ctrl+windows", "mode": "hold", "source": "system"},
    )


def test_release_emits_system_source():
    listener = HotkeyListener()
    events = collect_events(listener)
    press(listener, "ctrl", "windows", "alt")
    release(listener, "alt", "windows", "ctrl")
    assert events[-1] == (
        "hotkey-released",
        {"shortcut": "ctrl+windows", "mode": "hold", "source": "system"},
    )


def test_alt_hotkey_uses_shift_for_system_audio():
    os.environ["FLOW_HOTKEY"] = "ctrl+alt"
    try:
        listener = HotkeyListener()
        events = collect_events(listener)
        assert listener.system_audio_token == "shift"
        press(listener, "ctrl", "alt", "shift")
        assert events[-1][1]["source"] == "system"
    finally:
        os.environ["FLOW_HOTKEY"] = "ctrl+windows"


def main() -> int:
    tests = [
        test_ctrl_win_stays_microphone_hold,
        test_ctrl_win_alt_starts_system_hold,
        test_alt_can_upgrade_an_active_hold,
        test_space_on_system_combo_enables_hands_free,
        test_space_can_upgrade_system_hold_to_hands_free,
        test_releasing_alt_does_not_drop_system_source,
        test_release_emits_system_source,
        test_alt_hotkey_uses_shift_for_system_audio,
    ]
    for test in tests:
        test()
        print(f"PASS {test.__name__}")
    print(f"PASS {len(tests)} hotkey system-audio tests")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
