# -*- mode: python ; coding: utf-8 -*-

import os
import sys

block_cipher = None

current_dir = os.path.abspath(SPECPATH)
project_root = os.path.abspath(os.path.join(current_dir, ".."))
backend_dir = os.path.join(project_root, "backend")

added_files = [
    (os.path.join(current_dir, "scanner_web"), "scanner_web"),
    (os.path.join(current_dir, "dashboard_web"), "dashboard_web"),
    (os.path.join(backend_dir, "app"), "app"),
    (os.path.join(backend_dir, "neuroface.db"), "."),
]

a = Analysis(
    ['gui_app.py'],
    pathex=[current_dir, project_root, backend_dir],
    binaries=[],
    datas=added_files,
    hiddenimports=[
        'uvicorn',
        'fastapi',
        'torch',
        'torchvision',
        'facenet_pytorch',
        'qrcode',
        'PIL',
        'cv2',
        'sqlalchemy',
        'pydantic',
        'pydantic_settings',
        'starlette',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['IPython', 'notebook', 'scipy', 'matplotlib'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='NeuroFace-Teacher-Server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='NeuroFace-Teacher-Server',
)
