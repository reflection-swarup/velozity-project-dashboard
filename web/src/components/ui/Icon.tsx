type Props = { className?: string };

const Svg = ({ className, children }: Props & { children: React.ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    className={className ?? 'size-4'}
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

export const IconHome = (props: Props) => (
  <Svg {...props}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
  </Svg>
);

export const IconFolder = (props: Props) => (
  <Svg {...props}>
    <path d="M3 7a2 2 0 0 1 2-2h3.6l2 2.4H19a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </Svg>
);

export const IconCheck = (props: Props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12 2.4 2.4L15.5 10" />
  </Svg>
);

export const IconActivity = (props: Props) => (
  <Svg {...props}>
    <path d="M13 3 5.5 13H11l-1 8 7.5-10H12z" />
  </Svg>
);

export const IconUsers = (props: Props) => (
  <Svg {...props}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20c0-3.1 2.5-5.4 5.5-5.4s5.5 2.3 5.5 5.4M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14.8c1.9.6 3 2.3 3 4.3" />
  </Svg>
);

export const IconBriefcase = (props: Props) => (
  <Svg {...props}>
    <rect x="3" y="7.5" width="18" height="12.5" rx="2" />
    <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3 12.5h18" />
  </Svg>
);

export const IconBell = (props: Props) => (
  <Svg {...props}>
    <path d="M14.9 17.1a3 3 0 0 1-5.8 0M17.7 13.7V10a5.7 5.7 0 1 0-11.4 0v3.7L5 15.8v.9h14v-.9z" />
  </Svg>
);

export const IconSearch = (props: Props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const IconSun = (props: Props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" />
  </Svg>
);

export const IconMoon = (props: Props) => (
  <Svg {...props}>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5" />
  </Svg>
);

export const IconMenu = (props: Props) => (
  <Svg {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Svg>
);

export const IconClose = (props: Props) => (
  <Svg {...props}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Svg>
);

export const IconClock = (props: Props) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
);

export const IconAlert = (props: Props) => (
  <Svg {...props}>
    <path d="M12 4.5 21 19.5H3z" />
    <path d="M12 10v4M12 16.6v.1" />
  </Svg>
);

export const IconShield = (props: Props) => (
  <Svg {...props}>
    <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.5-7 9-4.2-1.5-7-4.8-7-9V6z" />
    <path d="m9 12 2.2 2.2L15.2 10" />
  </Svg>
);

export const IconDatabase = (props: Props) => (
  <Svg {...props}>
    <ellipse cx="12" cy="6" rx="7.5" ry="3" />
    <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" />
  </Svg>
);

export const IconArrowRight = (props: Props) => (
  <Svg {...props}>
    <path d="M4.5 12h15M13.5 6l6 6-6 6" />
  </Svg>
);

export const IconChevronRight = (props: Props) => (
  <Svg {...props}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
);

export const IconLogout = (props: Props) => (
  <Svg {...props}>
    <path d="M14.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6.5a2 2 0 0 0 2-2v-2.5M10 12h10M17 9l3 3-3 3" />
  </Svg>
);
