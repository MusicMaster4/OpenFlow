from PyInstaller.utils.hooks import copy_metadata

# The installed distribution is named "webrtcvad-wheels" even though the
# imported module is "webrtcvad".
datas = copy_metadata("webrtcvad-wheels")
