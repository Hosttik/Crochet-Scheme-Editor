import type { ReactNode, SVGProps } from 'react'

export type EditorIconName =
  | 'select'
  | 'hand'
  | 'marquee'
  | 'lasso'
  | 'guide'
  | 'ruler'
  | 'undo'
  | 'redo'
  | 'save'
  | 'open'
  | 'export'
  | 'search'
  | 'star'
  | 'layers'
  | 'settings'
  | 'plus'
  | 'minus'
  | 'trash'
  | 'duplicate'
  | 'group'
  | 'ungroup'
  | 'row'
  | 'bringForward'
  | 'sendBackward'
  | 'bringToFront'
  | 'sendToBack'
  | 'rotateLeft'
  | 'rotateRight'
  | 'rotate180'
  | 'mirrorHorizontal'
  | 'mirrorVertical'
  | 'mirrorCopyHorizontal'
  | 'mirrorCopyVertical'
  | 'lock'
  | 'unlock'
  | 'eye'
  | 'eyeOff'
  | 'chevronDown'
  | 'more'

const paths: Record<EditorIconName, ReactNode> = {
  select: <path d="M5 3l12 9-6 1.2L8 19 5 3z" />,
  hand: <path d="M7.5 11V6.5a1.5 1.5 0 013 0V10m0-4.5a1.5 1.5 0 013 0V10m0-3a1.5 1.5 0 013 0v4m0-2.5a1.5 1.5 0 013 0V13c0 4-2.3 7-6.4 7H9.5c-2.6 0-4.1-1.2-5.2-3l-1.5-2.5a1.5 1.5 0 012.5-1.6L7.5 15v-4z" />,
  marquee: <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="3 3" />,
  lasso: <path d="M19 9c0 3.3-3.6 6-8 6s-8-2.7-8-6 3.6-6 8-6 8 2.7 8 6zm-5 5c0 4.5 6 2.5 6 5 0 1.1-1.1 2-2.5 2" />,
  guide: <><path d="M4 18L18 4" /><circle cx="7" cy="15" r="2" /><circle cx="15" cy="7" r="2" /></>,
  ruler: <><path d="M4 17L17 4l3 3L7 20l-3-3z" /><path d="M12 7l2 2M9 10l2 2M6 13l2 2" /></>,
  undo: <><path d="M9 7H4v-5" /><path d="M4 7c2.2-2.5 5-3.7 8-3.2 4.5.7 7.7 5 6.5 9.5-1.2 4.3-5.9 6.8-10 5" /></>,
  redo: <><path d="M15 7h5V2" /><path d="M20 7c-2.2-2.5-5-3.7-8-3.2-4.5.7-7.7 5-6.5 9.5 1.2 4.3 5.9 6.8 10 5" /></>,
  save: <><path d="M5 3h12l2 2v16H5V3z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></>,
  open: <><path d="M3 7h7l2 2h9v10H3V7z" /><path d="M3 19l4-7h14" /></>,
  export: <><path d="M12 3v12" /><path d="M8 7l4-4 4 4M5 12H3v9h18v-9h-2" /></>,
  search: <><circle cx="10" cy="10" r="6" /><path d="M14.5 14.5L21 21" /></>,
  star: <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3z" />,
  layers: <><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 12l9 5 9-5M3 16l9 5 9-5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.9 4.9L7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
  duplicate: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 16H4a2 2 0 01-2-2V5a2 2 0 012-2h9a2 2 0 012 2v1" /></>,
  group: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" /><path d="M10 7h4M7 10v4M17 10v4M10 17h4" strokeDasharray="2 2" /></>,
  ungroup: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><path d="M11 7h2M7 11v2M17 11v2M11 17h2" /></>,
  row: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none" /><circle cx="12" cy="20" r="1.4" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" /></>,
  bringForward: <><path d="M6 16l6 3 6-3" /><path d="M6 11l6 3 6-3" /><path d="M12 12V4M9 7l3-3 3 3" /></>,
  sendBackward: <><path d="M6 8l6-3 6 3" /><path d="M6 13l6-3 6 3" /><path d="M12 12v8M9 17l3 3 3-3" /></>,
  bringToFront: <><path d="M5 5h14" /><path d="M6 16l6 3 6-3" /><path d="M12 15V7M9 10l3-3 3 3" /></>,
  sendToBack: <><path d="M5 19h14" /><path d="M6 8l6-3 6 3" /><path d="M12 9v8M9 14l3 3 3-3" /></>,
  rotateLeft: <><path d="M8 7H3V2" /><path d="M3 7a9 9 0 11-1 8" /></>,
  rotateRight: <><path d="M16 7h5V2" /><path d="M21 7a9 9 0 10 1 8" /></>,
  rotate180: <><path d="M5 7a8 8 0 0114 5" /><path d="M19 7v5h-5" /><path d="M19 17a8 8 0 01-14-5" /><path d="M5 17v-5h5" /></>,
  mirrorHorizontal: <><path d="M12 3v18" strokeDasharray="2 2" /><path d="M9 6L3 12l6 6V6zM15 6l6 6-6 6V6z" /></>,
  mirrorVertical: <><path d="M3 12h18" strokeDasharray="2 2" /><path d="M6 9l6-6 6 6H6zM6 15l6 6 6-6H6z" /></>,
  mirrorCopyHorizontal: <><path d="M10 4v16" strokeDasharray="2 2" /><path d="M7 7L3 12l4 5V7zM14 7l5 5-5 5V7z" /><path d="M17 4v4M15 6h4" /></>,
  mirrorCopyVertical: <><path d="M4 10h16" strokeDasharray="2 2" /><path d="M7 7l5-4 5 4H7zM7 14l5 5 5-5H7z" /><path d="M19 15v4M17 17h4" /></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 018 0v3" /></>,
  unlock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M16 10V7a4 4 0 00-7.5-2" /></>,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" /><circle cx="12" cy="12" r="2.5" /></>,
  eyeOff: <><path d="M3 3l18 18M9.5 6.4A11 11 0 0112 6c6.5 0 10 6 10 6a16 16 0 01-3.1 3.7M6.3 7.2C3.5 9.1 2 12 2 12s3.5 6 10 6c1.2 0 2.2-.2 3.2-.5" /></>,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
}

export function EditorIcon({ name, size = 18, ...props }: { name: EditorIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {paths[name]}
    </svg>
  )
}
