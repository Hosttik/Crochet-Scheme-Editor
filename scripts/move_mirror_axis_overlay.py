from pathlib import Path

path = Path('src/App.tsx')
text = path.read_text()
overlay = '''            {mirrorAxis && productivitySelectionIds().length > 0 && (
              <MirrorAxisOverlay
                state={mirrorAxis}
                elements={elements}
                selectedIds={productivitySelectionIds()}
                zoom={viewport.zoom}
                clientToDocument={clientToDocument}
                onChange={moveMirrorAxis}
              />
            )}

'''
if text.count(overlay) != 1:
    raise SystemExit(f'expected one mirror overlay, got {text.count(overlay)}')
text = text.replace(overlay, '', 1)
marker = '''            <StitchLayer
              elements={elements}
              selectedIds={selectedIds}
              primaryId={primaryId}
              zoom={viewport.zoom}
              sourceAnchor={snapping.sourceAnchor}
              marquee={marqueeRect}
              selectedTopologyParentId={selectedTopologyParentId}
              onElementPointerDown={handleElementPointerDown}
              onRotatePointerDown={handleRotatePointerDown}
              onTopologyMarkerPointerDown={handleTopologyMarkerPointerDown}
            />

'''
if text.count(marker) != 1:
    raise SystemExit(f'expected one StitchLayer marker, got {text.count(marker)}')
text = text.replace(marker, marker + overlay, 1)
path.write_text(text)

Path('.github/workflows/move-mirror-axis-overlay.yml').unlink(missing_ok=True)
Path('scripts/move_mirror_axis_overlay.py').unlink(missing_ok=True)
