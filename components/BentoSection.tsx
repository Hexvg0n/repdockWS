import {
  IconCalculator,
  IconLink,
  IconTools,
  IconTransform,
  IconTruckDelivery,
} from "@tabler/icons-react";

import styles from "./BentoSection.module.css";

const items = [
  {
    title: "Convert across agents",
    description: "Paste one product link and move it between your preferred agents.",
    className: styles.cardCompact,
    icon: IconTransform,
    visual: "converter",
  },
  {
    title: "All tools in one workflow",
    description: "Converter, QC checks, calculator and tracking stay close to your order.",
    className: styles.cardWide,
    icon: IconTools,
    visual: "workflow",
  },
  {
    title: "Cost clarity before checkout",
    description: "Estimate item price, local shipping and international fees before you commit.",
    className: styles.cardLarge,
    icon: IconCalculator,
    visual: "calculator",
  },
  {
    title: "Track every parcel",
    description: "Follow warehouse updates and delivery progress without opening five tabs.",
    className: styles.cardSide,
    icon: IconTruckDelivery,
    visual: "tracking",
  },
];

const agentIcons = {
  DHL: "/agents/DHL_logo.jpg",
  KAKOBUY: "/agents/kako_icon.png",
  RIZZITGO: "/agents/rig_icon.png",
  USFANS: "/agents/usfans_icon.png",
  OOPBUY: "/agents/oop_icon.png",
  ACBUY: "/agents/acb_icon.png",
  WEIDIAN: "/agents/weidian_logo.png"
} as const;

export function BentoSection() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.grid}>
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article className={`${styles.card} ${item.className}`} key={item.title}>
              <div className={styles.cardHeader}>
                <span className={styles.iconWrap}>
                  <Icon className={styles.icon} stroke={1.8} />
                </span>
                <h3 className={styles.cardTitle}>{item.title}</h3>
              </div>

              <p className={styles.description}>{item.description}</p>
              <CardVisual type={item.visual} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CardVisual({ type }: { type: string }) {
  if (type === "converter") {
    return (
      <div className={styles.converterVisual} aria-hidden="true">
        <AgentBadge
          className={styles.badgeTop}
          color="blue"
          label="RIZZITGO"
          src={agentIcons.RIZZITGO}
        />
        <AgentBadge
          className={styles.badgeMiddle}
          color="amber"
          label="ACBUY"
          src={agentIcons.ACBUY}
        />
        <AgentBadge
          className={styles.badgeBottom}
          color="pink"
          label="USFANS"
          src={agentIcons.USFANS}
        />
      </div>
    );
  }

  if (type === "workflow") {
    return (
      <div className={styles.workflowVisual} aria-hidden="true">
        <div className={styles.previewPanel}>
          <span className={styles.productLinkBadge}>
            <span className={styles.productLinkIcon}>
              <IconLink size={18} stroke={2} />
            </span>
            <strong>Product Link</strong>
          </span>
          <div className={styles.productPreview}>
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className={styles.linkGrid}>
          {["Converter", "QC Gallery", "Calculator", "Tracking", "Outfits", "Sellers"].map(
            (label) => (
              <span key={label}>{label}</span>
            ),
          )}
        </div>
      </div>
    );
  }

  if (type === "calculator") {
    return (
      <div className={styles.calculatorVisual} aria-hidden="true">
        <div className={styles.analyticsPanel}>
          <p>See total</p>
          <div className={styles.chart}>
            <span className={styles.chartGridLine} />
            <span className={styles.chartGridLine} />
            <span className={styles.chartGridLine} />
            <svg className={styles.chartSvg} viewBox="0 0 260 118" preserveAspectRatio="none">
              <path
                className={styles.chartArea}
                d="M0 88 C18 42 27 24 41 28 C56 33 58 86 82 88 C105 90 116 58 136 63 C154 68 160 94 184 84 C204 75 211 42 234 47 C247 50 253 63 260 58 L260 118 L0 118 Z"
              />
              <path
                className={styles.chartPath}
                d="M0 88 C18 42 27 24 41 28 C56 33 58 86 82 88 C105 90 116 58 136 63 C154 68 160 94 184 84 C204 75 211 42 234 47 C247 50 253 63 260 58"
              />
              <circle className={styles.chartDot} cx="41" cy="28" r="4" />
              <circle className={styles.chartDot} cx="136" cy="63" r="4" />
              <circle className={styles.chartDot} cx="234" cy="47" r="4" />
            </svg>
          </div>
          <AgentBadge color="blue" label=" OOPBUY" src={agentIcons.OOPBUY} />
        </div>

        <div className={styles.costPanel}>
          <p>Cost breakdown</p>
          <span>Item price</span>
          <strong>389 CNY</strong>
          <span>Shipping</span>
          <strong>72 CNY</strong>
          <span>Total estimate</span>
          <strong>$64.12</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.trackingVisual} aria-hidden="true">
      <span>Warehouse</span>
      <span>QC photos</span>
      <span>International</span>
      <span>Delivery</span>
      <AgentBadge color="blue" label="WEIDIAN" src={agentIcons.WEIDIAN} />
      <AgentBadge color="pink" label="DHL" src={agentIcons.DHL} />
    </div>
  );
}

function AgentBadge({
  className = "",
  color,
  label,
  src,
}: {
  className?: string;
  color: "amber" | "blue" | "orange" | "pink";
  label: string;
  src?: string;
}) {
  return (
    <span className={`${styles.agentBadge} ${styles[color]} ${className}`}>
      {src ? (
        <img className={styles.agentImage} src={src} alt="" />
      ) : (
        <span className={styles.agentIcon} />
      )}
      <strong>{label}</strong>
    </span>
  );
}
