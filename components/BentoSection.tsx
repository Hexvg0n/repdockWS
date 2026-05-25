"use client";

import {
  IconCalculator,
  IconLink,
  IconTools,
  IconTransform,
  IconTruckDelivery,
} from "@tabler/icons-react";

import styles from "./BentoSection.module.css";
import { useLanguageCopy } from "@/lib/use-repdock-language";

const bentoCopy = {
  PL: {
    items: [
      {
        title: "Konwertuj między agentami",
        description: "Wklej jeden link produktu i przenieś go do preferowanych agentów.",
      },
      {
        title: "Wszystkie narzędzia w jednym miejscu",
        description: "Konwerter, QC, kalkulator i tracking są zawsze w jednym miejscu.",
      },
      {
        title: "Sprawdź koszty przed wysyłką",
        description: "Oszacuj cenę wysyłki i opłaty międzynarodowe przed zakupem.",
      },
      {
        title: "Śledź każdą paczkę",
        description: "Sprawdzaj status twoich paczek i daty dostaw.",
      },
    ],
    visual: {
      costBreakdown: "Koszty",
      delivery: "Dostawa",
      international: "Zdjęcia QC",
      itemPrice: "Cena produktu",
      productLink: "Link produktu",
      qcPhotos: "Zakupy",
      seeTotal: "Zobacz sumę",
      shipping: "Wysyłka",
      totalEstimate: "Szacowana suma",
      warehouse: "Link",
      workflow: ["Konwerter", "Galeria QC", "Kalkulator", "Tracking", "Outfity", "Sprzedawcy"],
    },
  },
  EN: {
    items: [
      {
        title: "Convert across agents",
        description: "Paste one product link and move it between your preferred agents.",
      },
      {
        title: "All tools in one workflow",
        description: "Converter, QC checks, calculator and tracking stay close to your order.",
      },
      {
        title: "Cost clarity before checkout",
        description: "Estimate item price, local shipping and international fees before you commit.",
      },
      {
        title: "Track every parcel",
        description: "Follow warehouse updates and delivery progress without opening five tabs.",
      },
    ],
    visual: {
      costBreakdown: "Cost breakdown",
      delivery: "Delivery",
      international: "International",
      itemPrice: "Item price",
      productLink: "Product Link",
      qcPhotos: "QC photos",
      seeTotal: "See total",
      shipping: "Shipping",
      totalEstimate: "Total estimate",
      warehouse: "Warehouse",
      workflow: ["Converter", "QC Gallery", "Calculator", "Tracking", "Outfits", "Sellers"],
    },
  },
} as const;

type BentoVisualCopy = (typeof bentoCopy)[keyof typeof bentoCopy]["visual"];

const itemMeta = [
  {
    className: styles.cardCompact,
    icon: IconTransform,
    visual: "converter",
  },
  {
    className: styles.cardWide,
    icon: IconTools,
    visual: "workflow",
  },
  {
    className: styles.cardLarge,
    icon: IconCalculator,
    visual: "calculator",
  },
  {
    className: styles.cardSide,
    icon: IconTruckDelivery,
    visual: "tracking",
  },
];

const agentIcons = {
  DHL: "/agents/DHL_logo.jpg",
  KAKOBUY: "/agents/kako_icon.png",
  BBDBUY: "/agents/BBDBUY_icon.png",
  USFANS: "/agents/usfans_icon.png",
  OOPBUY: "/agents/oop_icon.png",
  ACBUY: "/agents/acb_icon.png",
  WEIDIAN: "/agents/weidian_logo.png"
} as const;

export function BentoSection() {
  const copy = useLanguageCopy(bentoCopy);

  return (
    <section className={styles.section} id="features">
      <div className={styles.grid}>
        {itemMeta.map((item, index) => {
          const Icon = item.icon;
          const text = copy.items[index];

          return (
            <article className={`${styles.card} ${item.className}`} key={text.title}>
              <div className={styles.cardHeader}>
                <span className={styles.iconWrap}>
                  <Icon className={styles.icon} stroke={1.8} />
                </span>
                <h3 className={styles.cardTitle}>{text.title}</h3>
              </div>

              <p className={styles.description}>{text.description}</p>
              <CardVisual type={item.visual} copy={copy.visual} />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CardVisual({
  copy,
  type,
}: Readonly<{
  copy: BentoVisualCopy;
  type: string;
}>) {
  if (type === "converter") {
    return (
      <div className={styles.converterVisual} aria-hidden="true">
        <AgentBadge
          className={styles.badgeTop}
          color="blue"
          label="BBDBUY"
          src={agentIcons.BBDBUY}
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
            <strong>{copy.productLink}</strong>
          </span>
          <div className={styles.productPreview}>
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className={styles.linkGrid}>
          {copy.workflow.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    );
  }

  if (type === "calculator") {
    return (
      <div className={styles.calculatorVisual} aria-hidden="true">
        <div className={styles.analyticsPanel}>
          <p>{copy.seeTotal}</p>
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
          <p>{copy.costBreakdown}</p>
          <span>{copy.itemPrice}</span>
          <strong>389 CNY</strong>
          <span>{copy.shipping}</span>
          <strong>72 CNY</strong>
          <span>{copy.totalEstimate}</span>
          <strong>$64.12</strong>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.trackingVisual} aria-hidden="true">
      <span>{copy.warehouse}</span>
      <span>{copy.qcPhotos}</span>
      <span>{copy.international}</span>
      <span>{copy.delivery}</span>
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
}: Readonly<{
  className?: string;
  color: "amber" | "blue" | "orange" | "pink";
  label: string;
  src?: string;
}>) {
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
