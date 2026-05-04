import { motion, type Variants } from "framer-motion";

const spring = { type: "spring" as const, stiffness: 550, damping: 20 };

interface AnimatedNavIconProps {
  className?: string;
  isActive?: boolean;
}

/* ── Shared Lucide-compatible SVG wrapper ──────────────────── */

function IconWrapper({
  children,
  className,
  isActive,
}: {
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
}) {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      whileHover={isActive ? undefined : "hover"}
      initial="idle"
      animate="idle"
    >
      {children}
    </motion.svg>
  );
}

/* ── Overview (LayoutDashboard — 4 rectangles) ─────────────── */

const overviewTopLeft: Variants = {
  idle: { scale: 1, originX: "6.5px", originY: "7.5px" },
  hover: { scale: 1.15, originX: "6.5px", originY: "7.5px", transition: { ...spring, delay: 0 } },
};
const overviewBottomRight: Variants = {
  idle: { scale: 1, originX: "17.5px", originY: "16.5px" },
  hover: { scale: 1.15, originX: "17.5px", originY: "16.5px", transition: { ...spring, delay: 0.04 } },
};
const overviewTopRight: Variants = {
  idle: { scale: 1, originX: "17.5px", originY: "5.5px" },
  hover: { scale: 0.85, originX: "17.5px", originY: "5.5px", transition: { ...spring, delay: 0.04 } },
};
const overviewBottomLeft: Variants = {
  idle: { scale: 1, originX: "6.5px", originY: "18.5px" },
  hover: { scale: 0.85, originX: "6.5px", originY: "18.5px", transition: { ...spring, delay: 0 } },
};

export function OverviewIcon({ className, isActive }: AnimatedNavIconProps) {
  return (
    <IconWrapper className={className} isActive={isActive}>
      <motion.rect width="7" height="9" x="3" y="3" rx="1" variants={overviewTopLeft} style={{ willChange: "transform" }} />
      <motion.rect width="7" height="5" x="14" y="3" rx="1" variants={overviewTopRight} style={{ willChange: "transform" }} />
      <motion.rect width="7" height="9" x="14" y="12" rx="1" variants={overviewBottomRight} style={{ willChange: "transform" }} />
      <motion.rect width="7" height="5" x="3" y="16" rx="1" variants={overviewBottomLeft} style={{ willChange: "transform" }} />
    </IconWrapper>
  );
}

/* ── Campuses (Building2) ──────────────────────────────────── */

const buildingBody: Variants = {
  idle: { y: 0 },
  hover: { y: 0, transition: spring },
};
const buildingRoof: Variants = {
  idle: { y: 0 },
  hover: { y: -1.5, transition: spring },
};
const buildingDoor: Variants = {
  idle: { scaleY: 1, originX: "12px", originY: "21px" },
  hover: { scaleY: 1.2, originX: "12px", originY: "21px", transition: spring },
};
const buildingWindows: Variants = {
  idle: { opacity: 1 },
  hover: { opacity: 0.7, transition: spring },
};

export function CampusesIcon({ className, isActive }: AnimatedNavIconProps) {
  return (
    <IconWrapper className={className} isActive={isActive}>
      {/* Main building body + base */}
      <motion.path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16" variants={buildingRoof} style={{ willChange: "transform" }} />
      <motion.path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2" variants={buildingBody} style={{ willChange: "transform" }} />
      {/* Windows */}
      <motion.path d="M10 8h4" variants={buildingWindows} style={{ willChange: "transform" }} />
      <motion.path d="M10 12h4" variants={buildingWindows} style={{ willChange: "transform" }} />
      {/* Door */}
      <motion.path d="M14 21v-3a2 2 0 0 0-4 0v3" variants={buildingDoor} style={{ willChange: "transform" }} />
    </IconWrapper>
  );
}

/* ── Year over Year (TrendingUp) ───────────────────────────── */

const trendLine: Variants = {
  idle: { pathLength: 1, pathOffset: 0 },
  hover: {
    pathLength: [0.6, 1],
    pathOffset: [0.4, 0],
    transition: { duration: 0.5, ease: "easeOut" },
  },
};
const trendArrowhead: Variants = {
  idle: { x: 0 },
  hover: { x: 2, transition: spring },
};

export function YearOverYearIcon({ className, isActive }: AnimatedNavIconProps) {
  return (
    <IconWrapper className={className} isActive={isActive}>
      <motion.path d="m22 7-8.5 8.5-5-5L2 17" variants={trendLine} style={{ willChange: "transform" }} />
      <motion.path d="M16 7h6v6" variants={trendArrowhead} style={{ willChange: "transform" }} />
    </IconWrapper>
  );
}

/* ── Demographics (Users) ──────────────────────────────────── */

const userCenter: Variants = {
  idle: { y: 0, scale: 1, originX: "9px", originY: "7px" },
  hover: { y: -1.5, scale: 1.08, originX: "9px", originY: "7px", transition: spring },
};
const userCenterBody: Variants = {
  idle: { y: 0, x: 0 },
  hover: { y: -1.5, transition: spring },
};
const userRight: Variants = {
  idle: { x: 0, opacity: 1 },
  hover: { x: 1.5, opacity: 0.75, transition: spring },
};
const userRightBody: Variants = {
  idle: { x: 0, opacity: 1 },
  hover: { x: 1.5, opacity: 0.75, transition: spring },
};

export function DemographicsIcon({ className, isActive }: AnimatedNavIconProps) {
  return (
    <IconWrapper className={className} isActive={isActive}>
      {/* Center figure — head */}
      <motion.circle cx="9" cy="7" r="4" variants={userCenter} style={{ willChange: "transform" }} />
      {/* Center figure — body */}
      <motion.path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" variants={userCenterBody} style={{ willChange: "transform" }} />
      {/* Right figure — head arc */}
      <motion.path d="M16 3.128a4 4 0 0 1 0 7.744" variants={userRight} style={{ willChange: "transform" }} />
      {/* Right figure — body */}
      <motion.path d="M22 21v-2a4 4 0 0 0-3-3.87" variants={userRightBody} style={{ willChange: "transform" }} />
    </IconWrapper>
  );
}

/* ── Admin (Settings — gear) ───────────────────────────────── */

const gearOuter: Variants = {
  idle: { rotate: 0, originX: "12px", originY: "12px" },
  hover: { rotate: 30, originX: "12px", originY: "12px", transition: spring },
};
const gearInner: Variants = {
  idle: { scale: 1, originX: "12px", originY: "12px" },
  hover: { scale: 0.85, originX: "12px", originY: "12px", transition: spring },
};

export function AdminIcon({ className, isActive }: AnimatedNavIconProps) {
  return (
    <IconWrapper className={className} isActive={isActive}>
      <motion.path
        d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"
        variants={gearOuter}
        style={{ willChange: "transform" }}
      />
      <motion.circle cx="12" cy="12" r="3" variants={gearInner} style={{ willChange: "transform" }} />
    </IconWrapper>
  );
}
