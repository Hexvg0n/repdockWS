import styles from "./HeroSection.module.css";
import type { CSSProperties } from "react";
import { BentoSection } from "./BentoSection";
import { ServerMembersBadge } from "./ServerMembersBadge";

type CssVariables = CSSProperties & Record<`--${string}`, string | undefined>;

type Logo = {
  src: string;
  width: number;
  height: number;
  displayWidth: string;
  displayHeight?: string;
};

const logos: Logo[] = [
  {
    src: "/agents/Rizzitgo.png ",
    width: 75,
    height: 17,
    displayWidth: "125px",
  },
  {
    src: "/agents/Kakobuy.png",
    width: 75,
    height: 17,
    displayWidth: "125px",
  },
  {
    src: "/agents/Usfans.png",
    width: 75,
    height: 17,
    displayWidth: "125px",
  },
  {
    src: "/agents/Acbuy.png",
    width: 75,
    height: 17,
    displayWidth: "82px",
    displayHeight: "125px",
  },
  {
    src: "/agents/Oopbuy.png",
    width: 75,
    height: 17,
    displayWidth: "125px",
  },
];

const rays: CssVariables[] = [
  {
    "--ray-width": "40px",
    "--ray-height": "2072px",
    "--ray-bottom": "auto",
    "--ray-opacity": "0.27",
  },
  { "--ray-opacity": "0.28", "--ray-rotation": "25deg" },
  { "--ray-opacity": "0.57", "--ray-rotation": "11deg" },
  { "--ray-opacity": "0.42", "--ray-rotation": "-12deg" },
  { "--ray-opacity": "0.32", "--ray-rotation": "-24deg" },
  { "--ray-width": "50px", "--ray-rotation": "-18deg" },
  {
    "--ray-width": "50px",
    "--ray-height": "2704px",
    "--ray-top": "-342px",
    "--ray-right": "446px",
    "--ray-bottom": "auto",
    "--ray-left": "auto",
    "--ray-rotation": "-18deg",
  },
  {
    "--ray-width": "50px",
    "--ray-top": "-362px",
    "--ray-bottom": "-910px",
    "--ray-left": "69.2645%",
    "--ray-rotation": "-18deg",
  },
  { "--ray-width": "20px", "--ray-rotation": "-5deg" },
  {
    "--ray-width": "20px",
    "--ray-top": "-362px",
    "--ray-bottom": "-910px",
    "--ray-left": "69.2645%",
    "--ray-rotation": "-5deg",
  },
  { "--ray-width": "15px", "--ray-opacity": "0.5", "--ray-rotation": "-3deg" },
  { "--ray-width": "20px", "--ray-opacity": "0.6", "--ray-rotation": "18deg" },
  { "--ray-width": "20px", "--ray-opacity": "0.18", "--ray-rotation": "6deg" },
];

const duplicatedLogos = [...logos, ...logos];

function HeroActions() {
  return (
    <div className={styles.heroActions}>
      <a
        className={`${styles.button} ${styles.buttonPrimary}`}
        href="/w2c"
        target="_blank"
        rel="noopener noreferrer"
      >
        Check Spreadsheet
      </a>
      <a className={`${styles.button} ${styles.buttonSecondary}`} href="/sellers">
        Seller list
      </a>
    </div>
  );
}

function HeroBackground() {
  return (
    <div className={styles.background} aria-hidden="true">
      <div className={styles.topBlueLight} />
      <div className={styles.topFade} />

      <div className={styles.grid}>
        <img
          src="https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?width=513&height=272"
          srcSet="
            https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?scale-down-to=512&width=513&height=272 512w,
            https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?width=513&height=272 513w
          "
          sizes="100vw"
          width="513"
          height="272"
          alt=""
          decoding="async"
        />
      </div>

      <div className={styles.leftRays}>
        {rays.map((rayStyle) => (
          <div className={styles.ray} style={rayStyle} key={JSON.stringify(rayStyle)} />
        ))}

        <div className={`${styles.lightSource} ${styles.lightSourceLarge}`} />
        <div className={`${styles.lightSource} ${styles.lightSourceMedium}`} />
        <div className={`${styles.lightSource} ${styles.lightSourceSmall}`} />
      </div>
    </div>
  );
}

function LogoSlider() {
  return (
    <section className={styles.logoSlider} aria-label="Trusted by companies">
      <div className={styles.logoMarquee}>
        <ul className={styles.logoTrack}>
          {duplicatedLogos.map((logo, index) => (
            <li
              className={styles.brandLogo}
              style={{
                "--logo-width": logo.displayWidth,
                "--logo-height": logo.displayHeight,
              } as CssVariables}
              aria-hidden={index >= logos.length}
              key={`${logo.src}-${index}`}
            >
              <img
                src={logo.src}
                width={logo.width}
                height={logo.height}
                alt=""
                decoding="async"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HeroSection() {
  return (
    <main className={styles.page}>
      <HeroBackground />

      <section className={styles.heroContent} id="hero">
        <ServerMembersBadge />
        <h1 className={styles.heroTitle}>Your last stop in the replica world</h1>
        <p className={styles.heroSubtitle}>
          The most useful tools to comfortable browse and the most up to date spreadsheet selected by us for you.

        </p>
        <HeroActions />
      </section>

      <LogoSlider />
      <BentoSection />
    </main>
  );
}
