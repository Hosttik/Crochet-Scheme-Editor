import fs from 'node:fs'

function patchFile(path, replacements) {
  let source = fs.readFileSync(path, 'utf8')
  for (const [label, before, after] of replacements) {
    const first = source.indexOf(before)
    if (first < 0) throw new Error(`${label}: fragment not found in ${path}`)
    if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${label}: fragment not unique in ${path}`)
    source = source.slice(0, first) + after + source.slice(first + before.length)
  }
  fs.writeFileSync(path, source)
}

patchFile('src/App.tsx', [
  [
    'duplicate shortcut latch ref',
    `  const duplicateSeriesRef = useRef<{ previous: StitchElement[]; currentIds: string[] } | null>(null)\n  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve())`,
    `  const duplicateSeriesRef = useRef<{ previous: StitchElement[]; currentIds: string[] } | null>(null)\n  const duplicateKeyDownRef = useRef(false)\n  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve())`,
  ],
  [
    'guard Ctrl+D keydown',
    `        } else if (key === 'd') {\n          event.preventDefault()\n          if (!event.repeat) duplicateSelection()\n        } else if (key === 'a') {`,
    `        } else if (key === 'd') {\n          event.preventDefault()\n          if (!event.repeat && !duplicateKeyDownRef.current) {\n            duplicateKeyDownRef.current = true\n            duplicateSelection()\n          }\n        } else if (key === 'a') {`,
  ],
  [
    'release Ctrl+D latch',
    `    const onKeyUp = (event: KeyboardEvent) => {\n      if (event.code === 'Space') spacePressedRef.current = false\n    }`,
    `    const onKeyUp = (event: KeyboardEvent) => {\n      if (event.code === 'Space') spacePressedRef.current = false\n      if (event.key.toLowerCase() === 'd' || event.key === 'Control' || event.key === 'Meta') {\n        duplicateKeyDownRef.current = false\n      }\n    }`,
  ],
])

patchFile('e2e/productivity.e2e.ts', [
  [
    'assert repeat selection before Ctrl+D',
    `  const current = transformParts(await selected.getAttribute('transform'))\n  await page.keyboard.press('Control+D')`,
    `  const current = transformParts(await selected.getAttribute('transform'))\n  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)\n  await page.keyboard.press('Control+D')`,
  ],
])

console.log('v1.8 shortcut latch and E2E assertion applied')
